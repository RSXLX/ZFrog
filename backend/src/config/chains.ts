// backend/src/config/chains.ts

export const SUPPORTED_CHAINS = {
  BSC_TESTNET: {
    name: 'BSC 测试网',
    displayName: '币安测试链',
    chainId: 97,
    rpcUrl: process.env.BSC_TESTNET_RPC || 'https://bsc-testnet.publicnode.com',
    nativeSymbol: 'tBNB',
    explorerUrl: 'https://testnet.bscscan.com',
    explorerApiUrl: 'https://api-testnet.bscscan.com/api',  // 新增
    genesisTimestamp: new Date('2020-08-31'),
    avgBlockTime: 3,
    scenery: '繁华的测试市集',
    vibe: '热闹',
    // 新增：跨链配置
    isZetaSupported: true,
    zetaConnector: null,  // 如果有部署
    commonTokens: {
      'USDT': '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
      'USDC': '0x64544969ed7EBf5f083679233325356EbE738930',
      'WBNB': '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
    }
  },
  
  ETH_SEPOLIA: {
    name: 'Sepolia 测试网',
    displayName: '以太坊测试链',
    chainId: 11155111,
    rpcUrl: process.env.ETH_SEPOLIA_RPC || 'https://ethereum-sepolia.core.chainstack.com/957f76502df7cde9b0b45870eb2fda46',
    nativeSymbol: 'SepoliaETH',
    explorerUrl: 'https://sepolia.etherscan.io',
    explorerApiUrl: 'https://api-sepolia.etherscan.io/api',  // 新增
    genesisTimestamp: new Date('2022-06-20'),
    avgBlockTime: 12,
    scenery: '古老的以太坊街道',
    vibe: '怀旧',
    isZetaSupported: true,
    zetaConnector: null,
    commonTokens: {
      'USDT': '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
      'USDC': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      'WETH': '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
    }
  },
  
  ZETACHAIN_ATHENS: {
    name: 'ZetaChain Athens',
    displayName: 'ZetaChain 测试链',
    chainId: 7001,
    rpcUrl: process.env.ZETA_ATHENS_RPC || 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public',
    nativeSymbol: 'aZETA',
    explorerUrl: 'https://athens.explorer.zetachain.com',
    explorerApiUrl: 'https://zetachain-athens.blockscout.com/api',  // 新增
    genesisTimestamp: new Date('2023-02-01'),
    avgBlockTime: 6,
    scenery: '连接各个世界的彩虹桥',
    vibe: '新奇',
    isZetaSupported: true,
    isMainChain: true,  // 新增：主链标识
    zetaConnector: null,
    commonTokens: {
      'aUSDC': '0x5353b4556B447C2c0A0e65e7c6043d2F3ba648C4',
      'aUSDT': '0x07865c6E87B9F70255377e024ace6630C1Eaa37F',
      'WZETA': '0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf',
    }
  },
  
  // 新增：Polygon Mumbai
  POLYGON_MUMBAI: {
    name: 'Polygon Mumbai',
    displayName: 'Polygon 测试链',
    chainId: 80001,
    rpcUrl: process.env.POLYGON_MUMBAI_RPC || 'https://rpc-mumbai.maticvigil.com',
    nativeSymbol: 'MATIC',
    explorerUrl: 'https://mumbai.polygonscan.com',
    explorerApiUrl: 'https://api-testnet.polygonscan.com/api',
    genesisTimestamp: new Date('2020-05-30'),
    avgBlockTime: 2,
    scenery: '紫色的魔法城堡',
    vibe: '魔幻',
    isZetaSupported: true,
    zetaConnector: null,
    commonTokens: {
      'USDT': '0xA02f6adc7926efeBBd59Fd43B84E8C9951DacA28',
      'USDC': '0x41e94eb019c0762f9bfcf9f248664db355169cbe',
      'WMATIC': '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
    }
  },
  
  // 新增：Arbitrum Goerli
  ARBITRUM_GOERLI: {
    name: 'Arbitrum Goerli',
    displayName: 'Arbitrum 测试链',
    chainId: 421613,
    rpcUrl: process.env.ARBITRUM_GOERLI_RPC || 'https://goerli-rollup.arbitrum.io/rpc',
    nativeSymbol: 'AGOR',
    explorerUrl: 'https://goerli.arbiscan.io',
    explorerApiUrl: 'https://api-goerli.arbiscan.io/api',
    genesisTimestamp: new Date('2022-06-21'),
    avgBlockTime: 1,
    scenery: '高速运转的蓝色隧道',
    vibe: '科技',
    isZetaSupported: true,
    zetaConnector: null,
    commonTokens: {
      'USDT': '0x50fbfd74e50882a88a0e81e3a650d99dc0749033', // Fake
      'USDC': '0x8fb1e3fc51f3b789ded7557e680551d93ea9d892', // Fake
      'WETH': '0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3',
    }
  },
} as const;

export type ChainKey = keyof typeof SUPPORTED_CHAINS;
export const CHAIN_KEYS = Object.keys(SUPPORTED_CHAINS) as ChainKey[];

// 新增：chainId 到 ChainKey 的映射
export const CHAIN_ID_TO_KEY: Record<number, ChainKey> = {
  97: 'BSC_TESTNET',
  11155111: 'ETH_SEPOLIA',
  7001: 'ZETACHAIN_ATHENS',
  80001: 'POLYGON_MUMBAI',
  421613: 'ARBITRUM_GOERLI',
};

// 新增：获取链配置的辅助函数
export function getChainConfig(chainIdOrKey: number | ChainKey) {
  if (typeof chainIdOrKey === 'number') {
    const key = CHAIN_ID_TO_KEY[chainIdOrKey];
    if (!key) throw new Error(`Unsupported chain ID: ${chainIdOrKey}`);
    return SUPPORTED_CHAINS[key];
  }
  return SUPPORTED_CHAINS[chainIdOrKey];
}

export function getChainKey(chainId: number): ChainKey {
  const key = CHAIN_ID_TO_KEY[chainId];
  if (!key) throw new Error(`Unsupported chain ID: ${chainId}`);
  return key;
}
