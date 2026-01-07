// frontend/src/config/contracts.ts

// 🔧 修复：安全的地址类型转换
const getAddress = (envVar: string | undefined): `0x${string}` | undefined => {
  if (!envVar) return undefined;
  if (!envVar.startsWith('0x')) return undefined;
  // If envVar matches old hardcoded address, ignore it to force new logic
  if (["0x0244573DDDECa169EA322473ebe590540a79941b"].includes(envVar)) return undefined;
  return envVar as `0x${string}`;
};

export const ZETAFROG_ADDRESS = getAddress(import.meta.env.VITE_CONTRACT_ADDRESS_ZETAFROG) || '0x0721CDff3291a1Dd2af28633B5dEE5427553F09E' as `0x${string}`;
export const SOUVENIR_ADDRESS = getAddress(import.meta.env.VITE_CONTRACT_ADDRESS_SOUVENIR);
export const TRAVEL_ADDRESS = getAddress(import.meta.env.VITE_CONTRACT_ADDRESS_TRAVEL);
// IMPORTANT: These are hardcoded to ensure the latest deployed addresses are used
// After new deployments, update these values directly
export const OMNI_TRAVEL_ADDRESS = getAddress(import.meta.env.VITE_CONTRACT_ADDRESS_OMNI) || '0x0F4B80d84363B3FCdC1F4fBb8d749c894B087E5a' as `0x${string}`;
export const BSC_CONNECTOR_ADDRESS = '0x1E8D44A6D21C29332a4528439d107Fa9e9aF4752' as `0x${string}`;
export const SEPOLIA_CONNECTOR_ADDRESS = '0x1c31e32A91dcF6f76D61fDef4Aa7B2eC047Cc7A9' as `0x${string}`;


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
      { indexed: false, name: 'newLevel', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' }
    ],
    name: 'LevelUp',
    type: 'event'
  }
] as const;

// Travel ABI (新)
export const TRAVEL_ABI = [
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
  {
    inputs: [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    name: 'getActiveTravel',
    outputs: [
      {"internalType": "uint64", "name": "startTime", "type": "uint64"},
      {"internalType": "uint64", "name": "endTime", "type": "uint64"},
      {"internalType": "address", "name": "targetWallet", "type": "address"},
      {"internalType": "uint256", "name": "targetChainId", "type": "uint256"},
      {"internalType": "bool", "name": "completed", "type": "bool"},
      {"internalType": "bool", "name": "isRandom", "type": "bool"}
    ],
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
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: true, name: 'targetWallet', type: 'address' },
      { indexed: false, name: 'targetChainId', type: 'uint256' },
      { indexed: false, name: 'startTime', type: 'uint64' },
      { indexed: false, name: 'endTime', type: 'uint64' },
      { indexed: false, name: 'isRandom', type: 'bool' }
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
      { indexed: false, name: 'timestamp', type: 'uint256' },
      { indexed: false, name: 'xpReward', type: 'uint256' }
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

// OmniTravel ABI (Cross-Chain Travel)
export const OMNI_TRAVEL_ABI = [
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'targetChainId', type: 'uint256' },
      { name: 'duration', type: 'uint256' }
    ],
    name: 'startCrossChainTravel',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'crossChainTravels',
    outputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'owner', type: 'address' },
      { name: 'targetChainId', type: 'uint256' },
      { name: 'outboundMessageId', type: 'bytes32' },
      { name: 'returnMessageId', type: 'bytes32' },
      { name: 'startTime', type: 'uint64' },
      { name: 'maxDuration', type: 'uint64' },
      { name: 'status', type: 'uint8' },
      { name: 'travelData', type: 'bytes' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'canStartCrossChainTravel',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: true, name: 'owner', type: 'address' },
      { indexed: false, name: 'targetChainId', type: 'uint256' },
      { indexed: false, name: 'messageId', type: 'bytes32' },
      { indexed: false, name:'startTime', type: 'uint64' },
      { indexed: false, name: 'maxDuration', type: 'uint64' }
    ],
    name: 'CrossChainTravelStarted',
    type: 'event'
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
    { id: 31337, name: 'Localhost', symbol: 'ETH', icon: '🏠', testnet: true },
] as const;

// 稀有度配置
export const RARITY_CONFIG: Record<number, { name: string; color: string; label: string; bgColor: string }> = {
  0: { name: 'Common', color: '#9CA3AF', label: '普通', bgColor: '#F3F4F6' },
  1: { name: 'Uncommon', color: '#22C55E', label: '稀有', bgColor: '#DCFCE7' },
  2: { name: 'Rare', color: '#8B5CF6', label: '史诗', bgColor: '#EDE9FE' },
};