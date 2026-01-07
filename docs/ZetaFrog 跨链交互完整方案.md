# 🌉 ZetaFrog 跨链交互完整方案（基于现有代码结构）

## 📊 现有数据结构分析

### **当前 Schema（GitHub 实际代码）**

```prisma
// 当前 prisma/schema.prisma

model Frog {
  id           Int        @id @default(autoincrement())
  tokenId      Int        @unique
  name         String
  ownerAddress String
  birthday     DateTime
  totalTravels Int        @default(0)
  status       FrogStatus @default(Idle)
  xp           Int        @default(0)
  level        Int        @default(1)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  souvenirs    Souvenir[]
  travels      Travel[]
  @@index([ownerAddress])
}

model Travel {
  id                 Int            @id @default(autoincrement())
  frogId             Int
  targetWallet       String
  chainId            Int            @default(1)  // 默认 Ethereum Mainnet
  startTime          DateTime
  endTime            DateTime
  status             TravelStatus   @default(Active)
  observedTxCount    Int?
  observedTotalValue String?
  journalHash        String?
  journalContent     String?
  souvenirId         Int?
  completedAt        DateTime?
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt
  frog               Frog           @relation(...)
  souvenir           Souvenir?      @relation(...)
  observations       WalletObservation[]
  @@index([frogId])
  @@index([status])
  @@index([endTime])
}

model WalletObservation {
  id             Int       @id @default(autoincrement())
  travelId       Int
  walletAddress  String
  chainId        Int
  transactions   Json
  totalTxCount   Int
  totalValueWei  String
  notableEvents  Json?
  observedFrom   DateTime
  observedTo     DateTime
  createdAt      DateTime  @default(now())
  travel         Travel    @relation(...)
  @@index([travelId])
  @@index([walletAddress])
}

enum FrogStatus { Idle, Traveling, Returning }
enum TravelStatus { Active, Processing, Completed, Cancelled, Failed }
enum Rarity { Common, Uncommon, Rare }
```

### **当前链配置（chains.ts）**

```typescript
// 当前支持的测试链
SUPPORTED_CHAINS = {
  BSC_TESTNET: { chainId: 97, ... },
  ETH_SEPOLIA: { chainId: 11155111, ... },
  ZETACHAIN_ATHENS: { chainId: 7001, ... }
}
```

### **当前合约结构（ZetaFrogNFT.sol）**

```solidity
// 当前合约已支持 targetChainId！
struct Travel {
    uint64 startTime;
    uint64 endTime;
    address targetWallet;
    uint256 targetChainId;  // ✅ 已有此字段
    bool completed;
}

function startTravel(
    uint256 tokenId,
    address targetWallet,
    uint256 duration,
    uint256 targetChainId  // ✅ 已支持
) external { ... }
```

---

## 🔍 问题诊断

通过对比分析，发现以下问题：

| 问题 | 说明 |
|------|------|
| ❌ 合约拒绝零地址 | `require(targetWallet != address(0), "Invalid target")` |
| ⚠️ 后端未充分利用 chainId | `travelProcessor.ts` 中 chainId 使用默认值 |
| ⚠️ exploration.service.ts 返回零地址 | 失败时 fallback 返回零地址 |
| ⚠️ Schema 与跨链功能不完全匹配 | 缺少跨链状态追踪字段 |

---

## ✅ 完整修改方案

### **第一部分：Schema 升级**

```prisma
// prisma/schema.prisma - 升级版

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============ 青蛙 ============
model Frog {
  id           Int        @id @default(autoincrement())
  tokenId      Int        @unique
  name         String
  ownerAddress String
  birthday     DateTime
  totalTravels Int        @default(0)
  status       FrogStatus @default(Idle)
  xp           Int        @default(0)
  level        Int        @default(1)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  
  // 关联
  souvenirs    Souvenir[]
  travels      Travel[]
  
  @@index([ownerAddress])
}

// ============ 旅行（核心升级） ============
model Travel {
  id                 Int            @id @default(autoincrement())
  frogId             Int
  
  // ✅ 目标信息（升级）
  targetWallet       String         // 目标钱包地址
  targetChain        ChainType      @default(ZETACHAIN_ATHENS)  // ✅ 新增：目标链类型
  chainId            Int            @default(7001)              // 数值型 chainId，与合约一致
  
  // ✅ 随机探索支持
  isRandom           Boolean        @default(false)             // ✅ 新增：是否随机探索
  originalTarget     String?                                     // ✅ 新增：原始目标（随机时为零地址）
  discoveredAt       DateTime?                                   // ✅ 新增：地址发现时间
  
  // 时间
  startTime          DateTime
  endTime            DateTime
  duration           Int                                         // ✅ 新增：旅行时长（秒）
  
  // 状态
  status             TravelStatus   @default(Active)
  currentStage       TravelStage    @default(DEPARTING)          // ✅ 新增：当前阶段
  progress           Int            @default(0)                   // ✅ 新增：进度 0-100
  
  // ✅ 跨链交易追踪
  startTxHash        String?                                      // ✅ 新增：开始旅行的交易哈希
  completeTxHash     String?                                      // ✅ 新增：完成旅行的交易哈希
  
  // 观察结果
  observedTxCount    Int?
  observedTotalValue String?
  
  // AI 生成内容
  journalHash        String?
  journalContent     String?
  
  // 纪念品
  souvenirId         Int?
  
  // 错误处理
  errorMessage       String?                                      // ✅ 新增：错误信息
  
  // 时间戳
  completedAt        DateTime?
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt
  
  // 关联
  frog               Frog           @relation(fields: [frogId], references: [id])
  souvenir           Souvenir?      @relation(fields: [souvenirId], references: [id])
  observations       WalletObservation[]
  statusMessages     TravelStatusMessage[]                        // ✅ 新增：状态消息
  
  @@index([frogId])
  @@index([status])
  @@index([endTime])
  @@index([targetChain])                                          // ✅ 新增索引
}

// ✅ 新增：旅行状态消息
model TravelStatusMessage {
  id          Int         @id @default(autoincrement())
  travelId    Int
  message     String
  messageType MessageType @default(INFO)
  createdAt   DateTime    @default(now())
  
  travel      Travel      @relation(fields: [travelId], references: [id])
  
  @@index([travelId])
}

// ============ 钱包观察 ============
model WalletObservation {
  id             Int       @id @default(autoincrement())
  travelId       Int
  walletAddress  String
  chainId        Int
  chainType      ChainType @default(ZETACHAIN_ATHENS)               // ✅ 新增
  transactions   Json
  totalTxCount   Int
  totalValueWei  String
  notableEvents  Json?
  
  // ✅ 新增：更详细的观察数据
  nativeBalance  String?                                             // ✅ 原生代币余额
  tokenBalances  Json?                                               // ✅ 代币余额
  protocols      String[]  @default([])                              // ✅ 交互的协议
  
  observedFrom   DateTime
  observedTo     DateTime
  createdAt      DateTime  @default(now())
  
  travel         Travel    @relation(fields: [travelId], references: [id])
  
  @@index([travelId])
  @@index([walletAddress])
  @@index([chainType])                                               // ✅ 新增索引
}

// ============ 纪念品 ============
model Souvenir {
  id            Int       @id @default(autoincrement())
  tokenId       Int       @unique
  frogId        Int
  name          String
  rarity        Rarity
  chainType     ChainType @default(ZETACHAIN_ATHENS)                 // ✅ 新增：来源链
  metadataUri   String?
  mintedAt      DateTime
  createdAt     DateTime  @default(now())
  
  frog          Frog      @relation(fields: [frogId], references: [id])
  travels       Travel[]
  
  @@index([frogId])
  @@index([chainType])                                               // ✅ 新增索引
}

// ============ 枚举 ============

enum FrogStatus {
  Idle
  Traveling
  Returning
}

enum TravelStatus {
  Active      // 旅行中
  Processing  // 处理中（观察钱包、生成AI内容）
  Completed   // 已完成
  Cancelled   // 已取消
  Failed      // 失败
}

// ✅ 新增：旅行阶段
enum TravelStage {
  DEPARTING   // 出发中
  CROSSING    // 跨链穿越中
  ARRIVING    // 到达中
  EXPLORING   // 探索中
  RETURNING   // 返程中
}

// ✅ 新增：消息类型
enum MessageType {
  INFO
  DISCOVERY
  JOKE
  WARNING
  ERROR
}

enum Rarity {
  Common
  Uncommon
  Rare
  Epic        // ✅ 新增
  Legendary   // ✅ 新增
}

// ✅ 新增：支持的链类型（与 chains.ts 保持一致）
enum ChainType {
  BSC_TESTNET       // chainId: 97
  ETH_SEPOLIA       // chainId: 11155111
  ZETACHAIN_ATHENS  // chainId: 7001
  POLYGON_MUMBAI    // chainId: 80001 (可选扩展)
  ARBITRUM_GOERLI   // chainId: 421613 (可选扩展)
}
```

---

### **第二部分：合约层修改**

```solidity
// contracts/contracts/ZetaFrogNFT.sol - 修改版

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract ZetaFrogNFT is ERC721URIStorage, Ownable, ReentrancyGuard, Pausable {
    // ============ Constants ============
    uint256 public constant MAX_SUPPLY = 1000;
    uint256 public constant MIN_TRAVEL_DURATION = 1 minutes;
    uint256 public constant MAX_TRAVEL_DURATION = 24 hours;
    uint256 public constant COOLDOWN_PERIOD = 10 minutes;

    // ============ Enums ============
    enum FrogStatus { Idle, Traveling, Returning }

    // ============ Structs ============
    struct Frog {
        string name;
        uint64 birthday;
        uint32 totalTravels;
        FrogStatus status;
        uint256 xp;
        uint256 level;
    }

    struct Travel {
        uint64 startTime;
        uint64 endTime;
        address targetWallet;
        uint256 targetChainId;
        bool completed;
        bool isRandom;          // ✅ 新增：是否随机探索
    }

    // ============ State Variables ============
    uint256 private _tokenIdCounter;
    
    mapping(uint256 => Frog) public frogs;
    mapping(uint256 => Travel) public activeTravels;
    mapping(uint256 => uint64) public lastTravelEnd;
    mapping(uint256 => string[]) public travelJournals;
    
    // ✅ 新增：支持的链 ID
    mapping(uint256 => bool) public supportedChains;
    
    address public souvenirNFT;
    address public travelManager;

    // ============ Events ============
    event FrogMinted(address indexed owner, uint256 indexed tokenId, string name, uint256 timestamp);
    
    event TravelStarted(
        uint256 indexed tokenId,
        address indexed targetWallet,
        uint256 targetChainId,
        uint64 startTime,
        uint64 endTime,
        bool isRandom              // ✅ 新增
    );
    
    event TravelCompleted(uint256 indexed tokenId, string journalHash, uint256 souvenirId, uint256 timestamp);
    event TravelCancelled(uint256 indexed tokenId, uint256 timestamp);
    event LevelUp(uint256 indexed tokenId, uint256 newLevel, uint256 timestamp);
    event ChainSupportUpdated(uint256 indexed chainId, bool supported);  // ✅ 新增

    // ============ Modifiers ============
    modifier onlyTravelManager() {
        require(msg.sender == travelManager, "Not travel manager");
        _;
    }

    modifier onlyFrogOwner(uint256 tokenId) {
        require(ownerOf(tokenId) == msg.sender, "Not frog owner");
        _;
    }

    // ============ Constructor ============
    constructor() ERC721("ZetaFrog", "ZFROG") Ownable(msg.sender) {
        travelManager = msg.sender;
        _initializeSupportedChains();
    }
    
    // ✅ 新增：初始化支持的链
    function _initializeSupportedChains() internal {
        supportedChains[97] = true;       // BSC Testnet
        supportedChains[11155111] = true; // ETH Sepolia
        supportedChains[7001] = true;     // ZetaChain Athens
        supportedChains[80001] = true;    // Polygon Mumbai
        supportedChains[421613] = true;   // Arbitrum Goerli
    }

    // ============ Admin Functions ============
    function setTravelManager(address _manager) external onlyOwner {
        require(_manager != address(0), "Invalid address");
        travelManager = _manager;
    }

    function setSouvenirNFT(address _souvenir) external onlyOwner {
        require(_souvenir != address(0), "Invalid address");
        souvenirNFT = _souvenir;
    }
    
    // ✅ 新增：管理支持的链
    function setSupportedChain(uint256 chainId, bool supported) external onlyOwner {
        supportedChains[chainId] = supported;
        emit ChainSupportUpdated(chainId, supported);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ============ Core Functions ============

    function mintFrog(string calldata name) external whenNotPaused nonReentrant returns (uint256) {
        bytes memory nameBytes = bytes(name);
        require(nameBytes.length >= 2 && nameBytes.length <= 16, "Name: 2-16 chars");
        require(_tokenIdCounter < MAX_SUPPLY, "Max supply reached");

        uint256 tokenId = _tokenIdCounter++;
        _safeMint(msg.sender, tokenId);

        frogs[tokenId] = Frog({
            name: name,
            birthday: uint64(block.timestamp),
            totalTravels: 0,
            status: FrogStatus.Idle,
            xp: 0,
            level: 1
        });

        string memory uri = _generateInitialURI(tokenId, name);
        _setTokenURI(tokenId, uri);

        emit FrogMinted(msg.sender, tokenId, name, block.timestamp);
        return tokenId;
    }

    /**
     * @notice 开始跨链旅行
     * @param tokenId 青蛙 NFT ID
     * @param targetWallet 目标钱包地址（可以是 address(0) 表示随机探索）
     * @param duration 旅行时长（秒）
     * @param targetChainId 目标链 ID
     */
    function startTravel(
        uint256 tokenId,
        address targetWallet,
        uint256 duration,
        uint256 targetChainId
    ) external whenNotPaused nonReentrant onlyFrogOwner(tokenId) {
        Frog storage frog = frogs[tokenId];

        require(frog.status == FrogStatus.Idle, "Frog is busy");
        require(supportedChains[targetChainId], "Chain not supported");
        require(duration >= MIN_TRAVEL_DURATION, "Duration too short");
        require(duration <= MAX_TRAVEL_DURATION, "Duration too long");
        require(
            block.timestamp >= lastTravelEnd[tokenId] + COOLDOWN_PERIOD,
            "Still in cooldown"
        );
        
        // ✅ 关键修改：允许零地址（随机探索）
        // 删除这行：require(targetWallet != address(0), "Invalid target");
        
        bool isRandom = (targetWallet == address(0));

        frog.status = FrogStatus.Traveling;

        uint64 startTime = uint64(block.timestamp);
        uint64 endTime = uint64(block.timestamp + duration);

        activeTravels[tokenId] = Travel({
            startTime: startTime,
            endTime: endTime,
            targetWallet: targetWallet,
            targetChainId: targetChainId,
            completed: false,
            isRandom: isRandom
        });

        emit TravelStarted(tokenId, targetWallet, targetChainId, startTime, endTime, isRandom);
    }

    /**
     * @notice 完成旅行（由后端 TravelManager 调用）
     */
    function completeTravel(
        uint256 tokenId,
        string calldata journalHash,
        uint256 souvenirId
    ) external onlyTravelManager nonReentrant {
        Frog storage frog = frogs[tokenId];
        Travel storage travel = activeTravels[tokenId];

        require(frog.status == FrogStatus.Traveling, "Not traveling");
        require(!travel.completed, "Already completed");
        require(block.timestamp >= travel.endTime, "Travel not ended");

        frog.status = FrogStatus.Idle;
        frog.totalTravels++;
        travel.completed = true;
        lastTravelEnd[tokenId] = uint64(block.timestamp);

        travelJournals[tokenId].push(journalHash);

        emit TravelCompleted(tokenId, journalHash, souvenirId, block.timestamp);
    }

    function cancelTravel(uint256 tokenId) external onlyFrogOwner(tokenId) {
        Frog storage frog = frogs[tokenId];
        require(frog.status == FrogStatus.Traveling, "Not traveling");

        frog.status = FrogStatus.Idle;
        activeTravels[tokenId].completed = true;
        lastTravelEnd[tokenId] = uint64(block.timestamp);

        emit TravelCancelled(tokenId, block.timestamp);
    }

    function addExperience(uint256 tokenId, uint256 xpAmount) external onlyTravelManager {
        require(tokenId < _tokenIdCounter, "Frog does not exist");
        Frog storage frog = frogs[tokenId];
        frog.xp += xpAmount;

        uint256 newLevel = (frog.xp / 100) + 1;
        if (newLevel > frog.level) {
            frog.level = newLevel;
            emit LevelUp(tokenId, newLevel, block.timestamp);
        }
    }

    // ============ View Functions ============

    function getFrog(uint256 tokenId) external view returns (
        string memory name,
        uint64 birthday,
        uint32 totalTravels,
        FrogStatus status,
        uint256 xp,
        uint256 level
    ) {
        Frog memory frog = frogs[tokenId];
        return (frog.name, frog.birthday, frog.totalTravels, frog.status, frog.xp, frog.level);
    }

    function getActiveTravel(uint256 tokenId) external view returns (
        uint64 startTime,
        uint64 endTime,
        address targetWallet,
        uint256 targetChainId,
        bool completed,
        bool isRandom       // ✅ 新增返回值
    ) {
        Travel memory travel = activeTravels[tokenId];
        return (travel.startTime, travel.endTime, travel.targetWallet, travel.targetChainId, travel.completed, travel.isRandom);
    }
    
    function isChainSupported(uint256 chainId) external view returns (bool) {
        return supportedChains[chainId];
    }

    function getTravelJournals(uint256 tokenId) external view returns (string[] memory) {
        return travelJournals[tokenId];
    }

    function canTravel(uint256 tokenId) external view returns (bool) {
        if (tokenId >= _tokenIdCounter) return false;
        Frog memory frog = frogs[tokenId];
        if (frog.status != FrogStatus.Idle) return false;
        if (block.timestamp < lastTravelEnd[tokenId] + COOLDOWN_PERIOD) return false;
        return true;
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    // ============ Internal Functions ============

    function _generateInitialURI(uint256 tokenId, string memory name) internal pure returns (string memory) {
        return string(abi.encodePacked(
            "data:application/json,",
            '{"name":"', name, '",',
            '"description":"A ZetaFrog Desktop Pet",',
            '"image":"ipfs://placeholder",',
            '"attributes":[{"trait_type":"ID","value":"', _toString(tokenId), '"}]}'
        ));
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
```

---

### **第三部分：链配置升级**

```typescript
// backend/src/config/chains.ts - 升级版

export const SUPPORTED_CHAINS = {
  BSC_TESTNET: {
    name: 'BSC 测试网',
    displayName: '币安测试链',
    chainId: 97,
    rpcUrl: process.env.BSC_TESTNET_RPC || 'https://bsc-testnet.publicnode.com',
    nativeSymbol: 'tBNB',
    explorerUrl: 'https://testnet.bscscan.com',
    explorerApiUrl: 'https://api-testnet.bscscan.com/api',  // ✅ 新增
    genesisTimestamp: new Date('2020-08-31'),
    avgBlockTime: 3,
    scenery: '繁华的测试市集',
    vibe: '热闹',
    // ✅ 新增：跨链配置
    isZetaSupported: true,
    zetaConnector: null,  // 如果有部署
  },
  
  ETH_SEPOLIA: {
    name: 'Sepolia 测试网',
    displayName: '以太坊测试链',
    chainId: 11155111,
    rpcUrl: process.env.ETH_SEPOLIA_RPC || 'https://rpc.sepolia.org',
    nativeSymbol: 'SepoliaETH',
    explorerUrl: 'https://sepolia.etherscan.io',
    explorerApiUrl: 'https://api-sepolia.etherscan.io/api',  // ✅ 新增
    genesisTimestamp: new Date('2022-06-20'),
    avgBlockTime: 12,
    scenery: '古老的以太坊街道',
    vibe: '怀旧',
    isZetaSupported: true,
    zetaConnector: null,
  },
  
  ZETACHAIN_ATHENS: {
    name: 'ZetaChain Athens',
    displayName: 'ZetaChain 测试链',
    chainId: 7001,
    rpcUrl: process.env.ZETA_ATHENS_RPC || 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public',
    nativeSymbol: 'aZETA',
    explorerUrl: 'https://athens.explorer.zetachain.com',
    explorerApiUrl: 'https://zetachain-athens.blockscout.com/api',  // ✅ 新增
    genesisTimestamp: new Date('2023-02-01'),
    avgBlockTime: 6,
    scenery: '连接各个世界的彩虹桥',
    vibe: '新奇',
    isZetaSupported: true,
    isMainChain: true,  // ✅ 新增：主链标识
    zetaConnector: null,
  },
  
  // ✅ 新增：Polygon Mumbai
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
  },
  
  // ✅ 新增：Arbitrum Goerli
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
  },
} as const;

export type ChainKey = keyof typeof SUPPORTED_CHAINS;
export const CHAIN_KEYS = Object.keys(SUPPORTED_CHAINS) as ChainKey[];

// ✅ 新增：chainId 到 ChainKey 的映射
export const CHAIN_ID_TO_KEY: Record<number, ChainKey> = {
  97: 'BSC_TESTNET',
  11155111: 'ETH_SEPOLIA',
  7001: 'ZETACHAIN_ATHENS',
  80001: 'POLYGON_MUMBAI',
  421613: 'ARBITRUM_GOERLI',
};

// ✅ 新增：获取链配置的辅助函数
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
```

---

### **第四部分：探索服务升级**

```typescript
// backend/src/services/travel/exploration.service.ts - 升级版

import { createPublicClient, http, formatEther } from 'viem';
import { bscTestnet, sepolia, polygonMumbai, arbitrumGoerli } from 'viem/chains';
import { SUPPORTED_CHAINS, ChainKey, CHAIN_KEYS, getChainConfig } from '../../config/chains';
import { logger } from '../../utils/logger';

export interface ExplorationResult {
  chain: ChainKey;
  blockNumber: bigint;
  timestamp: Date;
  snapshot: WalletSnapshot;
  discoveries: Discovery[];
}

export interface WalletSnapshot {
  address: string;
  nativeBalance: string;
  nativeSymbol: string;
  txCount: number;
  isActive: boolean;
  walletAge: string;
  isContract: boolean;  // ✅ 新增
}

export interface Discovery {
  type: 'balance' | 'activity' | 'timing' | 'fun_fact' | 'cross_chain';
  title: string;
  description: string;
  rarity: number;
}

// ✅ 定义 ZetaChain Athens 链对象
const zetachainAthens = {
  id: 7001,
  name: 'ZetaChain Athens',
  nativeCurrency: { name: 'ZETA', symbol: 'aZETA', decimals: 18 },
  rpcUrls: { default: { http: [SUPPORTED_CHAINS.ZETACHAIN_ATHENS.rpcUrl] } },
} as const;

// ✅ 定义 Polygon Mumbai 链对象
const polygonMumbaiChain = {
  id: 80001,
  name: 'Polygon Mumbai',
  nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
  rpcUrls: { default: { http: [SUPPORTED_CHAINS.POLYGON_MUMBAI.rpcUrl] } },
} as const;

// ✅ 定义 Arbitrum Goerli 链对象
const arbitrumGoerliChain = {
  id: 421613,
  name: 'Arbitrum Goerli',
  nativeCurrency: { name: 'AGOR', symbol: 'AGOR', decimals: 18 },
  rpcUrls: { default: { http: [SUPPORTED_CHAINS.ARBITRUM_GOERLI.rpcUrl] } },
} as const;

class ExplorationService {
  private clients: Record<ChainKey, any>;
  
  // ✅ 新增：重试配置
  private readonly MAX_RETRY = 3;
  private readonly RETRY_DELAY = 2000;

  constructor() {
    this.clients = {
      BSC_TESTNET: createPublicClient({
        chain: bscTestnet,
        transport: http(SUPPORTED_CHAINS.BSC_TESTNET.rpcUrl),
      }),
      ETH_SEPOLIA: createPublicClient({
        chain: sepolia,
        transport: http(SUPPORTED_CHAINS.ETH_SEPOLIA.rpcUrl),
      }),
      ZETACHAIN_ATHENS: createPublicClient({
        chain: zetachainAthens as any,
        transport: http(SUPPORTED_CHAINS.ZETACHAIN_ATHENS.rpcUrl),
      }),
      // ✅ 新增链的客户端
      POLYGON_MUMBAI: createPublicClient({
        chain: polygonMumbaiChain as any,
        transport: http(SUPPORTED_CHAINS.POLYGON_MUMBAI.rpcUrl),
      }),
      ARBITRUM_GOERLI: createPublicClient({
        chain: arbitrumGoerliChain as any,
        transport: http(SUPPORTED_CHAINS.ARBITRUM_GOERLI.rpcUrl),
      }),
    };
  }

  /**
   * ✅ 随机选择目标链和区块
   */
  async pickRandomDestination(): Promise<{ chain: ChainKey; blockNumber: bigint }> {
    const chain = CHAIN_KEYS[Math.floor(Math.random() * CHAIN_KEYS.length)];
    const blockNumber = await this.pickRandomBlock(chain);
    logger.info(`Frog decided to visit ${chain} at block ${blockNumber}`);
    return { chain, blockNumber };
  }

  /**
   * ✅ 在指定链上随机选择区块
   */
  async pickRandomBlock(chain: ChainKey): Promise<bigint> {
    const client = this.clients[chain];
    try {
      const latestBlock = await client.getBlockNumber();
      const safeLatest = latestBlock - BigInt(100);
      const ranges = this.getInterestingRanges(chain, safeLatest);
      const selectedRange = ranges[Math.floor(Math.random() * ranges.length)];
      const rangeSize = selectedRange.end - selectedRange.start;
      const randomOffset = BigInt(Math.floor(Math.random() * Number(rangeSize)));
      return selectedRange.start + randomOffset;
    } catch (error) {
      logger.error(`Failed to pick random block for ${chain}: ${error}`);
      return this.getFallbackBlockNumber(chain);
    }
  }

  private getInterestingRanges(chain: ChainKey, latestBlock: bigint): { start: bigint; end: bigint }[] {
    const ranges = [];
    const step = latestBlock / BigInt(5);
    for (let i = 0; i < 5; i++) {
      ranges.push({
        start: step * BigInt(i),
        end: step * BigInt(i + 1),
      });
    }
    return ranges;
  }
  
  // ✅ 新增：备用区块号
  private getFallbackBlockNumber(chain: ChainKey): bigint {
    const fallbacks: Record<ChainKey, bigint> = {
      BSC_TESTNET: BigInt(35000000),
      ETH_SEPOLIA: BigInt(5000000),
      ZETACHAIN_ATHENS: BigInt(4000000),
      POLYGON_MUMBAI: BigInt(40000000),
      ARBITRUM_GOERLI: BigInt(30000000),
    };
    return fallbacks[chain] || BigInt(0);
  }

  /**
   * ✅ 探索目标地址
   */
  async explore(chain: ChainKey, blockNumber: bigint, targetAddress: string): Promise<ExplorationResult> {
    logger.info(`Exploring ${chain} block ${blockNumber} for wallet ${targetAddress}`);

    const client = this.clients[chain];
    const config = SUPPORTED_CHAINS[chain];

    const block = await client.getBlock({ blockNumber });
    const timestamp = new Date(Number(block.timestamp) * 1000);
    const snapshot = await this.getWalletSnapshot(client, targetAddress, blockNumber, config);
    const discoveries = this.generateDiscoveries(snapshot, timestamp, config, chain);

    return { chain, blockNumber, timestamp, snapshot, discoveries };
  }

  private async getWalletSnapshot(
    client: any,
    address: string,
    blockNumber: bigint,
    config: typeof SUPPORTED_CHAINS[ChainKey]
  ): Promise<WalletSnapshot> {
    try {
      const [balance, txCount, code] = await Promise.all([
        client.getBalance({ address: address as `0x${string}`, blockNumber }),
        client.getTransactionCount({ address: address as `0x${string}`, blockNumber }),
        client.getBytecode({ address: address as `0x${string}` }),
      ]);

      const isContract = code !== undefined && code !== '0x';
      const isActive = txCount > 0;
      const walletAge = this.estimateWalletAge(txCount, blockNumber, config);

      return {
        address,
        nativeBalance: formatEther(balance),
        nativeSymbol: config.nativeSymbol,
        txCount,
        isActive,
        walletAge,
        isContract,
      };
    } catch (error) {
      logger.warn(`Failed to get wallet snapshot: ${error}`);
      return {
        address,
        nativeBalance: '0',
        nativeSymbol: config.nativeSymbol,
        txCount: 0,
        isActive: false,
        walletAge: '未知',
        isContract: false,
      };
    }
  }

  private estimateWalletAge(txCount: number, blockNumber: bigint, config: typeof SUPPORTED_CHAINS[ChainKey]): string {
    if (txCount === 0) return '可能是新钱包';
    if (txCount < 10) return '新手钱包';
    if (txCount < 50) return '有点经验的钱包';
    if (txCount < 200) return '老练的钱包';
    return '资深老钱包';
  }

  private generateDiscoveries(
    snapshot: WalletSnapshot,
    timestamp: Date,
    config: typeof SUPPORTED_CHAINS[ChainKey],
    chain: ChainKey
  ): Discovery[] {
    const discoveries: Discovery[] = [];
    const balance = parseFloat(snapshot.nativeBalance);

    // ✅ 新增：跨链发现
    if (chain !== 'ZETACHAIN_ATHENS') {
      discoveries.push({
        type: 'cross_chain',
        title: `跨链到${config.displayName}！`,
        description: `青蛙穿越了 ZetaChain 的彩虹桥，来到了${config.scenery}`,
        rarity: 3,
      });
    }

    // 余额发现
    if (balance === 0) {
      discoveries.push({ type: 'balance', title: '空空的口袋', description: '这个钱包当时是空的', rarity: 1 });
    } else if (balance > 100) {
      discoveries.push({ type: 'balance', title: '发现巨鲸！', description: `天呐！余额有 ${balance.toFixed(2)} ${config.nativeSymbol}！`, rarity: 5 });
    } else if (balance > 10) {
      discoveries.push({ type: 'balance', title: '发现大户！', description: `有 ${balance.toFixed(2)} ${config.nativeSymbol}！`, rarity: 4 });
    } else {
      discoveries.push({ type: 'balance', title: '普通积蓄', description: `持有 ${balance.toFixed(4)} ${config.nativeSymbol}`, rarity: 2 });
    }

    // 活跃度发现
    if (snapshot.txCount > 100) {
      discoveries.push({ type: 'activity', title: '活跃老手', description: `已有 ${snapshot.txCount} 笔交易！`, rarity: 3 });
    }

    // 趣味发现
    if (Math.random() < 0.2) {
      const funFacts = [
        { title: '幸运数字', description: '这个区块号看起来很吉利呢！', rarity: 2 },
        { title: '路边小花', description: '青蛙在路边发现了一朵小花', rarity: 1 },
        { title: `${config.vibe}的气息`, description: `这里的空气充满了${config.vibe}的气息`, rarity: 2 },
      ];
      discoveries.push({ type: 'fun_fact', ...funFacts[Math.floor(Math.random() * funFacts.length)] });
    }

    return discoveries;
  }

  /**
   * ✅ 核心方法：获取随机目标地址（带重试）
   */
  async getRandomTargetAddress(chain: ChainKey): Promise<string> {
    for (let attempt = 1; attempt <= this.MAX_RETRY; attempt++) {
      try {
        logger.info(`Attempt ${attempt}/${this.MAX_RETRY} to discover address on ${chain}`);
        const address = await this.discoverLuckyAddress(chain);
        
        // ✅ 验证地址不是零地址
        if (address && address !== '0x0000000000000000000000000000000000000000') {
          return address;
        }
      } catch (error) {
        logger.warn(`Attempt ${attempt} failed for ${chain}: ${error}`);
        if (attempt < this.MAX_RETRY) {
          await this.delay(this.RETRY_DELAY * attempt);
        }
      }
    }
    
    // ✅ 使用备用地址而不是零地址
    logger.warn(`All attempts failed for ${chain}, using fallback address`);
    return this.getFallbackAddress(chain);
  }

  /**
   * ✅ 从最新区块发现活跃地址
   */
  async discoverLuckyAddress(chain: ChainKey): Promise<string> {
    logger.info(`Discovering lucky address on ${chain}...`);
    const client = this.clients[chain];

    const latestBlock = await client.getBlock({ includeTransactions: true });
    
    if (!latestBlock?.transactions?.length) {
      throw new Error('Empty block or no transactions');
    }

    const candidates = new Set<string>();
    for (const tx of latestBlock.transactions) {
      if (tx.from) candidates.add(tx.from.toLowerCase());
      if (tx.to) candidates.add(tx.to.toLowerCase());
    }

    const candidateList = Array.from(candidates).sort(() => Math.random() - 0.5);

    for (const addr of candidateList) {
      // ✅ 排除零地址
      if (addr === '0x0000000000000000000000000000000000000000') continue;

      try {
        const code = await client.getBytecode({ address: addr as `0x${string}` });
        if (code && code !== '0x') continue; // 排除合约

        const balance = await client.getBalance({ address: addr as `0x${string}` });
        if (balance > BigInt(0)) {
          logger.info(`Found lucky address: ${addr} on ${chain}`);
          return addr;
        }
      } catch (e) {
        continue;
      }
    }

    throw new Error('No valid lucky address found');
  }
  
  /**
   * ✅ 新增：获取备用地址
   */
  private getFallbackAddress(chain: ChainKey): string {
    // 使用每条链上的知名测试地址
    const fallbackAddresses: Record<ChainKey, string[]> = {
      BSC_TESTNET: [
        '0xCe2CC46682E9C6D5f174aF598fb4931a9c0bE68e', // PancakeSwap Router
        '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd', // WBNB
      ],
      ETH_SEPOLIA: [
        '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // WETH
        '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008', // Uniswap
      ],
      ZETACHAIN_ATHENS: [
        '0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf', // zETH
        '0xd97B1de3619ed2c6BEb3860147E30cA8A7dC9891', // zBTC
      ],
      POLYGON_MUMBAI: [
        '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889', // WMATIC
        '0xE097d6B3100777DC31B34dC2c58fB524C2e76921', // Uniswap
      ],
      ARBITRUM_GOERLI: [
        '0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3', // WETH
        '0x4A2ba922052bA54e29c5417bC979Daaf7D5Fe4f4', // Uniswap
      ],
    };

    const addresses = fallbackAddresses[chain];
    return addresses[Math.floor(Math.random() * addresses.length)];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const explorationService = new ExplorationService();
```

---

### **第五部分：旅行处理器升级**

```typescript
// backend/src/workers/travelProcessor.ts - 升级版

import { PrismaClient, TravelStatus, FrogStatus, ChainType, TravelStage } from '@prisma/client';
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { observerService } from '../services/observer.service';
import { aiService } from '../services/ai.service';
import { ipfsService } from '../services/ipfs.service';
import { explorationService } from '../services/travel/exploration.service';  // ✅ 导入
import { config } from '../config';
import { logger } from '../utils/logger';
import { ZETAFROG_ABI, SOUVENIR_ABI } from '../config/contracts';
import { CHAIN_ID_TO_KEY, getChainConfig } from '../config/chains';  // ✅ 导入
import type { Server } from 'socket.io';

const zetachainAthens = {
  id: 7001,
  name: 'ZetaChain Athens Testnet',
  nativeCurrency: { name: 'ZETA', symbol: 'ZETA', decimals: 18 },
  rpcUrls: { default: { http: [config.ZETACHAIN_RPC_URL] } },
} as const;

const prisma = new PrismaClient();

class TravelProcessor {
  private walletClient: any;
  private publicClient: any;
  private account: any;
  private isInitialized = false;
  private io: Server | null = null;

  constructor() {
    this.initialize();
  }

  setIo(ioInstance: Server) {
    this.io = ioInstance;
  }

  private initialize() {
    if (!config.RELAYER_PRIVATE_KEY) {
      logger.warn('RELAYER_PRIVATE_KEY not configured, running in mock mode');
      return;
    }

    try {
      let privateKey = config.RELAYER_PRIVATE_KEY;
      if (!privateKey.startsWith('0x')) {
        privateKey = `0x${privateKey}`;
      }

      this.account = privateKeyToAccount(privateKey as `0x${string}`);
      this.publicClient = createPublicClient({
        chain: zetachainAthens,
        transport: http(config.ZETACHAIN_RPC_URL),
      });
      this.walletClient = createWalletClient({
        account: this.account,
        chain: zetachainAthens,
        transport: http(config.ZETACHAIN_RPC_URL),
      });
      this.isInitialized = true;
      logger.info('Travel processor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize travel processor:', error);
    }
  }

  async start() {
    logger.info('Travel processor started');
    setInterval(() => this.processCompletedTravels(), 30 * 1000);
    this.processCompletedTravels();
  }

  async processCompletedTravels() {
    try {
      const pendingTravels = await prisma.travel.findMany({
        where: {
          status: TravelStatus.Active,
          endTime: { lte: new Date() },
        },
        include: { frog: true },
        take: 10,
      });

      if (pendingTravels.length === 0) return;

      logger.info(`Processing ${pendingTravels.length} completed travels`);

      for (const travel of pendingTravels) {
        await this.processSingleTravel(travel);
      }
    } catch (error) {
      logger.error('Error in processCompletedTravels:', error);
    }
  }

  private async processSingleTravel(travel: any) {
    const { id: travelId, frog, targetWallet, startTime, endTime, chainId, isRandom } = travel;
    
    logger.info(`Processing travel ${travelId} for frog ${frog.tokenId}`);
    logger.info(`Target chain: ${chainId}, isRandom: ${isRandom}`);

    try {
      // ✅ 更新状态为处理中
      await this.updateTravelStage(travelId, TravelStage.EXPLORING, 10);
      
      await prisma.travel.update({
        where: { id: travelId },
        data: { status: TravelStatus.Processing },
      });

      // ✅ 确定目标地址
      let actualTargetWallet = targetWallet;
      const chainKey = CHAIN_ID_TO_KEY[chainId] || 'ZETACHAIN_ATHENS';
      
      // ✅ 关键：处理随机探索（零地址）
      if (isRandom || targetWallet === '0x0000000000000000000000000000000000000000') {
        logger.info(`🎲 Random exploration on ${chainKey}, discovering address...`);
        
        await this.updateTravelStage(travelId, TravelStage.EXPLORING, 20);
        await this.sendStatusMessage(travelId, frog.tokenId, '🎲 正在发现目标地址...', 'INFO');
        
        try {
          actualTargetWallet = await explorationService.getRandomTargetAddress(chainKey);
          
          logger.info(`✅ Discovered address: ${actualTargetWallet}`);
          
          // ✅ 更新数据库中的目标地址
          await prisma.travel.update({
            where: { id: travelId },
            data: {
              targetWallet: actualTargetWallet,
              discoveredAt: new Date(),
            },
          });
          
          await this.sendStatusMessage(
            travelId,
            frog.tokenId,
            `🎯 发现目标！${actualTargetWallet.slice(0, 8)}...${actualTargetWallet.slice(-6)}`,
            'DISCOVERY'
          );
          
        } catch (discoverError) {
          logger.error(`Failed to discover address: ${discoverError}`);
          throw new Error(`Address discovery failed: ${discoverError}`);
        }
      }
      
      // ✅ 验证地址有效性
      if (!actualTargetWallet || actualTargetWallet === '0x0000000000000000000000000000000000000000') {
        throw new Error('Invalid target wallet address');
      }

      await this.updateTravelStage(travelId, TravelStage.EXPLORING, 40);

      // ✅ 观察钱包活动
      const observation = await observerService.observeWallet(
        actualTargetWallet,
        startTime,
        endTime,
        chainId
      );

      // ✅ 保存观察数据（包含链类型）
      await prisma.walletObservation.create({
        data: {
          travelId,
          walletAddress: actualTargetWallet,
          chainId,
          chainType: chainKey as ChainType,  // ✅ 新增
          transactions: observation.transactions as any,
          totalTxCount: observation.totalTxCount,
          totalValueWei: observation.totalValueWei.toString(),
          notableEvents: observation.notableEvents as any,
          nativeBalance: observation.nativeBalance,  // ✅ 新增
          protocols: observation.protocols || [],     // ✅ 新增
          observedFrom: startTime,
          observedTo: endTime,
        },
      });

      await this.updateTravelStage(travelId, TravelStage.RETURNING, 60);
      await this.sendStatusMessage(travelId, frog.tokenId, '📝 正在撰写旅行日记...', 'INFO');

      // ✅ 生成 AI 故事（包含链信息）
      const durationHours = Math.ceil(
        (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
      );
      
      const chainConfig = getChainConfig(chainId);
      
      const journal = await aiService.generateJournal(
        frog.name,
        observation,
        durationHours,
        {
          chainName: chainConfig.displayName,
          chainScenery: chainConfig.scenery,
          chainVibe: chainConfig.vibe,
          isRandom: isRandom,
        }
      );

      await this.updateTravelStage(travelId, TravelStage.RETURNING, 80);

      // 计算 XP
      const xpGained = (durationHours * 10) + (observation.notableEvents.length * 50);
      logger.info(`Frog ${frog.tokenId} gained ${xpGained} XP`);

      // 上传到 IPFS
      const journalHash = await ipfsService.uploadJournal(
        frog.name,
        frog.tokenId,
        journal,
        durationHours
      );

      // 链上操作
      let souvenirId = 0;
      let completeTxHash = null;
      
      if (this.isInitialized && config.ZETAFROG_NFT_ADDRESS) {
        try {
          souvenirId = await this.mintSouvenir(frog.ownerAddress, frog.tokenId, chainKey);
          const receipt = await this.completeOnChain(frog.tokenId, journalHash, souvenirId);
          completeTxHash = receipt?.transactionHash;
          await this.addExperienceOnChain(frog.tokenId, xpGained);
        } catch (error) {
          logger.error('On-chain completion failed:', error);
        }
      }

      // ✅ 更新数据库
      await prisma.travel.update({
        where: { id: travelId },
        data: {
          status: TravelStatus.Completed,
          currentStage: TravelStage.RETURNING,
          progress: 100,
          journalHash,
          journalContent: JSON.stringify(journal),
          observedTxCount: observation.totalTxCount,
          observedTotalValue: observation.totalValueWei.toString(),
          completedAt: new Date(),
          completeTxHash,
        },
      });

      // 更新青蛙状态
      await prisma.frog.update({
        where: { id: frog.id },
        data: {
          status: FrogStatus.Idle,
          totalTravels: { increment: 1 },
          xp: { increment: xpGained },
          level: { set: Math.floor((frog.xp + xpGained) / 100) + 1 },
        },
      });

      // ✅ WebSocket 通知
      if (this.io) {
        this.io.to(`frog:${frog.tokenId}`).emit('travel:completed', {
          frogId: frog.tokenId,
          travelId,
          journalHash,
          souvenirId,
          chainId,
          chainName: chainConfig.displayName,
          discoveredAddress: isRandom ? actualTargetWallet : null,
        });
      }

      logger.info(`✅ Travel ${travelId} completed successfully`);
      
    } catch (error: any) {
      logger.error(`Failed to process travel ${travelId}:`, error);
      
      await prisma.travel.update({
        where: { id: travelId },
        data: {
          status: TravelStatus.Failed,
          errorMessage: error.message,
        },
      });

      // 恢复青蛙状态
      await prisma.frog.update({
        where: { id: travel.frog.id },
        data: { status: FrogStatus.Idle },
      });

      if (this.io) {
        this.io.to(`frog:${frog.tokenId}`).emit('travel:failed', {
          frogId: frog.tokenId,
          travelId,
          error: error.message,
        });
      }
    }
  }

  // ✅ 新增：更新旅行阶段
  private async updateTravelStage(travelId: number, stage: TravelStage, progress: number) {
    await prisma.travel.update({
      where: { id: travelId },
      data: { currentStage: stage, progress },
    });
  }

  // ✅ 新增：发送状态消息
  private async sendStatusMessage(
    travelId: number,
    frogTokenId: number,
    message: string,
    type: 'INFO' | 'DISCOVERY' | 'JOKE' | 'WARNING' | 'ERROR'
  ) {
    await prisma.travelStatusMessage.create({
      data: { travelId, message, messageType: type as any },
    });

    if (this.io) {
      this.io.to(`frog:${frogTokenId}`).emit('travel:message', {
        travelId,
        message,
        type,
      });
    }
  }

  // ✅ 修改：支持链类型
  private async mintSouvenir(ownerAddress: string, frogId: number, chainKey: string): Promise<number> {
    if (!this.isInitialized || !config.SOUVENIR_NFT_ADDRESS) return 0;

    const rarityRoll = Math.floor(Math.random() * 100);
    
    const { request } = await this.publicClient.simulateContract({
      address: config.SOUVENIR_NFT_ADDRESS as `0x${string}`,
      abi: SOUVENIR_ABI,
      functionName: 'mintSouvenir',
      args: [ownerAddress, BigInt(frogId), BigInt(rarityRoll)],
      account: this.account,
    });

    const hash = await this.walletClient.writeContract(request);
    await this.publicClient.waitForTransactionReceipt({ hash });

    const totalSupply = await this.publicClient.readContract({
      address: config.SOUVENIR_NFT_ADDRESS as `0x${string}`,
      abi: SOUVENIR_ABI,
      functionName: 'totalSupply',
    });

    return Number(totalSupply) - 1;
  }

  private async completeOnChain(frogId: number, journalHash: string, souvenirId: number) {
    if (!this.isInitialized || !config.ZETAFROG_NFT_ADDRESS) return null;

    const { request } = await this.publicClient.simulateContract({
      address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
      abi: ZETAFROG_ABI,
      functionName: 'completeTravel',
      args: [BigInt(frogId), journalHash, BigInt(souvenirId)],
      account: this.account,
    });

    const hash = await this.walletClient.writeContract(request);
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    
    logger.info(`Travel completed on-chain: ${hash}`);
    return receipt;
  }

  private async addExperienceOnChain(frogId: number, xpAmount: number) {
    if (!this.isInitialized || !config.ZETAFROG_NFT_ADDRESS) return;

    const { request } = await this.publicClient.simulateContract({
      address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
      abi: ZETAFROG_ABI,
      functionName: 'addExperience',
      args: [BigInt(frogId), BigInt(xpAmount)],
      account: this.account,
    });

    const hash = await this.walletClient.writeContract(request);
    await this.publicClient.waitForTransactionReceipt({ hash });
    
    logger.info(`Added ${xpAmount} XP to frog ${frogId}: ${hash}`);
  }
}

export const travelProcessor = new TravelProcessor();
```

---

### **第六部分：数据库迁移**

```bash
# 运行迁移
cd backend
npx prisma migrate dev --name add_crosschain_support
npx prisma generate
```

---

## 📋 **完整修改清单**

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `prisma/schema.prisma` | **升级** | 添加 `ChainType`, `TravelStage`, 跨链字段 |
| `contracts/ZetaFrogNFT.sol` | **修改** | 移除零地址限制，添加 `supportedChains` |
| `config/chains.ts` | **扩展** | 添加新链，辅助函数 |
| `services/travel/exploration.service.ts` | **增强** | 重试机制，备用地址 |
| `workers/travelProcessor.ts` | **重构** | 集成跨链探索，状态消息 |

---

## ✅ **验证测试**

```bash
# 1. 部署合约
cd contracts
npx hardhat run scripts/deploy.js --network zetaAthens

# 2. 运行迁移
cd backend
npx prisma migrate dev

# 3. 启动后端
npm run dev

# 4. 测试随机跨链旅行
curl -X POST http://localhost:3001/api/travel/start \
  -H "Content-Type: application/json" \
  -d '{
    "frogId": 1,
    "targetWallet": "0x0000000000000000000000000000000000000000",
    "duration": 60,
    "chainId": 97,
    "isRandom": true
  }'
```
