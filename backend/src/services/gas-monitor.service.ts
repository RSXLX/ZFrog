/**
 * Gas Monitor Service
 * 
 * 监测链上 Gas 价格变化，检测异动
 */

import { createPublicClient, http, formatGwei } from 'viem';
import { bscTestnet, sepolia } from 'viem/chains';
import { zetachainAthensTestnet } from 'viem/chains';
import { config } from '../config';
import { logger } from '../utils/logger';

interface GasSnapshot {
  chainId: number;
  gasPrice: bigint;
  timestamp: Date;
}

interface GasStatus {
  chainId: number;
  chainName: string;
  currentGas: bigint;
  currentGasFormatted: string;
  avg24h: bigint;
  avg24hFormatted: string;
  trend: 'spike' | 'normal' | 'low';
  changePercent: number;
}

interface LargeTransaction {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  valueFormatted: string;
  chainId: number;
  blockNumber: bigint;
  timestamp: Date;
}

// 配置
const CHAIN_CONFIGS = {
  BSC_TESTNET: {
    chainId: 97,
    name: 'BSC Testnet',
    chain: bscTestnet,
    rpcUrl: config.BSC_TESTNET_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com',
    nativeSymbol: 'tBNB',
    largeThreshold: 10n * 10n ** 18n, // 10 tBNB
  },
  ETH_SEPOLIA: {
    chainId: 11155111,
    name: 'Sepolia',
    chain: sepolia,
    rpcUrl: config.ETH_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
    nativeSymbol: 'SepoliaETH',
    largeThreshold: 10n * 10n ** 18n, // 10 ETH
  },
  ZETACHAIN_ATHENS: {
    chainId: 7001,
    name: 'ZetaChain Athens',
    chain: zetachainAthensTestnet,
    rpcUrl: config.ZETACHAIN_RPC_URL || 'https://zetachain-athens.g.allthatnode.com/archive/evm',
    nativeSymbol: 'aZETA',
    largeThreshold: 100n * 10n ** 18n, // 100 ZETA
  },
};

class GasMonitorService {
  // Gas 历史记录 (每 10 分钟采样，保留 144 个点 = 24 小时)
  private gasHistory: Map<number, GasSnapshot[]> = new Map();
  private clients: Map<string, ReturnType<typeof createPublicClient>> = new Map();
  
  constructor() {
    // 初始化客户端
    for (const [key, chainConfig] of Object.entries(CHAIN_CONFIGS)) {
      this.clients.set(key, createPublicClient({
        chain: chainConfig.chain as any,
        transport: http(chainConfig.rpcUrl),
      }) as any);
      this.gasHistory.set(chainConfig.chainId, []);
    }
  }
  
  /**
   * 更新 Gas 快照
   */
  async updateGasSnapshot(chain: string): Promise<GasSnapshot | null> {
    const client = this.clients.get(chain);
    const chainConfig = CHAIN_CONFIGS[chain as keyof typeof CHAIN_CONFIGS];
    
    if (!client || !chainConfig) {
      return null;
    }
    
    try {
      const gasPrice = await client.getGasPrice();
      
      const snapshot: GasSnapshot = {
        chainId: chainConfig.chainId,
        gasPrice,
        timestamp: new Date(),
      };
      
      // 添加到历史记录
      const history = this.gasHistory.get(chainConfig.chainId) || [];
      history.push(snapshot);
      
      // 只保留最近 144 个点 (24 小时)
      if (history.length > 144) {
        history.shift();
      }
      
      this.gasHistory.set(chainConfig.chainId, history);
      
      return snapshot;
    } catch (error) {
      logger.error(`[GasMonitor] Error updating gas for ${chain}:`, error);
      return null;
    }
  }
  
  /**
   * 更新所有链的 Gas
   */
  async updateAllGas(): Promise<void> {
    const promises = Object.keys(CHAIN_CONFIGS).map(chain => 
      this.updateGasSnapshot(chain)
    );
    await Promise.all(promises);
    logger.info('[GasMonitor] Updated gas snapshots for all chains');
  }
  
  /**
   * 计算 24 小时平均 Gas
   */
  calculateAverage(chainId: number): bigint {
    const history = this.gasHistory.get(chainId) || [];
    if (history.length === 0) {
      return 0n;
    }
    
    const sum = history.reduce((acc, s) => acc + s.gasPrice, 0n);
    return sum / BigInt(history.length);
  }
  
  /**
   * 检测 Gas 异动
   */
  detectAnomaly(current: bigint, avg: bigint): 'spike' | 'normal' | 'low' {
    if (avg === 0n) return 'normal';
    
    const ratio = (current * 100n) / avg;
    
    if (ratio > 200n) return 'spike';  // > 2x 均值
    if (ratio < 50n) return 'low';     // < 0.5x 均值
    return 'normal';
  }
  
  /**
   * 获取 Gas 状态
   */
  async getGasStatus(chain: string): Promise<GasStatus | null> {
    const chainConfig = CHAIN_CONFIGS[chain as keyof typeof CHAIN_CONFIGS];
    const client = this.clients.get(chain);
    
    if (!chainConfig || !client) {
      return null;
    }
    
    try {
      const currentGas = await client.getGasPrice();
      const avg24h = this.calculateAverage(chainConfig.chainId);
      const trend = this.detectAnomaly(currentGas, avg24h);
      
      const changePercent = avg24h > 0n 
        ? Number((currentGas - avg24h) * 100n / avg24h)
        : 0;
      
      return {
        chainId: chainConfig.chainId,
        chainName: chainConfig.name,
        currentGas,
        currentGasFormatted: `${formatGwei(currentGas)} Gwei`,
        avg24h,
        avg24hFormatted: avg24h > 0n ? `${formatGwei(avg24h)} Gwei` : 'N/A',
        trend,
        changePercent,
      };
    } catch (error) {
      logger.error(`[GasMonitor] Error getting gas status for ${chain}:`, error);
      return null;
    }
  }
  
  /**
   * 获取所有链的 Gas 状态
   */
  async getAllGasStatus(): Promise<GasStatus[]> {
    const statuses: GasStatus[] = [];
    
    for (const chain of Object.keys(CHAIN_CONFIGS)) {
      const status = await this.getGasStatus(chain);
      if (status) {
        statuses.push(status);
      }
    }
    
    return statuses;
  }
  
  /**
   * 检测大额交易
   */
  async detectLargeTransactions(chain: string): Promise<LargeTransaction[]> {
    const client = this.clients.get(chain);
    const chainConfig = CHAIN_CONFIGS[chain as keyof typeof CHAIN_CONFIGS];
    
    if (!client || !chainConfig) {
      return [];
    }
    
    try {
      const block = await client.getBlock({ 
        blockTag: 'latest', 
        includeTransactions: true 
      });
      
      if (!block.transactions || typeof block.transactions[0] === 'string') {
        return [];
      }
      
      const largeTxs: LargeTransaction[] = [];
      
      for (const tx of block.transactions) {
        if (typeof tx === 'string') continue;
        
        if (tx.value >= chainConfig.largeThreshold) {
          largeTxs.push({
            hash: tx.hash,
            from: tx.from,
            to: tx.to,
            value: tx.value.toString(),
            valueFormatted: `${Number(tx.value / 10n ** 18n)} ${chainConfig.nativeSymbol}`,
            chainId: chainConfig.chainId,
            blockNumber: block.number,
            timestamp: new Date(Number(block.timestamp) * 1000),
          });
        }
      }
      
      if (largeTxs.length > 0) {
        logger.info(`[GasMonitor] Found ${largeTxs.length} large transactions on ${chain}`);
      }
      
      return largeTxs;
    } catch (error) {
      logger.error(`[GasMonitor] Error detecting large txs on ${chain}:`, error);
      return [];
    }
  }
  
  /**
   * 检测所有链的大额交易
   */
  async detectAllLargeTransactions(): Promise<LargeTransaction[]> {
    const allTxs: LargeTransaction[] = [];
    
    for (const chain of Object.keys(CHAIN_CONFIGS)) {
      const txs = await this.detectLargeTransactions(chain);
      allTxs.push(...txs);
    }
    
    return allTxs;
  }
  
  /**
   * 生成 Gas 报告描述
   */
  generateGasReport(status: GasStatus): string {
    const trendEmoji = {
      spike: '🔥 Gas 飙升！',
      normal: '⚡ Gas 正常',
      low: '💤 Gas 很低',
    };
    
    return `${status.chainName}: ${status.currentGasFormatted} ${trendEmoji[status.trend]} (${status.changePercent > 0 ? '+' : ''}${status.changePercent}%)`;
  }
  
  /**
   * 生成大额交易描述
   */
  generateLargeTxReport(tx: LargeTransaction): string {
    const chainName = Object.values(CHAIN_CONFIGS).find(c => c.chainId === tx.chainId)?.name || 'Unknown';
    return `🐋 巨鲸出没！${chainName} 发现 ${tx.valueFormatted} 转账！`;
  }
}

export const gasMonitorService = new GasMonitorService();
