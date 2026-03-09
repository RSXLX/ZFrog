/**
 * ZetaChain Chain Monitor Service - With Bug Fixes
 * Enhanced version with better error handling and real-time monitoring
 */

import { ethers } from 'ethers';

// Event Types
export enum ChainEventType {
  TRANSFER = 'transfer',
  LARGE_TRANSFER = 'large_transfer',
  WHALE_TRANSFER = 'whale_transfer',
  SWAP = 'swap',
  MINT = 'mint',
  BURN = 'burn',
  PRICE_CHANGE = 'price_change',
  PRICE_ALERT = 'price_alert',
  GAS_SPIKE = 'gas_spike',
  GAS_DROP = 'gas_drop',
}

// ZetaChain Configuration
const ZETACHAIN_CONFIG = {
  mainnet: {
    chainId: '7000',
    name: 'ZetaChain Mainnet',
    rpcUrl: 'https://api.mainnet.zetachain.com',
    wsUrl: 'wss://ws.mainnet.zetachain.com',
    nativeCurrency: { name: 'Zeta', symbol: 'ZETA', decimals: 18 },
  },
  testnet: {
    chainId: '7001',
    name: 'ZetaChain Testnet',
    rpcUrl: 'https://api.athens.zetachain.com',
    wsUrl: 'wss://ws.athens.zetachain.com',
    nativeCurrency: { name: 'Zeta', symbol: 'aZETA', decimals: 18 },
  },
};

// Monitoring Thresholds
const THRESHOLDS = {
  largeTransfer: ethers.parseEther('100'),    // 100 ZETA
  whaleTransfer: ethers.parseEther('1000'),   // 1000 ZETA
  gasWarning: 50n,                            // 50 gwei
  gasCritical: 100n,                          // 100 gwei
};

// Event Types
export interface ChainEvent {
  id: string;
  type: ChainEventType;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
  from: string;
  to: string;
  value: string;
  gasPrice?: string;
  data?: Record<string, unknown>;
}

// Callback Types
export type EventCallback = (event: ChainEvent) => void;

// Chain Monitor Service
export class ChainMonitorService {
  private provider: ethers.JsonRpcProvider | null = null;
  private wsProvider: ethers.WebSocketProvider | null = null;
  private isRunning = false;
  private listeners: Map<ChainEventType, Set<EventCallback>> = new Map();
  private eventHistory: ChainEvent[] = [];
  private lastGasPrice = 0n;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    // Initialize listener maps
    Object.values(ChainEventType).forEach((type) => {
      this.listeners.set(type, new Set());
    });
  }

  // Initialize connection
  async initialize(): Promise<boolean> {
    try {
      console.log('[ChainMonitor] Initializing...');
      
      // Use testnet for development
      const network = ZETACHAIN_CONFIG.testnet;
      
      // Create HTTP provider
      this.provider = new ethers.JsonRpcProvider(network.rpcUrl);
      
      // Test connection
      const blockNumber = await this.provider.getBlockNumber();
      console.log(`[ChainMonitor] Connected. Block: ${blockNumber}`);
      
      // Get initial gas price
      const feeData = await this.provider.getFeeData();
      this.lastGasPrice = feeData.gasPrice || 0n;
      
      // Try WebSocket connection
      try {
        this.wsProvider = new ethers.WebSocketProvider(network.wsUrl);
        this.wsProvider.on('block', (block) => this.handleNewBlock(block));
        console.log('[ChainMonitor] WebSocket connected');
      } catch (wsError) {
        console.warn('[ChainMonitor] WebSocket failed, using polling:', wsError);
        // Fallback to polling
        this.startPolling();
      }
      
      this.isRunning = true;
      this.reconnectAttempts = 0;
      
      // Start gas monitoring
      this.startGasMonitoring();
      
      console.log('[ChainMonitor] Initialization complete');
      return true;
    } catch (error) {
      console.error('[ChainMonitor] Initialization failed:', error);
      this.handleReconnect();
      return false;
    }
  }

  // Handle reconnection
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[ChainMonitor] Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`[ChainMonitor] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => this.initialize(), delay);
  }

  // Start polling fallback
  private startPolling(): void {
    setInterval(async () => {
      if (!this.provider) return;
      try {
        const blockNumber = await this.provider.getBlockNumber();
        await this.handleNewBlock(blockNumber);
      } catch (error) {
        console.error('[ChainMonitor] Polling error:', error);
      }
    }, 15000); // Poll every 15 seconds
  }

  // Handle new block
  private async handleNewBlock(blockNumber: number): Promise<void> {
    try {
      if (!this.provider) return;
      
      const block = await this.provider.getBlock(blockNumber);
      if (!block) return;
      
      console.log(`[ChainMonitor] Block #${blockNumber}: ${block.transactions.length} txs`);
      
      // Analyze each transaction
      for (const txHash of block.transactions) {
        await this.analyzeTransaction(txHash as string, blockNumber);
      }
    } catch (error) {
      console.error(`[ChainMonitor] Block #${blockNumber} error:`, error);
    }
  }

  // Analyze transaction
  private async analyzeTransaction(txHash: string, blockNumber: number): Promise<void> {
    try {
      if (!this.provider) return;
      
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) return;
      
      // Check for large transfers
      if (tx.value >= THRESHOLDS.largeTransfer) {
        const isWhale = tx.value >= THRESHOLDS.whaleTransfer;
        
        const event: ChainEvent = {
          id: `${isWhale ? 'whale' : 'large'}-${Date.now()}-${txHash.slice(0, 8)}`,
          type: isWhale ? ChainEventType.WHALE_TRANSFER : ChainEventType.LARGE_TRANSFER,
          timestamp: Date.now(),
          blockNumber,
          transactionHash: txHash,
          from: tx.from || 'unknown',
          to: tx.to || 'unknown',
          value: ethers.formatEther(tx.value),
        };
        
        this.emitEvent(event);
      }
    } catch (error) {
      console.error(`[ChainMonitor] Tx ${txHash.slice(0, 8)} error:`, error);
    }
  }

  // Start gas monitoring
  private startGasMonitoring(): void {
    setInterval(async () => {
      try {
        if (!this.provider) return;
        
        const feeData = await this.provider.getFeeData();
        const currentGas = feeData.gasPrice || 0n;
        
        if (this.lastGasPrice > 0n) {
          const change = ((currentGas - this.lastGasPrice) * 100n) / this.lastGasPrice;
          
          if (currentGas >= THRESHOLDS.gasCritical && this.lastGasPrice < THRESHOLDS.gasCritical) {
            this.emitEvent({
              id: `gas-spike-${Date.now()}`,
              type: ChainEventType.GAS_SPIKE,
              timestamp: Date.now(),
              blockNumber: 0,
              transactionHash: '',
              from: 'network',
              to: 'network',
              value: '0',
              gasPrice: currentGas.toString(),
              data: { change: change.toString() },
            });
          }
        }
        
        this.lastGasPrice = currentGas;
      } catch (error) {
        console.error('[ChainMonitor] Gas monitoring error:', error);
      }
    }, 30000); // Every 30 seconds
  }

  // Emit event
  private emitEvent(event: ChainEvent): void {
    this.eventHistory.push(event);
    
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-1000);
    }
    
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error('[ChainMonitor] Listener error:', error);
        }
      });
    }
    
    console.log(`[ChainMonitor] Event: ${event.type}`, event);
  }

  // Add event listener
  addEventListener(type: ChainEventType, callback: EventCallback): () => void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.add(callback);
    }
    
    return () => {
      listeners?.delete(callback);
    };
  }

  // Get event history
  getEventHistory(type?: ChainEventType, limit: number = 100): ChainEvent[] {
    let events = this.eventHistory;
    
    if (type) {
      events = events.filter((e) => e.type === type);
    }
    
    return events.slice(-limit);
  }

  // Get status
  getStatus(): {
    isRunning: boolean;
    providerConnected: boolean;
    wsConnected: boolean;
    eventCount: number;
    lastGasPrice: string;
  } {
    return {
      isRunning: this.isRunning,
      providerConnected: this.provider !== null,
      wsConnected: this.wsProvider !== null,
      eventCount: this.eventHistory.length,
      lastGasPrice: this.lastGasPrice.toString(),
    };
  }

  // Stop monitoring
  async stop(): Promise<void> {
    console.log('[ChainMonitor] Stopping...');
    
    this.isRunning = false;
    
    if (this.wsProvider) {
      this.wsProvider.removeAllListeners();
      await this.wsProvider.destroy();
      this.wsProvider = null;
    }
    
    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
    }
    
    this.listeners.clear();
    
    console.log('[ChainMonitor] Stopped');
  }
}

// Singleton instance
export const chainMonitorService = new ChainMonitorService();

// Export types
export type { ChainEvent, EventCallback };

// Default export
export default chainMonitorService;
