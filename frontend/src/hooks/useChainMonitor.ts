import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  ChainEvent, 
  WhaleAlert, 
  ChainMonitorState 
} from '../types/frogAnimation';

// 监控配置
const MONITOR_CONFIG = {
  // 大单阈值 (USD)
  largeTradeThreshold: 100000,
  // 巨鲸阈值 (USD)
  whaleThreshold: 1000000,
  // 价格变化警报阈值 (%)
  priceAlertThreshold: 5,
  // 监控的代币地址
  watchedTokens: [
    { address: '0x...', symbol: 'ZETA', decimals: 18 },
    { address: '0x...', symbol: 'ETH', decimals: 18 },
  ],
  // 监控的鲸鱼地址
  watchedWhales: [
    '0x...', // 已知鲸鱼地址
  ],
  // 轮询间隔 (ms)
  pollInterval: 10000,
};

// 模拟数据生成器
const mockDataGenerator = {
  // 生成随机链上事件
  generateRandomEvent: (): ChainEvent => {
    const events: ChainEvent['type'][] = ['large_buy', 'large_sell', 'whale_transfer', 'new_listing', 'price_change'];
    const tokens = ['ZETA', 'ETH', 'BTC', 'USDT'];
    const type = events[Math.floor(Math.random() * events.length)];
    const token = tokens[Math.floor(Math.random() * tokens.length)];
    
    return {
      type,
      token,
      value: Math.random() * 500000 + 50000,
      from: `0x${Math.random().toString(16).substr(2, 8)}...`,
      to: `0x${Math.random().toString(16).substr(2, 8)}...`,
      timestamp: Date.now(),
      txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
    };
  },
  
  // 生成随机鲸鱼警报
  generateWhaleAlert: (): WhaleAlert => {
    const tokens = ['ZETA', 'ETH', 'BTC'];
    const direction = Math.random() > 0.5 ? 'in' : 'out';
    
    return {
      address: `0x${Math.random().toString(16).substr(2, 8)}...`,
      amount: Math.random() * 5000000 + 1000000,
      token: tokens[Math.floor(Math.random() * tokens.length)],
      direction,
      timestamp: Date.now(),
    };
  },
  
  // 生成随机Gas价格
  generateGasPrice: () => {
    return BigInt(Math.floor(Math.random() * 50 + 10) * 1e9); // 10-60 Gwei
  },
  
  // 生成随机价格变化
  generatePriceChange: () => {
    return (Math.random() - 0.5) * 30; // -15% 到 +15%
  },
};

export function useChainMonitor() {
  const [state, setState] = useState<ChainMonitorState>({
    latestEvent: null,
    priceChange: 0,
    whaleAlert: null,
    gasPrice: BigInt(0),
    isConnected: false,
    events: [],
  });
  
  const priceHistoryRef = useRef<Map<string, number[]>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 初始化连接
  useEffect(() => {
    // 模拟连接成功
    setTimeout(() => {
      setState(prev => ({ ...prev, isConnected: true }));
    }, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  // 监控大额转账
  const monitorLargeTransfers = useCallback(async () => {
    try {
      // 模拟获取链上数据
      const randomEvent = Math.random();
      
      if (randomEvent > 0.8) {
        const event = mockDataGenerator.generateRandomEvent();
        
        // 根据事件类型判断是否为大额交易
        if (event.value >= MONITOR_CONFIG.largeTradeThreshold) {
          addEvent(event);
          
          // 检查是否为鲸鱼交易
          if (event.value >= MONITOR_CONFIG.whaleThreshold) {
            const whaleAlert = mockDataGenerator.generateWhaleAlert();
            setState(prev => ({ ...prev, whaleAlert }));
          }
        }
      }
    } catch (error) {
      console.error('监控大额转账失败:', error);
    }
  }, []);
  
  // 监控价格变化
  const monitorPriceChanges = useCallback(async () => {
    try {
      const priceChange = mockDataGenerator.generatePriceChange();
      
      if (Math.abs(priceChange) >= MONITOR_CONFIG.priceAlertThreshold) {
        setState(prev => ({ ...prev, priceChange }));
        
        addEvent({
          type: 'price_change',
          token: 'ZETA',
          value: priceChange,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('监控价格变化失败:', error);
    }
  }, []);
  
  // 监控 Gas 价格
  const monitorGasPrice = useCallback(async () => {
    try {
      const gasPrice = mockDataGenerator.generateGasPrice();
      setState(prev => ({ ...prev, gasPrice }));
    } catch (error) {
      console.error('获取 Gas 价格失败:', error);
    }
  }, []);
  
  // 添加事件
  const addEvent = useCallback((event: ChainEvent) => {
    setState(prev => ({
      ...prev,
      latestEvent: event,
      events: [event, ...prev.events].slice(0, 50), // 保留最近 50 条
    }));
  }, []);
  
  // 启动监控
  useEffect(() => {
    if (!state.isConnected) return;
    
    intervalRef.current = setInterval(() => {
      monitorLargeTransfers();
      monitorPriceChanges();
      monitorGasPrice();
    }, MONITOR_CONFIG.pollInterval);
    
    // 立即执行一次
    monitorLargeTransfers();
    monitorPriceChanges();
    monitorGasPrice();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isConnected, monitorLargeTransfers, monitorPriceChanges, monitorGasPrice]);
  
  // 手动刷新
  const refresh = useCallback(() => {
    monitorLargeTransfers();
    monitorPriceChanges();
    monitorGasPrice();
  }, [monitorLargeTransfers, monitorPriceChanges, monitorGasPrice]);
  
  // 清除警报
  const clearAlerts = useCallback(() => {
    setState(prev => ({
      ...prev,
      latestEvent: null,
      whaleAlert: null,
      priceChange: 0,
    }));
  }, []);
  
  // 模拟实时事件推送
  useEffect(() => {
    if (!state.isConnected) return;
    
    const pushInterval = setInterval(() => {
      const random = Math.random();
      
      if (random > 0.95) {
        // 5% 概率推送大事件
        const event = mockDataGenerator.generateRandomEvent();
        addEvent(event);
        
        if (event.value >= MONITOR_CONFIG.whaleThreshold) {
          const whaleAlert = mockDataGenerator.generateWhaleAlert();
          setState(prev => ({ ...prev, whaleAlert }));
        }
      }
    }, 5000); // 每5秒检查一次
    
    return () => clearInterval(pushInterval);
  }, [state.isConnected, addEvent]);
  
  return {
    ...state,
    refresh,
    clearAlerts,
  };
}

// 辅助函数：获取代币价格
async function getTokenPrice(symbol: string): Promise<number> {
  try {
    // 模拟价格获取
    const prices: Record<string, number> = {
      'ETH': 2000 + Math.random() * 200,
      'ZETA': 0.5 + Math.random() * 0.1,
      'BTC': 40000 + Math.random() * 2000,
      'USDT': 1.0,
    };
    return prices[symbol] || 0;
  } catch {
    return 0;
  }
}

function getCoingeckoId(symbol: string): string {
  const mapping: Record<string, string> = {
    'ETH': 'ethereum',
    'ZETA': 'zetachain',
    'BTC': 'bitcoin',
  };
  return mapping[symbol] || symbol.toLowerCase();
}

function isKnownDex(address?: string): boolean {
  if (!address) return false;
  const dexAddresses = [
    '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router
    '0xE592427A0AEce92De3Edee1F18E0157C05861564', // Uniswap V3 Router
    // ... 更多 DEX 地址
  ];
  return dexAddresses.includes(address.toLowerCase());
}