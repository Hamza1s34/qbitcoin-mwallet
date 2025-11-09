/**
 * Settings Screen
 * App settings and wallet management options
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import WalletStorage from '../services/WalletStorage';

export default function SettingsScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    const activeWallet = await WalletStorage.getActiveWallet();
    setWallet(activeWallet);
  };

  const handleBackupWallet = async () => {
    if (!wallet) {
      Alert.alert('Error', 'No active wallet found');
      return;
    }

    try {
      setLoading(true);

      // Create backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const fileName = `qbitcoin_wallet_backup_${timestamp}.json`;

      // Get wallet data
      const walletData = JSON.stringify(wallet, null, 2);

      // Define backup path in Downloads directory
      const downloadDir = ReactNativeBlobUtil.fs.dirs.DownloadDir;
      const backupPath = `${downloadDir}/${fileName}`;

      // Write wallet data to file
      await ReactNativeBlobUtil.fs.writeFile(backupPath, walletData, 'utf8');

      Alert.alert(
        '✅ Backup Successful',
        `Wallet backup saved to:\n${fileName}\n\nLocation: Downloads folder\n\n⚠️ Keep this file secure! It contains your encrypted wallet data.`,
        [{ text: 'OK' }]
      );

      console.log('Wallet backed up to:', backupPath);
    } catch (error) {
      console.error('Error backing up wallet:', error);
      Alert.alert('Error', `Failed to backup wallet: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPublicKey = async () => {
    if (!wallet) {
      Alert.alert('Error', 'No active wallet found');
      return;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const fileName = `qbitcoin_public_key_${timestamp}.txt`;

      const publicKeyData = `Qbitcoin Wallet Public Information
==========================================
Wallet Name: ${wallet.name}
Address: ${wallet.address}
Algorithm: ${wallet.algorithm}
Created: ${new Date(wallet.created_at * 1000).toLocaleString()}

Public Key (Base64):
${wallet.public_key}
`;

      const downloadDir = ReactNativeBlobUtil.fs.dirs.DownloadDir;
      const filePath = `${downloadDir}/${fileName}`;

      await ReactNativeBlobUtil.fs.writeFile(filePath, publicKeyData, 'utf8');

      Alert.alert(
        '✅ Export Successful',
        `Public key exported to:\n${fileName}\n\nLocation: Downloads folder`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error exporting public key:', error);
      Alert.alert('Error', `Failed to export public key: ${error}`);
    }
  };

  return (
    <ScrollView
      style={[styles.container, isDarkMode && styles.containerDark]}
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        {/* Header */}
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>
          Settings
        </Text>

        {/* Wallet Info Section */}
        {wallet && (
          <View style={[styles.section, isDarkMode && styles.sectionDark]}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
              Active Wallet
            </Text>
            <View style={[styles.infoCard, isDarkMode && styles.infoCardDark]}>
              <Text style={[styles.infoLabel, isDarkMode && styles.infoLabelDark]}>
                Name
              </Text>
              <Text style={[styles.infoValue, isDarkMode && styles.infoValueDark]}>
                {wallet.name}
              </Text>
              
              <Text style={[styles.infoLabel, isDarkMode && styles.infoLabelDark, styles.marginTop]}>
                Algorithm
              </Text>
              <Text style={[styles.infoValue, isDarkMode && styles.infoValueDark]}>
                {wallet.algorithm.toUpperCase()}
              </Text>

              <Text style={[styles.infoLabel, isDarkMode && styles.infoLabelDark, styles.marginTop]}>
                Address
              </Text>
              <Text style={[styles.infoValueSmall, isDarkMode && styles.infoValueSmallDark]}>
                {wallet.address}
              </Text>
            </View>
          </View>
        )}

        {/* Backup & Export Section */}
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
            Backup & Export
          </Text>

          <TouchableOpacity
            style={[styles.actionButton, isDarkMode && styles.actionButtonDark]}
            onPress={handleBackupWallet}
            disabled={loading}>
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionIcon}>💾</Text>
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionButtonText, isDarkMode && styles.actionButtonTextDark]}>
                  Backup Wallet
                </Text>
                <Text style={[styles.actionButtonSubtext, isDarkMode && styles.actionButtonSubtextDark]}>
                  Save encrypted wallet file to Downloads
                </Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, isDarkMode && styles.actionButtonDark]}
            onPress={handleExportPublicKey}>
            <View style={styles.actionButtonContent}>
              <Text style={styles.actionIcon}>📄</Text>
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionButtonText, isDarkMode && styles.actionButtonTextDark]}>
                  Export Public Key
                </Text>
                <Text style={[styles.actionButtonSubtext, isDarkMode && styles.actionButtonSubtextDark]}>
                  Save public key and address information
                </Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Security Notice */}
        <View style={[styles.warningBox, isDarkMode && styles.warningBoxDark]}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <View style={styles.warningTextContainer}>
            <Text style={[styles.warningTitle, isDarkMode && styles.warningTitleDark]}>
              Security Warning
            </Text>
            <Text style={[styles.warningText, isDarkMode && styles.warningTextDark]}>
              • Keep your backup files secure{'\n'}
              • Never share your wallet backup file{'\n'}
              • Store backups in multiple safe locations{'\n'}
              • Your wallet file contains encrypted private keys
            </Text>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, isDarkMode && styles.appInfoTextDark]}>
            Qbitcoin Wallet v1.0.0
          </Text>
          <Text style={[styles.appInfoText, isDarkMode && styles.appInfoTextDark]}>
            Quantum-Resistant Cryptocurrency
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
    marginBottom: 24,
  },
  titleDark: {
    color: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  sectionDark: {
    // No background change needed
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 12,
  },
  sectionTitleDark: {
    color: '#fff',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoCardDark: {
    backgroundColor: '#1a2332',
    borderColor: '#263238',
  },
  infoLabel: {
    fontSize: 12,
    color: '#546e7a',
    marginBottom: 4,
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
  infoValueSmall: {
    fontSize: 12,
    color: '#263238',
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  infoValueSmallDark: {
    color: '#fff',
  },
  marginTop: {
    marginTop: 12,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionButtonDark: {
    backgroundColor: '#1a2332',
    borderColor: '#263238',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 4,
  },
  actionButtonTextDark: {
    color: '#fff',
  },
  actionButtonSubtext: {
    fontSize: 13,
    color: '#546e7a',
  },
  actionButtonSubtextDark: {
    color: '#90caf9',
  },
  actionArrow: {
    fontSize: 24,
    color: '#90a4ae',
    marginLeft: 8,
  },
  warningBox: {
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
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
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e65100',
    marginBottom: 8,
  },
  warningTitleDark: {
    color: '#ffb74d',
  },
  warningText: {
    fontSize: 14,
    color: '#f57c00',
    lineHeight: 20,
  },
  warningTextDark: {
    color: '#ffcc80',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 24,
  },
  appInfoText: {
    fontSize: 12,
    color: '#90a4ae',
    marginBottom: 4,
  },
  appInfoTextDark: {
    color: '#546e7a',
  },
});
