
# 🐸 ZetaFrog 旅行系统升级 — P0 版本详细需求

## 📋 核心理念

### 从「指定穿越」回归「随机旅行」

| 旧设计问题 | 新设计理念 |
|-----------|-----------|
| 用户指定区块/日期 → 太像工具 | **青蛙自己决定去哪** → 保留惊喜 |
| 时光穿越 → 名字太科幻 | **旅行探险** → 符合「旅行青蛙」调性 |
| 必须选择 → 操作复杂 | **一键出发** → 简单有趣 |

### 新的用户故事

```
🐸 旅行青蛙的区块链探险

"你的小青蛙背上小书包，跳进了区块链的世界！
 它可能会去 BSC 的繁华市集，
 也可能溜达到以太坊的古老街道，
 或者蹦跶到 ZetaChain 的跨链桥上...
 
 你永远不知道它会带回什么故事！
 也许是某个钱包的有趣八卦，
 也许是某个历史时刻的见闻，
 也许只是路边捡到的一片特别的树叶🍃
 
 给它打包行李，让它出发吧！"
```

---

## 1. P0 功能范围

### 1.1 核心功能清单

| 功能 | P0 | P1 | 说明 |
|------|:--:|:--:|------|
| 🎒 打包出发 | ✅ | | 一键让青蛙出发旅行 |
| 🎲 随机目的地 | ✅ | | 青蛙自己选择去哪条链、哪个区块 |
| 📍 指定钱包观察 | ✅ | | 可选：指定一个钱包让青蛙去看看 |
| 📖 旅行日记 | ✅ | | AI 生成的旅行见闻 |
| 🎁 旅行纪念品 | ✅ | | 带回的小礼物（链上发现的有趣信息） |
| 🏆 旅行徽章 | ✅ | | 简单的成就系统 |
| ⚓ 特色景点 | | ✅ | 预设的有趣地点（阶段二） |
| 🗺️ 旅行地图 | | ✅ | 可视化去过的地方（阶段二） |

### 1.2 旅行流程

```
【出发前】
用户选择：
├── 🎲 随机旅行（推荐）- 青蛙自己决定去哪
│      └── 可选：指定一个想让它观察的钱包地址
│
└── 📍 定点旅行 - 指定去哪条链
       └── 可选：指定钱包地址

【旅行中】
青蛙出发 → 随机选择链 → 随机选择时间点 → 观察钱包活动 → 生成日记 → 带回纪念品

【旅行结束】
用户收到：
├── 📖 旅行日记（青蛙视角的见闻）
├── 📸 旅行快照（那个时刻的钱包状态）
├── 🎁 纪念品（特殊发现）
└── 🏆 徽章（如果满足条件）
```

---

## 2. 数据库升级设计

### 2.1 基于现有结构的最小改动原则

现有 Travel 表结构：
```prisma
model Travel {
  id              String        @id @default(cuid())
  userId          String
  travelType      TravelType    // RANDOM / SPECIFIC / CELEBRITY
  targetChain     ChainType
  targetAddress   String?
  status          TravelStatus
  currentStage    TravelStage
  progress        Int
  startedAt       DateTime?
  completedAt     DateTime?
  estimatedDuration Int
  addressAnalysis Json?
  // ... 其他字段
}
```

**升级策略：扩展而非重建**

### 2.2 扩展 Travel 表

```prisma
model Travel {
  // ========== 现有字段（保持不变）==========
  id              String        @id @default(cuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  
  travelType      TravelType
  targetChain     ChainType
  targetAddress   String?
  targetENS       String?
  
  status          TravelStatus  @default(PENDING)
  currentStage    TravelStage   @default(DEPARTING)
  progress        Int           @default(0)
  
  startedAt       DateTime?
  completedAt     DateTime?
  estimatedDuration Int
  
  addressAnalysis Json?
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  statusMessages  TravelStatusMessage[]
  postcard        Postcard?
  
  // ========== P0 新增字段 ==========
  
  // 旅行探索详情
  exploredBlock     BigInt?               // 探索的区块号
  exploredTimestamp DateTime?             // 探索的时间点
  exploredSnapshot  Json?                 // 那个时刻的快照数据
  /*
    exploredSnapshot 结构:
    {
      nativeBalance: "1.234",
      nativeSymbol: "BNB",
      txCount: 42,
      walletAge: "180天",
      discoveries: [
        { type: "balance", desc: "持有 1.23 BNB" },
        { type: "activity", desc: "是个活跃的交易者" },
        { type: "fun_fact", desc: "这个钱包在牛市顶峰时..." }
      ]
    }
  */
  
  // 旅行日记（AI生成）
  diary             String?     @db.Text  // 旅行日记
  diaryMood         DiaryMood?            // 日记心情
  
  // 纪念品
  souvenir          Json?                 // 带回的纪念品
  /*
    souvenir 结构:
    {
      type: "postcard" | "leaf" | "stone" | "photo" | "story",
      name: "一张旧明信片",
      description: "上面写着2021年的祝福...",
      rarity: 1-5,
      chainOrigin: "BSC_TESTNET",
      blockOrigin: "5000000"
    }
  */
  
  @@index([userId])
  @@index([status])
  @@index([exploredBlock])
}

// 新增：日记心情枚举
enum DiaryMood {
  HAPPY         // 开心
  CURIOUS       // 好奇
  SURPRISED     // 惊讶
  PEACEFUL      // 平静
  EXCITED       // 兴奋
  SLEEPY        // 困困的
}
```

### 2.3 更新链类型枚举（测试网）

```prisma
enum ChainType {
  // P0 支持的测试网
  BSC_TESTNET         // BSC 测试网
  ETH_SEPOLIA         // ETH Sepolia 测试网
  ZETACHAIN_ATHENS    // ZetaChain Athens 测试网
  
  // 保留未来扩展
  ETHEREUM
  ARBITRUM
  BASE
  // ...
}
```

### 2.4 新增旅行徽章表

```prisma
// ========== 旅行徽章 ==========

model TravelBadge {
  id              String    @id @default(cuid())
  
  code            String    @unique           // 徽章代码
  name            String                      // 名称
  description     String                      // 描述
  icon            String                      // emoji 图标
  
  // 解锁条件
  unlockType      BadgeUnlockType
  unlockCondition Json
  
  rarity          Int       @default(1)       // 稀有度 1-5
  isHidden        Boolean   @default(false)   // 隐藏成就
  
  createdAt       DateTime  @default(now())
  
  userBadges      UserBadge[]
}

model UserBadge {
  id            String    @id @default(cuid())
  
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  
  badgeId       String
  badge         TravelBadge @relation(fields: [badgeId], references: [id])
  
  unlockedAt    DateTime  @default(now())
  unlockedByTravelId String?               // 解锁时的旅行
  
  @@unique([userId, badgeId])
  @@index([userId])
}

enum BadgeUnlockType {
  TRIP_COUNT        // 旅行次数
  CHAIN_VISIT       // 访问特定链
  MULTI_CHAIN       // 多链旅行
  RARE_FIND         // 稀有发现
  SPECIAL           // 特殊条件
}
```

### 2.5 新增用户旅行统计

```prisma
// ========== 旅行统计 ==========

model UserTravelStats {
  id              String    @id @default(cuid())
  
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id])
  
  // 总计
  totalTrips      Int       @default(0)
  
  // 各链统计
  bscTrips        Int       @default(0)
  ethTrips        Int       @default(0)
  zetaTrips       Int       @default(0)
  
  // 有趣统计
  totalDiscoveries Int      @default(0)      // 总发现数
  rareFinds       Int       @default(0)      // 稀有发现数
  
  // 最远/最早旅行
  earliestBlockVisited BigInt?
  oldestDateVisited    DateTime?
  
  updatedAt       DateTime  @updatedAt
}
```

### 2.6 扩展 User 表

```prisma
model User {
  // ... 现有字段保持不变 ...
  
  // P0 新增
  travelStats     UserTravelStats?
  badges          UserBadge[]
}
```

---

## 3. 后端服务设计

### 3.1 目录结构（最小新增）

```
backend/src/
├── services/
│   ├── travel/
│   │   ├── travel.service.ts          # 现有，需扩展
│   │   ├── travel.executor.ts         # 现有，需扩展
│   │   │
│   │   ├── exploration.service.ts     # 新增：探索逻辑
│   │   ├── snapshot.service.ts        # 新增：快照服务
│   │   └── souvenir.generator.ts      # 新增：纪念品生成
│   │
│   ├── ai/
│   │   ├── diary.generator.ts         # 现有，需扩展
│   │   └── prompts/
│   │       └── travel-diary.prompt.ts # 新增：旅行日记模板
│   │
│   └── badge/
│       ├── badge.service.ts           # 新增：徽章服务
│       └── badge.checker.ts           # 新增：条件检查
│
├── routes/
│   ├── travel.routes.ts               # 现有，需扩展
│   └── badge.routes.ts                # 新增：徽章API
```

### 3.2 链配置（测试网）

```typescript
// src/config/chains.ts

export const SUPPORTED_CHAINS = {
  BSC_TESTNET: {
    name: 'BSC 测试网',
    displayName: '币安测试链',
    chainId: 97,
    rpcUrl: process.env.BSC_TESTNET_RPC || 'https://data-seed-prebsc-1-s1.binance.org:8545',
    nativeSymbol: 'tBNB',
    explorerUrl: 'https://testnet.bscscan.com',
    genesisTimestamp: new Date('2020-08-31'),
    avgBlockTime: 3,
    // 旅行相关
    scenery: '繁华的测试市集',  // 场景描述
    vibe: '热闹',               // 氛围
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
```

### 3.3 探索服务（核心新增）

```typescript
// src/services/travel/exploration.service.ts

import { createPublicClient, http, formatEther } from 'viem';
import { bscTestnet, sepolia } from 'viem/chains';
import { SUPPORTED_CHAINS, ChainKey, CHAIN_KEYS } from '../../config/chains';
import { logger } from '../../utils/logger';

export interface ExplorationResult {
  chain: ChainKey;
  blockNumber: bigint;
  timestamp: Date;
  
  // 钱包快照
  snapshot: WalletSnapshot;
  
  // 发现列表
  discoveries: Discovery[];
}

export interface WalletSnapshot {
  address: string;
  nativeBalance: string;
  nativeSymbol: string;
  txCount: number;
  isActive: boolean;
  walletAge: string;
}

export interface Discovery {
  type: 'balance' | 'activity' | 'timing' | 'fun_fact';
  title: string;
  description: string;
  rarity: number; // 1-5
}

class ExplorationService {
  private clients: Record<ChainKey, any>;

  constructor() {
    // 初始化各链客户端
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
        chain: {
          id: 7001,
          name: 'ZetaChain Athens',
          nativeCurrency: { name: 'ZETA', symbol: 'aZETA', decimals: 18 },
          rpcUrls: { default: { http: [SUPPORTED_CHAINS.ZETACHAIN_ATHENS.rpcUrl] } },
        } as any,
        transport: http(SUPPORTED_CHAINS.ZETACHAIN_ATHENS.rpcUrl),
      }),
    };
  }

  /**
   * 随机选择旅行目的地
   */
  async pickRandomDestination(): Promise<{ chain: ChainKey; blockNumber: bigint }> {
    // 随机选择一条链
    const chain = CHAIN_KEYS[Math.floor(Math.random() * CHAIN_KEYS.length)];
    
    // 随机选择一个历史区块
    const blockNumber = await this.pickRandomBlock(chain);
    
    logger.info(`Frog decided to visit ${chain} at block ${blockNumber}`);
    
    return { chain, blockNumber };
  }

  /**
   * 随机选择一个区块
   */
  async pickRandomBlock(chain: ChainKey): Promise<bigint> {
    const client = this.clients[chain];
    const config = SUPPORTED_CHAINS[chain];
    
    const latestBlock = await client.getBlockNumber();
    const safeLatest = latestBlock - BigInt(10); // 避免太新的区块
    
    // 随机选择（偏向更有趣的时间段）
    const ranges = this.getInterestingRanges(chain, safeLatest);
    const selectedRange = ranges[Math.floor(Math.random() * ranges.length)];
    
    const rangeSize = selectedRange.end - selectedRange.start;
    const randomOffset = BigInt(Math.floor(Math.random() * Number(rangeSize)));
    
    return selectedRange.start + randomOffset;
  }

  /**
   * 获取有趣的区块范围（增加随机性的同时偏向有趣时期）
   */
  private getInterestingRanges(chain: ChainKey, latestBlock: bigint): { start: bigint; end: bigint }[] {
    // 简单实现：分成几个时期，都有机会被选中
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

  /**
   * 探索指定位置
   */
  async explore(
    chain: ChainKey,
    blockNumber: bigint,
    targetAddress: string
  ): Promise<ExplorationResult> {
    logger.info(`Exploring ${chain} block ${blockNumber} for wallet ${targetAddress}`);

    const client = this.clients[chain];
    const config = SUPPORTED_CHAINS[chain];

    // 1. 获取区块信息
    const block = await client.getBlock({ blockNumber });
    const timestamp = new Date(Number(block.timestamp) * 1000);

    // 2. 获取钱包快照
    const snapshot = await this.getWalletSnapshot(
      client,
      targetAddress,
      blockNumber,
      config
    );

    // 3. 生成发现
    const discoveries = this.generateDiscoveries(snapshot, timestamp, config);

    return {
      chain,
      blockNumber,
      timestamp,
      snapshot,
      discoveries,
    };
  }

  /**
   * 获取钱包快照
   */
  private async getWalletSnapshot(
    client: any,
    address: string,
    blockNumber: bigint,
    config: typeof SUPPORTED_CHAINS[ChainKey]
  ): Promise<WalletSnapshot> {
    try {
      // 获取余额
      const balance = await client.getBalance({
        address: address as `0x${string}`,
        blockNumber,
      });

      // 获取交易数
      const txCount = await client.getTransactionCount({
        address: address as `0x${string}`,
        blockNumber,
      });

      // 计算钱包活跃度
      const isActive = txCount > 0;

      // 估算钱包年龄
      const walletAge = this.estimateWalletAge(txCount, blockNumber, config);

      return {
        address,
        nativeBalance: formatEther(balance),
        nativeSymbol: config.nativeSymbol,
        txCount,
        isActive,
        walletAge,
      };
    } catch (error) {
      logger.warn(`Failed to get wallet snapshot: ${error}`);
      
      // 返回默认值
      return {
        address,
        nativeBalance: '0',
        nativeSymbol: config.nativeSymbol,
        txCount: 0,
        isActive: false,
        walletAge: '未知',
      };
    }
  }

  /**
   * 估算钱包年龄
   */
  private estimateWalletAge(
    txCount: number,
    blockNumber: bigint,
    config: typeof SUPPORTED_CHAINS[ChainKey]
  ): string {
    if (txCount === 0) return '可能是新钱包';
    if (txCount < 10) return '新手钱包';
    if (txCount < 50) return '有点经验的钱包';
    if (txCount < 200) return '老练的钱包';
    return '资深老钱包';
  }

  /**
   * 生成发现
   */
  private generateDiscoveries(
    snapshot: WalletSnapshot,
    timestamp: Date,
    config: typeof SUPPORTED_CHAINS[ChainKey]
  ): Discovery[] {
    const discoveries: Discovery[] = [];
    const balance = parseFloat(snapshot.nativeBalance);
    const year = timestamp.getFullYear();
    const month = timestamp.getMonth() + 1;

    // 余额相关发现
    if (balance === 0) {
      discoveries.push({
        type: 'balance',
        title: '空空的口袋',
        description: `这个钱包当时是空的，也许主人还没开始冒险呢`,
        rarity: 1,
      });
    } else if (balance < 0.1) {
      discoveries.push({
        type: 'balance',
        title: '小小的积蓄',
        description: `只有 ${balance.toFixed(4)} ${config.nativeSymbol}，是个节俭的小钱包`,
        rarity: 1,
      });
    } else if (balance > 10) {
      discoveries.push({
        type: 'balance',
        title: '发现大户！',
        description: `哇！有 ${balance.toFixed(2)} ${config.nativeSymbol}！这是个富有的钱包`,
        rarity: 4,
      });
    } else if (balance > 100) {
      discoveries.push({
        type: 'balance',
        title: '巨鲸出没！',
        description: `难以置信！${balance.toFixed(2)} ${config.nativeSymbol}！这是传说中的巨鲸吗？`,
        rarity: 5,
      });
    } else {
      discoveries.push({
        type: 'balance',
        title: '普通的积蓄',
        description: `持有 ${balance.toFixed(4)} ${config.nativeSymbol}`,
        rarity: 2,
      });
    }

    // 活跃度发现
    if (snapshot.txCount === 0) {
      discoveries.push({
        type: 'activity',
        title: '安静的角落',
        description: '这个钱包还没发送过任何交易，像是在沉睡',
        rarity: 2,
      });
    } else if (snapshot.txCount < 10) {
      discoveries.push({
        type: 'activity',
        title: '刚起步的旅人',
        description: `只有 ${snapshot.txCount} 笔交易，是个区块链新人`,
        rarity: 1,
      });
    } else if (snapshot.txCount > 100) {
      discoveries.push({
        type: 'activity',
        title: '活跃的老手',
        description: `已经有 ${snapshot.txCount} 笔交易了！这是个经验丰富的钱包`,
        rarity: 3,
      });
    }

    // 时间相关发现
    if (year === 2021) {
      discoveries.push({
        type: 'timing',
        title: '牛市的气息',
        description: '2021年！空气中弥漫着牛市的味道，到处都是兴奋的交易者',
        rarity: 3,
      });
    } else if (year === 2022 && month >= 5) {
      discoveries.push({
        type: 'timing',
        title: '熊市的寒风',
        description: '2022年下半年...市场有点冷清，但坚持的人还在',
        rarity: 2,
      });
    } else if (year === 2023) {
      discoveries.push({
        type: 'timing',
        title: '复苏的曙光',
        description: '2023年，虽然刚经历熊市，但新的希望正在萌芽',
        rarity: 2,
      });
    }

    // 随机趣味发现（小概率）
    if (Math.random() < 0.2) {
      const funFacts = [
        { title: '幸运数字', description: '这个区块号看起来很吉利呢！', rarity: 2 },
        { title: '路边的小花', description: '青蛙在路边发现了一朵小花', rarity: 1 },
        { title: '神秘的脚印', description: '地上有奇怪的脚印，是谁留下的呢？', rarity: 3 },
        { title: '飘落的树叶', description: '一片金色的树叶飘落在青蛙头上', rarity: 2 },
      ];
      const randomFact = funFacts[Math.floor(Math.random() * funFacts.length)];
      discoveries.push({
        type: 'fun_fact',
        ...randomFact,
      });
    }

    return discoveries;
  }

  /**
   * 随机生成目标地址（如果用户没指定）
   */
  async getRandomTargetAddress(chain: ChainKey): Promise<string> {
    // 简单实现：使用一些知名的测试网地址或随机生成
    const knownAddresses: Record<ChainKey, string[]> = {
      BSC_TESTNET: [
        '0x0000000000000000000000000000000000000000', // 零地址
        '0x000000000000000000000000000000000000dEaD', // 黑洞地址
      ],
      ETH_SEPOLIA: [
        '0x0000000000000000000000000000000000000000',
        '0x000000000000000000000000000000000000dEaD',
      ],
      ZETACHAIN_ATHENS: [
        '0x0000000000000000000000000000000000000000',
        '0x000000000000000000000000000000000000dEaD',
      ],
    };

    const addresses = knownAddresses[chain];
    return addresses[Math.floor(Math.random() * addresses.length)];
  }
}

export const explorationService = new ExplorationService();
```

### 3.4 纪念品生成器

```typescript
// src/services/travel/souvenir.generator.ts

import { ChainKey, SUPPORTED_CHAINS } from '../../config/chains';
import { Discovery } from './exploration.service';

export interface Souvenir {
  type: SouvenirType;
  name: string;
  description: string;
  rarity: number;
  chainOrigin: ChainKey;
  blockOrigin: string;
  emoji: string;
}

export type SouvenirType = 'postcard' | 'leaf' | 'stone' | 'photo' | 'story' | 'feather' | 'shell';

// 纪念品模板
const SOUVENIR_TEMPLATES: Record<SouvenirType, { names: string[]; descriptions: string[]; emoji: string }> = {
  postcard: {
    names: ['旧明信片', '褪色的明信片', '手绘明信片', '复古明信片'],
    descriptions: [
      '上面画着 {chain} 的风景',
      '写着来自 {year} 年的祝福',
      '印着模糊的区块号 {block}',
      '背面有青蛙的蹄印',
    ],
    emoji: '📮',
  },
  leaf: {
    names: ['金色落叶', '幸运四叶草', '银杏叶', '枫叶'],
    descriptions: [
      '从 {chain} 的大树上飘落',
      '沾着 {year} 年的露水',
      '叶脉上刻着神秘的数字',
      '据说能带来好运',
    ],
    emoji: '🍂',
  },
  stone: {
    names: ['光滑的石头', '奇特的小石子', '闪亮的鹅卵石', '透明的晶石'],
    descriptions: [
      '在 {chain} 的小溪里捡到的',
      '上面有奇怪的纹路',
      '摸起来温温的',
      '在月光下会发光',
    ],
    emoji: '🪨',
  },
  photo: {
    names: ['模糊的照片', '珍贵的留影', '偷拍的照片', '合影'],
    descriptions: [
      '拍下了 {chain} 的街景',
      '记录了 {year} 年的某个瞬间',
      '青蛙在角落里比了个 V',
      '有点曝光过度但很珍贵',
    ],
    emoji: '📷',
  },
  story: {
    names: ['听来的故事', '神秘的传说', '老钱包的回忆', '区块链轶事'],
    descriptions: [
      '关于 {chain} 的传说',
      '{year} 年发生的趣事',
      '一个老钱包告诉青蛙的秘密',
      '值得记录下来的见闻',
    ],
    emoji: '📖',
  },
  feather: {
    names: ['彩色羽毛', '轻飘飘的羽毛', '神奇的羽毛', '金色羽毛'],
    descriptions: [
      '不知道是什么鸟留下的',
      '在 {chain} 的风中飘来',
      '据说是幸运的象征',
      '轻得像空气一样',
    ],
    emoji: '🪶',
  },
  shell: {
    names: ['漂亮的贝壳', '螺旋贝壳', '珍珠贝壳', '小海螺'],
    descriptions: [
      '能听到区块链的声音',
      '从 {chain} 的海边带回',
      '里面住着小寄居蟹',
      '闪着珍珠般的光泽',
    ],
    emoji: '🐚',
  },
};

class SouvenirGenerator {
  /**
   * 根据探索结果生成纪念品
   */
  generate(
    chain: ChainKey,
    blockNumber: bigint,
    timestamp: Date,
    discoveries: Discovery[]
  ): Souvenir {
    // 根据发现的稀有度决定纪念品稀有度
    const maxRarity = Math.max(...discoveries.map(d => d.rarity), 1);
    const souvenirRarity = Math.min(5, Math.max(1, maxRarity + Math.floor(Math.random() * 2) - 1));

    // 随机选择纪念品类型（稀有发现更可能得到好纪念品）
    const types: SouvenirType[] = ['postcard', 'leaf', 'stone', 'photo', 'story', 'feather', 'shell'];
    const type = types[Math.floor(Math.random() * types.length)];

    const template = SOUVENIR_TEMPLATES[type];
    const config = SUPPORTED_CHAINS[chain];
    const year = timestamp.getFullYear();

    // 随机选择名称和描述
    const name = template.names[Math.floor(Math.random() * template.names.length)];
    let description = template.descriptions[Math.floor(Math.random() * template.descriptions.length)];

    // 替换占位符
    description = description
      .replace('{chain}', config.displayName)
      .replace('{year}', year.toString())
      .replace('{block}', blockNumber.toString());

    return {
      type,
      name,
      description,
      rarity: souvenirRarity,
      chainOrigin: chain,
      blockOrigin: blockNumber.toString(),
      emoji: template.emoji,
    };
  }
}

export const souvenirGenerator = new SouvenirGenerator();
```

### 3.5 旅行日记 AI Prompt

```typescript
// src/services/ai/prompts/travel-diary.prompt.ts

import { WalletSnapshot, Discovery } from '../../travel/exploration.service';
import { ChainKey, SUPPORTED_CHAINS } from '../../../config/chains';
import { Souvenir } from '../../travel/souvenir.generator';

export interface TravelDiaryParams {
  frogName: string;
  chain: ChainKey;
  blockNumber: bigint;
  timestamp: Date;
  targetAddress: string;
  snapshot: WalletSnapshot;
  discoveries: Discovery[];
  souvenir: Souvenir;
}

export function buildTravelDiaryPrompt(params: TravelDiaryParams): string {
  const {
    frogName,
    chain,
    blockNumber,
    timestamp,
    snapshot,
    discoveries,
    souvenir,
  } = params;

  const config = SUPPORTED_CHAINS[chain];
  const dateStr = timestamp.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const discoveriesText = discoveries
    .map(d => `- ${d.title}: ${d.description}`)
    .join('\n');

  return `
你是一只可爱的旅行青蛙，名叫「${frogName}」🐸

今天你背着小书包，跳进了区块链的世界去旅行！

【旅行目的地】
- 🌐 去了：${config.displayName}（${config.scenery}）
- 📍 到达：区块 #${blockNumber}
- 📅 时间：${dateStr}
- 🏠 拜访的钱包：${snapshot.address.slice(0, 10)}...

【你看到的情况】
- 💰 钱包余额：${snapshot.nativeBalance} ${snapshot.nativeSymbol}
- 📊 交易记录：${snapshot.txCount} 笔
- 👤 钱包状态：${snapshot.walletAge}

【旅途中的发现】
${discoveriesText}

【带回的纪念品】
${souvenir.emoji} ${souvenir.name}：${souvenir.description}

---

请以第一人称写一篇 100-200 字的【旅行日记】，要求：

1. 🐸 用可爱、天真、慵懒的青蛙口吻（像原版旅行青蛙的感觉）
2. 🎒 描述这次旅行的见闻，但不要太技术性
3. 🌈 把区块链的东西转化成可爱的比喻
4. 🎁 提到带回的纪念品
5. 😴 可以有点小困、小饿、小开心之类的情绪
6. 📝 简短自然，不要太正式

请以 JSON 格式输出：
{
  "title": "日记标题（简短可爱，5-10个字）",
  "content": "日记正文",
  "mood": "HAPPY/CURIOUS/SURPRISED/PEACEFUL/EXCITED/SLEEPY",
  "oneLiner": "一句话总结这次旅行（用于分享）"
}
`.trim();
}
```

### 3.6 扩展旅行服务

```typescript
// src/services/travel/travel.service.ts（扩展现有服务）

import { PrismaClient, TravelStatus, TravelType, DiaryMood } from '@prisma/client';
import { explorationService, ExplorationResult } from './exploration.service';
import { souvenirGenerator } from './souvenir.generator';
import { aiService } from '../ai/ai.service';
import { badgeService } from '../badge/badge.service';
import { ChainKey, CHAIN_KEYS } from '../../config/chains';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export interface StartTravelParams {
  userId: string;
  
  // 旅行方式
  travelType: 'RANDOM' | 'SPECIFIC';
  
  // 可选：指定链（不指定则随机）
  targetChain?: ChainKey;
  
  // 可选：指定观察的钱包
  targetAddress?: string;
}

class TravelService {
  /**
   * 开始旅行
   */
  async startTravel(params: StartTravelParams): Promise<{ travelId: string; estimatedDuration: number }> {
    const { userId, travelType, targetChain, targetAddress } = params;

    logger.info(`Starting travel for user ${userId}, type: ${travelType}`);

    // 1. 确定目的地
    let chain: ChainKey;
    let blockNumber: bigint;

    if (travelType === 'RANDOM') {
      // 完全随机
      const destination = await explorationService.pickRandomDestination();
      chain = destination.chain;
      blockNumber = destination.blockNumber;
    } else {
      // 指定链，随机区块
      chain = targetChain || CHAIN_KEYS[Math.floor(Math.random() * CHAIN_KEYS.length)];
      blockNumber = await explorationService.pickRandomBlock(chain);
    }

    // 2. 确定观察目标
    const address = targetAddress || await explorationService.getRandomTargetAddress(chain);

    // 3. 创建旅行记录
    const travel = await prisma.travel.create({
      data: {
        userId,
        travelType: travelType as TravelType,
        targetChain: chain,
        targetAddress: address,
        status: 'PENDING',
        currentStage: 'DEPARTING',
        progress: 0,
        estimatedDuration: 120, // 2分钟
      },
    });

    // 4. 加入处理队列
    await this.queueTravelJob(travel.id, chain, blockNumber, address);

    return {
      travelId: travel.id,
      estimatedDuration: 120,
    };
  }

  /**
   * 处理旅行（Worker 调用）
   */
  async processTravel(
    travelId: string,
    chain: ChainKey,
    blockNumber: bigint,
    targetAddress: string
  ): Promise<void> {
    logger.info(`Processing travel ${travelId}`);

    // 获取旅行信息
    const travel = await prisma.travel.findUnique({
      where: { id: travelId },
      include: { user: { include: { frog: true } } },
    });

    if (!travel) throw new Error('Travel not found');

    try {
      // 1. 更新状态：出发中
      await this.updateTravelProgress(travelId, 10, 'DEPARTING');

      // 2. 更新状态：探索中
      await this.updateTravelProgress(travelId, 30, 'EXPLORING');

      // 3. 执行探索
      const exploration = await explorationService.explore(chain, blockNumber, targetAddress);

      await this.updateTravelProgress(travelId, 50, 'EXPLORING');

      // 4. 生成纪念品
      const souvenir = souvenirGenerator.generate(
        chain,
        blockNumber,
        exploration.timestamp,
        exploration.discoveries
      );

      await this.updateTravelProgress(travelId, 70, 'RETURNING');

      // 5. 生成旅行日记
      const frogName = travel.user.frog?.name || 'ZetaFrog';
      const { diary, mood } = await aiService.generateTravelDiary({
        frogName,
        chain,
        blockNumber,
        timestamp: exploration.timestamp,
        targetAddress,
        snapshot: exploration.snapshot,
        discoveries: exploration.discoveries,
        souvenir,
      });

      await this.updateTravelProgress(travelId, 90, 'RETURNING');

      // 6. 保存结果
      await prisma.travel.update({
        where: { id: travelId },
        data: {
          status: 'COMPLETED',
          currentStage: 'RETURNING',
          progress: 100,
          completedAt: new Date(),
          exploredBlock: blockNumber,
          exploredTimestamp: exploration.timestamp,
          exploredSnapshot: {
            ...exploration.snapshot,
            discoveries: exploration.discoveries,
          },
          diary,
          diaryMood: mood as DiaryMood,
          souvenir: souvenir,
        },
      });

      // 7. 更新用户统计
      await this.updateUserStats(travel.userId, chain);

      // 8. 检查徽章
      await badgeService.checkAndUnlock(travel.userId, {
        chain,
        travelId,
        discoveries: exploration.discoveries,
      });

      logger.info(`Travel ${travelId} completed successfully`);

    } catch (error) {
      logger.error(`Travel ${travelId} failed: ${error}`);
      
      await prisma.travel.update({
        where: { id: travelId },
        data: { status: 'FAILED' },
      });
      
      throw error;
    }
  }

  /**
   * 更新旅行进度
   */
  private async updateTravelProgress(
    travelId: string,
    progress: number,
    stage: string
  ): Promise<void> {
    await prisma.travel.update({
      where: { id: travelId },
      data: { progress, currentStage: stage as any },
    });
  }

  /**
   * 更新用户统计
   */
  private async updateUserStats(userId: string, chain: ChainKey): Promise<void> {
    const chainField = {
      BSC_TESTNET: 'bscTrips',
      ETH_SEPOLIA: 'ethTrips',
      ZETACHAIN_ATHENS: 'zetaTrips',
    }[chain] as 'bscTrips' | 'ethTrips' | 'zetaTrips';

    await prisma.userTravelStats.upsert({
      where: { userId },
      create: {
        userId,
        totalTrips: 1,
        [chainField]: 1,
      },
      update: {
        totalTrips: { increment: 1 },
        [chainField]: { increment: 1 },
      },
    });
  }

  /**
   * 加入处理队列
   */
  private async queueTravelJob(
    travelId: string,
    chain: ChainKey,
    blockNumber: bigint,
    targetAddress: string
  ): Promise<void> {
    const { travelQueue } = require('../../queues');
    await travelQueue.add('process', {
      travelId,
      chain,
      blockNumber: blockNumber.toString(),
      targetAddress,
    }, {
      delay: 500,
      attempts: 3,
    });
  }
}

export const travelService = new TravelService();
```

### 3.7 徽章服务

```typescript
// src/services/badge/badge.service.ts

import { PrismaClient } from '@prisma/client';
import { ChainKey } from '../../config/chains';
import { Discovery } from '../travel/exploration.service';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export interface BadgeCheckContext {
  chain: ChainKey;
  travelId: string;
  discoveries: Discovery[];
}

class BadgeService {
  /**
   * 检查并解锁徽章
   */
  async checkAndUnlock(userId: string, context: BadgeCheckContext): Promise<string[]> {
    const unlockedBadges: string[] = [];

    // 获取用户统计
    const stats = await prisma.userTravelStats.findUnique({
      where: { userId },
    });

    // 获取用户已有徽章
    const existingBadges = await prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    });
    const existingIds = new Set(existingBadges.map(b => b.badgeId));

    // 获取所有徽章
    const allBadges = await prisma.travelBadge.findMany();

    for (const badge of allBadges) {
      if (existingIds.has(badge.id)) continue;

      const shouldUnlock = await this.checkCondition(
        badge.unlockType,
        badge.unlockCondition as any,
        stats,
        context
      );

      if (shouldUnlock) {
        await prisma.userBadge.create({
          data: {
            userId,
            badgeId: badge.id,
            unlockedByTravelId: context.travelId,
          },
        });
        unlockedBadges.push(badge.code);
        logger.info(`Badge ${badge.code} unlocked for user ${userId}`);
      }
    }

    return unlockedBadges;
  }

  /**
   * 检查解锁条件
   */
  private async checkCondition(
    type: string,
    condition: any,
    stats: any,
    context: BadgeCheckContext
  ): Promise<boolean> {
    switch (type) {
      case 'TRIP_COUNT':
        return (stats?.totalTrips || 0) >= condition.threshold;

      case 'CHAIN_VISIT':
        const chainField = {
          BSC_TESTNET: 'bscTrips',
          ETH_SEPOLIA: 'ethTrips',
          ZETACHAIN_ATHENS: 'zetaTrips',
        }[condition.chain];
        return (stats?.[chainField] || 0) >= condition.threshold;

      case 'MULTI_CHAIN':
        const visitedChains = [
          stats?.bscTrips > 0,
          stats?.ethTrips > 0,
          stats?.zetaTrips > 0,
        ].filter(Boolean).length;
        return visitedChains >= condition.threshold;

      case 'RARE_FIND':
        const maxRarity = Math.max(...context.discoveries.map(d => d.rarity));
        return maxRarity >= condition.minRarity;

      default:
        return false;
    }
  }

  /**
   * 获取用户徽章
   */
  async getUserBadges(userId: string) {
    return prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  /**
   * 获取所有徽章（含解锁状态）
   */
  async getAllBadgesWithStatus(userId: string) {
    const [allBadges, userBadges] = await Promise.all([
      prisma.travelBadge.findMany({ where: { isHidden: false } }),
      prisma.userBadge.findMany({ where: { userId } }),
    ]);

    const unlockedIds = new Set(userBadges.map(ub => ub.badgeId));

    return allBadges.map(badge => ({
      ...badge,
      unlocked: unlockedIds.has(badge.id),
      unlockedAt: userBadges.find(ub => ub.badgeId === badge.id)?.unlockedAt,
    }));
  }
}

export const badgeService = new BadgeService();
```

---

## 4. 徽章种子数据

```typescript
// scripts/seed-badges.ts

const badges = [
  // ====== 旅行次数 ======
  {
    code: 'FIRST_TRIP',
    name: '第一次出门',
    description: '完成第一次旅行',
    icon: '🎒',
    unlockType: 'TRIP_COUNT',
    unlockCondition: { threshold: 1 },
    rarity: 1,
  },
  {
    code: 'FREQUENT_TRAVELER',
    name: '常旅客',
    description: '完成 5 次旅行',
    icon: '✈️',
    unlockType: 'TRIP_COUNT',
    unlockCondition: { threshold: 5 },
    rarity: 2,
  },
  {
    code: 'TRAVEL_ADDICT',
    name: '旅行上瘾',
    description: '完成 20 次旅行',
    icon: '🌍',
    unlockType: 'TRIP_COUNT',
    unlockCondition: { threshold: 20 },
    rarity: 3,
  },
  {
    code: 'TRAVEL_MASTER',
    name: '旅行大师',
    description: '完成 50 次旅行',
    icon: '🏆',
    unlockType: 'TRIP_COUNT',
    unlockCondition: { threshold: 50 },
    rarity: 4,
  },

  // ====== 链专属 ======
  {
    code: 'BSC_VISITOR',
    name: 'BSC 游客',
    description: '去 BSC 旅行 3 次',
    icon: '🟡',
    unlockType: 'CHAIN_VISIT',
    unlockCondition: { chain: 'BSC_TESTNET', threshold: 3 },
    rarity: 2,
  },
  {
    code: 'ETH_VISITOR',
    name: '以太坊游客',
    description: '去以太坊旅行 3 次',
    icon: '💎',
    unlockType: 'CHAIN_VISIT',
    unlockCondition: { chain: 'ETH_SEPOLIA', threshold: 3 },
    rarity: 2,
  },
  {
    code: 'ZETA_VISITOR',
    name: 'ZetaChain 游客',
    description: '去 ZetaChain 旅行 3 次',
    icon: '⚡',
    unlockType: 'CHAIN_VISIT',
    unlockCondition: { chain: 'ZETACHAIN_ATHENS', threshold: 3 },
    rarity: 2,
  },

  // ====== 多链 ======
  {
    code: 'CHAIN_HOPPER',
    name: '链间旅行者',
    description: '去过 2 条不同的链',
    icon: '🌉',
    unlockType: 'MULTI_CHAIN',
    unlockCondition: { threshold: 2 },
    rarity: 2,
  },
  {
    code: 'OMNI_TRAVELER',
    name: '全链旅行家',
    description: '去过所有 3 条链',
    icon: '🌈',
    unlockType: 'MULTI_CHAIN',
    unlockCondition: { threshold: 3 },
    rarity: 3,
  },

  // ====== 稀有发现 ======
  {
    code: 'LUCKY_FINDER',
    name: '幸运儿',
    description: '发现稀有度 4 星以上的东西',
    icon: '🍀',
    unlockType: 'RARE_FIND',
    unlockCondition: { minRarity: 4 },
    rarity: 3,
  },
  {
    code: 'WHALE_WATCHER',
    name: '观鲸者',
    description: '发现一个巨鲸钱包',
    icon: '🐋',
    unlockType: 'RARE_FIND',
    unlockCondition: { minRarity: 5 },
    rarity: 4,
  },
];
```

---

## 5. API 接口设计

### 5.1 旅行 API（扩展现有）

```typescript
// src/routes/travel.routes.ts（扩展）

/**
 * 开始旅行
 * POST /api/travel/start
 */
app.post('/api/travel/start', {
  schema: {
    body: {
      type: 'object',
      properties: {
        travelType: { 
          type: 'string', 
          enum: ['RANDOM', 'SPECIFIC'],
          default: 'RANDOM'
        },
        targetChain: { 
          type: 'string', 
          enum: ['BSC_TESTNET', 'ETH_SEPOLIA', 'ZETACHAIN_ATHENS'] 
        },
        targetAddress: { 
          type: 'string', 
          pattern: '^0x[a-fA-F0-9]{40}$' 
        },
      },
    },
  },
}, async (request, reply) => {
  const userId = request.user.id;
  const { travelType, targetChain, targetAddress } = request.body as any;

  const result = await travelService.startTravel({
    userId,
    travelType: travelType || 'RANDOM',
    targetChain,
    targetAddress,
  });

  return {
    success: true,
    data: result,
    message: '🐸 青蛙背上小书包出发啦！',
  };
});

/**
 * 获取旅行结果
 * GET /api/travel/:id
 */
app.get('/api/travel/:id', async (request, reply) => {
  const { id } = request.params as { id: string };

  const travel = await prisma.travel.findUnique({
    where: { id },
  });

  if (!travel) {
    return reply.status(404).send({
      success: false,
      error: '找不到这次旅行',
    });
  }

  return {
    success: true,
    data: {
      status: travel.status,
      progress: travel.progress,
      stage: travel.currentStage,
      // 旅行完成后返回详情
      ...(travel.status === 'COMPLETED' && {
        chain: travel.targetChain,
        exploredBlock: travel.exploredBlock?.toString(),
        exploredTime: travel.exploredTimestamp,
        snapshot: travel.exploredSnapshot,
        diary: travel.diary,
        mood: travel.diaryMood,
        souvenir: travel.souvenir,
      }),
    },
  };
});

/**
 * 获取旅行历史
 * GET /api/travel/history
 */
app.get('/api/travel/history', async (request, reply) => {
  const userId = request.user.id;
  const { limit = 10, offset = 0 } = request.query as any;

  const [travels, total] = await Promise.all([
    prisma.travel.findMany({
      where: { userId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      select: {
        id: true,
        targetChain: true,
        exploredBlock: true,
        exploredTimestamp: true,
        diary: true,
        diaryMood: true,
        souvenir: true,
        completedAt: true,
      },
    }),
    prisma.travel.count({ where: { userId, status: 'COMPLETED' } }),
  ]);

  return {
    success: true,
    data: { travels, total },
  };
});

/**
 * 获取用户统计
 * GET /api/travel/stats
 */
app.get('/api/travel/stats', async (request, reply) => {
  const userId = request.user.id;

  const stats = await prisma.userTravelStats.findUnique({
    where: { userId },
  });

  return {
    success: true,
    data: stats || {
      totalTrips: 0,
      bscTrips: 0,
      ethTrips: 0,
      zetaTrips: 0,
    },
  };
});
```

### 5.2 徽章 API

```typescript
// src/routes/badge.routes.ts

/**
 * 获取所有徽章（含解锁状态）
 * GET /api/badges
 */
app.get('/api/badges', async (request, reply) => {
  const userId = request.user.id;

  const badges = await badgeService.getAllBadgesWithStatus(userId);

  return {
    success: true,
    data: badges,
  };
});

/**
 * 获取已解锁徽章
 * GET /api/badges/unlocked
 */
app.get('/api/badges/unlocked', async (request, reply) => {
  const userId = request.user.id;

  const badges = await badgeService.getUserBadges(userId);

  return {
    success: true,
    data: badges,
  };
});
```

---

## 6. 前端页面设计

### 6.1 主页面（保持简洁）

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                      🏠 青蛙的小窝                           │
│                                                             │
│                         🐸                                  │
│                   （青蛙待机动画）                            │
│                                                             │
│                    "呱~ 想出门了"                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │      ┌─────────────────────────────────────┐       │   │
│  │      │     🎒 让青蛙出门旅行               │       │   │
│  │      └─────────────────────────────────────┘       │   │
│  │                                                     │   │
│  │      可选设置：                                      │   │
│  │      ┌─────────────────────────────────────┐       │   │
│  │      │ 📍 指定观察的钱包（可不填）            │       │   │
│  │      │    0x...                             │       │   │
│  │      └─────────────────────────────────────┘       │   │
│  │                                                     │   │
│  │      ┌────────────────────────────────┐           │   │
│  │      │ 🎲 随机旅行（推荐）        ✓    │           │   │
│  │      │ 📍 指定去某条链                  │           │   │
│  │      └────────────────────────────────┘           │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                    │
│  │ 📖 日记 │  │ 🎁 纪念品│  │ 🏆 徽章 │                    │
│  └─────────┘  └─────────┘  └─────────┘                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 旅行中页面

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    🐸 青蛙出门了...                          │
│                                                             │
│                         🎒                                  │
│                    （走路动画）                              │
│                                                             │
│                                                             │
│  ────────────────────●───────────────── 60%                │
│                                                             │
│                                                             │
│            ✓ 背上小书包                                      │
│            ✓ 跳出家门                                        │
│            → 探索中...                                       │
│            ○ 发现有趣的东西                                   │
│            ○ 写旅行日记                                      │
│            ○ 蹦蹦跳跳回家                                    │
│                                                             │
│                                                             │
│              "不知道青蛙去哪了呢..."                          │
│                                                             │
│              等它回来会带礼物的 🎁                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 旅行结果页面

```
┌─────────────────────────────────────────────────────────────┐
│                    🐸 青蛙回来啦！                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📖 旅行日记                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  # 在 BSC 发现了好多有趣的东西                        │   │
│  │                                                     │   │
│  │  呱~ 今天去了币安测试链玩！                           │   │
│  │                                                     │   │
│  │  路过一个小钱包，里面只有 0.1 个金币，               │   │
│  │  看起来是个刚开始冒险的新人呢。                       │   │
│  │  在旁边的草丛里捡到一片漂亮的落叶，                   │   │
│  │  决定带回家当纪念品！                                 │   │
│  │                                                     │   │
│  │  有点累了，想回家睡觉... 😴                          │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🎁 带回的纪念品                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🍂 金色落叶                                         │   │
│  │  "从 BSC 测试链的大树上飘落"                         │   │
│  │  稀有度：⭐⭐                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📸 旅行快照                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🌐 BSC 测试网  📍 区块 #12345678                    │   │
│  │  📅 2024年6月15日                                    │   │
│  │  💰 观察到：0.1 tBNB  📊 5笔交易                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🏆 获得徽章：第一次出门 🎒                                  │
│                                                             │
│  ┌────────────┐  ┌────────────┐                           │
│  │   再出发！   │  │   返回首页  │                           │
│  └────────────┘  └────────────┘                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. P0 里程碑

| 周次 | 任务 | 交付物 |
|------|------|--------|
| **Week 1** | 数据库升级 | Prisma Schema 修改、迁移脚本 |
| **Week 2** | 探索服务 | 3条测试链 Provider、exploration.service |
| **Week 3** | 纪念品 & AI 日记 | souvenir.generator、AI Prompt |
| **Week 4** | 徽章系统 | badge.service、徽章种子数据 |
| **Week 5** | API & Worker | 路由扩展、队列处理 |
| **Week 6** | 前端 & 测试 | UI 页面、E2E 测试 |

---

## 8. P0 完成标准

- [ ] 一键出发，青蛙随机选择目的地
- [ ] 支持可选指定钱包观察
- [ ] 支持 BSC/ETH/ZETA 三条测试链
- [ ] AI 生成可爱的旅行日记
- [ ] 每次旅行带回一个纪念品
- [ ] 10+ 种徽章可解锁
- [ ] 前端交互流畅自然
- [ ] 整体体验像「旅行青蛙」而不是工具

---

这份 P0 需求把重点放回「随机性」和「惊喜感」，让用户的操作变得很简单——**就是让青蛙出门，然后等它回来看看带了什么**。这才是旅行青蛙的精髓！

要我继续细化哪个部分吗？