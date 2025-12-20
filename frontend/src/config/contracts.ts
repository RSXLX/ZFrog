// frontend/src/config/contracts.ts

// 🔧 修复：安全的地址类型转换
const getAddress = (envVar: string | undefined): `0x${string}` | undefined => {
  if (!envVar) return undefined;
  if (!envVar.startsWith('0x')) return undefined;
  return envVar as `0x${string}`;
};

export const ZETAFROG_ADDRESS = getAddress(import.meta.env.VITE_ZETAFROG_ADDRESS);
export const SOUVENIR_ADDRESS = getAddress(import.meta.env.VITE_SOUVENIR_ADDRESS);

// ZetaFrogNFT ABI (与合约完全匹配)
export const ZETAFROG_ABI = [
  // === 写入函数 ===
  {
    inputs: [{"internalType": "string", "name": "name", "type": "string"}],
    name: 'mintFrog',
    outputs: [{"internalType": "uint256", "name": "", "type": "uint256"}],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      {"internalType": "uint256", "name": "tokenId", "type": "uint256"},
      {"internalType": "address", "name": "targetWallet", "type": "address"},
      {"internalType": "uint256", "name": "duration", "type": "uint256"},
      {"internalType": "uint256", "name": "targetChainId", "type": "uint256"}
    ],
    name: 'startTravel',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    name: 'cancelTravel',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },

  // === 读取函数 ===
  {
    inputs: [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    name: 'getFrog',
    outputs: [
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "uint64", "name": "birthday", "type": "uint64"},
      {"internalType": "uint32", "name": "totalTravels", "type": "uint32"},
      {"internalType": "uint8", "name": "status", "type": "uint8"},
      {"internalType": "uint256", "name": "xp", "type": "uint256"},
      {"internalType": "uint256", "name": "level", "type": "uint256"}
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    name: 'getActiveTravel',
    outputs: [
      {"internalType": "uint64", "name": "startTime", "type": "uint64"},
      {"internalType": "uint64", "name": "endTime", "type": "uint64"},
      {"internalType": "address", "name": "targetWallet", "type": "address"},
      {"internalType": "uint256", "name": "targetChainId", "type": "uint256"},
      {"internalType": "bool", "name": "completed", "type": "bool"}
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    name: 'canTravel',
    outputs: [{"internalType": "bool", "name": "", "type": "bool"}],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    name: 'getTravelJournals',
    outputs: [{"internalType": "string[]", "name": "", "type": "string[]"}],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{"internalType": "uint256", "name": "", "type": "uint256"}],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    name: 'ownerOf',
    outputs: [{"internalType": "address", "name": "", "type": "address"}],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{"internalType": "address", "name": "owner", "type": "address"}],
    name: 'balanceOf',
    outputs: [{"internalType": "uint256", "name": "", "type": "uint256"}],
    stateMutability: 'view',
    type: 'function'
  },

  // === 事件 ===
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: false, name: 'name', type: 'string' },
      { indexed: false, name: 'timestamp', type: 'uint256' }
    ],
    name: 'FrogMinted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: true, name: 'targetWallet', type: 'address' },
      { indexed: false, name: 'targetChainId', type: 'uint256' },
      { indexed: false, name: 'startTime', type: 'uint64' },
      { indexed: false, name: 'endTime', type: 'uint64' }
    ],
    name: 'TravelStarted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: false, name: 'journalHash', type: 'string' },
      { indexed: false, name: 'souvenirId', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' }
    ],
    name: 'TravelCompleted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' }
    ],
    name: 'TravelCancelled',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: false, name: 'newLevel', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' }
    ],
    name: 'LevelUp',
    type: 'event'
  }
] as const;

// SouvenirNFT ABI
export const SOUVENIR_ABI = [
  {
    inputs: [{ name: 'souvenirId', type: 'uint256' }],
    name: 'getSouvenir',
    outputs: [
      { name: 'name', type: 'string' },
      { name: 'rarity', type: 'uint8' },
      { name: 'frogId', type: 'uint256' },
      { name: 'mintTime', type: 'uint64' },
      { name: 'metadataURI', type: 'string' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'frogId', type: 'uint256' }],
    name: 'getFrogSouvenirs',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'uri',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// 旅行时长选项
export const TRAVEL_DURATIONS = [
  { label: '1分钟', value: 60, description: '测试用', testOnly: true },
  { label: '1小时', value: 3600, description: '快速探索' },
  { label: '6小时', value: 21600, description: '深度观察' },
  { label: '24小时', value: 86400, description: '完整旅程' },
] as const;

// 支持的链
// 支持的链 (测试网)
export const SUPPORTED_CHAINS = [
    { id: 11155111, name: 'Sepolia', symbol: 'ETH', icon: '⟠', testnet: true },
    { id: 80002, name: 'Polygon Amoy', symbol: 'MATIC', icon: '⬡', testnet: true },
    { id: 97, name: 'BSC Testnet', symbol: 'tBNB', icon: '◆', testnet: true },
    { id: 7001, name: 'ZetaChain Athens', symbol: 'ZETA', icon: '⚡', testnet: true },
] as const;

// 稀有度配置
export const RARITY_CONFIG: Record<number, { name: string; color: string; label: string; bgColor: string }> = {
  0: { name: 'Common', color: '#9CA3AF', label: '普通', bgColor: '#F3F4F6' },
  1: { name: 'Uncommon', color: '#22C55E', label: '稀有', bgColor: '#DCFCE7' },
  2: { name: 'Rare', color: '#8B5CF6', label: '史诗', bgColor: '#EDE9FE' },
};