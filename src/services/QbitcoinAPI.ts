/**
 * Qbitcoin API Service
 * Connects to multiple Qbitcoin nodes and selects the best one(s)
 */

import NodeStorage, { NodeInfo } from './NodeStorage';

const DEFAULT_API_BASE_URL = 'http://134.122.79.166:18090/api';

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

interface NodeStatus {
  url: string;
  height: number;
  connected: boolean;
  state?: string;
  peers?: number;
  version?: string;
}

class QbitcoinAPI {
  private nodeStatuses: Map<string, NodeStatus> = new Map();
  private lastSuccessfulNode: string | null = null;
  private isCheckingNodes: boolean = false;
  private cachedBestNodes: string[] = [];
  private lastNodeCheckTime: number = 0;
  private NODE_CHECK_INTERVAL = 30000; // 30 seconds

  /**
   * Make HTTP GET request to a specific node
   */
  private async makeRequestToNode(baseUrl: string, endpoint: string, params: Record<string, any> = {}, timeout: number = 5000): Promise<any> {
    try {
      const apiUrl = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
      const queryString = new URLSearchParams(params).toString();
      const url = `${apiUrl}/${endpoint}${queryString ? `?${queryString}` : ''}`;

      console.log(`📡 API Request to ${baseUrl}: ${url}`);

      // Create timeout promise with configurable timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      );

      const fetchPromise = fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Mark this node as successful
      if (data && !data.error) {
        this.lastSuccessfulNode = baseUrl;
      }

      return { data, error: null };
    } catch (error) {
      console.error(`❌ API Error (${baseUrl}/${endpoint}):`, error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Check all nodes and get their statuses (with timeout per node)
   */
  async checkAllNodes(quickCheck: boolean = false): Promise<NodeStatus[]> {
    const nodes = await NodeStorage.getAllNodes();
    const statuses: NodeStatus[] = [];
    const timeout = quickCheck ? 3000 : 5000; // Use shorter timeout for quick checks

    // Check all nodes in parallel with individual timeouts
    const checks = nodes.map(async (nodeUrl) => {
      try {
        const result = await this.makeRequestToNode(nodeUrl, 'GetNodeState', {}, timeout);

        if (result.error || !result.data || result.data.error) {
          statuses.push({
            url: nodeUrl,
            height: 0,
            connected: false,
            peers: 0,
            version: 'Unknown',
          });
          return;
        }

        const nodeState = result.data;
        const height = nodeState.info?.blockHeight || nodeState.height || 0;
        const state = nodeState.info?.state || nodeState.state || 'UNKNOWN';
        const isConnected = state === 'SYNCED' || state === 'SYNCING';
        const peers = nodeState.info?.numConnections || nodeState.numConnections || 0;
        const version = nodeState.info?.version || nodeState.version || 'Unknown';

        const status: NodeStatus = {
          url: nodeUrl,
          height: parseInt(height.toString()) || 0,
          connected: isConnected,
          state,
          peers: parseInt(peers.toString()) || 0,
          version: version.toString(),
        };

        statuses.push(status);

        // Cache node info (without awaiting to speed up)
        NodeStorage.saveNodeInfo(nodeUrl, {
          url: nodeUrl,
          height: status.height,
          connected: status.connected,
          state: status.state,
        }).catch(err => console.warn('Failed to cache node info:', err));
      } catch (error) {
        console.error(`Error checking node ${nodeUrl}:`, error);
        statuses.push({
          url: nodeUrl,
          height: 0,
          connected: false,
        });
      }
    });

    await Promise.all(checks);

    // Update cache
    statuses.forEach(status => {
      this.nodeStatuses.set(status.url, status);
    });

    return statuses;
  }

  /**
   * Get any available node quickly without waiting for all checks
   */
  async getFirstAvailableNode(): Promise<string | null> {
    // First try the last successful node
    if (this.lastSuccessfulNode) {
      const result = await this.makeRequestToNode(this.lastSuccessfulNode, 'GetNodeState', {}, 2000);
      if (!result.error && result.data && !result.data.error) {
        return this.lastSuccessfulNode;
      }
    }

    // Try cached best nodes
    if (this.cachedBestNodes.length > 0) {
      for (const node of this.cachedBestNodes) {
        const result = await this.makeRequestToNode(node, 'GetNodeState', {}, 2000);
        if (!result.error && result.data && !result.data.error) {
          return node;
        }
      }
    }

    // Try all nodes in parallel and return first successful
    const nodes = await NodeStorage.getAllNodes();
    if (nodes.length === 0) {
      return DEFAULT_API_BASE_URL.replace('/api', '');
    }

    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          // Fallback to first node if none respond
          resolve(nodes[0] || DEFAULT_API_BASE_URL.replace('/api', ''));
        }
      }, 3000);

      nodes.forEach(async (nodeUrl) => {
        if (resolved) return;

        try {
          const result = await this.makeRequestToNode(nodeUrl, 'GetNodeState', {}, 2000);
          if (!resolved && !result.error && result.data && !result.data.error) {
            resolved = true;
            clearTimeout(timeout);
            resolve(nodeUrl);
          }
        } catch (error) {
          // Ignore errors, we're racing for first successful
        }
      });
    });
  }

  /**
   * Get the best node(s) - highest height, or all if same height
   * Now with caching and background updates
   */
  async getBestNodes(forceRefresh: boolean = false): Promise<string[]> {
    const now = Date.now();

    // Return cached nodes if available and recent
    if (!forceRefresh &&
      this.cachedBestNodes.length > 0 &&
      now - this.lastNodeCheckTime < this.NODE_CHECK_INTERVAL) {
      return this.cachedBestNodes;
    }

    // Start background check if not already running
    if (!this.isCheckingNodes) {
      this.checkNodesInBackground();
    }

    // If we have cached nodes, return them while checking in background
    if (this.cachedBestNodes.length > 0) {
      return this.cachedBestNodes;
    }

    // Do a quick check for first run
    const statuses = await this.checkAllNodes(true); // Quick check
    const connectedNodes = statuses.filter(s => s.connected && s.height > 0);

    if (connectedNodes.length === 0) {
      // Try to get first available node quickly
      const firstNode = await this.getFirstAvailableNode();
      return firstNode ? [firstNode] : [DEFAULT_API_BASE_URL.replace('/api', '')];
    }

    // Find maximum height
    const maxHeight = Math.max(...connectedNodes.map(s => s.height));

    // Get all nodes with max height
    const bestNodes = connectedNodes
      .filter(s => s.height === maxHeight)
      .map(s => s.url);

    this.cachedBestNodes = bestNodes.length > 0 ? bestNodes : [connectedNodes[0].url];
    this.lastNodeCheckTime = now;

    return this.cachedBestNodes;
  }

  /**
   * Check nodes in background without blocking
   */
  private async checkNodesInBackground(): Promise<void> {
    if (this.isCheckingNodes) return;

    this.isCheckingNodes = true;
    try {
      const statuses = await this.checkAllNodes(false);
      const connectedNodes = statuses.filter(s => s.connected && s.height > 0);

      if (connectedNodes.length > 0) {
        const maxHeight = Math.max(...connectedNodes.map(s => s.height));
        const bestNodes = connectedNodes
          .filter(s => s.height === maxHeight)
          .map(s => s.url);

        if (bestNodes.length > 0) {
          this.cachedBestNodes = bestNodes;
          this.lastNodeCheckTime = Date.now();
        }
      }
    } catch (error) {
      console.warn('Background node check failed:', error);
    } finally {
      this.isCheckingNodes = false;
    }
  }

  /**
   * Make request with fast failover and parallel attempts
   */
  private async makeRequest(endpoint: string, params: Record<string, any> = {}, useAllBest: boolean = false): Promise<any> {
    // For critical endpoints like balance, try to get data quickly
    if (endpoint === 'GetBalance' || endpoint === 'GetTransactionsByAddress' || endpoint === 'GetAddressState') {
      return this.makeRequestFast(endpoint, params);
    }

    const bestNodes = await this.getBestNodes();
    const nodesToUse = useAllBest ? bestNodes : [bestNodes[0]];

    // Try nodes in order until one succeeds
    for (const nodeUrl of nodesToUse) {
      const result = await this.makeRequestToNode(nodeUrl, endpoint, params);
      if (!result.error && result.data && !result.data.error) {
        return result.data;
      }
    }

    // If all failed, return error
    return { error: 'All nodes failed to respond' };
  }

  /**
   * Make request quickly by trying first available node
   */
  private async makeRequestFast(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    // Try last successful node first with short timeout
    if (this.lastSuccessfulNode) {
      const result = await this.makeRequestToNode(this.lastSuccessfulNode, endpoint, params, 3000);
      if (!result.error && result.data && !result.data.error) {
        return result.data;
      }
    }

    // Get all nodes and try them in parallel
    const nodes = await NodeStorage.getAllNodes();

    if (nodes.length === 0) {
      const result = await this.makeRequestToNode(DEFAULT_API_BASE_URL.replace('/api', ''), endpoint, params);
      return result.data || result;
    }

    // Race all nodes for fastest response
    return new Promise((resolve) => {
      let resolved = false;
      let errorCount = 0;
      const totalNodes = nodes.length;

      // Set overall timeout
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ error: 'Request timeout - no nodes responded' });
        }
      }, 5000);

      nodes.forEach(async (nodeUrl) => {
        if (resolved) return;

        try {
          const result = await this.makeRequestToNode(nodeUrl, endpoint, params, 4000);

          if (!resolved && !result.error && result.data && !result.data.error) {
            resolved = true;
            clearTimeout(timeout);
            this.lastSuccessfulNode = nodeUrl;
            resolve(result.data);
          } else {
            errorCount++;
            // If all nodes have responded with errors
            if (!resolved && errorCount === totalNodes) {
              resolved = true;
              clearTimeout(timeout);
              resolve({ error: 'All nodes failed to respond' });
            }
          }
        } catch (error) {
          errorCount++;
          if (!resolved && errorCount === totalNodes) {
            resolved = true;
            clearTimeout(timeout);
            resolve({ error: 'All nodes failed to respond' });
          }
        }
      });
    });
  }

  /**
   * Broadcast to all best nodes (for transactions)
   */
  private async broadcastToNodes(endpoint: string, params: Record<string, any>): Promise<any> {
    const bestNodes = await this.getBestNodes();
    const results: any[] = [];

    // Broadcast to all best nodes in parallel
    const broadcasts = bestNodes.map(async (nodeUrl) => {
      const result = await this.makeRequestToNode(nodeUrl, endpoint, params);
      return { nodeUrl, ...result };
    });

    const responses = await Promise.all(broadcasts);

    // Return first successful response, or first error if all failed
    const success = responses.find(r => !r.error && r.data && !r.data.error);
    if (success) {
      return success.data;
    }

    return responses[0]?.error ? { error: responses[0].error } : { error: 'All nodes failed' };
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
   * Get node state information (from best node)
   */
  async getNodeState(): Promise<any> {
    const bestNodes = await this.getBestNodes();
    if (bestNodes.length > 0) {
      const result = await this.makeRequestToNode(bestNodes[0], 'GetNodeState');
      return result.data || result;
    }
    return { error: 'No nodes available' };
  }

  /**
   * Get all node statuses (with quick check option)
   */
  async getAllNodeStatuses(quickCheck: boolean = true): Promise<NodeStatus[]> {
    // Get current nodes from storage to ensure we don't show removed nodes
    // and DO show newly added nodes
    const currentNodes = await NodeStorage.getAllNodes();

    // Return cached statuses immediately if available
    if (this.nodeStatuses.size > 0 && quickCheck) {
      // Filter cache to only include current nodes AND add any missing nodes
      const statuses = currentNodes.map(url => {
        const cached = this.nodeStatuses.get(url);
        if (cached) {
          return cached;
        }
        // Return default status for new nodes while we check them
        return {
          url,
          height: 0,
          connected: false,
          state: 'CONNECTING',
          peers: 0,
          version: 'Unknown'
        };
      });

      // Start background update
      this.checkNodesInBackground();

      return statuses;
    }

    return await this.checkAllNodes(quickCheck);
  }

  /**
   * Submit transaction to network (broadcasts to all best nodes)
   */
  async pushTransaction(transactionHex: string): Promise<any> {
    try {
      const params = { transaction_signed: transactionHex };
      console.log('📤 Broadcasting transaction to best nodes, hex length:', transactionHex.length);

      const result = await this.broadcastToNodes('PushTransaction', params);
      return result;
    } catch (error) {
      console.error('❌ Push Transaction Error:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export default new QbitcoinAPI();
