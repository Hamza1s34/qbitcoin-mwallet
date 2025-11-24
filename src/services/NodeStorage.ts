/**
 * Node Storage Service
 * Manages multiple Qbitcoin node connections
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const NODES_STORAGE_KEY = '@qbitcoin_nodes';
const DEFAULT_NODES = [
  'http://134.122.79.166:18090',
  
];

export interface NodeInfo {
  url: string;
  height?: number;
  connected?: boolean;
  state?: string;
  lastChecked?: number;
}

class NodeStorage {
  /**
   * Get all stored nodes
   */
  async getAllNodes(): Promise<string[]> {
    try {
      const nodesJson = await AsyncStorage.getItem(NODES_STORAGE_KEY);
      if (nodesJson) {
        return JSON.parse(nodesJson);
      }
      // Return default nodes if none stored
      await this.saveNodes(DEFAULT_NODES);
      return DEFAULT_NODES;
    } catch (error) {
      console.error('Error getting nodes:', error);
      return DEFAULT_NODES;
    }
  }

  /**
   * Save nodes list
   */
  async saveNodes(nodes: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(NODES_STORAGE_KEY, JSON.stringify(nodes));
    } catch (error) {
      console.error('Error saving nodes:', error);
    }
  }

  /**
   * Add a new node
   */
  async addNode(url: string): Promise<void> {
    const nodes = await this.getAllNodes();
    if (!nodes.includes(url)) {
      nodes.push(url);
      await this.saveNodes(nodes);
    }
  }

  /**
   * Remove a node
   */
  async removeNode(url: string): Promise<void> {
    const nodes = await this.getAllNodes();
    const filtered = nodes.filter(n => n !== url);
    await this.saveNodes(filtered);
  }

  /**
   * Get node info from cache
   */
  async getNodeInfo(url: string): Promise<NodeInfo | null> {
    try {
      const infoKey = `@node_info_${url}`;
      const infoJson = await AsyncStorage.getItem(infoKey);
      if (infoJson) {
        return JSON.parse(infoJson);
      }
      return null;
    } catch (error) {
      console.error('Error getting node info:', error);
      return null;
    }
  }

  /**
   * Save node info to cache
   */
  async saveNodeInfo(url: string, info: NodeInfo): Promise<void> {
    try {
      const infoKey = `@node_info_${url}`;
      await AsyncStorage.setItem(infoKey, JSON.stringify({
        ...info,
        url,
        lastChecked: Date.now(),
      }));
    } catch (error) {
      console.error('Error saving node info:', error);
    }
  }

  /**
   * Clear all node info cache
   */
  async clearNodeInfoCache(): Promise<void> {
    try {
      const nodes = await this.getAllNodes();
      for (const node of nodes) {
        const infoKey = `@node_info_${node}`;
        await AsyncStorage.removeItem(infoKey);
      }
    } catch (error) {
      console.error('Error clearing node info cache:', error);
    }
  }
}

export default new NodeStorage();

