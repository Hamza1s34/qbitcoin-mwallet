/**
 * Verify Message Screen
 * Verify message signatures
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
} from 'react-native';
import Falcon from '../FalconCrypto';

export default function VerifyMessageScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerifySignature = async () => {
    if (!signature.trim()) {
      Alert.alert('Error', 'Please enter the signature');
      return;
    }

    if (!publicKey.trim()) {
      Alert.alert('Error', 'Please enter the public key');
      return;
    }

    // Message is optional - we'll get it from the signature if verification succeeds
    const expectedMessage = message.trim();

    try {
      setLoading(true);

      console.log('🔍 Verifying signature...');
      console.log('✍️ Signature (first 50):', signature.substring(0, 50));
      console.log('🔑 Public Key (first 50):', publicKey.substring(0, 50));

      // Verify signature using Falcon
      // The signature contains both the signature AND the original message
      const result = await Falcon.verifySignature512(signature, publicKey);
      
      console.log('📊 Verification result:', result);

      if (result.success) {
        // The signature is cryptographically valid
        // Now check if the message matches what the user expected (if they provided one)
        const recoveredMessage = result.message || '';
        
        if (expectedMessage && recoveredMessage !== expectedMessage) {
          // Signature is valid but message doesn't match what user expected
          setVerificationResult(false);
          Alert.alert(
            '⚠️ Message Mismatch', 
            `The signature is cryptographically VALID, but the message doesn't match what you entered.\n\n` +
            `You entered: "${expectedMessage}"\n\n` +
            `Actual signed message: "${recoveredMessage}"\n\n` +
            `This signature was created for a different message.`
          );
        } else {
          // Signature is valid and message matches (or no expected message provided)
          setVerificationResult(true);
          setMessage(recoveredMessage); // Update the message field with recovered message
          Alert.alert(
            '✅ Valid Signature', 
            `The signature is VALID!\n\n` +
            `Signed message:\n"${recoveredMessage}"\n\n` +
            `This message was signed by the holder of this public key.`
          );
        }
      } else {
        setVerificationResult(false);
        Alert.alert('❌ Invalid Signature', result.error || 'The signature is cryptographically INVALID.');
      }
    } catch (error) {
      console.error('Error verifying signature:', error);
      Alert.alert('Error', `Failed to verify signature: ${error}`);
      setVerificationResult(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, isDarkMode && styles.containerDark]}
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>
          Verify Signature
        </Text>
        <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
          Verify a message signature using a public key. The signature contains the message.
        </Text>

        {/* Message Input - OPTIONAL */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            Expected Message (Optional)
          </Text>
          <Text style={[styles.helperText, isDarkMode && styles.helperTextDark]}>
            Leave empty to see the signed message, or enter to verify it matches
          </Text>
          <TextInput
            style={[styles.textArea, isDarkMode && styles.textAreaDark]}
            placeholder="Optional: Enter expected message to verify..."
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Signature Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            Signature
          </Text>
          <TextInput
            style={[styles.textArea, isDarkMode && styles.textAreaDark]}
            placeholder="Paste the signature here..."
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            value={signature}
            onChangeText={setSignature}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Public Key Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            Public Key
          </Text>
          <TextInput
            style={[styles.textArea, isDarkMode && styles.textAreaDark]}
            placeholder="Paste the public key here..."
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            value={publicKey}
            onChangeText={setPublicKey}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
          onPress={handleVerifySignature}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.verifyButtonText}>🔍 Verify Signature</Text>
          )}
        </TouchableOpacity>

        {/* Verification Result */}
        {verificationResult !== null && (
          <View style={[
            styles.resultCard,
            verificationResult ? styles.resultCardValid : styles.resultCardInvalid,
            isDarkMode && (verificationResult ? styles.resultCardValidDark : styles.resultCardInvalidDark)
          ]}>
            <Text style={styles.resultIcon}>
              {verificationResult ? '✅' : '❌'}
            </Text>
            <View style={styles.resultTextContainer}>
              <Text style={[
                styles.resultTitle,
                verificationResult ? styles.resultTitleValid : styles.resultTitleInvalid
              ]}>
                {verificationResult ? 'Valid Signature' : 'Invalid Signature'}
              </Text>
              <Text style={[
                styles.resultText,
                verificationResult ? styles.resultTextValid : styles.resultTextInvalid
              ]}>
                {verificationResult 
                  ? 'The signature is cryptographically valid and was created by the holder of this public key.'
                  : 'The signature verification failed. The message may have been altered or signed with a different key.'}
              </Text>
            </View>
          </View>
        )}

        {/* Info Box */}
        <View style={[styles.infoBox, isDarkMode && styles.infoBoxDark]}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
            Falcon signatures include the original message. When you verify a signature, you'll see the exact message that was signed. You can optionally enter an expected message to confirm it matches.
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
  helperText: {
    fontSize: 13,
    color: '#546e7a',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  helperTextDark: {
    color: '#90caf9',
  },
  textArea: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#263238',
    borderWidth: 1,
    borderColor: '#cfd8dc',
    minHeight: 80,
  },
  textAreaDark: {
    backgroundColor: '#1a2332',
    color: '#fff',
    borderColor: '#263238',
  },
  verifyButton: {
    backgroundColor: '#1565c0',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resultCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    borderWidth: 2,
  },
  resultCardValid: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4caf50',
  },
  resultCardValidDark: {
    backgroundColor: '#1e3a2a',
    borderColor: '#4ade80',
  },
  resultCardInvalid: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
  },
  resultCardInvalidDark: {
    backgroundColor: '#3a1e1e',
    borderColor: '#ef5350',
  },
  resultIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  resultTitleValid: {
    color: '#2e7d32',
  },
  resultTitleInvalid: {
    color: '#c62828',
  },
  resultText: {
    fontSize: 14,
    lineHeight: 20,
  },
  resultTextValid: {
    color: '#388e3c',
  },
  resultTextInvalid: {
    color: '#d32f2f',
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
