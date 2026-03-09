/**
 * ZetaChain 链上监控服务
 * 接入真实链上数据，监控大额转账、Gas价格等事件
 * 
 * 修改记录:
 * - 2026-03-05: 从模拟数据切换到真实 ZetaChain 数据
 */

import { ethers } from 'ethers';
import {
  ZETACHAIN_CONFIG,
  CURRENT_NETWORK,
  MONITORING_CONFIG,
  EVENT_RESPONSES,
  ChainEventType,
} from '../config/chain';

// 事件回调类型
export type ChainEventCallback = (event: ChainEvent) => void;

// 链上事件数据结构
export interface ChainEvent {
  id: string;
  type: ChainEventType;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
  data: Record<string, unknown>;
  decoded?: Record<string, unknown>;
}

// 大额转账事件
export interface LargeTransferEvent extends ChainEvent {
  type: ChainEventType.LARGE_TRANSFER | ChainEventType.WHALE_TRANSFER;
  data: {
    from: string;
    to: string;
    value: string;
    token: string;
    tokenSymbol: string;
    tokenDecimals: number;
    usdValue?: number;
  };
}

// Gas 价格事件
export interface GasPriceEvent extends ChainEvent {
  type: ChainEventType.GAS_SPIKE | ChainEventType.GAS_DROP;
  data: {
    gasPrice: string;
    gasPriceGwei: number;
    previousGasPrice?: string;
    changePercent?: number;
  };
}

// 监控服务类
export class ChainMonitorService {
  private provider: ethers.Provider | null = null;
  private wsProvider: ethers.WebSocketProvider | null = null;
  private isRunning = false;
  private eventListeners: Map<ChainEventType, Set<ChainEventCallback>> = new Map();
  private lastGasPrice: bigint = BigInt(0);
  private eventHistory: ChainEvent[] = [];
  private readonly MAX_HISTORY_SIZE = 1000;
  
  // 单例实例
  private static instance: ChainMonitorService;
  
  static getInstance(): ChainMonitorService {
    if (!ChainMonitorService.instance) {
      ChainMonitorService.instance = new ChainMonitorService();
    }
    return ChainMonitorService.instance;
  }
  
  private constructor() {
    // 初始化事件监听器映射
    Object.values(ChainEventType).forEach((type) => {
      this.eventListeners.set(type as ChainEventType, new Set());
    });
  }
  
  // 初始化连接
  async initialize(): Promise<void> {
    try {
      console.log('[ChainMonitor] 正在初始化 ZetaChain 连接...');
      
      // 创建 HTTP Provider
      this.provider = new ethers.JsonRpcProvider(CURRENT_NETWORK.rpcUrl);
      
      // 测试连接
      const blockNumber = await this.provider.getBlockNumber();
      console.log(`[ChainMonitor] 连接成功，当前区块高度: ${blockNumber}`);
      
      // 获取初始 Gas 价格
      const feeData = await this.provider.getFeeData();
      this.lastGasPrice = feeData.gasPrice || BigInt(0);
      console.log(`[ChainMonitor] 初始 Gas 价格: ${ethers.formatUnits(this.lastGasPrice, 'gwei')} gwei`);
      
      // 尝试创建 WebSocket Provider (实时推送)
      try {
        this.wsProvider = new ethers.WebSocketProvider(CURRENT_NETWORK.wsUrl);
        console.log('[ChainMonitor] WebSocket 连接已建立');
        
        // 监听新区块
        this.wsProvider.on('block', (blockNumber) => {
          this.handleNewBlock(blockNumber);
        });
      } catch (wsError) {
        console.warn('[ChainMonitor] WebSocket 连接失败，将使用轮询模式:', wsError);
      }
      
      this.isRunning = true;
      
      // 启动 Gas 价格监控
      this.startGasPriceMonitoring();
      
      // 启动历史区块扫描
      this.startHistoricalBlockScan();
      
      console.log('[ChainMonitor] 初始化完成，开始监控链上事件');
    } catch (error) {
      console.error('[ChainMonitor] 初始化失败:', error);
      throw error;
    }
  }
  
  // 处理新区块
  private async handleNewBlock(blockNumber: number): Promise<void> {
    try {
      if (!this.provider) return;
      
      // 获取区块详情
      const block = await this.provider.getBlock(blockNumber);
      if (!block) return;
      
      console.log(`[ChainMonitor] 新区块 #${blockNumber}, 包含 ${block.transactions.length} 笔交易`);
      
      // 分析每笔交易
      for (const txHash of block.transactions) {
        await this.analyzeTransaction(txHash as string, blockNumber);
      }
    } catch (error) {
      console.error(`[ChainMonitor] 处理区块 #${blockNumber} 失败:`, error);
    }
  }
  
  // 分析交易
  private async analyzeTransaction(txHash: string, blockNumber: number): Promise<void> {
    try {
      if (!this.provider) return;
      
      // 获取交易详情
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) return;
      
      // 获取交易收据
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt || receipt.status !== 1) return; // 只处理成功交易
      
      // 计算交易价值
      const value = tx.value;
      
      // 检查是否是大额转账 (使用 ZETA 代币)
      const threshold = MONITORING_CONFIG.largeTransferThreshold.ZETA;
      
      if (value >= threshold) {
        // 这是大额转账
        const isWhale = value >= threshold * BigInt(10); // 超过阈值10倍认为是巨鲸
        
        const event: LargeTransferEvent = {
          id: `large-transfer-${Date.now()}-${txHash}`,
          type: isWhale ? ChainEventType.WHALE_TRANSFER : ChainEventType.LARGE_TRANSFER,
          timestamp: Date.now(),
          blockNumber,
          transactionHash: txHash,
          data: {
            from: tx.from,
            to: tx.to || '',
            value: value.toString(),
            token: 'ZETA',
            tokenSymbol: 'ZETA',
            tokenDecimals: 18,
            usdValue: undefined, // 可以后续添加价格转换
          },
        };
        
        this.emitEvent(event);
      }
      
      // 解析交易日志 (ERC20 转账等)
      for (const log of receipt.logs) {
        await this.parseEventLog(log, txHash, blockNumber);
      }
    } catch (error) {
      console.error(`[ChainMonitor] 分析交易 ${txHash} 失败:`, error);
    }
  }
  
  // 解析事件日志
  private async parseEventLog(
    log: ethers.Log,
    txHash: string,
    blockNumber: number
  ): Promise<void> {
    try {
      // ERC20 Transfer 事件签名: Transfer(address indexed from, address indexed to, uint256 value)
      const transferSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      
      if (log.topics[0] === transferSignature) {
        // 解析 ERC20 转账
        const from = '0x' + log.topics[1].slice(26);
        const to = '0x' + log.topics[2].slice(26);
        const value = BigInt(log.data);
        
        // 获取代币信息 (这里简化处理，实际应该查询代币合约)
        const tokenAddress = log.address;
        
        // 检查是否是大额转账
        // 这里需要根据具体代币的阈值来判断
        // 简化处理：只记录事件，不判断阈值
        
        console.log(`[ChainMonitor] ERC20 转账: ${from} -> ${to}, 价值: ${value.toString()}, 代币: ${tokenAddress}`);
      }
    } catch (error) {
      console.error('[ChainMonitor] 解析事件日志失败:', error);
    }
  }
  
  // Gas 价格监控
  private async checkGasPrice(): Promise<void> {
    try {
      if (!this.provider) return;
      
      const feeData = await this.provider.getFeeData();
      const currentGasPrice = feeData.gasPrice || BigInt(0);
      
      // 转换为 gwei
      const currentGwei = Number(ethers.formatUnits(currentGasPrice, 'gwei'));
      const previousGwei = Number(ethers.formatUnits(this.lastGasPrice, 'gwei'));
      
      // 判断是否触发事件
      if (this.lastGasPrice !== BigInt(0)) {
        const changePercent = previousGwei > 0 
          ? ((currentGwei - previousGwei) / previousGwei) * 100 
          : 0;
        
        // Gas 飙升
        if (currentGwei >= MONITORING_CONFIG.gasPrice.critical && previousGwei < MONITORING_CONFIG.gasPrice.critical) {
          const event: GasPriceEvent = {
            id: `gas-spike-${Date.now()}`,
            type: ChainEventType.GAS_SPIKE,
            timestamp: Date.now(),
            blockNumber: 0, // 可以通过 provider 获取
            transactionHash: '',
            data: {
              gasPrice: currentGasPrice.toString(),
              gasPriceGwei: currentGwei,
              previousGasPrice: this.lastGasPrice.toString(),
              changePercent,
            },
          };
          
          this.emitEvent(event);
        }
        
        // Gas 下降
        if (currentGwei <= MONITORING_CONFIG.gasPrice.warning && previousGwei > MONITORING_CONFIG.gasPrice.warning) {
          const event: GasPriceEvent = {
            id: `gas-drop-${Date.now()}`,
            type: ChainEventType.GAS_DROP,
            timestamp: Date.now(),
            blockNumber: 0,
            transactionHash: '',
            data: {
              gasPrice: currentGasPrice.toString(),
              gasPriceGwei: currentGwei,
              previousGasPrice: this.lastGasPrice.toString(),
              changePercent,
            },
          };
          
          this.emitEvent(event);
        }
      }
      
      // 更新上次价格
      this.lastGasPrice = currentGasPrice;
    } catch (error) {
      console.error('[ChainMonitor] Gas 价格检查失败:', error);
    }
  }
  
  // 启动 Gas 价格监控
  private startGasPriceMonitoring(): void {
    // 立即检查一次
    this.checkGasPrice();
    
    // 每 30 秒检查一次
    setInterval(() => {
      this.checkGasPrice();
    }, 30000);
  }
  
  // 启动历史区块扫描
  private async startHistoricalBlockScan(): Promise<void> {
    try {
      if (!this.provider) return;
      
      // 只扫描最近的 10 个区块
      const currentBlock = await this.provider.getBlockNumber();
      const startBlock = Math.max(0, currentBlock - 10);
      
      console.log(`[ChainMonitor] 开始扫描历史区块 #${startBlock} 到 #${currentBlock}`);
      
      for (let i = startBlock; i <= currentBlock; i++) {
        await this.handleNewBlock(i);
      }
      
      console.log('[ChainMonitor] 历史区块扫描完成');
    } catch (error) {
      console.error('[ChainMonitor] 历史区块扫描失败:', error);
    }
  }
  
  // 添加事件监听器
  addEventListener(eventType: ChainEventType, callback: ChainEventCallback): () => void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.add(callback);
    }
    
    // 返回取消订阅函数
    return () => {
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }
  
  // 移除事件监听器
  removeEventListener(eventType: ChainEventType, callback: ChainEventCallback): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
    }
  }
  
  // 触发事件
  private emitEvent(event: ChainEvent): void {
    // 添加到历史记录
    this.eventHistory.push(event);
    
    // 限制历史记录大小
    if (this.eventHistory.length > this.MAX_HISTORY_SIZE) {
      this.eventHistory = this.eventHistory.slice(-this.MAX_HISTORY_SIZE);
    }
    
    // 通知监听器
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error(`[ChainMonitor] 事件监听器执行失败:`, error);
        }
      });
    }
    
    // 同时通知通配符监听器 (监听所有事件类型)
    const wildcardListeners = this.eventListeners.get('*' as ChainEventType);
    if (wildcardListeners) {
      wildcardListeners.forEach((callback) => {
        try {
          callback(event);
        } catch (error) {
          console.error(`[ChainMonitor] 通配符监听器执行失败:`, error);
        }
      });
    }
    
    console.log(`[ChainMonitor] 事件触发: ${event.type}`, event);
  }
  
  // 获取事件历史
  getEventHistory(eventType?: ChainEventType, limit: number = 100): ChainEvent[] {
    let events = this.eventHistory;
    
    if (eventType) {
      events = events.filter((e) => e.type === eventType);
    }
    
    return events.slice(-limit);
  }
  
  // 获取当前状态
  getStatus(): {
    isRunning: boolean;
    providerConnected: boolean;
    wsConnected: boolean;
    lastGasPrice: string;
    eventCount: number;
  } {
    return {
      isRunning: this.isRunning,
      providerConnected: this.provider !== null,
      wsConnected: this.wsProvider !== null,
      lastGasPrice: this.lastGasPrice.toString(),
      eventCount: this.eventHistory.length,
    };
  }
  
  // 停止监控
  async stop(): Promise<void> {
    console.log('[ChainMonitor] 正在停止监控...');
    
    this.isRunning = false;
    
    // 关闭 WebSocket 连接
    if (this.wsProvider) {
      this.wsProvider.removeAllListeners();
      await this.wsProvider.destroy();
      this.wsProvider = null;
    }
    
    // 关闭 HTTP Provider
    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
    }
    
    // 清除所有监听器
    this.eventListeners.clear();
    
    console.log('[ChainMonitor] 监控已停止');
  }
}

// 导出单例实例
export const chainMonitor = ChainMonitorService.getInstance();

// 导出类型
export type {
  ChainEvent,
  ChainEventCallback,
  LargeTransferEvent,
  GasPriceEvent,
};

// 默认导出
export default chainMonitor;
