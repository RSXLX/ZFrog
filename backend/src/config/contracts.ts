// backend/src/config/contracts.ts

// ZetaFrogNFT ABI (与实际合约匹配)
export const ZETAFROG_ABI = [
  // === 写入函数 ===
  {
    inputs: [{ internalType: 'string', name: 'name', type: 'string' }],
    name: 'mintFrog',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'address', name: 'targetWallet', type: 'address' },
      { internalType: 'uint256', name: 'duration', type: 'uint256' },
      { internalType: 'uint256', name: 'targetChainId', type: 'uint256' }  // 🔧 修复：添加缺失参数
    ],
    name: 'startTravel',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'string', name: 'journalHash', type: 'string' },
      { internalType: 'uint256', name: 'souvenirId', type: 'uint256' }
    ],
    name: 'completeTravel',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'cancelTravel',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'uint256', name: 'xpAmount', type: 'uint256' }
    ],
    name: 'addExperience',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },

  // === 读取函数 ===
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'getFrog',
    outputs: [
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'uint64', name: 'birthday', type: 'uint64' },
      { internalType: 'uint32', name: 'totalTravels', type: 'uint32' },
      { internalType: 'uint8', name: 'status', type: 'uint8' },
      { internalType: 'uint256', name: 'xp', type: 'uint256' },       // 🔧 修复：添加 xp
      { internalType: 'uint256', name: 'level', type: 'uint256' }     // 🔧 修复：添加 level
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'getActiveTravel',
    outputs: [
      { internalType: 'uint64', name: 'startTime', type: 'uint64' },
      { internalType: 'uint64', name: 'endTime', type: 'uint64' },
      { internalType: 'address', name: 'targetWallet', type: 'address' },
      { internalType: 'uint256', name: 'targetChainId', type: 'uint256' },  // 🔧 修复：添加 targetChainId
      { internalType: 'bool', name: 'completed', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'canTravel',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'getTravelJournals',
    outputs: [{ internalType: 'string[]', name: '', type: 'string[]' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },

  // === 事件 ===
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'name', type: 'string' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }
    ],
    name: 'FrogMinted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'targetWallet', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'targetChainId', type: 'uint256' },  // 🔧 修复
      { indexed: false, internalType: 'uint64', name: 'startTime', type: 'uint64' },
      { indexed: false, internalType: 'uint64', name: 'endTime', type: 'uint64' }
    ],
    name: 'TravelStarted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'journalHash', type: 'string' },
      { indexed: false, internalType: 'uint256', name: 'souvenirId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }
    ],
    name: 'TravelCompleted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }
    ],
    name: 'TravelCancelled',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'newLevel', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }
    ],
    name: 'LevelUp',
    type: 'event'
  }
] as const;

// SouvenirNFT ABI
export const SOUVENIR_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'frogId', type: 'uint256' },
      { internalType: 'uint256', name: 'rarityRoll', type: 'uint256' }
    ],
    name: 'mintSouvenir',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'souvenirId', type: 'uint256' },
      { internalType: 'string', name: 'uri_', type: 'string' }
    ],
    name: 'setMetadataURI',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'souvenirId', type: 'uint256' }],
    name: 'getSouvenir',
    outputs: [
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'uint8', name: 'rarity', type: 'uint8' },
      { internalType: 'uint256', name: 'frogId', type: 'uint256' },
      { internalType: 'uint64', name: 'mintTime', type: 'uint64' },
      { internalType: 'string', name: 'metadataURI', type: 'string' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'frogId', type: 'uint256' }],
    name: 'getFrogSouvenirs',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'uri',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'souvenirId', type: 'uint256' },
      { indexed: true, internalType: 'uint256', name: 'frogId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: false, internalType: 'uint8', name: 'rarity', type: 'uint8' },
      { indexed: false, internalType: 'string', name: 'name', type: 'string' }
    ],
    name: 'SouvenirMinted',
    type: 'event'
  }
] as const;