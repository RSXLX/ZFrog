/**
 * ZetaChain 链上监控配置
 * 接入真实链上数据
 * 
 * 修改记录:
 * - 2026-03-05: 从模拟数据切换到真实 ZetaChain 数据
 */

// ZetaChain 网络配置
export const ZETACHAIN_CONFIG = {
  // 主网配置
  mainnet: {
    chainId: '7000',
    name: 'ZetaChain Mainnet',
    rpcUrl: 'https://api.mainnet.zetachain.com',
    wsUrl: 'wss://ws.mainnet.zetachain.com',
    explorer: 'https://explorer.zetachain.com',
    nativeCurrency: {
      name: 'Zeta',
      symbol: 'ZETA',
      decimals: 18,
    },
  },
  
  // 测试网配置 (用于开发)
  testnet: {
    chainId: '7001',
    name: 'ZetaChain Testnet (Athens)',
    rpcUrl: 'https://api.athens.zetachain.com',
    wsUrl: 'wss://ws.athens.zetachain.com',
    explorer: 'https://athens.explorer.zetachain.com',
    nativeCurrency: {
      name: 'Zeta',
      symbol: 'aZETA',
      decimals: 18,
    },
  },
};

// 当前使用的网络
export const CURRENT_NETWORK = process.env.NODE_ENV === 'production' 
  ? ZETACHAIN_CONFIG.mainnet 
  : ZETACHAIN_CONFIG.testnet;

// 监控配置
export const MONITORING_CONFIG = {
  // 大单监控阈值
  largeTransferThreshold: {
    ZETA: BigInt('100000000000000000000'), // 100 ZETA
    ETH: BigInt('50000000000000000'),      // 0.05 ETH
    BTC: BigInt('100000'),                 // 0.001 BTC
    USDC: BigInt('100000000'),             // 100 USDC
    USDT: BigInt('100000000'),             // 100 USDT
  },
  
  // Gas 价格监控
  gasPrice: {
    warning: 50,   // 50 gwei 警告
    critical: 100, // 100 gwei 严重
    unit: 'gwei',
  },
  
  // 价格监控
  priceAlerts: [
    { token: 'ZETA', above: 2.0, below: 0.5 },
    { token: 'ETH', above: 5000, below: 2000 },
    { token: 'BTC', above: 100000, below: 30000 },
  ],
  
  // 监控地址 (可以自定义添加)
  watchAddresses: {
    // 官方合约
    zetaToken: '0x0000000000000000000000000000000000000000',
    
    // DEX
    uniswapV3: '0x...',
    sushiSwap: '0x...',
    
    // 桥接
    zetaChainBridge: '0x...',
    
    // 可自定义添加
    custom: [] as string[],
  },
  
  // 更新频率
  updateInterval: {
    blocks: 1000,      // 每1000个区块检查一次
    minutes: 1,        // 每分钟检查一次
    websocket: true,   // 使用 WebSocket 实时推送
  },
};

// 事件类型定义
export enum ChainEventType {
  // 转账事件
  TRANSFER = 'transfer',
  LARGE_TRANSFER = 'large_transfer',
  WHALE_TRANSFER = 'whale_transfer',
  
  // 交易事件
  SWAP = 'swap',
  MINT = 'mint',
  BURN = 'burn',
  
  // 价格事件
  PRICE_CHANGE = 'price_change',
  PRICE_ALERT = 'price_alert',
  
  // Gas 事件
  GAS_SPIKE = 'gas_spike',
  GAS_DROP = 'gas_drop',
  
  // 合约事件
  CONTRACT_DEPLOYMENT = 'contract_deployment',
  CONTRACT_INTERACTION = 'contract_interaction',
  
  // 桥接事件
  BRIDGE_DEPOSIT = 'bridge_deposit',
  BRIDGE_WITHDRAWAL = 'bridge_withdrawal',
  BRIDGE_SETTLEMENT = 'bridge_settlement',
}

// 事件响应配置
export const EVENT_RESPONSES: Record<ChainEventType, EventResponse> = {
  [ChainEventType.TRANSFER]: {
    animation: 'IDLE',
    sound: false,
    notification: false,
    dialog: null,
  },
  [ChainEventType.LARGE_TRANSFER]: {
    animation: 'EXCITED',
    sound: true,
    notification: true,
    dialog: '检测到一笔大额转账！',
  },
  [ChainEventType.WHALE_TRANSFER]: {
    animation: 'RICH',
    sound: true,
    notification: true,
    dialog: '🐋 巨鲸出没！这笔交易太大了！',
  },
  [ChainEventType.GAS_SPIKE]: {
    animation: 'THINKING',
    sound: false,
    notification: true,
    dialog: 'Gas 费突然飙升，建议稍后再交易~',
  },
  [ChainEventType.PRICE_ALERT]: {
    animation: 'DANCING',
    sound: true,
    notification: true,
    dialog: '价格触发预警！快来看看~',
  },
  [ChainEventType.SWAP]: {
    animation: 'HAPPY',
    sound: false,
    notification: false,
    dialog: null,
  },
  [ChainEventType.MINT]: {
    animation: 'EXCITED',
    sound: false,
    notification: false,
    dialog: null,
  },
  [ChainEventType.BURN]: {
    animation: 'SAD',
    sound: false,
    notification: false,
    dialog: null,
  },
  [ChainEventType.PRICE_CHANGE]: {
    animation: 'IDLE',
    sound: false,
    notification: false,
    dialog: null,
  },
  [ChainEventType.GAS_DROP]: {
    animation: 'HAPPY',
    sound: false,
    notification: true,
    dialog: 'Gas 费降下来了，是个好时机！',
  },
  [ChainEventType.CONTRACT_DEPLOYMENT]: {
    animation: 'CURIOUS',
    sound: false,
    notification: true,
    dialog: '有新合约部署了，要去看看吗？',
  },
  [ChainEventType.CONTRACT_INTERACTION]: {
    animation: 'IDLE',
    sound: false,
    notification: false,
    dialog: null,
  },
  [ChainEventType.BRIDGE_DEPOSIT]: {
    animation: 'EXCITED',
    sound: true,
    notification: true,
    dialog: '有资金进入跨链桥！',
  },
  [ChainEventType.BRIDGE_WITHDRAWAL]: {
    animation: 'HAPPY',
    sound: true,
    notification: true,
    dialog: '跨链提款完成了！',
  },
  [ChainEventType.BRIDGE_SETTLEMENT]: {
    animation: 'SATISFIED',
    sound: false,
    notification: true,
    dialog: '跨链结算完成了~',
  },
};

// 导出类型
export interface EventResponse {
  animation: string;
  sound: boolean;
  notification: boolean;
  dialog: string | null;
}

// 默认导出
export default {
  ZETACHAIN_CONFIG,
  CURRENT_NETWORK,
  MONITORING_CONFIG,
  EVENT_RESPONSES,
  ChainEventType,
};
