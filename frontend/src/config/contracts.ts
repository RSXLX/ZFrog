// frontend/src/config/contracts.ts

// 🔧 修复：安全的地址类型转换
const getAddress = (envVar: string | undefined): `0x${string}` | undefined => {
  if (!envVar) return undefined;
  if (!envVar.startsWith('0x')) return undefined;
  return envVar as `0x${string}`;
};

export const ZETAFROG_ADDRESS = getAddress(import.meta.env.VITE_ZETAFROG_NFT_ADDRESS);
export const SOUVENIR_ADDRESS = getAddress(import.meta.env.VITE_SOUVENIR_NFT_ADDRESS);

// ZetaFrogNFT ABI (与合约完全匹配)
export const ZETAFROG_ABI = [
  // === 写入函数 ===
  {
    inputs: [{ name: 'name', type: 'string' }],
    name: 'mintFrog',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'targetWallet', type: 'address' },
      { name: 'duration', type: 'uint256' },
      { name: 'targetChainId', type: 'uint256' }
    ],
    name: 'startTravel',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'cancelTravel',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },

  // === 读取函数 ===
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getFrog',
    outputs: [
      { name: 'name', type: 'string' },
      { name: 'birthday', type: 'uint64' },
      { name: 'totalTravels', type: 'uint32' },
      { name: 'status', type: 'uint8' },
      { name: 'xp', type: 'uint256' },
      { name: 'level', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getActiveTravel',
    outputs: [
      { name: 'startTime', type: 'uint64' },
      { name: 'endTime', type: 'uint64' },
      { name: 'targetWallet', type: 'address' },
      { name: 'targetChainId', type: 'uint256' },
      { name: 'completed', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'canTravel',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getTravelJournals',
    outputs: [{ name: '', type: 'string[]' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
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
export const SUPPORTED_CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', icon: '⟠' },
  { id: 137, name: 'Polygon', symbol: 'MATIC', icon: '⬡' },
  { id: 56, name: 'BSC', symbol: 'BNB', icon: '◆' },
  { id: 7001, name: 'ZetaChain', symbol: 'ZETA', icon: '⚡' },
] as const;

// 稀有度配置
export const RARITY_CONFIG: Record<number, { name: string; color: string; label: string; bgColor: string }> = {
  0: { name: 'Common', color: '#9CA3AF', label: '普通', bgColor: '#F3F4F6' },
  1: { name: 'Uncommon', color: '#22C55E', label: '稀有', bgColor: '#DCFCE7' },
  2: { name: 'Rare', color: '#8B5CF6', label: '史诗', bgColor: '#EDE9FE' },
};