/**
 * Transaction Builder for Qbitcoin
 * Creates and encodes transactions in protobuf format
 */

import { Buffer } from 'buffer';
import crypto from 'crypto-js';

export interface TransactionParams {
  masterAddr: string;        // Q-address format
  recipientAddr: string;     // Q-address format
  amount: string;            // Amount in shor (string to handle big numbers)
  fee: string;               // Fee in shor
  nonce: number;             // Next nonce (current + 1)
  publicKey: string;         // Hex string
}

export class TransactionBuilder {
  /**
   * Create signing message following TransferTransaction.get_data_bytes format
   * Returns the HASH of message bytes for Falcon signing
   */
  static createSigningMessage(params: TransactionParams): { hash: Buffer; originalData: Buffer } {
    // Convert addresses from Q-format to bytes
    const masterAddrBytes = Buffer.from(params.masterAddr.substring(1), 'hex');
    const recipientAddrBytes = Buffer.from(params.recipientAddr.substring(1), 'hex');
    
    // Convert fee to 8-byte big-endian
    const feeBytes = this.uint64ToBytes(BigInt(params.fee));
    
    // Convert amount to 8-byte big-endian
    const amountBytes = this.uint64ToBytes(BigInt(params.amount));
    
    // Build signing data following Python format:
    // data = master_addr + fee + message_data + addr_to + amount
    const originalData = Buffer.concat([
      masterAddrBytes,
      feeBytes,
      // message_data is empty for simple transfers
      recipientAddrBytes,
      amountBytes
    ]);
    
    // Hash the data - THIS hash is what gets signed
    const dataHex = originalData.toString('hex');
    const hashResult = crypto.SHA256(crypto.enc.Hex.parse(dataHex));
    const hash = Buffer.from(hashResult.toString(crypto.enc.Hex), 'hex');
    
    return { hash, originalData };
  }
  
  /**
   * Build complete protobuf transaction
   */
  static buildTransaction(
    params: TransactionParams,
    signature: string,  // Hex string from Falcon signing
    txHash: string      // Transaction hash hex string
  ): string {
    // Convert addresses from Q-format to bytes
    const masterAddrBytes = Buffer.from(params.masterAddr.substring(1), 'hex');
    const recipientAddrBytes = Buffer.from(params.recipientAddr.substring(1), 'hex');
    const publicKeyBytes = Buffer.from(params.publicKey, 'hex');
    const signatureBytes = Buffer.from(signature, 'hex');
    const txHashBytes = Buffer.from(txHash, 'hex');
    
    let protobuf = Buffer.alloc(0);
    
    // Field 1: master_addr (bytes)
    protobuf = Buffer.concat([protobuf, this.encodeBytesField(1, masterAddrBytes)]);
    
    // Field 2: fee (uint64)
    protobuf = Buffer.concat([protobuf, this.encodeVarintField(2, BigInt(params.fee))]);
    
    // Field 3: public_key (bytes)
    protobuf = Buffer.concat([protobuf, this.encodeBytesField(3, publicKeyBytes)]);
    
    // Field 4: signature (bytes)
    protobuf = Buffer.concat([protobuf, this.encodeBytesField(4, signatureBytes)]);
    
    // Field 5: nonce (uint64)
    protobuf = Buffer.concat([protobuf, this.encodeVarintField(5, BigInt(params.nonce))]);
    
    // Field 6: transaction_hash (bytes)
    protobuf = Buffer.concat([protobuf, this.encodeBytesField(6, txHashBytes)]);
    
    // Field 7: Transfer message (nested)
    const transferData = this.createTransferMessage(recipientAddrBytes, BigInt(params.amount));
    protobuf = Buffer.concat([protobuf, this.encodeBytesField(7, transferData)]);
    
    return protobuf.toString('hex');
  }
  
  /**
   * Create Transfer submessage
   */
  private static createTransferMessage(recipientAddr: Buffer, amount: bigint): Buffer {
    let transfer = Buffer.alloc(0);
    
    // Field 1: addrs_to (repeated bytes)
    transfer = Buffer.concat([transfer, this.encodeBytesField(1, recipientAddr)]);
    
    // Field 2: amounts (repeated uint64)
    transfer = Buffer.concat([transfer, this.encodeVarintField(2, amount)]);
    
    return transfer;
  }
  
  /**
   * Encode protobuf varint field
   */
  private static encodeVarintField(fieldNum: number, value: bigint): Buffer {
    const tag = (fieldNum << 3) | 0; // Wire type 0 (varint)
    return Buffer.concat([
      this.encodeVarint(tag),
      this.encodeVarint(Number(value))
    ]);
  }
  
  /**
   * Encode protobuf bytes field
   */
  private static encodeBytesField(fieldNum: number, data: Buffer): Buffer {
    const tag = (fieldNum << 3) | 2; // Wire type 2 (length-delimited)
    return Buffer.concat([
      this.encodeVarint(tag),
      this.encodeVarint(data.length),
      data
    ]);
  }
  
  /**
   * Encode varint (variable-length integer)
   */
  private static encodeVarint(value: number): Buffer {
    const result: number[] = [];
    while (value >= 0x80) {
      result.push((value & 0x7F) | 0x80);
      value >>>= 7;
    }
    result.push(value & 0x7F);
    return Buffer.from(result);
  }
  
  /**
   * Convert uint64 to 8-byte big-endian buffer
   */
  private static uint64ToBytes(value: bigint): Buffer {
    const buffer = Buffer.alloc(8);
    // Manually write bigint as big-endian
    for (let i = 7; i >= 0; i--) {
      buffer[i] = Number(value & 0xFFn);
      value = value >> 8n;
    }
    return buffer;
  }
  
  /**
   * Calculate transaction hash
   * txHash = SHA256(original_signing_data + signature)
   */
  static calculateTxHash(originalData: Buffer, signature: string): string {
    // Concatenate original signing data and signature, then hash
    const signatureBytes = Buffer.from(signature, 'hex');
    const fullMessage = Buffer.concat([originalData, signatureBytes]);
    
    const hash = crypto.SHA256(crypto.enc.Hex.parse(fullMessage.toString('hex')));
    return hash.toString(crypto.enc.Hex);
  }

  /**
   * Build protobuf transaction from Rust transaction result
   * The Rust function returns all necessary fields already computed
   */
  static buildTransactionFromRust(rustTx: any): string {
    const masterAddrBytes = Buffer.from(rustTx.master_addr, 'hex');
    const publicKeyBytes = Buffer.from(rustTx.public_key, 'hex');
    const signatureBytes = Buffer.from(rustTx.signature, 'hex');
    const txHashBytes = Buffer.from(rustTx.transaction_hash, 'hex');
    
    let protobuf = Buffer.alloc(0);
    
    // Field 1: master_addr (bytes)
    protobuf = Buffer.concat([protobuf, this.encodeBytesField(1, masterAddrBytes)]);
    
    // Field 2: fee (uint64)
    protobuf = Buffer.concat([protobuf, this.encodeVarintField(2, BigInt(rustTx.fee))]);
    
    // Field 3: public_key (bytes)
    protobuf = Buffer.concat([protobuf, this.encodeBytesField(3, publicKeyBytes)]);
    
    // Field 4: signature (bytes)
    protobuf = Buffer.concat([protobuf, this.encodeBytesField(4, signatureBytes)]);
    
    // Field 5: nonce (uint64)
    protobuf = Buffer.concat([protobuf, this.encodeVarintField(5, BigInt(rustTx.nonce))]);
    
    // Field 6: transaction_hash (bytes)
    protobuf = Buffer.concat([protobuf, this.encodeBytesField(6, txHashBytes)]);
    
    // Field 7: Transfer messages (nested)
    for (const transfer of rustTx.transfers) {
      const recipientAddrBytes = Buffer.from(transfer.addr_to, 'hex');
      const transferData = this.createTransferMessage(recipientAddrBytes, BigInt(transfer.amount));
      protobuf = Buffer.concat([protobuf, this.encodeBytesField(7, transferData)]);
    }
    
    return protobuf.toString('hex');
  }
}
