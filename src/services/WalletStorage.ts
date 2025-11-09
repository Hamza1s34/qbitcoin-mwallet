/**
 * Wallet Storage Service
 * Manages encrypted wallet storage using AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WalletData {
  address: string;
  name: string;
  algorithm: 'falcon-512' | 'falcon-1024';
  created_at: number;
  encrypted: boolean;
  encryption_version: string;
  password_hash?: string; // Password used to encrypt the wallet
  private_key_encrypted: {
    ciphertext: string;
    encrypted: boolean;
    nonce: string;
    salt: string;
  };
  private_key_size: number;
  public_key: string;
  public_key_size: number;
}

const WALLETS_KEY = '@qbitcoin_wallets';
const ACTIVE_WALLET_KEY = '@qbitcoin_active_wallet';

class WalletStorage {
  /**
   * Save wallet to storage
   */
  async saveWallet(wallet: WalletData): Promise<void> {
    try {
      const walletsJson = await AsyncStorage.getItem(WALLETS_KEY);
      const wallets: WalletData[] = walletsJson ? JSON.parse(walletsJson) : [];
      
      // Add or update wallet
      const existingIndex = wallets.findIndex(w => w.address === wallet.address);
      if (existingIndex >= 0) {
        wallets[existingIndex] = wallet;
      } else {
        wallets.push(wallet);
      }
      
      await AsyncStorage.setItem(WALLETS_KEY, JSON.stringify(wallets));
      
      // Set as active wallet if it's the first one
      if (wallets.length === 1) {
        await this.setActiveWallet(wallet.address);
      }
      
      console.log('✅ Wallet saved:', wallet.address);
    } catch (error) {
      console.error('❌ Error saving wallet:', error);
      throw error;
    }
  }

  /**
   * Get all wallets
   */
  async getAllWallets(): Promise<WalletData[]> {
    try {
      const walletsJson = await AsyncStorage.getItem(WALLETS_KEY);
      return walletsJson ? JSON.parse(walletsJson) : [];
    } catch (error) {
      console.error('❌ Error getting wallets:', error);
      return [];
    }
  }

  /**
   * Get wallet by address
   */
  async getWallet(address: string): Promise<WalletData | null> {
    try {
      const wallets = await this.getAllWallets();
      return wallets.find(w => w.address === address) || null;
    } catch (error) {
      console.error('❌ Error getting wallet:', error);
      return null;
    }
  }

  /**
   * Set active wallet
   */
  async setActiveWallet(address: string): Promise<void> {
    try {
      await AsyncStorage.setItem(ACTIVE_WALLET_KEY, address);
      console.log('✅ Active wallet set:', address);
    } catch (error) {
      console.error('❌ Error setting active wallet:', error);
      throw error;
    }
  }

  /**
   * Get active wallet
   */
  async getActiveWallet(): Promise<WalletData | null> {
    try {
      const address = await AsyncStorage.getItem(ACTIVE_WALLET_KEY);
      if (!address) return null;
      
      return await this.getWallet(address);
    } catch (error) {
      console.error('❌ Error getting active wallet:', error);
      return null;
    }
  }

  /**
   * Delete wallet
   */
  async deleteWallet(address: string): Promise<void> {
    try {
      const wallets = await this.getAllWallets();
      const filtered = wallets.filter(w => w.address !== address);
      await AsyncStorage.setItem(WALLETS_KEY, JSON.stringify(filtered));
      
      // If deleted wallet was active, set another one as active
      const activeAddress = await AsyncStorage.getItem(ACTIVE_WALLET_KEY);
      if (activeAddress === address && filtered.length > 0) {
        await this.setActiveWallet(filtered[0].address);
      }
      
      console.log('✅ Wallet deleted:', address);
    } catch (error) {
      console.error('❌ Error deleting wallet:', error);
      throw error;
    }
  }

  /**
   * Clear all wallets (for development/testing)
   */
  async clearAllWallets(): Promise<void> {
    try {
      await AsyncStorage.removeItem(WALLETS_KEY);
      await AsyncStorage.removeItem(ACTIVE_WALLET_KEY);
      console.log('✅ All wallets cleared');
    } catch (error) {
      console.error('❌ Error clearing wallets:', error);
      throw error;
    }
  }
}

export default new WalletStorage();
