/**
 * Sign Message Screen
 * Sign messages using wallet's private key with Rust backend
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
  Clipboard,
} from 'react-native';
import { Buffer } from 'buffer';
import Falcon from '../FalconCrypto';
import WalletStorage from '../services/WalletStorage';

export default function SignMessageScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [signature, setSignature] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignMessage = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message to sign');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter your wallet password');
      return;
    }

    try {
      setLoading(true);

      // Get active wallet
      const wallet = await WalletStorage.getActiveWallet();
      if (!wallet) {
        Alert.alert('Error', 'No active wallet found');
        setLoading(false);
        return;
      }

      // Verify password and decrypt private key using Rust backend
      const encryptedDataJson = JSON.stringify(wallet.private_key_encrypted);
      const decryptResult = await Falcon.decryptPrivateKey(encryptedDataJson, password);
      
      if (decryptResult.error) {
        Alert.alert('Error', 'Failed to decrypt private key. Wrong password?');
        setLoading(false);
        return;
      }
      
      if (!decryptResult.privateKey) {
        Alert.alert('Error', 'Failed to decrypt private key');
        setLoading(false);
        return;
      }
      
      // Convert hex private key to bytes, then to base64 for Falcon
      const privateKeyHex = decryptResult.privateKey;
      // Hex string -> bytes -> base64
      const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');
      const privateKeyBase64 = privateKeyBytes.toString('base64');
      
      console.log('🔑 Private key hex length:', privateKeyHex.length);
      console.log('🔑 Private key bytes length:', privateKeyBytes.length);
      console.log('🔑 Private key base64:', privateKeyBase64.substring(0, 50) + '...');

      // Sign the message using Falcon
      const signatureBase64 = await Falcon.signMessage512(message, privateKeyBase64);
      
      console.log('✍️ Signature created:', signatureBase64.substring(0, 50) + '...');

      // Convert public key from hex to base64 for verification
      const publicKeyBytes = Buffer.from(wallet.public_key, 'hex');
      const publicKeyBase64 = publicKeyBytes.toString('base64');

      setSignature(signatureBase64);
      setPublicKey(publicKeyBase64);
      Alert.alert('✅ Success', 'Message signed successfully!\n\nYou can now copy the signature and public key for verification.');
    } catch (error) {
      console.error('Error signing message:', error);
      Alert.alert('Error', `Failed to sign message: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const copySignature = () => {
    if (!signature) {
      Alert.alert('Error', 'No signature to copy');
      return;
    }
    
    Clipboard.setString(signature);
    Alert.alert('✅ Copied', 'Signature copied to clipboard');
  };

  const copyPublicKey = () => {
    if (!publicKey) {
      Alert.alert('Error', 'No public key to copy');
      return;
    }
    
    Clipboard.setString(publicKey);
    Alert.alert('✅ Copied', 'Public key copied to clipboard');
  };

  return (
    <ScrollView
      style={[styles.container, isDarkMode && styles.containerDark]}
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>
          Sign Message
        </Text>
        <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
          Create a cryptographic signature for any message
        </Text>

        {/* Message Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            Message to Sign
          </Text>
          <TextInput
            style={[styles.textArea, isDarkMode && styles.textAreaDark]}
            placeholder="Enter your message here..."
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            Wallet Password
          </Text>
          <TextInput
            style={[styles.input, isDarkMode && styles.inputDark]}
            placeholder="Enter your password"
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />
        </View>

        {/* Sign Button */}
        <TouchableOpacity
          style={[styles.signButton, loading && styles.signButtonDisabled]}
          onPress={handleSignMessage}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signButtonText}>🔏 Sign Message</Text>
          )}
        </TouchableOpacity>

        {/* Signature Output */}
        {signature && (
          <>
            <View style={[styles.signatureCard, isDarkMode && styles.signatureCardDark]}>
              <View style={styles.signatureHeader}>
                <Text style={[styles.signatureTitle, isDarkMode && styles.signatureTitleDark]}>
                  Signature
                </Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={copySignature}>
                  <Text style={styles.copyButtonText}>📋 Copy</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.signatureScroll} horizontal>
                <Text style={[styles.signatureText, isDarkMode && styles.signatureTextDark]}>
                  {signature}
                </Text>
              </ScrollView>
            </View>

            <View style={[styles.signatureCard, isDarkMode && styles.signatureCardDark]}>
              <View style={styles.signatureHeader}>
                <Text style={[styles.signatureTitle, isDarkMode && styles.signatureTitleDark]}>
                  Public Key (for verification)
                </Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={copyPublicKey}>
                  <Text style={styles.copyButtonText}>📋 Copy</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.signatureScroll} horizontal>
                <Text style={[styles.signatureText, isDarkMode && styles.signatureTextDark]}>
                  {publicKey}
                </Text>
              </ScrollView>
            </View>
          </>
        )}

        {/* Info Box */}
        <View style={[styles.infoBox, isDarkMode && styles.infoBoxDark]}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
            The signature proves you control the private key without revealing it. Anyone can verify this signature using your public key.
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
    marginBottom: 32,
  },
  subtitleDark: {
    color: '#90caf9',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 8,
  },
  labelDark: {
    color: '#fff',
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
  inputDark: {
    backgroundColor: '#1a2332',
    color: '#fff',
    borderColor: '#263238',
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#263238',
    borderWidth: 1,
    borderColor: '#cfd8dc',
    minHeight: 120,
  },
  textAreaDark: {
    backgroundColor: '#1a2332',
    color: '#fff',
    borderColor: '#263238',
  },
  signButton: {
    backgroundColor: '#1565c0',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  signButtonDisabled: {
    opacity: 0.6,
  },
  signButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  signatureCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1565c0',
  },
  signatureCardDark: {
    backgroundColor: '#1a2f47',
    borderColor: '#64B5F6',
  },
  signatureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  signatureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565c0',
  },
  signatureTitleDark: {
    color: '#64B5F6',
  },
  copyButton: {
    backgroundColor: '#1565c0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  signatureScroll: {
    maxHeight: 100,
  },
  signatureText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#263238',
  },
  signatureTextDark: {
    color: '#fff',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#1565c0',
  },
  infoBoxDark: {
    backgroundColor: '#1a2530',
    borderColor: '#1976D2',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1565c0',
    lineHeight: 20,
  },
  infoTextDark: {
    color: '#64B5F6',
  },
});
