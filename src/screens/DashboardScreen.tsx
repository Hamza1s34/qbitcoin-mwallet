/**
 * Dashboard Screen
 * Main wallet screen showing balance and recent transactions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Buffer } from 'buffer';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import ReactNativeBlobUtil from 'react-native-blob-util';
import QbitcoinAPI from '../services/QbitcoinAPI';
import WalletStorage from '../services/WalletStorage';

type RootStackParamList = {
  Welcome: undefined;
  CreateWallet: undefined;
  ImportWallet: undefined;
  MainApp: undefined;
};

type NavigationProp = BottomTabNavigationProp<TabParamList, 'Dashboard'> & {
  navigate(screen: keyof RootStackParamList): void;
};

type TabParamList = {
  Dashboard: undefined;
  Send: undefined;
  Receive: undefined;
  Transactions: undefined;
};

type DashboardScreenProps = {
  navigation: NavigationProp;
};

export default function DashboardScreen({ navigation }: DashboardScreenProps) {
  const isDarkMode = useColorScheme() === 'dark';
  const [balance, setBalance] = useState('0');
  const [address, setAddress] = useState('');
  const [walletName, setWalletName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [walletSwitcherVisible, setWalletSwitcherVisible] = useState(false);
  const [customNode, setCustomNode] = useState('http://207.154.252.226:18090');
  const [nodeStats, setNodeStats] = useState<any>(null);
  const [wallets, setWallets] = useState<any[]>([]);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const wallet = await WalletStorage.getActiveWallet();
      if (wallet) {
        setAddress(wallet.address);
        setWalletName(wallet.name);
        setLoading(false); // Show UI immediately after loading wallet
        
        // Fetch balance and transactions in parallel (non-blocking)
        Promise.all([
          fetchBalance(wallet.address),
          fetchTransactions(wallet.address)
        ]).catch(err => {
          console.error('Error fetching data:', err);
        });
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  const loadWallets = async () => {
    const allWallets = await WalletStorage.getAllWallets();
    setWallets(allWallets);
  };

  const switchWallet = async (walletAddress: string) => {
    await WalletStorage.setActiveWallet(walletAddress);
    setWalletSwitcherVisible(false);
    setMenuVisible(false);
    loadWalletData();
  };

  const deleteWallet = async (walletName: string) => {
    Alert.alert(
      'Delete Wallet',
      `Are you sure you want to delete "${walletName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Find the wallet by name to get its address
              const allWallets = await WalletStorage.getAllWallets();
              const walletToDelete = allWallets.find(w => w.name === walletName);
              
              if (!walletToDelete) {
                Alert.alert('Error', 'Wallet not found');
                return;
              }
              
              await WalletStorage.deleteWallet(walletToDelete.address);
              const remaining = await WalletStorage.getAllWallets();
              
              if (remaining.length === 0) {
                // No wallets left, go to welcome screen
                navigation.navigate('Welcome');
              } else if (walletToDelete.address === address) {
                // Deleted active wallet, reload to switch to new active wallet
                loadWalletData();
                loadWallets();
              } else {
                // Just refresh the wallet list
                loadWallets();
              }
              
              Alert.alert('Success', 'Wallet deleted successfully');
            } catch (error) {
              console.error('Error deleting wallet:', error);
              Alert.alert('Error', 'Failed to delete wallet');
            }
          },
        },
      ]
    );
  };

  const fetchNodeStats = async () => {
    try {
      const result = await QbitcoinAPI.getNodeState();
      console.log('Node state result:', result);
      
      if (result && result.info) {
        const stats = {
          height: result.info.blockHeight || '0',
          connected: result.info.state === 'SYNCED',
          peers: result.info.numConnections || 0,
          version: result.info.version || 'Unknown'
        };
        setNodeStats(stats);
      }
    } catch (error) {
      console.error('Error fetching node stats:', error);
    }
  };

    const handleBackupWallet = async () => {
    try {
      setLoading(true);

      // Get the active wallet first
      const activeWallet = await WalletStorage.getActiveWallet();
      
      if (!activeWallet) {
        Alert.alert('Error', 'No active wallet found');
        setLoading(false);
        return;
      }

      // Create backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const fileName = `qbitcoin_wallet_backup_${timestamp}.json`;

      // Get wallet data
      const walletData = JSON.stringify(activeWallet, null, 2);

      // Save to Downloads directory (same approach as exportPublicKey)
      const downloadDir = ReactNativeBlobUtil.fs.dirs.DownloadDir;
      const filePath = `${downloadDir}/${fileName}`;

      // Log all available directory paths for debugging
      console.log('=== Backup File Path Information ===');
      console.log('Platform:', Platform.OS);
      console.log('Download directory path:', downloadDir);
      console.log('Full file path:', filePath);
      console.log('All available dirs:', {
        DownloadDir: ReactNativeBlobUtil.fs.dirs.DownloadDir,
        DocumentDir: ReactNativeBlobUtil.fs.dirs.DocumentDir,
        MainBundleDir: ReactNativeBlobUtil.fs.dirs.MainBundleDir,
        CacheDir: ReactNativeBlobUtil.fs.dirs.CacheDir,
      });

      // Write wallet data to file
      await ReactNativeBlobUtil.fs.writeFile(filePath, walletData, 'utf8');

      // Verify file was created
      const fileExists = await ReactNativeBlobUtil.fs.exists(filePath);
      console.log('File exists after write:', fileExists);
      
      if (fileExists) {
        const fileStats = await ReactNativeBlobUtil.fs.stat(filePath);
        console.log('File stats:', fileStats);
      }

      // Format path for display (wrap long paths)
      const displayPath = filePath.length > 60 
        ? `${filePath.substring(0, 60)}...\n${filePath.substring(60)}`
        : filePath;

      Alert.alert(
        '✅ Backup Successful',
        `Wallet backup saved!\n\n📄 File Name:\n${fileName}\n\n📁 Full Path:\n${displayPath}\n\n⚠️ Keep this file secure! It contains your encrypted wallet data.\n\n💡 Check your Downloads folder or use a file manager to locate the file.`,
        [{ text: 'OK' }]
      );

      console.log('✅ Wallet backed up successfully to:', filePath);
    } catch (error: any) {
      console.error('❌ Error backing up wallet:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      Alert.alert('Error', `Failed to backup wallet:\n\n${error?.message || error}\n\nPlease check app permissions.`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPublicKey = async () => {
    const wallet = await WalletStorage.getActiveWallet();
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

  const fetchBalance = async (addr: string) => {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );
      
      const result = await Promise.race([
        QbitcoinAPI.getBalance(addr),
        timeoutPromise
      ]) as any;
      
      if (result && result.balance) {
        // Convert from shor to QBC (1 QBC = 1,000,000,000 shor)
        const balanceQBC = (parseInt(result.balance) / 1000000000).toFixed(4);
        setBalance(balanceQBC);
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      // Set default balance on error
      setBalance('0.0000');
    }
  };

  const fetchTransactions = async (addr: string) => {
    try {
      // Convert wallet address to base64 for comparison (API uses base64)
      const walletAddressBase64 = Buffer.from(addr.substring(1), 'hex').toString('base64');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );
      
      const result = await Promise.race([
        QbitcoinAPI.getTransactionsByAddress(addr, 4, 1),
        timeoutPromise
      ]) as any;
      
      console.log('Dashboard transaction result:', result);
      
      // API returns transactionsDetail array
      if (result && result.transactionsDetail && Array.isArray(result.transactionsDetail)) {
        // Transform API data to match our UI format
        const formattedTxs = result.transactionsDetail.slice(0, 4).map((txDetail: any) => {
          const tx = txDetail.tx;
          
          // Check if this is a sent or received transaction
          const isSent = txDetail.addrFrom === walletAddressBase64 || tx.masterAddr === walletAddressBase64;
          
          let amount = '0';
          let fee = tx.fee || '0';
          
          if (isSent) {
            // For sent transactions, calculate total sent amount
            if (tx.transfer && tx.transfer.amounts && tx.transfer.amounts.length > 0) {
              // Sum all amounts sent
              const totalSent = tx.transfer.amounts.reduce((sum: string, amt: string) => {
                return (BigInt(sum) + BigInt(amt)).toString();
              }, '0');
              // Add fee to show total deducted from wallet
              amount = (BigInt(totalSent) + BigInt(fee)).toString();
            }
          } else {
            // For received transactions, find amount sent to this wallet
            if (tx.transfer && tx.transfer.addrsTo && tx.transfer.amounts) {
              for (let i = 0; i < tx.transfer.addrsTo.length; i++) {
                if (tx.transfer.addrsTo[i] === walletAddressBase64) {
                  amount = tx.transfer.amounts[i] || '0';
                  break;
                }
              }
            }
          }
          
          // Convert transaction hash from base64 to hex for display
          let txHash = tx.transactionHash || txDetail.blockHeaderHash;
          if (txHash) {
            try {
              // Decode base64 to buffer, then convert to hex
              const hashBuffer = Buffer.from(txHash, 'base64');
              txHash = hashBuffer.toString('hex');
            } catch (e) {
              console.log('Error converting hash:', e);
            }
          }
          
          return {
            tx_hash: txHash,
            amount: amount,
            timestamp: parseInt(txDetail.timestamp),
            type: isSent ? 'send' : 'receive',
            confirmations: parseInt(txDetail.confirmations || '0'),
          };
        });
        
        setTransactions(formattedTxs);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Set empty transactions on error
      setTransactions([]);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadWalletData();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, isDarkMode && styles.containerDark]}>
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, isDarkMode && styles.containerDark]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.welcomeText, isDarkMode && styles.welcomeTextDark]}>
            {walletName || 'Qbitcoin Wallet'}
          </Text>
          <Text style={[styles.addressText, isDarkMode && styles.addressTextDark]}>
            {address.substring(0, 12)}...{address.substring(address.length - 8)}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}>
          <Text style={[styles.menuDots, isDarkMode && styles.menuDotsDark]}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}>
          <View style={[styles.menuDropdown, isDarkMode && styles.menuDropdownDark]}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                loadWallets();
                setWalletSwitcherVisible(true);
              }}>
              <Text style={styles.menuIcon}>💼</Text>
              <Text style={[styles.menuText, isDarkMode && styles.menuTextDark]}>
                Switch Wallet
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                fetchNodeStats();
                setSettingsVisible(true);
              }}>
              <Text style={styles.menuIcon}>⚙️</Text>
              <Text style={[styles.menuText, isDarkMode && styles.menuTextDark]}>
                Settings
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={settingsVisible}
        animationType="slide"
        onRequestClose={() => setSettingsVisible(false)}>
        <View style={[styles.modalContainer, isDarkMode && styles.modalContainerDark]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, isDarkMode && styles.modalTitleDark]}>
              Settings
            </Text>
            <TouchableOpacity onPress={() => setSettingsVisible(false)}>
              <Text style={[styles.closeButton, isDarkMode && styles.closeButtonDark]}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Backup & Export Section */}
            <View style={[styles.settingSection, isDarkMode && styles.settingSectionDark]}>
              <Text style={[styles.settingSectionTitle, isDarkMode && styles.settingSectionTitleDark]}>
                Backup & Export
              </Text>
              
              <TouchableOpacity
                style={[styles.backupButton, isDarkMode && styles.backupButtonDark]}
                onPress={handleBackupWallet}>
                <Text style={styles.backupIcon}>💾</Text>
                <View style={styles.backupTextContainer}>
                  <Text style={[styles.backupButtonText, isDarkMode && styles.backupButtonTextDark]}>
                    Backup Wallet
                  </Text>
                  <Text style={[styles.backupSubtext, isDarkMode && styles.backupSubtextDark]}>
                    Save encrypted wallet to Downloads folder
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.backupButton, isDarkMode && styles.backupButtonDark]}
                onPress={handleExportPublicKey}>
                <Text style={styles.backupIcon}>📄</Text>
                <View style={styles.backupTextContainer}>
                  <Text style={[styles.backupButtonText, isDarkMode && styles.backupButtonTextDark]}>
                    Export Public Key
                  </Text>
                  <Text style={[styles.backupSubtext, isDarkMode && styles.backupSubtextDark]}>
                    Save public key information
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Network Settings */}
            <View style={[styles.settingSection, isDarkMode && styles.settingSectionDark]}>
              <Text style={[styles.settingSectionTitle, isDarkMode && styles.settingSectionTitleDark]}>
                Network
              </Text>
              <Text style={[styles.settingLabel, isDarkMode && styles.settingLabelDark]}>
                Custom Node
              </Text>
              <TextInput
                style={[styles.settingInput, isDarkMode && styles.settingInputDark]}
                value={customNode}
                onChangeText={setCustomNode}
                placeholder="http://your-node-ip:18090"
                placeholderTextColor={isDarkMode ? '#546e7a' : '#90a4ae'}
              />
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={() => {
                  Alert.alert('Success', 'Node settings saved');
                  setSettingsVisible(false);
                }}>
                <Text style={styles.saveButtonText}>Save Node</Text>
              </TouchableOpacity>
            </View>

            {/* Node Stats */}
            <View style={[styles.statsCard, isDarkMode && styles.statsCardDark]}>
              <Text style={[styles.statsTitle, isDarkMode && styles.statsTitleDark]}>
                Node Statistics
              </Text>
              {nodeStats ? (
                <>
                  <View style={styles.statRow}>
                    <Text style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
                      Block Height:
                    </Text>
                    <Text style={[styles.statValue, isDarkMode && styles.statValueDark]}>
                      {nodeStats.height}
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
                      Peers:
                    </Text>
                    <Text style={[styles.statValue, isDarkMode && styles.statValueDark]}>
                      {nodeStats.peers}
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
                      Status:
                    </Text>
                    <Text style={[styles.statValue, styles.statusConnected]}>
                      {nodeStats.connected ? '🟢 Connected' : '🔴 Disconnected'}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
                  Loading stats...
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Wallet Switcher Modal */}
      <Modal
        visible={walletSwitcherVisible}
        animationType="slide"
        onRequestClose={() => setWalletSwitcherVisible(false)}>
        <View style={[styles.modalContainer, isDarkMode && styles.modalContainerDark]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, isDarkMode && styles.modalTitleDark]}>
              Switch Wallet
            </Text>
            <TouchableOpacity onPress={() => setWalletSwitcherVisible(false)}>
              <Text style={[styles.closeButton, isDarkMode && styles.closeButtonDark]}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {wallets.map((wallet, index) => (
              <View
                key={index}
                style={[
                  styles.walletItem,
                  isDarkMode && styles.walletItemDark,
                  wallet.address === address && styles.walletItemActive
                ]}>
                <TouchableOpacity
                  style={styles.walletItemContent}
                  onPress={() => switchWallet(wallet.address)}>
                  <View>
                    <Text style={[styles.walletItemName, isDarkMode && styles.walletItemNameDark]}>
                      {wallet.name}
                    </Text>
                    <Text style={[styles.walletItemAddress, isDarkMode && styles.walletItemAddressDark]}>
                      {wallet.address.substring(0, 16)}...{wallet.address.substring(wallet.address.length - 8)}
                    </Text>
                  </View>
                  {wallet.address === address && (
                    <Text style={styles.activeIndicator}>✓</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteWalletButton}
                  onPress={() => deleteWallet(wallet.name)}>
                  <Text style={styles.deleteWalletIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            ))}
            
            {/* Create/Import Buttons */}
            <View style={styles.walletActions}>
              <TouchableOpacity 
                style={[styles.walletActionButton, styles.createButton]}
                onPress={() => {
                  setWalletSwitcherVisible(false);
                  navigation.navigate('CreateWallet');
                }}>
                <Text style={styles.walletActionText}>+ Create New Wallet</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.walletActionButton, styles.importButton, isDarkMode && styles.importButtonDark]}
                onPress={() => {
                  setWalletSwitcherVisible(false);
                  navigation.navigate('ImportWallet');
                }}>
                <Text style={[styles.walletActionTextSecondary, isDarkMode && styles.walletActionTextSecondaryDark]}>
                  📥 Import Wallet
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Balance Card */}
      <View style={[styles.balanceCard, isDarkMode && styles.balanceCardDark]}>
        <Text style={[styles.balanceLabel, isDarkMode && styles.balanceLabelDark]}>
          Total Balance
        </Text>
        <Text style={[styles.balanceAmount, isDarkMode && styles.balanceAmountDark]}>
          {balance} QBC
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <QuickActionButton
          icon="📤"
          label="Send"
          onPress={() => navigation.navigate('Send')}
          isDarkMode={isDarkMode}
        />
        <QuickActionButton
          icon="📥"
          label="Receive"
          onPress={() => navigation.navigate('Receive')}
          isDarkMode={isDarkMode}
        />
        <QuickActionButton
          icon="📊"
          label="History"
          onPress={() => navigation.navigate('Transactions')}
          isDarkMode={isDarkMode}
        />
      </View>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
            Recent Transactions
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {transactions.length === 0 ? (
          <View style={[styles.emptyState, isDarkMode && styles.emptyStateDark]}>
            <Text style={[styles.emptyStateText, isDarkMode && styles.emptyStateTextDark]}>
              No transactions yet
            </Text>
          </View>
        ) : (
          transactions.map((tx, index) => (
            <TransactionItem
              key={index}
              transaction={tx}
              isDarkMode={isDarkMode}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

function QuickActionButton({
  icon,
  label,
  onPress,
  isDarkMode,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  isDarkMode: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.quickAction, isDarkMode && styles.quickActionDark]}
      onPress={onPress}>
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text style={[styles.quickActionLabel, isDarkMode && styles.quickActionLabelDark]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function TransactionItem({ transaction, isDarkMode }: { transaction: any; isDarkMode: boolean }) {
  const isReceived = transaction.type === 'receive';
  
  return (
    <View style={[styles.txItem, isDarkMode && styles.txItemDark]}>
      <View style={styles.txIcon}>
        <Text style={styles.txIconText}>{isReceived ? '📥' : '📤'}</Text>
      </View>
      <View style={styles.txDetails}>
        <Text style={[styles.txType, isDarkMode && styles.txTypeDark]}>
          {isReceived ? 'Received' : 'Sent'}
        </Text>
        <Text style={[styles.txDate, isDarkMode && styles.txDateDark]}>
          {new Date(transaction.timestamp * 1000).toLocaleDateString()}
        </Text>
      </View>
      <Text
        style={[
          styles.txAmount,
          isReceived ? styles.txAmountReceived : styles.txAmountSent,
        ]}>
        {isReceived ? '+' : '-'}{(transaction.amount / 1000000000).toFixed(4)} QBC
      </Text>
    </View>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  welcomeTextDark: {
    color: '#fff',
  },
  addressText: {
    fontSize: 14,
    color: '#546e7a',
    marginTop: 4,
  },
  addressTextDark: {
    color: '#90caf9',
  },
  menuButton: {
    padding: 8,
  },
  menuDots: {
    fontSize: 24,
    color: '#546e7a',
  },
  menuDotsDark: {
    color: '#90caf9',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 20,
    paddingTop: 80,
  },
  menuDropdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuDropdownDark: {
    backgroundColor: '#1a2332',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    color: '#263238',
    fontWeight: '500',
  },
  menuTextDark: {
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalContainerDark: {
    backgroundColor: '#0a1929',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a237e',
  },
  modalTitleDark: {
    color: '#fff',
  },
  closeButton: {
    fontSize: 28,
    color: '#546e7a',
    fontWeight: '300',
  },
  closeButtonDark: {
    color: '#90caf9',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  settingSection: {
    marginBottom: 24,
  },
  settingSectionDark: {
    borderBottomWidth: 1,
    borderBottomColor: '#263238',
    paddingBottom: 16,
  },
  settingSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1565c0',
    marginBottom: 16,
  },
  settingSectionTitleDark: {
    color: '#90caf9',
  },
  backupButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  backupButtonDark: {
    backgroundColor: '#1a2332',
    borderColor: '#263238',
  },
  backupIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  backupTextContainer: {
    flex: 1,
  },
  backupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 4,
  },
  backupButtonTextDark: {
    color: '#fff',
  },
  backupSubtext: {
    fontSize: 13,
    color: '#546e7a',
  },
  backupSubtextDark: {
    color: '#90caf9',
  },
  themeOptions: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
  },
  themeNote: {
    fontSize: 12,
    color: '#546e7a',
    marginTop: 4,
    fontStyle: 'italic',
  },
  themeNoteDark: {
    color: '#90caf9',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 8,
    marginTop: 16,
  },
  settingLabelDark: {
    color: '#fff',
  },
  settingInput: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: '#263238',
    borderWidth: 1,
    borderColor: '#cfd8dc',
  },
  settingInputDark: {
    backgroundColor: '#1a2332',
    color: '#fff',
    borderColor: '#263238',
  },
  saveButton: {
    backgroundColor: '#1565c0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  statsCardDark: {
    backgroundColor: '#1a2332',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1565c0',
    marginBottom: 16,
  },
  statsTitleDark: {
    color: '#90caf9',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  statLabel: {
    fontSize: 16,
    color: '#546e7a',
  },
  statLabelDark: {
    color: '#90caf9',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
  },
  statValueDark: {
    color: '#fff',
  },
  statusConnected: {
    color: '#4caf50',
  },
  walletItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  walletItemDark: {
    backgroundColor: '#1a2332',
  },
  walletItemActive: {
    borderColor: '#1565c0',
  },
  walletItemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteWalletButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteWalletIcon: {
    fontSize: 20,
  },
  walletItemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 4,
  },
  walletItemNameDark: {
    color: '#fff',
  },
  walletItemAddress: {
    fontSize: 14,
    color: '#546e7a',
    fontFamily: 'monospace',
  },
  walletItemAddressDark: {
    color: '#90caf9',
  },
  activeIndicator: {
    fontSize: 24,
    color: '#4caf50',
  },
  walletActions: {
    marginTop: 24,
    gap: 12,
  },
  walletActionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#1565c0',
  },
  importButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#1565c0',
  },
  importButtonDark: {
    borderColor: '#90caf9',
  },
  walletActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  walletActionTextSecondary: {
    color: '#1565c0',
    fontSize: 16,
    fontWeight: '600',
  },
  walletActionTextSecondaryDark: {
    color: '#90caf9',
  },
  balanceCard: {
    backgroundColor: '#1565c0',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  balanceCardDark: {
    backgroundColor: '#1a2f47',
  },
  balanceLabel: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
  },
  balanceLabelDark: {
    color: '#90caf9',
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 8,
  },
  balanceAmountDark: {
    color: '#fff',
  },
  balanceUsd: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.8,
    marginTop: 4,
  },
  balanceUsdDark: {
    color: '#90caf9',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionDark: {
    backgroundColor: '#1a2332',
  },
  quickActionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#263238',
  },
  quickActionLabelDark: {
    color: '#fff',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#263238',
  },
  sectionTitleDark: {
    color: '#fff',
  },
  seeAll: {
    fontSize: 14,
    color: '#1565c0',
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateDark: {
    backgroundColor: '#1a2332',
  },
  emptyStateText: {
    color: '#90a4ae',
    fontSize: 16,
  },
  emptyStateTextDark: {
    color: '#546e7a',
  },
  txItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  txItemDark: {
    backgroundColor: '#1a2332',
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txIconText: {
    fontSize: 20,
  },
  txDetails: {
    flex: 1,
  },
  txType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
  },
  txTypeDark: {
    color: '#fff',
  },
  txDate: {
    fontSize: 12,
    color: '#90a4ae',
    marginTop: 2,
  },
  txDateDark: {
    color: '#546e7a',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  txAmountReceived: {
    color: '#4caf50',
  },
  txAmountSent: {
    color: '#f44336',
  },
});
