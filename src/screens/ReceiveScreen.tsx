/**
 * Receive Screen
 * Display wallet address and QR code to receive Qbitcoin
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import WalletStorage from '../services/WalletStorage';
import ReactNativeBlobUtil from 'react-native-blob-util';

export default function ReceiveScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const [address, setAddress] = useState('');
  const [walletName, setWalletName] = useState('');
  const [loading, setLoading] = useState(true);
  const qrCodeRef = useRef<any>(null);

  useEffect(() => {
    loadWalletAddress();
  }, []);

  const loadWalletAddress = async () => {
    try {
      const wallet = await WalletStorage.getActiveWallet();
      if (wallet) {
        setAddress(wallet.address || 'Q0000000000000000000000000000000000000000000000000');
        setWalletName(wallet.name || 'My Wallet');
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
      setAddress('Q0000000000000000000000000000000000000000000000000');
      setWalletName('My Wallet');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = async () => {
    Clipboard.setString(address);
    Alert.alert('✅ Copied!', 'Address copied to clipboard');
  };

  const shareAddress = async () => {
    try {
      if (!qrCodeRef.current) {
        // Fallback to text-only share if QR code is not available
        await Share.share({
          message: `Send Qbitcoin to my wallet:\n${address}`,
          title: 'My Qbitcoin Address',
        });
        return;
      }

      // Get QR code as base64 data URL
      qrCodeRef.current.toDataURL(async (data: string) => {
        try {
          // Create temporary file path
          const filePath = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/qr_code_${Date.now()}.png`;
          
          // Write base64 data to file
          await ReactNativeBlobUtil.fs.writeFile(filePath, data, 'base64');
          
          // Share the image with the address
          await Share.share({
            message: `Send Qbitcoin to my wallet:\n${address}`,
            url: `file://${filePath}`,
            title: 'My Qbitcoin Address',
          });
          
          // Clean up the temporary file after a delay
          setTimeout(async () => {
            try {
              await ReactNativeBlobUtil.fs.unlink(filePath);
            } catch (err) {
              console.log('Error cleaning up temp file:', err);
            }
          }, 5000);
        } catch (error) {
          console.error('Error sharing QR code:', error);
          // Fallback to text-only share
          await Share.share({
            message: `Send Qbitcoin to my wallet:\n${address}`,
            title: 'My Qbitcoin Address',
          });
        }
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <ScrollView
      style={[styles.container, isDarkMode && styles.containerDark]}
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        {/* Header */}
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>
          Receive Qbitcoin
        </Text>
        <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
          Share this address to receive QRL
        </Text>

        {/* Wallet Name */}
        <View style={[styles.walletCard, isDarkMode && styles.walletCardDark]}>
          <Text style={[styles.walletLabel, isDarkMode && styles.walletLabelDark]}>
            Wallet
          </Text>
          <Text style={[styles.walletName, isDarkMode && styles.walletNameDark]}>
            {walletName}
          </Text>
        </View>

        {/* QR Code */}
        <View style={[styles.qrContainer, isDarkMode && styles.qrContainerDark]}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, isDarkMode && styles.loadingTextDark]}>
                Loading QR Code...
              </Text>
            </View>
          ) : address ? (
            <>
              <View style={styles.qrCodeWrapper}>
                <QRCode
                  value={address}
                  size={220}
                  backgroundColor={isDarkMode ? '#1a2332' : '#ffffff'}
                  color={isDarkMode ? '#ffffff' : '#000000'}
                  getRef={(ref) => (qrCodeRef.current = ref)}
                />
              </View>
              <Text style={[styles.qrLabel, isDarkMode && styles.qrLabelDark]}>
                Scan QR Code
              </Text>
            </>
          ) : (
            <Text style={[styles.errorText, isDarkMode && styles.errorTextDark]}>
              No wallet address available
            </Text>
          )}
        </View>

        {/* Address Display */}
        <View style={[styles.addressCard, isDarkMode && styles.addressCardDark]}>
          <Text style={[styles.addressLabel, isDarkMode && styles.addressLabelDark]}>
            Your Address
          </Text>
          <Text style={[styles.addressText, isDarkMode && styles.addressTextDark]}>
            {address}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.actionButton, styles.copyButton]}
            onPress={copyAddress}>
            <Text style={styles.buttonIcon}>📋</Text>
            <Text style={styles.buttonText}>Copy Address</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton, isDarkMode && styles.shareButtonDark]}
            onPress={shareAddress}>
            <Text style={styles.buttonIcon}>📤</Text>
            <Text style={[styles.buttonTextSecondary, isDarkMode && styles.buttonTextSecondaryDark]}>
              Share
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info Box */}
        <View style={[styles.infoBox, isDarkMode && styles.infoBoxDark]}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, isDarkMode && styles.infoTitleDark]}>
              How to Receive
            </Text>
            <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
              • Share your address or QR code with the sender{'\n'}
              • Wait for transaction confirmation{'\n'}
              • Funds will appear in your balance{'\n'}
              • All transactions are quantum-resistant
            </Text>
          </View>
        </View>

        {/* Security Notice */}
        <View style={[styles.securityBox, isDarkMode && styles.securityBoxDark]}>
          <Text style={styles.securityIcon}>🛡️</Text>
          <Text style={[styles.securityText, isDarkMode && styles.securityTextDark]}>
            This address is protected by post-quantum Falcon cryptography
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
    marginBottom: 24,
    textAlign: 'center',
  },
  subtitleDark: {
    color: '#90caf9',
  },
  walletCard: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  walletCardDark: {
    backgroundColor: '#1a2f47',
  },
  walletLabel: {
    fontSize: 14,
    color: '#1565c0',
    marginBottom: 4,
  },
  walletLabelDark: {
    color: '#90caf9',
  },
  walletName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1565c0',
  },
  walletNameDark: {
    color: '#fff',
  },
  qrContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  qrContainerDark: {
    backgroundColor: '#1a2332',
  },
  qrCodeWrapper: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#546e7a',
  },
  loadingTextDark: {
    color: '#90caf9',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    padding: 40,
  },
  errorTextDark: {
    color: '#ef5350',
  },
  qrLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    marginTop: 16,
  },
  qrLabelDark: {
    color: '#fff',
  },
  addressCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#cfd8dc',
  },
  addressCardDark: {
    backgroundColor: '#1a2332',
    borderColor: '#263238',
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#546e7a',
    marginBottom: 8,
  },
  addressLabelDark: {
    color: '#90caf9',
  },
  addressText: {
    fontSize: 14,
    color: '#263238',
    fontFamily: 'monospace',
    lineHeight: 22,
  },
  addressTextDark: {
    color: '#fff',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  copyButton: {
    backgroundColor: '#1565c0',
  },
  shareButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#1565c0',
  },
  shareButtonDark: {
    borderColor: '#90caf9',
  },
  buttonIcon: {
    fontSize: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#1565c0',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondaryDark: {
    color: '#90caf9',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    marginBottom: 16,
    width: '100%',
  },
  infoBoxDark: {
    backgroundColor: '#1a2f47',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565c0',
    marginBottom: 8,
  },
  infoTitleDark: {
    color: '#90caf9',
  },
  infoText: {
    fontSize: 14,
    color: '#263238',
    lineHeight: 20,
  },
  infoTextDark: {
    color: '#fff',
  },
  securityBox: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  securityBoxDark: {
    backgroundColor: '#1e3a2a',
  },
  securityIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '500',
  },
  securityTextDark: {
    color: '#4ade80',
  },
});
