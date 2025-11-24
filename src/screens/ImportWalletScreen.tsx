/**
 * Import Wallet Screen
 * Import existing wallet from JSON file with password authentication
 * Uses Rust backend to verify wallet can be decrypted
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  useColorScheme,
  TextInput,
  Platform,
} from 'react-native';
import WalletStorage from '../services/WalletStorage';
import Falcon from '../FalconCrypto';
import RNFS from 'react-native-fs';
import { pick, types } from '@react-native-documents/picker';

export default function ImportWalletScreen({ navigation }: any) {
  const isDarkMode = useColorScheme() === 'dark';
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [walletData, setWalletData] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectWalletFile = async () => {
    try {
      console.log('Opening document picker...');

      // Pick a document using the new document picker
      const result = await pick({
        type: [types.allFiles],
      });

      console.log('Document picker result:', result);

      if (!result || result.length === 0) {
        console.log('No file selected');
        return;
      }

      const file = result[0];
      console.log('Selected file:', file);

      // Get the file URI
      const fileUri = file.uri;
      const fileName = file.name || 'wallet.json';
      const fileSize = file.size || 0;

      console.log('File URI:', fileUri);
      console.log('File name:', fileName);

      setSelectedFile({
        name: fileName,
        uri: fileUri,
        size: fileSize,
      });

      try {
        console.log('Reading file content from:', fileUri);

        // Read file content using RNFS which properly handles content:// URIs on Android
        const text = await RNFS.readFile(fileUri, 'utf8');

        console.log('File read successfully, length:', text.length);

        try {
          const data = JSON.parse(text);
          console.log('JSON parsed successfully');

          // Validate wallet structure
          if (!data.address || !data.private_key_encrypted || !data.algorithm) {
            console.log('Invalid wallet structure');
            Alert.alert('Error', 'Invalid wallet file format. Missing required fields.');
            return;
          }

          console.log('Wallet validated:', data.name, data.address);
          setWalletData(data);
          Alert.alert('Success', 'Wallet file loaded successfully. Ready to import.');
        } catch (error) {
          console.error('JSON parse error:', error);
          Alert.alert('Error', 'Failed to parse wallet file. Please ensure it is a valid JSON file.');
        }
      } catch (readError: any) {
        console.error('File read error:', readError);
        Alert.alert('Error', 'Failed to read file: ' + (readError.message || 'Unknown error'));
      }
    } catch (err: any) {
      // Handle user cancellation gracefully
      if (err && err.message && err.message.includes('cancel')) {
        console.log('User cancelled document picker');
        return;
      }

      console.error('Document picker error:', err);
      Alert.alert('Error', 'Failed to open file picker: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleImportWallet = async () => {
    if (!walletData) {
      Alert.alert('Error', 'Please select a wallet file first');
      return;
    }

    // The wallet is encrypted, so we ALWAYS need the password to verify it can be decrypted
    // Show password input to get the decryption password
    setShowPasswordInput(true);
  };

  const proceedWithImport = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter the password used to encrypt this wallet');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // Verify password can decrypt the wallet using Rust backend
      console.log('Verifying wallet password with Rust backend...');
      const walletJson = JSON.stringify(walletData);
      const verifyResult = await Falcon.verifyWalletPassword(walletJson, password);

      if (!verifyResult.valid) {
        Alert.alert('Error', 'Incorrect password. Cannot decrypt wallet.');
        setPassword('');
        setLoading(false);
        return;
      }

      console.log('✅ Password verified successfully');

      // Check if wallet name already exists
      const existingWallets = await WalletStorage.getAllWallets();
      const nameExists = existingWallets.some(
        w => w.name.toLowerCase() === walletData.name.toLowerCase()
      );

      if (nameExists) {
        Alert.alert(
          'Wallet Already Exists',
          `A wallet named "${walletData.name}" already exists. Import anyway with a new name?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
            {
              text: 'Import with New Name',
              onPress: async () => {
                const newName = `${walletData.name}_imported_${Date.now()}`;
                const modifiedWallet = {
                  ...walletData,
                  name: newName
                };
                await saveWallet(modifiedWallet);
              },
            },
          ]
        );
        return;
      }

      // Save the original wallet data (already encrypted)
      await saveWallet(walletData);
    } catch (error) {
      console.error('Error importing wallet:', error);
      Alert.alert('Error', `Failed to import wallet: ${error}`);
      setLoading(false);
    }
  };

  const saveWallet = async (wallet: any) => {
    try {
      // Save wallet
      await WalletStorage.saveWallet(wallet);

      // Check if this is the first wallet (no active wallet set)
      const activeWallet = await WalletStorage.getActiveWallet();
      const allWallets = await WalletStorage.getAllWallets();

      // If this is the first wallet or no active wallet, set it as active
      if (!activeWallet || allWallets.length === 1) {
        await WalletStorage.setActiveWallet(wallet.address);

        Alert.alert(
          '✅ Success',
          `Wallet "${wallet.name}" imported successfully! This is now your active wallet.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset state
                setWalletData(null);
                setSelectedFile(null);
                setPassword('');
                setShowPasswordInput(false);
                setLoading(false);

                // Navigate to MainApp (replace the entire navigation stack)
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainApp' }],
                });
              },
            },
          ]
        );
      } else {
        // Automatically switch to imported wallet
        await WalletStorage.setActiveWallet(wallet.address);

        Alert.alert(
          '✅ Success',
          `Wallet "${wallet.name}" imported successfully! Switched to this wallet.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset state and go back to previous screen (Dashboard)
                setWalletData(null);
                setSelectedFile(null);
                setPassword('');
                setShowPasswordInput(false);
                setLoading(false);
                navigation.goBack();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error saving wallet:', error);
      Alert.alert('Error', 'Failed to save wallet');
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, isDarkMode && styles.containerDark]}
      contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>
          Import Wallet
        </Text>
        <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
          Import your Qbitcoin wallet from a JSON file
        </Text>
      </View>

      {/* File Selection Card */}
      <View style={[styles.fileCard, isDarkMode && styles.fileCardDark]}>
        <Text style={[styles.fileCardTitle, isDarkMode && styles.fileCardTitleDark]}>
          📁 Wallet File
        </Text>

        {selectedFile ? (
          <View style={styles.fileInfo}>
            <Text style={[styles.fileName, isDarkMode && styles.fileNameDark]}>
              ✓ {selectedFile.name}
            </Text>
            <Text style={[styles.fileSize, isDarkMode && styles.fileSizeDark]}>
              {(selectedFile.size / 1024).toFixed(2)} KB
            </Text>
          </View>
        ) : (
          <Text style={[styles.noFileText, isDarkMode && styles.noFileTextDark]}>
            No file selected
          </Text>
        )}

        <TouchableOpacity
          style={[styles.selectButton, isDarkMode && styles.selectButtonDark]}
          onPress={selectWalletFile}>
          <Text style={[styles.selectButtonText, isDarkMode && styles.selectButtonTextDark]}>
            {selectedFile ? '📄 Change File' : '📂 Select Wallet File'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Wallet Info Display */}
      {walletData && (
        <View style={[styles.infoCard, isDarkMode && styles.infoCardDark]}>
          <Text style={[styles.infoCardTitle, isDarkMode && styles.infoCardTitleDark]}>
            Wallet Information
          </Text>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, isDarkMode && styles.infoLabelDark]}>Name:</Text>
            <Text style={[styles.infoValue, isDarkMode && styles.infoValueDark]}>
              {walletData.name}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, isDarkMode && styles.infoLabelDark]}>Address:</Text>
            <Text style={[styles.infoValue, isDarkMode && styles.infoValueDark]} numberOfLines={1}>
              {walletData.address}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, isDarkMode && styles.infoLabelDark]}>Algorithm:</Text>
            <Text style={[styles.infoValue, isDarkMode && styles.infoValueDark]}>
              {walletData.algorithm}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, isDarkMode && styles.infoLabelDark]}>Encrypted:</Text>
            <Text style={[styles.infoValue, isDarkMode && styles.infoValueDark]}>
              {walletData.encrypted ? '🔒 Yes (AES)' : '❌ No'}
            </Text>
          </View>
        </View>
      )}

      {/* Warning Box */}
      {walletData && !showPasswordInput && (
        <View style={[styles.warningBox, isDarkMode && styles.warningBoxDark]}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={[styles.warningText, isDarkMode && styles.warningTextDark]}>
            This wallet is encrypted. You will need to enter the password that was used to encrypt it. Click "Next: Enter Password" to continue.
          </Text>
        </View>
      )}

      {/* Password Input (shown only if wallet doesn't have password) */}
      {showPasswordInput && (
        <View style={[styles.passwordCard, isDarkMode && styles.passwordCardDark]}>
          <Text style={[styles.passwordCardTitle, isDarkMode && styles.passwordCardTitleDark]}>
            🔐 Wallet Password Required
          </Text>
          <Text style={[styles.passwordCardSubtitle, isDarkMode && styles.passwordCardSubtitleDark]}>
            Enter the password that was used to encrypt this wallet
          </Text>
          <TextInput
            style={[styles.passwordInput, isDarkMode && styles.passwordInputDark]}
            placeholder="Enter wallet password (min 8 characters)"
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />
        </View>
      )}

      {/* Import Button */}
      <TouchableOpacity
        style={[
          styles.importButton,
          (!walletData || loading) && styles.importButtonDisabled
        ]}
        onPress={showPasswordInput ? proceedWithImport : handleImportWallet}
        disabled={!walletData || loading}>
        <Text style={styles.importButtonText}>
          {loading ? 'Importing...' : showPasswordInput ? '✅ Confirm & Import' : '🔑 Next: Enter Password'}
        </Text>
      </TouchableOpacity>

      {/* Back Button */}
      <TouchableOpacity
        style={[styles.backButton, isDarkMode && styles.backButtonDark]}
        onPress={() => navigation.goBack()}>
        <Text style={[styles.backButtonText, isDarkMode && styles.backButtonTextDark]}>
          Cancel
        </Text>
      </TouchableOpacity>

      {/* Instructions */}
      <View style={[styles.instructionsBox, isDarkMode && styles.instructionsBoxDark]}>
        <Text style={[styles.instructionsTitle, isDarkMode && styles.instructionsTitleDark]}>
          📖 How to Import
        </Text>
        <Text style={[styles.instructionsText, isDarkMode && styles.instructionsTextDark]}>
          1. Tap "Select Wallet File" and choose your wallet JSON file{'\n'}
          2. Review the wallet information displayed{'\n'}
          3. Tap "Import Wallet" to add it to your app{'\n'}
          4. Enter your password when prompted to access the wallet
        </Text>
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
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
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
    textAlign: 'center',
  },
  subtitleDark: {
    color: '#90caf9',
  },
  fileCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  fileCardDark: {
    backgroundColor: '#1a2332',
    borderColor: '#263238',
  },
  fileCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 15,
  },
  fileCardTitleDark: {
    color: '#fff',
  },
  fileInfo: {
    marginBottom: 15,
  },
  fileName: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 5,
  },
  fileNameDark: {
    color: '#81C784',
  },
  fileSize: {
    fontSize: 12,
    color: '#546e7a',
  },
  fileSizeDark: {
    color: '#90caf9',
  },
  noFileText: {
    fontSize: 14,
    color: '#90a4ae',
    fontStyle: 'italic',
    marginBottom: 15,
  },
  noFileTextDark: {
    color: '#546e7a',
  },
  selectButton: {
    backgroundColor: '#1565c0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  selectButtonDark: {
    backgroundColor: '#1976D2',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectButtonTextDark: {
    color: '#fff',
  },
  infoCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1565c0',
  },
  infoCardDark: {
    backgroundColor: '#1a2530',
    borderColor: '#1976D2',
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565c0',
    marginBottom: 15,
  },
  infoCardTitleDark: {
    color: '#64B5F6',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#546e7a',
    width: 100,
  },
  infoLabelDark: {
    color: '#90caf9',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#263238',
  },
  infoValueDark: {
    color: '#fff',
  },
  warningBox: {
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ffb74d',
  },
  warningBoxDark: {
    backgroundColor: '#3a2f1a',
    borderColor: '#ff9800',
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
  passwordCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  passwordCardDark: {
    backgroundColor: '#1a2e1a',
    borderColor: '#66BB6A',
  },
  passwordCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 5,
  },
  passwordCardTitleDark: {
    color: '#81C784',
  },
  passwordCardSubtitle: {
    fontSize: 13,
    color: '#558b2f',
    marginBottom: 15,
  },
  passwordCardSubtitleDark: {
    color: '#A5D6A7',
  },
  passwordInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#263238',
  },
  passwordInputDark: {
    backgroundColor: '#0d1a0d',
    borderColor: '#66BB6A',
    color: '#fff',
  },
  importButton: {
    backgroundColor: '#1565c0',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  importButtonDisabled: {
    opacity: 0.6,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    backgroundColor: 'transparent',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1565c0',
    marginBottom: 20,
  },
  backButtonDark: {
    borderColor: '#90caf9',
  },
  backButtonText: {
    color: '#1565c0',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonTextDark: {
    color: '#90caf9',
  },
  instructionsBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
  },
  instructionsBoxDark: {
    backgroundColor: '#1a2332',
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 10,
  },
  instructionsTitleDark: {
    color: '#fff',
  },
  instructionsText: {
    fontSize: 12,
    color: '#546e7a',
    lineHeight: 18,
  },
  instructionsTextDark: {
    color: '#90caf9',
  },
});
