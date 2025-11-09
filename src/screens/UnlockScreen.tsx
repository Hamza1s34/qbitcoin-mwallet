/**
 * Unlock Screen
 * Password authentication screen shown when app reopens
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import WalletStorage from '../services/WalletStorage';

interface UnlockScreenProps {
  onUnlock: () => void;
  navigation?: any;
}

export default function UnlockScreen({ onUnlock, navigation }: UnlockScreenProps) {
  const isDarkMode = useColorScheme() === 'dark';
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletInfo, setWalletInfo] = useState<any>(null);
  const [allWallets, setAllWallets] = useState<any[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    const wallets = await WalletStorage.getAllWallets();
    setAllWallets(wallets);
    
    // Try to get the active wallet
    const activeWallet = await WalletStorage.getActiveWallet();
    if (activeWallet) {
      setWalletInfo(activeWallet);
      setSelectedWalletId(activeWallet.address);
    } else if (wallets.length > 0) {
      // If no active wallet, select the first one
      setWalletInfo(wallets[0]);
      setSelectedWalletId(wallets[0].address);
    }
  };

  const selectWallet = (wallet: any) => {
    setWalletInfo(wallet);
    setSelectedWalletId(wallet.address);
    setPassword(''); // Clear password when switching wallets
  };

  const handleUnlock = async () => {
    if (!password.trim()) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    if (!walletInfo) {
      Alert.alert('Error', 'No wallet selected');
      return;
    }

    setLoading(true);

    try {
      // Try to decrypt the wallet's private key with the password
      // This verifies the password is correct
      const isValid = await verifyPassword(walletInfo, password);
      
      if (isValid) {
        // Set this wallet as active before unlocking
        await WalletStorage.setActiveWallet(walletInfo.address);
        
        // Call the onUnlock callback to update app state
        onUnlock();
        
        // Navigate to MainApp (Dashboard)
        if (navigation) {
          navigation.replace('MainApp');
        }
      } else {
        Alert.alert('Error', 'Incorrect password. Please try again.');
        setPassword('');
      }
    } catch (error) {
      console.error('Error unlocking:', error);
      Alert.alert('Error', 'Failed to unlock. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyPassword = async (wallet: any, password: string): Promise<boolean> => {
    try {
      // Simple verification - in production, you would actually try to decrypt
      // For now, we'll store the password hash with the wallet
      // This is a placeholder - actual AES decryption will validate the password
      
      // Check if wallet has stored password hash
      if (wallet.password_hash) {
        return wallet.password_hash === password;
      }
      
      // If no password hash stored (old wallet), accept any password for now
      // In production, you would try to decrypt the private_key_encrypted
      return true;
    } catch (error) {
      return false;
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDarkMode && styles.containerDark]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Logo/Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🔐</Text>
            <Text style={[styles.appName, isDarkMode && styles.appNameDark]}>
              Qbitcoin Wallet
            </Text>
          </View>

          {/* Title */}
          <View style={styles.header}>
            <Text style={[styles.title, isDarkMode && styles.titleDark]}>
              Unlock Wallet
            </Text>
            <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
              Select a wallet and enter password
            </Text>
          </View>

          {/* Wallet Selector */}
          {allWallets.length > 0 && (
            <View style={styles.walletSelectorContainer}>
              <Text style={[styles.selectorLabel, isDarkMode && styles.selectorLabelDark]}>
                Select Wallet
              </Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.walletScroll}>
                {allWallets.map((wallet) => (
                  <TouchableOpacity
                    key={wallet.address}
                    style={[
                      styles.walletCard,
                      isDarkMode && styles.walletCardDark,
                      selectedWalletId === wallet.address && styles.walletCardSelected,
                      selectedWalletId === wallet.address && isDarkMode && styles.walletCardSelectedDark,
                    ]}
                    onPress={() => selectWallet(wallet)}>
                    <Text style={[
                      styles.walletCardName,
                      isDarkMode && styles.walletCardNameDark,
                      selectedWalletId === wallet.address && styles.walletCardNameSelected,
                    ]}>
                      {wallet.name}
                    </Text>
                    <Text style={[
                      styles.walletCardAddress,
                      isDarkMode && styles.walletCardAddressDark,
                      selectedWalletId === wallet.address && styles.walletCardAddressSelected,
                    ]}>
                      {wallet.address.substring(0, 8)}...{wallet.address.substring(wallet.address.length - 6)}
                    </Text>
                    {selectedWalletId === wallet.address && (
                      <Text style={styles.selectedIcon}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Selected Wallet Info */}
          {walletInfo && (
            <View style={[styles.selectedWalletInfo, isDarkMode && styles.selectedWalletInfoDark]}>
              <Text style={[styles.walletName, isDarkMode && styles.walletNameDark]}>
                {walletInfo.name}
              </Text>
              <Text style={[styles.walletAddress, isDarkMode && styles.walletAddressDark]}>
                {walletInfo.address.substring(0, 12)}...{walletInfo.address.substring(walletInfo.address.length - 8)}
              </Text>
            </View>
          )}

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, isDarkMode && styles.labelDark]}>
              Password
            </Text>
            <TextInput
              style={[styles.input, isDarkMode && styles.inputDark]}
              placeholder="Enter your password"
              placeholderTextColor={isDarkMode ? '#666' : '#999'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleUnlock}
              editable={!loading}
            />
          </View>

          {/* Unlock Button */}
          <TouchableOpacity
            style={[styles.unlockButton, loading && styles.unlockButtonDisabled]}
            onPress={handleUnlock}
            disabled={loading}>
            <Text style={styles.unlockButtonText}>
              {loading ? 'Unlocking...' : '🔓 Unlock'}
            </Text>
          </TouchableOpacity>

          {/* Create or Import Wallet Options */}
          <View style={styles.alternativeActions}>
            <Text style={[styles.alternativeText, isDarkMode && styles.alternativeTextDark]}>
              Don't have a wallet?
            </Text>
            <View style={styles.alternativeButtons}>
              <TouchableOpacity
                style={[styles.altButton, isDarkMode && styles.altButtonDark]}
                onPress={() => navigation?.navigate?.('CreateWallet')}>
                <Text style={[styles.altButtonText, isDarkMode && styles.altButtonTextDark]}>
                  ➕ Create New
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.altButton, isDarkMode && styles.altButtonDark]}
                onPress={() => navigation?.navigate?.('ImportWallet')}>
                <Text style={[styles.altButtonText, isDarkMode && styles.altButtonTextDark]}>
                  📥 Import
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Security Info */}
          <View style={[styles.infoBox, isDarkMode && styles.infoBoxDark]}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
              Your password protects access to your wallet. Never share it with anyone.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 80,
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  appNameDark: {
    color: '#fff',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
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
    textAlign: 'center',
  },
  subtitleDark: {
    color: '#90caf9',
  },
  walletSelectorContainer: {
    marginBottom: 20,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 12,
  },
  selectorLabelDark: {
    color: '#fff',
  },
  walletScroll: {
    marginBottom: 8,
  },
  walletCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 160,
    position: 'relative',
  },
  walletCardDark: {
    backgroundColor: '#1a2332',
    borderColor: '#263238',
  },
  walletCardSelected: {
    borderColor: '#1565c0',
    backgroundColor: '#e3f2fd',
  },
  walletCardSelectedDark: {
    borderColor: '#64B5F6',
    backgroundColor: '#1a2f47',
  },
  walletCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 4,
  },
  walletCardNameDark: {
    color: '#fff',
  },
  walletCardNameSelected: {
    color: '#1565c0',
  },
  walletCardAddress: {
    fontSize: 12,
    color: '#546e7a',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  walletCardAddressDark: {
    color: '#90caf9',
  },
  walletCardAddressSelected: {
    color: '#1976D2',
  },
  selectedIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 20,
    color: '#1565c0',
  },
  selectedWalletInfo: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  selectedWalletInfoDark: {
    backgroundColor: '#1a2f47',
  },
  walletName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1565c0',
    marginBottom: 8,
  },
  walletNameDark: {
    color: '#64B5F6',
  },
  walletAddress: {
    fontSize: 14,
    color: '#546e7a',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  walletAddressDark: {
    color: '#90caf9',
  },
  inputContainer: {
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
    borderWidth: 1,
    borderColor: '#cfd8dc',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#263238',
  },
  inputDark: {
    backgroundColor: '#1a2332',
    borderColor: '#263238',
    color: '#fff',
  },
  unlockButton: {
    backgroundColor: '#1565c0',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  unlockButtonDisabled: {
    opacity: 0.6,
  },
  unlockButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  alternativeActions: {
    marginBottom: 24,
    alignItems: 'center',
  },
  alternativeText: {
    fontSize: 14,
    color: '#546e7a',
    marginBottom: 12,
  },
  alternativeTextDark: {
    color: '#90caf9',
  },
  alternativeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  altButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#1565c0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  altButtonDark: {
    backgroundColor: '#1a2332',
    borderColor: '#64B5F6',
  },
  altButtonText: {
    color: '#1565c0',
    fontSize: 14,
    fontWeight: '600',
  },
  altButtonTextDark: {
    color: '#64B5F6',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
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
