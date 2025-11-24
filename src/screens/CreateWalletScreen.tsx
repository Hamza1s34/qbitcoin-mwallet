/**
 * Create Wallet Screen
 * Allows user to create a new wallet with password encryption
 * Uses Rust backend for wallet creation with AES-256-GCM encryption
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Falcon from '../FalconCrypto';
import WalletStorage, { WalletData } from '../services/WalletStorage';

type RootStackParamList = {
  Welcome: undefined;
  CreateWallet: undefined;
  ImportWallet: undefined;
  MainApp: undefined;
};

type CreateWalletScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CreateWallet'>;
};

export default function CreateWalletScreen({ navigation }: CreateWalletScreenProps) {
  const isDarkMode = useColorScheme() === 'dark';
  const [walletName, setWalletName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const createWallet = async () => {
    // Validation
    if (!walletName.trim()) {
      Alert.alert('Error', 'Please enter a wallet name');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);

      // Check if wallet name already exists
      const existingWallets = await WalletStorage.getAllWallets();
      const nameExists = existingWallets.some(
        w => w.name.toLowerCase() === walletName.trim().toLowerCase()
      );

      if (nameExists) {
        Alert.alert('Error', 'A wallet with this name already exists. Please choose a different name.');
        setLoading(false);
        return;
      }

      // Create wallet using Rust backend (Falcon-512 + AES-256-GCM)
      console.log('🔑 Creating wallet with Rust backend...');
      const walletData = await Falcon.createWallet(walletName.trim(), password);

      // Save wallet to storage
      await WalletStorage.saveWallet(walletData);

      // Set as active wallet
      await WalletStorage.setActiveWallet(walletData.address);

      Alert.alert(
        '✅ Wallet Created!',
        `Your Qbitcoin wallet has been created successfully!\n\nAddress: ${walletData.address.substring(0, 20)}...`,
        [
          {
            text: 'OK',
            onPress: () => navigation.replace('MainApp'),
          },
        ]
      );
    } catch (error) {
      console.error('❌ Error creating wallet:', error);
      Alert.alert('Error', `Failed to create wallet: ${error}`);
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
          Create New Wallet
        </Text>
        <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
          Secure your wallet with a strong password
        </Text>

        {/* Wallet Name */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            Wallet Name
          </Text>
          <TextInput
            style={[styles.input, isDarkMode && styles.inputDark]}
            placeholder="My Qbitcoin Wallet"
            placeholderTextColor={isDarkMode ? '#546e7a' : '#90a4ae'}
            value={walletName}
            onChangeText={setWalletName}
            editable={!loading}
          />
        </View>

        {/* Security Info */}
        <View style={[styles.securityInfo, isDarkMode && styles.securityInfoDark]}>
          <Text style={styles.securityIcon}>🛡️</Text>
          <View style={styles.securityTextContainer}>
            <Text style={[styles.securityTitle, isDarkMode && styles.securityTitleDark]}>
              Falcon-512 Security
            </Text>
            <Text style={[styles.securityDescription, isDarkMode && styles.securityDescriptionDark]}>
              Your wallet will be protected with quantum-resistant Falcon-512 cryptography
            </Text>
          </View>
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            Password
          </Text>
          <TextInput
            style={[styles.input, isDarkMode && styles.inputDark]}
            placeholder="Enter password (min 8 characters)"
            placeholderTextColor={isDarkMode ? '#546e7a' : '#90a4ae'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
          />
        </View>

        {/* Confirm Password */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            Confirm Password
          </Text>
          <TextInput
            style={[styles.input, isDarkMode && styles.inputDark]}
            placeholder="Re-enter password"
            placeholderTextColor={isDarkMode ? '#546e7a' : '#90a4ae'}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            editable={!loading}
          />
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={createWallet}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create Wallet</Text>
          )}
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={loading}>
          <Text style={[styles.backButtonText, isDarkMode && styles.backButtonTextDark]}>
            Back to Welcome
          </Text>
        </TouchableOpacity>
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
  securityInfo: {
    flexDirection: 'row',
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  securityInfoDark: {
    backgroundColor: '#1e3a2a',
    borderColor: '#4ade80',
  },
  securityIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  securityTextContainer: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 4,
  },
  securityTitleDark: {
    color: '#4ade80',
  },
  securityDescription: {
    fontSize: 14,
    color: '#388e3c',
    lineHeight: 20,
  },
  securityDescriptionDark: {
    color: '#86efac',
  },
  createButton: {
    backgroundColor: '#1565c0',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  backButtonText: {
    color: '#1565c0',
    fontSize: 16,
  },
  backButtonTextDark: {
    color: '#90caf9',
  },
});
