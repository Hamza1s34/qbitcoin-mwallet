/**
 * Wallet Info Screen
 * Display wallet details including keys with Rust backend decryption
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  Clipboard,
} from 'react-native';
import WalletStorage from '../services/WalletStorage';
import Falcon from '../FalconCrypto';

export default function WalletInfoScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const [wallet, setWallet] = useState<any>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [decryptedPrivateKey, setDecryptedPrivateKey] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    const activeWallet = await WalletStorage.getActiveWallet();
    setWallet(activeWallet);
  };

  const handleShowPrivateKey = () => {
    setShowPasswordModal(true);
  };

  const verifyPasswordAndShowKey = async () => {
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    // Decrypt the private key using Rust backend
    try {
      const encryptedDataJson = JSON.stringify(wallet.private_key_encrypted);
      const decryptResult = await Falcon.decryptPrivateKey(encryptedDataJson, password);
      
      if (decryptResult.error) {
        Alert.alert('Error', 'Incorrect password');
        setPassword('');
        return;
      }
      
      if (!decryptResult.privateKey) {
        Alert.alert('Error', 'Failed to decrypt private key');
        setPassword('');
        return;
      }
      
      setDecryptedPrivateKey(decryptResult.privateKey);
      setShowPrivateKey(true);
      setShowPasswordModal(false);
      setPassword('');
    } catch (error) {
      console.error('Decryption error:', error);
      Alert.alert('Error', 'Failed to decrypt private key');
      setPassword('');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('✅ Copied', `${label} copied to clipboard`);
  };

  if (!wallet) {
    return (
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <Text style={[styles.errorText, isDarkMode && styles.errorTextDark]}>
          No wallet found
        </Text>
      </View>
    );
  }

  const createdDate = new Date(wallet.created_at * 1000);
  const formattedDate = createdDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <ScrollView
      style={[styles.container, isDarkMode && styles.containerDark]}
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>
          Wallet Information
        </Text>

        {/* Wallet Name */}
        <View style={[styles.infoCard, isDarkMode && styles.infoCardDark]}>
          <Text style={[styles.infoLabel, isDarkMode && styles.infoLabelDark]}>
            Wallet Name
          </Text>
          <Text style={[styles.infoValue, isDarkMode && styles.infoValueDark]}>
            {wallet.name}
          </Text>
        </View>

        {/* Algorithm */}
        <View style={[styles.infoCard, isDarkMode && styles.infoCardDark]}>
          <Text style={[styles.infoLabel, isDarkMode && styles.infoLabelDark]}>
            Security Algorithm
          </Text>
          <Text style={[styles.infoValue, isDarkMode && styles.infoValueDark]}>
            {wallet.algorithm.toUpperCase()}
          </Text>
        </View>

        {/* Created Date */}
        <View style={[styles.infoCard, isDarkMode && styles.infoCardDark]}>
          <Text style={[styles.infoLabel, isDarkMode && styles.infoLabelDark]}>
            Created On
          </Text>
          <Text style={[styles.infoValue, isDarkMode && styles.infoValueDark]}>
            {formattedDate}
          </Text>
        </View>

        {/* Address */}
        <View style={[styles.infoCard, isDarkMode && styles.infoCardDark]}>
          <View style={styles.infoHeader}>
            <Text style={[styles.infoLabel, isDarkMode && styles.infoLabelDark]}>
              Wallet Address
            </Text>
            <TouchableOpacity
              style={styles.copyIconButton}
              onPress={() => copyToClipboard(wallet.address, 'Address')}>
              <Text style={styles.copyIcon}>📋</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.infoValueMono, isDarkMode && styles.infoValueMonoDark]}>
            {wallet.address}
          </Text>
        </View>

        {/* Public Key */}
        <View style={[styles.infoCard, isDarkMode && styles.infoCardDark]}>
          <View style={styles.infoHeader}>
            <Text style={[styles.infoLabel, isDarkMode && styles.infoLabelDark]}>
              Public Key
            </Text>
            <TouchableOpacity
              style={styles.copyIconButton}
              onPress={() => copyToClipboard(wallet.public_key, 'Public Key')}>
              <Text style={styles.copyIcon}>📋</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal style={styles.keyScroll}>
            <Text style={[styles.infoValueMono, isDarkMode && styles.infoValueMonoDark]}>
              {wallet.public_key}
            </Text>
          </ScrollView>
          <Text style={[styles.keySizeText, isDarkMode && styles.keySizeTextDark]}>
            {wallet.public_key.length} characters ({wallet.public_key_size} bytes)
          </Text>
        </View>

        {/* Private Key */}
        <View style={[styles.infoCard, isDarkMode && styles.infoCardDark]}>
          <View style={styles.infoHeader}>
            <Text style={[styles.infoLabel, isDarkMode && styles.infoLabelDark]}>
              Private Key {showPrivateKey ? '(Decrypted)' : '(Encrypted)'}
            </Text>
            {showPrivateKey && (
              <TouchableOpacity
                style={styles.copyIconButton}
                onPress={() => copyToClipboard(decryptedPrivateKey, 'Private Key')}>
                <Text style={styles.copyIcon}>📋</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {!showPrivateKey ? (
            <TouchableOpacity
              style={styles.showKeyButton}
              onPress={handleShowPrivateKey}>
              <Text style={styles.showKeyButtonText}>
                🔒 Show Private Key
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <ScrollView horizontal style={styles.keyScroll}>
                <Text style={[styles.infoValueMono, isDarkMode && styles.infoValueMonoDark]}>
                  {decryptedPrivateKey}
                </Text>
              </ScrollView>
              <Text style={[styles.keySizeText, isDarkMode && styles.keySizeTextDark]}>
                {decryptedPrivateKey.length} characters ({wallet.private_key_size} bytes)
              </Text>
              <TouchableOpacity
                style={styles.hideKeyButton}
                onPress={() => {
                  setShowPrivateKey(false);
                  setDecryptedPrivateKey('');
                }}>
                <Text style={styles.hideKeyButtonText}>
                  👁️ Hide Private Key
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Warning */}
        <View style={[styles.warningBox, isDarkMode && styles.warningBoxDark]}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={[styles.warningText, isDarkMode && styles.warningTextDark]}>
            Never share your private key with anyone! After entering your password, you'll see the unencrypted private key. Keep it safe!
          </Text>
        </View>
      </View>

      {/* Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
            <Text style={[styles.modalTitle, isDarkMode && styles.modalTitleDark]}>
              Enter Password
            </Text>
            <Text style={[styles.modalSubtitle, isDarkMode && styles.modalSubtitleDark]}>
              Enter your wallet password to view the private key
            </Text>
            
            <TextInput
              style={[styles.modalInput, isDarkMode && styles.modalInputDark]}
              placeholder="Password"
              placeholderTextColor={isDarkMode ? '#666' : '#999'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                }}>
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={verifyPasswordAndShowKey}>
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 24,
  },
  titleDark: {
    color: '#fff',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoCardDark: {
    backgroundColor: '#1a2332',
    borderColor: '#263238',
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#546e7a',
    marginBottom: 8,
    fontWeight: '600',
  },
  infoLabelDark: {
    color: '#90caf9',
  },
  infoValue: {
    fontSize: 16,
    color: '#263238',
    fontWeight: '500',
  },
  infoValueDark: {
    color: '#fff',
  },
  infoValueMono: {
    fontSize: 12,
    color: '#263238',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  infoValueMonoDark: {
    color: '#fff',
  },
  keyScroll: {
    maxHeight: 100,
  },
  keySizeText: {
    fontSize: 11,
    color: '#90a4ae',
    marginTop: 8,
  },
  keySizeTextDark: {
    color: '#546e7a',
  },
  copyIconButton: {
    padding: 4,
  },
  copyIcon: {
    fontSize: 20,
  },
  showKeyButton: {
    backgroundColor: '#1565c0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  showKeyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  hideKeyButton: {
    backgroundColor: '#90a4ae',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  hideKeyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ff9800',
    flexDirection: 'row',
  },
  warningBoxDark: {
    backgroundColor: '#3a2a1a',
    borderColor: '#ffa726',
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#f57c00',
    lineHeight: 20,
  },
  warningTextDark: {
    color: '#ffcc80',
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
    textAlign: 'center',
    marginTop: 50,
  },
  errorTextDark: {
    color: '#ef5350',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalContentDark: {
    backgroundColor: '#1a2332',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 8,
  },
  modalTitleDark: {
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#546e7a',
    marginBottom: 20,
  },
  modalSubtitleDark: {
    color: '#90caf9',
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#263238',
    marginBottom: 20,
  },
  modalInputDark: {
    backgroundColor: '#0a1929',
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#e0e0e0',
  },
  modalButtonConfirm: {
    backgroundColor: '#1565c0',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextCancel: {
    color: '#263238',
    fontSize: 16,
    fontWeight: '600',
  },
});
