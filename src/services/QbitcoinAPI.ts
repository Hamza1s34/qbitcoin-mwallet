/**
 * Qbitcoin API Service
 * Connects to Qbitcoin node via HTTP API
 */

const API_BASE_URL = 'http://134.122.79.166:18090/api';

export interface Balance {
  balance: string;
}

export interface Transaction {
  tx_hash: string;
  amount: string;
  timestamp: number;
  type: 'send' | 'receive';
  confirmations: number;
}

export interface AddressState {
  address: string;
  balance: string;
  nonce: number;
  transactions: Transaction[];
}

class QbitcoinAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make HTTP GET request to API endpoint
   */
  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${this.baseUrl}/${endpoint}${queryString ? `?${queryString}` : ''}`;
      
      console.log(`📡 API Request: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`❌ API Error (${endpoint}):`, error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get balance for an address
   */
  async getBalance(address: string): Promise<Balance> {
    const result = await this.makeRequest('GetBalance', { address });
    return result;
  }

  /**
   * Get full address state including transactions
   */
  async getAddressState(address: string): Promise<AddressState> {
    const result = await this.makeRequest('GetAddressState', { address });
    return result;
  }

  /**
   * Get transactions for an address with pagination
   */
  async getTransactionsByAddress(
    address: string,
    itemPerPage: number = 10,
    pageNumber: number = 1
  ): Promise<any> {
    const result = await this.makeRequest('GetTransactionsByAddress', {
      address,
      item_per_page: itemPerPage,
      page_number: pageNumber,
    });
    return result;
  }

  /**
   * Get current blockchain height
   */
  async getHeight(): Promise<any> {
    const result = await this.makeRequest('GetHeight');
    return result;
  }

  /**
   * Get node state information
   */
  async getNodeState(): Promise<any> {
    const result = await this.makeRequest('GetNodeState');
    return result;
  }

  /**
   * Submit transaction to network
   */
  async pushTransaction(transactionHex: string): Promise<any> {
    try {
      // Use GET method with transaction_signed parameter (as per the API)
      const params = { transaction_signed: transactionHex };
      console.log('📤 Pushing transaction, hex length:', transactionHex.length);
      
      const result = await this.makeRequest('PushTransaction', params);
      return result;
    } catch (error) {
      console.error('❌ Push Transaction Error:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export default new QbitcoinAPI();
