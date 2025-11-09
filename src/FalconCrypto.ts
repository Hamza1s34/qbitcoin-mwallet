import { NativeModules } from 'react-native';

const { FalconCrypto } = NativeModules;

export interface FalconKeypair {
  publicKey: string;
  secretKey: string;
}

export interface VerifyResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface WalletData {
  address: string;
  algorithm: 'falcon-512' | 'falcon-1024';
  created_at: number;
  encrypted: boolean;
  encryption_version: string;
  name: string;
  private_key_encrypted: {
    ciphertext: string;
    nonce: string;
    salt: string;
    encrypted: boolean;
  };
  private_key_size: number;
  public_key: string;
  public_key_size: number;
}

export interface DecryptResult {
  privateKey?: string;
  error?: string;
}

export interface PasswordVerifyResult {
  valid: boolean;
  error?: string;
}

/**
 * Falcon Post-Quantum Cryptography for React Native
 * 
 * This module provides access to Falcon-512 and Falcon-1024 
 * post-quantum signature algorithms.
 */
export class Falcon {
  
  /**
   * Generate a Falcon-512 keypair
   * @returns Promise<FalconKeypair> - Public and secret keys (base64 encoded)
   */
  static async generateKeypair512(): Promise<FalconKeypair> {
    const result = await FalconCrypto.generateKeypair512();
    return JSON.parse(result);
  }

  /**
   * Generate a Falcon-1024 keypair (higher security)
   * @returns Promise<FalconKeypair> - Public and secret keys (base64 encoded)
   */
  static async generateKeypair1024(): Promise<FalconKeypair> {
    const result = await FalconCrypto.generateKeypair1024();
    return JSON.parse(result);
  }

  /**
   * Sign a message using Falcon-512
   * @param message - The message to sign
   * @param secretKey - The secret key (base64 encoded)
   * @returns Promise<string> - Signed message (base64 encoded)
   */
  static async signMessage512(message: string, secretKey: string): Promise<string> {
    return await FalconCrypto.signMessage512(message, secretKey);
  }

  /**
   * Sign a message using Falcon-1024 (higher security)
   * @param message - The message to sign
   * @param secretKey - The secret key (base64 encoded)
   * @returns Promise<string> - Signed message (base64 encoded)
   */
  static async signMessage1024(message: string, secretKey: string): Promise<string> {
    return await FalconCrypto.signMessage1024(message, secretKey);
  }

  /**
   * Verify a Falcon-512 signature
   * @param signedMessage - The signed message (base64 encoded)
   * @param publicKey - The public key (base64 encoded)
   * @returns Promise<VerifyResult> - Verification result with original message
   */
  static async verifySignature512(signedMessage: string, publicKey: string): Promise<VerifyResult> {
    const result = await FalconCrypto.verifySignature512(signedMessage, publicKey);
    return JSON.parse(result);
  }

  /**
   * Verify a Falcon-1024 signature
   * @param signedMessage - The signed message (base64 encoded)
   * @param publicKey - The public key (base64 encoded)
   * @returns Promise<VerifyResult> - Verification result with original message
   */
  static async verifySignature1024(signedMessage: string, publicKey: string): Promise<VerifyResult> {
    const result = await FalconCrypto.verifySignature1024(signedMessage, publicKey);
    return JSON.parse(result);
  }

  /**
   * Create a new wallet with Falcon-512 keypair and AES-256-GCM encryption
   * @param name - Wallet name
   * @param password - Password for encryption
   * @returns Promise<WalletData> - Complete wallet data with encrypted private key
   */
  static async createWallet(name: string, password: string): Promise<WalletData> {
    const result = await FalconCrypto.createWallet(name, password);
    return JSON.parse(result);
  }

  /**
   * Decrypt private key from encrypted wallet data
   * @param encryptedData - Encrypted private key data (JSON string)
   * @param password - Wallet password
   * @returns Promise<DecryptResult> - Decrypted private key in hex format
   */
  static async decryptPrivateKey(encryptedData: string, password: string): Promise<DecryptResult> {
    const result = await FalconCrypto.decryptPrivateKey(encryptedData, password);
    return JSON.parse(result);
  }

  /**
   * Verify wallet password without decrypting
   * @param walletData - Complete wallet JSON string
   * @param password - Password to verify
   * @returns Promise<PasswordVerifyResult> - Verification result
   */
  static async verifyWalletPassword(walletData: string, password: string): Promise<PasswordVerifyResult> {
    const result = await FalconCrypto.verifyWalletPassword(walletData, password);
    return JSON.parse(result);
  }

  /**
   * Create a Qbitcoin transaction with Falcon-512 signature
   * @param params - Transaction parameters (JSON string with master_addr, secret_key, public_key, recipient, amount, fee, nonce)
   * @returns Promise<Transaction> - Created transaction with signature and hash
   */
  static async createTransaction(params: {
    master_addr: string;
    secret_key: string;
    public_key: string;
    recipient: string;
    amount: number;
    fee: number;
    nonce: number;
  }): Promise<any> {
    const paramsJson = JSON.stringify(params);
    const result = await FalconCrypto.createTransaction(paramsJson);
    return JSON.parse(result);
  }
}

export default Falcon;
