/**
 * Send Screen
 * Send Qbitcoin to another address
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Buffer } from 'buffer';
import { Camera } from 'react-native-vision-camera';
import WalletStorage from '../services/WalletStorage';
import QbitcoinAPI from '../services/QbitcoinAPI';
import Falcon from '../FalconCrypto';
import { TransactionBuilder } from '../services/TransactionBuilder';

const DEFAULT_FEE = 0.0005; // Default fee: 0.0005 QBC
const NORMAL_FEE = 0.001;   // Normal fee: 0.001 QBC

export default function SendScreen({ navigation, route }: any) {
  const isDarkMode = useColorScheme() === 'dark';
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState('0');
  const [selectedFee, setSelectedFee] = useState(DEFAULT_FEE);

  React.useEffect(() => {
    loadBalance();
    
    // Handle scanned address from navigation params
    if (route?.params?.scannedAddress) {
      setRecipientAddress(route.params.scannedAddress);
    }
  }, [route?.params?.scannedAddress]);

  const loadBalance = async () => {
    const wallet = await WalletStorage.getActiveWallet();
    if (wallet) {
      const result = await QbitcoinAPI.getBalance(wallet.address);
      if (result.balance) {
        const balanceQRL = (parseInt(result.balance) / 1000000000).toFixed(4);
        setBalance(balanceQRL);
      }
    }
  };

  const handleSend = async () => {
    if (!recipientAddress.trim()) {
      Alert.alert('Error', 'Please enter recipient address');
      return;
    }

    // Validate Q01 prefix
    if (!recipientAddress.startsWith('Q01')) {
      Alert.alert('Error', 'Invalid Qbitcoin address format. Address must start with Q01');
      return;
    }

    // Validate address length (should be between 37-53 characters including the Q prefix)
    if (recipientAddress.length < 37 || recipientAddress.length > 53) {
      Alert.alert('Error', `Invalid Qbitcoin address length. Address must be between 37-53 characters.\nYour address is ${recipientAddress.length} characters.`);
      return;
    }

    // Validate hex characters after Q prefix
    const hexPart = recipientAddress.substring(1);
    if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
      Alert.alert('Error', 'Invalid Qbitcoin address format. Address must contain only hexadecimal characters after Q');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const totalAmount = parseFloat(amount) + selectedFee;
    if (totalAmount > parseFloat(balance)) {
      Alert.alert('Error', `Insufficient balance. You need ${totalAmount.toFixed(4)} QBC (including ${selectedFee} QBC fee)`);
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter your wallet password');
      return;
    }

    try {
      setLoading(true);

      // Get wallet
      const wallet = await WalletStorage.getActiveWallet();
      if (!wallet) {
        Alert.alert('Error', 'No active wallet found');
        return;
      }

      console.log('Creating transaction...');
      console.log('From:', wallet.address);
      console.log('To:', recipientAddress);
      console.log('Amount:', amount);
      console.log('Fee:', selectedFee);

      // Decrypt private key
      const encryptedDataJson = JSON.stringify(wallet.private_key_encrypted);
      const decryptResult = await Falcon.decryptPrivateKey(encryptedDataJson, password);
      
      if (decryptResult.error) {
        Alert.alert('Error', 'Incorrect password');
        setLoading(false);
        return;
      }

      // Get current nonce
      const addressState = await QbitcoinAPI.getAddressState(wallet.address);
      let nonce = 0;
      if (addressState && addressState.nonce) {
        nonce = parseInt(addressState.nonce.toString());
      }

      console.log('Current nonce:', nonce);

      // Convert amount and fee to shor (1 QBC = 1,000,000,000 shor)
      const amountInShor = Math.floor(parseFloat(amount) * 1000000000);
      const feeInShor = Math.floor(selectedFee * 1000000000);

      console.log('Amount in shor:', amountInShor);
      console.log('Fee in shor:', feeInShor);

      // Use Rust to create and sign transaction
      console.log('🚀 Creating and signing transaction with Rust...');
      const privateKeyHex = decryptResult.privateKey || '';
      
      // Call Rust createTransaction function
      const txResult = await Falcon.createTransaction({
        master_addr: wallet.address,
        secret_key: privateKeyHex,
        public_key: wallet.public_key,
        recipient: recipientAddress,
        amount: amountInShor,
        fee: feeInShor,
        nonce: nonce + 1,
      });

      if (txResult.error) {
        Alert.alert('Error', 'Failed to create transaction: ' + txResult.error);
        setLoading(false);
        return;
      }

      console.log('✅ Transaction created successfully');
      console.log('Transaction hash:', txResult.transaction_hash);
      console.log('Signature length:', txResult.signature.length / 2, 'bytes');
      
      // Build protobuf transaction using the Rust transaction data
      const protobufHex = TransactionBuilder.buildTransactionFromRust(txResult);
      console.log('Protobuf hex length:', protobufHex.length);
      console.log('Protobuf preview:', protobufHex.substring(0, 64) + '...');

      // Step 6: Submit transaction to network
      console.log('🚀 Step 6: Broadcasting transaction...');
      const pushResult = await QbitcoinAPI.pushTransaction(protobufHex);
      
      if (pushResult.error) {
        Alert.alert('Error', 'Failed to broadcast transaction: ' + pushResult.error);
        setLoading(false);
        return;
      }

      // Success!
      console.log('✅ Transaction broadcast successful!');
      
      Alert.alert(
        '✅ Transaction Sent!',
        `Successfully sent ${amount} QBC to\n${recipientAddress.substring(0, 20)}...\n\nTransaction Hash:\n${txResult.transaction_hash.substring(0, 32)}...\n\nFee: ${selectedFee} QBC\nTotal: ${totalAmount.toFixed(4)} QBC`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setRecipientAddress('');
              setAmount('');
              setPassword('');
              loadBalance(); // Refresh balance
              
              // Navigate to dashboard
              navigation.navigate('Dashboard');
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error sending transaction:', error);
      Alert.alert('Error', `Failed to send transaction: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleScanQR = async () => {
    try {
      // Check camera permission
      const cameraPermission = await Camera.requestCameraPermission();
      
      if (cameraPermission === 'denied') {
        Alert.alert(
          'Camera Permission Required',
          'Please grant camera permission to scan QR codes',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }

      // Navigate to QR scanner screen
      navigation.navigate('QRScanner', {
        onScan: (address: string) => {
          setRecipientAddress(address);
        },
      });
    } catch (error) {
      console.error('Camera permission error:', error);
      Alert.alert('Error', 'Failed to access camera');
    }
  };

  const setMaxAmount = () => {
    const maxSendable = Math.max(0, parseFloat(balance) - selectedFee);
    setAmount(maxSendable.toFixed(4));
  };

  return (
    <ScrollView
      style={[styles.container, isDarkMode && styles.containerDark]}
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        {/* Header */}
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>
          Send Qbitcoin
        </Text>
        <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
          Transfer QBC to another wallet
        </Text>

        {/* Balance Display */}
        <View style={[styles.balanceCard, isDarkMode && styles.balanceCardDark]}>
          <Text style={[styles.balanceLabel, isDarkMode && styles.balanceLabelDark]}>
            Available Balance
          </Text>
          <Text style={[styles.balanceAmount, isDarkMode && styles.balanceAmountDark]}>
            {balance} QBC
          </Text>
        </View>

        {/* Recipient Address */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            Recipient Address
          </Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, styles.inputAddress, isDarkMode && styles.inputDark]}
              placeholder="Q0..."
              placeholderTextColor={isDarkMode ? '#546e7a' : '#90a4ae'}
              value={recipientAddress}
              onChangeText={setRecipientAddress}
              editable={!loading}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.scanButton, isDarkMode && styles.scanButtonDark]}
              onPress={handleScanQR}
              disabled={loading}>
              <Text style={styles.scanIcon}>📷</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, isDarkMode && styles.labelDark]}>
              Amount (QBC)
            </Text>
            <TouchableOpacity onPress={setMaxAmount} disabled={loading}>
              <Text style={styles.maxButton}>MAX</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, isDarkMode && styles.inputDark]}
            placeholder="0.0000"
            placeholderTextColor={isDarkMode ? '#546e7a' : '#90a4ae'}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            editable={!loading}
          />
          <Text style={[styles.usdEquivalent, isDarkMode && styles.usdEquivalentDark]}>
            ≈ ${(parseFloat(amount || '0') * 0.5).toFixed(2)} USD
          </Text>
        </View>

        {/* Network Fee Selection */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            Network Fee
          </Text>
          <View style={styles.feeOptions}>
            <TouchableOpacity
              style={[
                styles.feeOption,
                isDarkMode && styles.feeOptionDark,
                selectedFee === DEFAULT_FEE && styles.feeOptionSelected,
                selectedFee === DEFAULT_FEE && isDarkMode && styles.feeOptionSelectedDark,
              ]}
              onPress={() => setSelectedFee(DEFAULT_FEE)}
              disabled={loading}>
              <Text style={[
                styles.feeOptionLabel,
                isDarkMode && styles.feeOptionLabelDark,
                selectedFee === DEFAULT_FEE && styles.feeOptionLabelSelected,
              ]}>
                Default
              </Text>
              <Text style={[
                styles.feeOptionAmount,
                isDarkMode && styles.feeOptionAmountDark,
                selectedFee === DEFAULT_FEE && styles.feeOptionAmountSelected,
              ]}>
                {DEFAULT_FEE} QBC
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.feeOption,
                isDarkMode && styles.feeOptionDark,
                selectedFee === NORMAL_FEE && styles.feeOptionSelected,
                selectedFee === NORMAL_FEE && isDarkMode && styles.feeOptionSelectedDark,
              ]}
              onPress={() => setSelectedFee(NORMAL_FEE)}
              disabled={loading}>
              <Text style={[
                styles.feeOptionLabel,
                isDarkMode && styles.feeOptionLabelDark,
                selectedFee === NORMAL_FEE && styles.feeOptionLabelSelected,
              ]}>
                Normal
              </Text>
              <Text style={[
                styles.feeOptionAmount,
                isDarkMode && styles.feeOptionAmountDark,
                selectedFee === NORMAL_FEE && styles.feeOptionAmountSelected,
              ]}>
                {NORMAL_FEE} QBC
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            Wallet Password
          </Text>
          <TextInput
            style={[styles.input, isDarkMode && styles.inputDark]}
            placeholder="Enter password to confirm"
            placeholderTextColor={isDarkMode ? '#546e7a' : '#90a4ae'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />
        </View>

        {/* Total */}
        <View style={[styles.totalCard, isDarkMode && styles.totalCardDark]}>
          <Text style={[styles.totalLabel, isDarkMode && styles.totalLabelDark]}>
            Total Amount
          </Text>
          <Text style={[styles.totalAmount, isDarkMode && styles.totalAmountDark]}>
            {(parseFloat(amount || '0') + selectedFee).toFixed(4)} QBC
          </Text>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>📤 Send Transaction</Text>
          )}
        </TouchableOpacity>

        {/* Warning */}
        <View style={[styles.warningBox, isDarkMode && styles.warningBoxDark]}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={[styles.warningText, isDarkMode && styles.warningTextDark]}>
            Double-check the recipient address. Transactions cannot be reversed.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#0a1929',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 8,
  },
  titleDark: {
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#546e7a',
    marginBottom: 24,
  },
  subtitleDark: {
    color: '#90caf9',
  },
  balanceCard: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  balanceCardDark: {
    backgroundColor: '#1a2f47',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#1565c0',
    marginBottom: 4,
  },
  balanceLabelDark: {
    color: '#90caf9',
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1565c0',
  },
  balanceAmountDark: {
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
  },
  labelDark: {
    color: '#fff',
  },
  maxButton: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1565c0',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#263238',
    borderWidth: 1,
    borderColor: '#cfd8dc',
  },
  inputAddress: {
    flex: 1,
  },
  inputDark: {
    backgroundColor: '#1a2332',
    color: '#fff',
    borderColor: '#263238',
  },
  scanButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cfd8dc',
  },
  scanButtonDark: {
    backgroundColor: '#1a2332',
    borderColor: '#263238',
  },
  scanIcon: {
    fontSize: 24,
  },
  usdEquivalent: {
    fontSize: 14,
    color: '#90a4ae',
    marginTop: 8,
  },
  usdEquivalentDark: {
    color: '#546e7a',
  },
  feeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  feeOption: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  feeOptionDark: {
    backgroundColor: '#1a2332',
    borderColor: '#263238',
  },
  feeOptionSelected: {
    borderColor: '#1565c0',
    backgroundColor: '#e3f2fd',
  },
  feeOptionSelectedDark: {
    borderColor: '#1976D2',
    backgroundColor: '#1a2f47',
  },
  feeOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#546e7a',
    marginBottom: 4,
  },
  feeOptionLabelDark: {
    color: '#90caf9',
  },
  feeOptionLabelSelected: {
    color: '#1565c0',
  },
  feeOptionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#263238',
  },
  feeOptionAmountDark: {
    color: '#fff',
  },
  feeOptionAmountSelected: {
    color: '#1565c0',
  },
  feeCard: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  feeCardDark: {
    backgroundColor: '#2e2416',
  },
  feeLabel: {
    fontSize: 14,
    color: '#e65100',
  },
  feeLabelDark: {
    color: '#ffb74d',
  },
  feeAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e65100',
  },
  feeAmountDark: {
    color: '#ffb74d',
  },
  totalCard: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  totalCardDark: {
    backgroundColor: '#1e3a2a',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
  },
  totalLabelDark: {
    color: '#4ade80',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  totalAmountDark: {
    color: '#4ade80',
  },
  sendButton: {
    backgroundColor: '#1565c0',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningBoxDark: {
    backgroundColor: '#2e2416',
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#e65100',
    lineHeight: 20,
  },
  warningTextDark: {
    color: '#ffb74d',
  },
});
