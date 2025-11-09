/**
 * Transactions Screen
 * View all transaction history
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useColorScheme,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ScrollView,
  Clipboard,
  Alert,
} from 'react-native';
import { Buffer } from 'buffer';
import WalletStorage from '../services/WalletStorage';
import QbitcoinAPI from '../services/QbitcoinAPI';

export default function TransactionsScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setError(null);
      const wallet = await WalletStorage.getActiveWallet();
      if (wallet) {
        console.log('Loading transactions for:', wallet.address);
        
        // Convert wallet address to base64 for comparison (API uses base64)
        const walletAddressBase64 = Buffer.from(wallet.address.substring(1), 'hex').toString('base64');
        console.log('Wallet address in base64:', walletAddressBase64);
        
        // Add timeout to API call
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );
        
        const apiPromise = QbitcoinAPI.getTransactionsByAddress(wallet.address, 50, 1);
        
        const result = await Promise.race([apiPromise, timeoutPromise]) as any;
        
        console.log('Transaction API result:', result);
        
        // API returns transactionsDetail array
        if (result && result.transactionsDetail && Array.isArray(result.transactionsDetail)) {
          // Transform API data to match our UI format
          const formattedTxs = result.transactionsDetail.map((txDetail: any) => {
            const tx = txDetail.tx;
            
            // Check if this is a sent or received transaction
            // Sent: addrFrom (masterAddr) matches wallet address
            // Received: addrsTo contains wallet address
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
              blockNumber: txDetail.blockNumber,
              fee: fee,
            };
          });
          
          setTransactions(formattedTxs);
        } else {
          setTransactions([]);
        }
      }
    } catch (error: any) {
      console.error('Error loading transactions:', error);
      setError(error.message || 'Unable to connect to node');
      // Set empty array on error so UI shows "No transactions" instead of hanging
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  const handleTransactionPress = (transaction: any) => {
    setSelectedTransaction(transaction);
    setDetailsVisible(true);
  };

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  const renderTransaction = ({ item }: { item: any }) => (
    <TransactionItem 
      transaction={item} 
      isDarkMode={isDarkMode} 
      onPress={() => handleTransactionPress(item)}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent, isDarkMode && styles.containerDark]}>
        <ActivityIndicator size="large" color="#1565c0" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>
          Transaction History
        </Text>
        <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
          {transactions.length} transactions
        </Text>
      </View>

      {/* Transaction List */}
      {transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>
            {error ? '⚠️' : '📭'}
          </Text>
          <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
            {error ? 'Connection Issue' : 'No transactions yet'}
          </Text>
          <Text style={[styles.emptySubtext, isDarkMode && styles.emptySubtextDark]}>
            {error 
              ? 'Unable to connect to the Qbitcoin node. Pull down to retry.'
              : 'Your transaction history will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item, index) => `${item.tx_hash || index}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
      
      {/* Transaction Details Modal */}
      <Modal
        visible={detailsVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailsVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
            <ScrollView>
              <Text style={[styles.modalTitle, isDarkMode && styles.modalTitleDark]}>
                Transaction Details
              </Text>
              
              {selectedTransaction && (
                <>
                  {/* Transaction Type */}
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, isDarkMode && styles.detailLabelDark]}>
                      Type
                    </Text>
                    <View style={[
                      styles.typeBadge,
                      selectedTransaction.type === 'receive' ? styles.typeBadgeReceive : styles.typeBadgeSend
                    ]}>
                      <Text style={styles.typeBadgeText}>
                        {selectedTransaction.type === 'receive' ? '📥 Received' : '📤 Sent'}
                      </Text>
                    </View>
                  </View>

                  {/* Amount */}
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, isDarkMode && styles.detailLabelDark]}>
                      Amount
                    </Text>
                    <Text style={[
                      styles.detailValue,
                      styles.detailValueAmount,
                      selectedTransaction.type === 'receive' ? styles.amountReceive : styles.amountSend,
                    ]}>
                      {selectedTransaction.type === 'receive' ? '+' : '-'}
                      {(selectedTransaction.amount / 1000000000).toFixed(8)} QBC
                    </Text>
                  </View>

                  {/* Fee */}
                  {selectedTransaction.fee && selectedTransaction.type === 'send' && (
                    <View style={styles.detailSection}>
                      <Text style={[styles.detailLabel, isDarkMode && styles.detailLabelDark]}>
                        Fee
                      </Text>
                      <Text style={[styles.detailValue, isDarkMode && styles.detailValueDark]}>
                        {(parseInt(selectedTransaction.fee) / 1000000000).toFixed(8)} QBC
                      </Text>
                    </View>
                  )}

                  {/* Confirmations */}
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, isDarkMode && styles.detailLabelDark]}>
                      Confirmations
                    </Text>
                    <Text style={[styles.detailValue, isDarkMode && styles.detailValueDark]}>
                      {selectedTransaction.confirmations.toLocaleString()}
                    </Text>
                  </View>

                  {/* Block Number */}
                  {selectedTransaction.blockNumber && (
                    <View style={styles.detailSection}>
                      <Text style={[styles.detailLabel, isDarkMode && styles.detailLabelDark]}>
                        Block Number
                      </Text>
                      <Text style={[styles.detailValue, isDarkMode && styles.detailValueDark]}>
                        {selectedTransaction.blockNumber}
                      </Text>
                    </View>
                  )}

                  {/* Date & Time */}
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailLabel, isDarkMode && styles.detailLabelDark]}>
                      Date & Time
                    </Text>
                    <Text style={[styles.detailValue, isDarkMode && styles.detailValueDark]}>
                      {new Date(selectedTransaction.timestamp * 1000).toLocaleString()}
                    </Text>
                  </View>

                  {/* Transaction Hash */}
                  {selectedTransaction.tx_hash && (
                    <View style={styles.detailSection}>
                      <Text style={[styles.detailLabel, isDarkMode && styles.detailLabelDark]}>
                        Transaction Hash
                      </Text>
                      <TouchableOpacity 
                        onPress={() => copyToClipboard(selectedTransaction.tx_hash, 'Transaction hash')}
                        style={styles.copyableField}>
                        <Text style={[styles.detailValueHash, isDarkMode && styles.detailValueHashDark]}>
                          {selectedTransaction.tx_hash}
                        </Text>
                        <Text style={styles.copyIcon}>📋</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

              {/* Close Button */}
              <TouchableOpacity
                style={[styles.closeButton, isDarkMode && styles.closeButtonDark]}
                onPress={() => setDetailsVisible(false)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function TransactionItem({ transaction, isDarkMode, onPress }: { transaction: any; isDarkMode: boolean; onPress: () => void }) {
  const isReceived = transaction.type === 'receive';
  const amount = (transaction.amount / 1000000000).toFixed(4);
  const date = new Date(transaction.timestamp * 1000);
  
  return (
    <TouchableOpacity
      style={[styles.txItem, isDarkMode && styles.txItemDark]}
      activeOpacity={0.7}
      onPress={onPress}>
      <View style={[
        styles.txIconContainer,
        isReceived ? styles.txIconReceived : styles.txIconSent,
        isDarkMode && (isReceived ? styles.txIconReceivedDark : styles.txIconSentDark)
      ]}>
        <Text style={styles.txIcon}>{isReceived ? '📥' : '📤'}</Text>
      </View>

      <View style={styles.txDetails}>
        <Text style={[styles.txType, isDarkMode && styles.txTypeDark]}>
          {isReceived ? 'Received' : 'Sent'}
        </Text>
        <Text style={[styles.txDate, isDarkMode && styles.txDateDark]}>
          {date.toLocaleDateString()} • {date.toLocaleTimeString()}
        </Text>
        {transaction.tx_hash && (
          <Text style={[styles.txHash, isDarkMode && styles.txHashDark]}>
            {transaction.tx_hash.substring(0, 16)}...
          </Text>
        )}
      </View>

      <View style={styles.txAmountContainer}>
        <Text
          style={[
            styles.txAmount,
            isReceived ? styles.txAmountReceived : styles.txAmountSent,
          ]}>
          {isReceived ? '+' : '-'}{amount}
        </Text>
        <Text style={[styles.txCurrency, isDarkMode && styles.txCurrencyDark]}>
          QBC
        </Text>
        {transaction.confirmations !== undefined && (
          <View style={[
            styles.confirmationBadge,
            transaction.confirmations > 0 ? styles.confirmationBadgeConfirmed : styles.confirmationBadgePending
          ]}>
            <Text style={styles.confirmationText}>
              {transaction.confirmations > 0 ? '✓' : '⏳'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
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
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a237e',
    marginBottom: 4,
  },
  titleDark: {
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#546e7a',
  },
  subtitleDark: {
    color: '#90caf9',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 8,
  },
  emptyTextDark: {
    color: '#fff',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#90a4ae',
    textAlign: 'center',
  },
  emptySubtextDark: {
    color: '#546e7a',
  },
  txItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  txItemDark: {
    backgroundColor: '#1a2332',
  },
  txIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txIconReceived: {
    backgroundColor: '#e8f5e9',
  },
  txIconReceivedDark: {
    backgroundColor: '#1e3a2a',
  },
  txIconSent: {
    backgroundColor: '#ffebee',
  },
  txIconSentDark: {
    backgroundColor: '#3a1e1e',
  },
  txIcon: {
    fontSize: 24,
  },
  txDetails: {
    flex: 1,
  },
  txType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#263238',
    marginBottom: 4,
  },
  txTypeDark: {
    color: '#fff',
  },
  txDate: {
    fontSize: 12,
    color: '#90a4ae',
    marginBottom: 2,
  },
  txDateDark: {
    color: '#546e7a',
  },
  txHash: {
    fontSize: 11,
    color: '#b0bec5',
    fontFamily: 'monospace',
  },
  txHashDark: {
    color: '#546e7a',
  },
  txAmountContainer: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  txAmountReceived: {
    color: '#4caf50',
  },
  txAmountSent: {
    color: '#f44336',
  },
  txCurrency: {
    fontSize: 12,
    color: '#90a4ae',
    marginTop: 2,
  },
  txCurrencyDark: {
    color: '#546e7a',
  },
  confirmationBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  confirmationBadgeConfirmed: {
    backgroundColor: '#e8f5e9',
  },
  confirmationBadgePending: {
    backgroundColor: '#fff3e0',
  },
  confirmationText: {
    fontSize: 10,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalContentDark: {
    backgroundColor: '#1a2332',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1565c0',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalTitleDark: {
    color: '#64B5F6',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#90a4ae',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  detailLabelDark: {
    color: '#546e7a',
  },
  detailValue: {
    fontSize: 16,
    color: '#263238',
  },
  detailValueDark: {
    color: '#fff',
  },
  detailValueAmount: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  amountReceive: {
    color: '#4caf50',
  },
  amountSend: {
    color: '#f44336',
  },
  detailValueHash: {
    fontSize: 12,
    color: '#1565c0',
    fontFamily: 'monospace',
    flex: 1,
  },
  detailValueHashDark: {
    color: '#64B5F6',
  },
  typeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  typeBadgeReceive: {
    backgroundColor: '#e8f5e9',
  },
  typeBadgeSend: {
    backgroundColor: '#ffebee',
  },
  typeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#263238',
  },
  copyableField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  copyIcon: {
    fontSize: 20,
    marginLeft: 8,
  },
  closeButton: {
    backgroundColor: '#1565c0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonDark: {
    backgroundColor: '#1976D2',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
