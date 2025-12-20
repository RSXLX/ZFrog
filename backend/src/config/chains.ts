// backend/src/config/chains.ts

export const SUPPORTED_CHAINS = {
  BSC_TESTNET: {
    name: 'BSC 测试网',
    displayName: '币安测试链',
    chainId: 97,
    rpcUrl: process.env.BSC_TESTNET_RPC || 'https://bsc-testnet.publicnode.com',
    nativeSymbol: 'tBNB',
    explorerUrl: 'https://testnet.bscscan.com',
    genesisTimestamp: new Date('2020-08-31'),
    avgBlockTime: 3,
    // 旅行相关
    scenery: '繁华的测试市集',
    vibe: '热闹',
  },
  ETH_SEPOLIA: {
    name: 'Sepolia 测试网',
    displayName: '以太坊测试链',
    chainId: 11155111,
    rpcUrl: process.env.ETH_SEPOLIA_RPC || 'https://rpc.sepolia.org',
    nativeSymbol: 'SepoliaETH',
    explorerUrl: 'https://sepolia.etherscan.io',
    genesisTimestamp: new Date('2022-06-20'),
    avgBlockTime: 12,
    scenery: '古老的以太坊街道',
    vibe: '怀旧',
  },
  ZETACHAIN_ATHENS: {
    name: 'ZetaChain Athens',
    displayName: 'ZetaChain 测试链',
    chainId: 7001,
    rpcUrl: process.env.ZETA_ATHENS_RPC || 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public',
    nativeSymbol: 'aZETA',
    explorerUrl: 'https://athens.explorer.zetachain.com',
    genesisTimestamp: new Date('2023-02-01'),
    avgBlockTime: 6,
    scenery: '连接各个世界的彩虹桥',
    vibe: '新奇',
  },
} as const;

export type ChainKey = keyof typeof SUPPORTED_CHAINS;
export const CHAIN_KEYS = Object.keys(SUPPORTED_CHAINS) as ChainKey[];
