# ZetaFrog 后端技术需求文档 (PRD)

## 📋 文档信息

| 项目         | 内容                               |
| ------------ | ---------------------------------- |
| **项目名称** | ZetaFrog Desktop Pet - Backend     |
| **文档版本** | v1.0                               |
| **创建日期** | 2024-12-17                         |
| **文档类型** | 后端技术需求文档                   |
| **目标读者** | 后端开发工程师、智能合约开发工程师 |

------

## 1. 项目概述

### 1.1 后端职责

ZetaFrog 后端负责以下核心功能：

1. **AI 服务**：青蛙日记生成、图片生成、状态文案生成
2. **链上数据服务**：多链地址分析、交易历史获取、协议识别
3. **ZetaChain 集成**：跨链消息传递、NFT 合约交互
4. **访客系统**：跨用户青蛙互访、礼物传递
5. **数据存储**：用户数据、旅行记录、明信片存储

### 1.2 技术栈选型

| 类别              | 技术                      | 版本      | 选型理由                |
| ----------------- | ------------------------- | --------- | ----------------------- |
| **运行时**        | Node.js                   | 20 LTS    | 生态成熟、异步性能好    |
| **框架**          | Fastify                   | 4.x       | 高性能、TypeScript 友好 |
| **语言**          | TypeScript                | 5.0+      | 类型安全                |
| **数据库**        | PostgreSQL                | 15+       | 可靠、支持 JSON         |
| **缓存**          | Redis                     | 7.x       | 高性能缓存、队列        |
| **ORM**           | Prisma                    | 5.x       | 类型安全、迁移方便      |
| **任务队列**      | BullMQ                    | 4.x       | Redis 基础、可靠        |
| **AI 接口**       | OpenAI / Qwen API         | -         | 文本生成                |
| **图片生成**      | DALL-E / Stable Diffusion | -         | 明信片图片              |
| **链上交互**      | ethers.js / viem          | 6.x / 2.x | 多链支持                |
| **ZetaChain SDK** | @zetachain/toolkit        | latest    | 跨链功能                |
| **API 文档**      | Swagger/OpenAPI           | 3.0       | 接口文档                |
| **部署**          | Docker + Railway/Fly.io   | -         | 容器化部署              |

### 1.3 系统架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ZetaFrog Backend System                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         API Gateway Layer                            │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │   │
│  │  │ REST API    │ │ WebSocket   │ │ Rate Limit  │ │ Auth        │   │   │
│  │  │ Fastify     │ │ 实时推送    │ │ 限流        │ │ 钱包签名    │   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      ↓                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Service Layer                                │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │   │
│  │  │ FrogService │ │TravelService│ │ AIService   │ │ChainService │   │   │
│  │  │ 青蛙管理    │ │ 旅行管理    │ │ AI 生成     │ │ 链上交互    │   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                   │   │
│  │  │VisitorSvc   │ │PostcardSvc  │ │SouvenirSvc  │                   │   │
│  │  │ 访客系统    │ │ 明信片      │ │ 纪念品      │                   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      ↓                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Worker Layer                                 │   │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │   │
│  │  │ TravelWorker    │ │ AIWorker        │ │ ChainWorker     │       │   │
│  │  │ 旅行流程执行    │ │ AI 内容生成     │ │ 链上数据同步    │       │   │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      ↓                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Data Layer                                   │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────────┐   │   │
│  │  │ PostgreSQL  │ │ Redis       │ │ External APIs               │   │   │
│  │  │ 持久化存储  │ │ 缓存/队列   │ │ Etherscan/DeBank/AI APIs   │   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓↑
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Blockchain Layer                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐          │
│  │ ZetaChain   │ │ Ethereum    │ │ Arbitrum    │ │ Solana      │ ...      │
│  │ 跨链枢纽    │ │             │ │             │ │             │          │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

------

## 2. 目录结构

```
zetafrog-backend/
├── src/
│   ├── index.ts                    # 应用入口
│   ├── app.ts                      # Fastify 应用配置
│   │
│   ├── config/                     # 配置
│   │   ├── index.ts               # 配置聚合
│   │   ├── database.ts            # 数据库配置
│   │   ├── redis.ts               # Redis 配置
│   │   ├── chains.ts              # 链配置
│   │   └── ai.ts                  # AI 服务配置
│   │
│   ├── routes/                     # API 路由
│   │   ├── index.ts               # 路由聚合
│   │   ├── frog.routes.ts         # 青蛙相关
│   │   ├── travel.routes.ts       # 旅行相关
│   │   ├── postcard.routes.ts     # 明信片相关
│   │   ├── visitor.routes.ts      # 访客相关
│   │   ├── souvenir.routes.ts     # 纪念品相关
│   │   └── health.routes.ts       # 健康检查
│   │
│   ├── controllers/                # 控制器
│   │   ├── frog.controller.ts
│   │   ├── travel.controller.ts
│   │   ├── postcard.controller.ts
│   │   ├── visitor.controller.ts
│   │   └── souvenir.controller.ts
│   │
│   ├── services/                   # 业务服务
│   │   ├── frog/
│   │   │   ├── frog.service.ts
│   │   │   └── frog.generator.ts  # 青蛙生成逻辑
│   │   │
│   │   ├── travel/
│   │   │   ├── travel.service.ts
│   │   │   ├── travel.executor.ts # 旅行执行器
│   │   │   └── travel.scheduler.ts
│   │   │
│   │   ├── ai/
│   │   │   ├── ai.service.ts      # AI 服务聚合
│   │   │   ├── diary.generator.ts # 日记生成
│   │   │   ├── status.generator.ts# 状态文案生成
│   │   │   ├── image.generator.ts # 图片生成
│   │   │   └── prompts/           # Prompt 模板
│   │   │       ├── diary.prompt.ts
│   │   │       ├── status.prompt.ts
│   │   │       └── image.prompt.ts
│   │   │
│   │   ├── chain/
│   │   │   ├── chain.service.ts   # 链服务聚合
│   │   │   ├── address.analyzer.ts# 地址分析
│   │   │   ├── transaction.parser.ts
│   │   │   ├── protocol.detector.ts
│   │   │   └── providers/         # 各链 Provider
│   │   │       ├── ethereum.provider.ts
│   │   │       ├── zetachain.provider.ts
│   │   │       ├── arbitrum.provider.ts
│   │   │       ├── solana.provider.ts
│   │   │       └── index.ts
│   │   │
│   │   ├── postcard/
│   │   │   ├── postcard.service.ts
│   │   │   └── postcard.renderer.ts
│   │   │
│   │   ├── visitor/
│   │   │   ├── visitor.service.ts
│   │   │   └── visitor.matcher.ts
│   │   │
│   │   └── souvenir/
│   │       ├── souvenir.service.ts
│   │       └── souvenir.rules.ts  # 纪念品获取规则
│   │
│   ├── workers/                    # 后台任务
│   │   ├── index.ts               # Worker 启动器
│   │   ├── travel.worker.ts       # 旅行流程 Worker
│   │   ├── ai.worker.ts           # AI 生成 Worker
│   │   ├── chain.worker.ts        # 链数据同步 Worker
│   │   └── cleanup.worker.ts      # 数据清理 Worker
│   │
│   ├── queues/                     # 任务队列
│   │   ├── index.ts
│   │   ├── travel.queue.ts
│   │   ├── ai.queue.ts
│   │   └── chain.queue.ts
│   │
│   ├── websocket/                  # WebSocket
│   │   ├── index.ts
│   │   ├── travel.socket.ts       # 旅行状态推送
│   │   └── visitor.socket.ts      # 访客通知推送
│   │
│   ├── contracts/                  # 智能合约交互
│   │   ├── ZetaFrogNFT.ts         # NFT 合约
│   │   ├── VisitorBook.ts         # 访客簿合约
│   │   └── abis/                  # 合约 ABI
│   │       ├── ZetaFrogNFT.json
│   │       └── VisitorBook.json
│   │
│   ├── middlewares/                # 中间件
│   │   ├── auth.middleware.ts     # 钱包签名验证
│   │   ├── rateLimit.middleware.ts
│   │   └── error.middleware.ts
│   │
│   ├── utils/                      # 工具函数
│   │   ├── crypto.ts              # 签名验证
│   │   ├── address.ts             # 地址处理
│   │   ├── formatters.ts          # 格式化
│   │   ├── validators.ts          # 校验器
│   │   └── constants.ts           # 常量
│   │
│   └── types/                      # 类型定义
│       ├── index.ts
│       ├── frog.types.ts
│       ├── travel.types.ts
│       ├── chain.types.ts
│       ├── ai.types.ts
│       └── api.types.ts
│
├── prisma/
│   ├── schema.prisma              # 数据库 Schema
│   └── migrations/                # 迁移文件
│
├── contracts/                      # Solidity 合约源码
│   ├── ZetaFrogNFT.sol
│   ├── VisitorBook.sol
│   └── hardhat.config.ts
│
├── scripts/                        # 脚本
│   ├── deploy.ts                  # 合约部署
│   └── seed.ts                    # 数据初始化
│
├── tests/                          # 测试
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
│
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

------

## 3. 数据库设计

### 3.1 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============ 用户 & 青蛙 ============

model User {
  id            String    @id @default(cuid())
  walletAddress String    @unique
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // 关联
  frog          Frog?
  travels       Travel[]
  postcards     Postcard[]
  visitors      Visitor[] @relation("VisitorHost")
  visits        Visitor[] @relation("VisitorGuest")
  
  @@index([walletAddress])
}

model Frog {
  id            String          @id @default(cuid())
  userId        String          @unique
  user          User            @relation(fields: [userId], references: [id])
  
  // 基本信息
  name          String
  personality   PersonalityType
  level         FrogLevel       @default(TADPOLE)
  
  // NFT 信息
  tokenId       String?         @unique
  mintedAt      DateTime?
  
  // 统计
  totalTrips    Int             @default(0)
  totalSouvenirs Int            @default(0)
  
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  
  // 关联
  accessories   FrogAccessory[]
  souvenirs     FrogSouvenir[]
  
  @@index([tokenId])
}

enum PersonalityType {
  PHILOSOPHER   // 哲学家
  COMEDIAN      // 段子手
  POET          // 诗人
  GOSSIP        // 八卦蛙
}

enum FrogLevel {
  TADPOLE       // 蝌蚪 (0-5)
  SMALL         // 小青蛙 (6-20)
  TRAVELER      // 旅行家 (21-50)
  EXPLORER      // 探险王 (51-100)
  MASTER        // 全链之蛙 (100+)
}

// ============ 装饰品 ============

model Accessory {
  id            String    @id @default(cuid())
  name          String
  icon          String
  slot          AccessorySlot
  rarity        Int       @default(1) // 1-5
  description   String?
  obtainCondition String?
  
  // 关联
  frogAccessories FrogAccessory[]
}

model FrogAccessory {
  id            String    @id @default(cuid())
  frogId        String
  frog          Frog      @relation(fields: [frogId], references: [id])
  accessoryId   String
  accessory     Accessory @relation(fields: [accessoryId], references: [id])
  
  isEquipped    Boolean   @default(false)
  obtainedAt    DateTime  @default(now())
  obtainedFrom  String?   // 来源地址或链
  
  @@unique([frogId, accessoryId])
  @@index([frogId])
}

enum AccessorySlot {
  HEAD
  EYES
  BODY
  BACK
  HAND
}

// ============ 纪念品 ============

model Souvenir {
  id              String    @id @default(cuid())
  name            String
  icon            String
  rarity          Int       @default(1) // 1-5
  description     String?
  obtainCondition String    // 获取条件描述
  
  // 获取规则 (JSON)
  rules           Json      // { chain?: string, minBalance?: number, hasProtocol?: string, ... }
  
  // 关联
  frogSouvenirs   FrogSouvenir[]
}

model FrogSouvenir {
  id            String    @id @default(cuid())
  frogId        String
  frog          Frog      @relation(fields: [frogId], references: [id])
  souvenirId    String
  souvenir      Souvenir  @relation(fields: [souvenirId], references: [id])
  
  obtainedAt    DateTime  @default(now())
  obtainedFrom  String    // 获取来源地址
  obtainedChain ChainType
  travelId      String?   // 关联的旅行
  
  @@unique([frogId, souvenirId])
  @@index([frogId])
}

// ============ 旅行 ============

model Travel {
  id              String        @id @default(cuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  
  // 旅行配置
  travelType      TravelType
  targetChain     ChainType
  targetAddress   String?
  targetENS       String?
  
  // 状态
  status          TravelStatus  @default(PENDING)
  currentStage    TravelStage   @default(DEPARTING)
  progress        Int           @default(0) // 0-100
  
  // 时间
  startedAt       DateTime?
  completedAt     DateTime?
  estimatedDuration Int         // 秒
  
  // 结果
  addressAnalysis Json?         // 地址分析结果
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  // 关联
  statusMessages  TravelStatusMessage[]
  postcard        Postcard?
  
  @@index([userId])
  @@index([status])
}

enum TravelType {
  RANDOM          // 随机
  SPECIFIC        // 指定地址
  CELEBRITY       // 名人
}

enum TravelStatus {
  PENDING         // 等待开始
  IN_PROGRESS     // 进行中
  COMPLETED       // 已完成
  FAILED          // 失败
  CANCELLED       // 已取消
}

enum TravelStage {
  DEPARTING       // 出发中
  CROSSING        // 跨链穿越中
  ARRIVING        // 到达中
  EXPLORING       // 探索中
  RETURNING       // 返回中
}

model TravelStatusMessage {
  id            String    @id @default(cuid())
  travelId      String
  travel        Travel    @relation(fields: [travelId], references: [id])
  
  message       String
  messageType   MessageType @default(INFO)
  
  createdAt     DateTime  @default(now())
  
  @@index([travelId])
}

enum MessageType {
  INFO
  DISCOVERY
  JOKE
  WARNING
}

// ============ 明信片 ============

model Postcard {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  travelId        String    @unique
  travel          Travel    @relation(fields: [travelId], references: [id])
  
  // 目标信息
  targetAddress   String
  targetENS       String?
  targetChain     ChainType
  
  // AI 生成内容
  diary           String    @db.Text
  mood            MoodType
  highlight       String?
  
  // 图片
  imageUrl        String?
  imagePrompt     String?   @db.Text
  
  // 留下的礼物
  giftLeft        GiftType  @default(POOP)
  
  // 获得的纪念品 ID 列表
  souvenirIds     String[]
  
  createdAt       DateTime  @default(now())
  
  @@index([userId])
  @@index([targetAddress])
}

enum MoodType {
  EXCITED
  CURIOUS
  SHOCKED
  PHILOSOPHICAL
  AMUSED
}

enum GiftType {
  POOP
  STICKER
  FLOWER
  NOTE
}

// ============ 访客 ============

model Visitor {
  id              String    @id @default(cuid())
  
  // 访问者
  guestUserId     String
  guest           User      @relation("VisitorGuest", fields: [guestUserId], references: [id])
  guestFrogName   String
  
  // 被访问者
  hostUserId      String
  host            User      @relation("VisitorHost", fields: [hostUserId], references: [id])
  hostAddress     String
  
  // 访问信息
  fromChain       ChainType
  message         String?   @db.Text
  giftLeft        GiftType  @default(POOP)
  
  // 状态
  isRead          Boolean   @default(false)
  
  visitedAt       DateTime  @default(now())
  
  @@index([hostUserId])
  @@index([guestUserId])
}

// ============ 名人地址 ============

model CelebrityAddress {
  id            String    @id @default(cuid())
  address       String    @unique
  ens           String?
  name          String    // 显示名称
  description   String?
  chain         ChainType
  category      String?   // 分类: founder, influencer, whale, etc.
  
  isActive      Boolean   @default(true)
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([chain])
  @@index([category])
}

// ============ 通用枚举 ============

enum ChainType {
  ETHEREUM
  ZETACHAIN
  ARBITRUM
  OPTIMISM
  SOLANA
  BITCOIN
  BSC
  BASE
  POLYGON
}
```

### 3.2 索引优化

```sql
-- 额外索引（性能优化）

-- 旅行查询优化
CREATE INDEX idx_travel_user_status ON "Travel" ("userId", "status");
CREATE INDEX idx_travel_created ON "Travel" ("createdAt" DESC);

-- 明信片查询优化
CREATE INDEX idx_postcard_user_created ON "Postcard" ("userId", "createdAt" DESC);

-- 访客查询优化
CREATE INDEX idx_visitor_host_unread ON "Visitor" ("hostUserId", "isRead") WHERE "isRead" = false;

-- 纪念品查询优化
CREATE INDEX idx_frog_souvenir_chain ON "FrogSouvenir" ("obtainedChain");
```

------

## 4. API 设计

### 4.1 API 概览

| 模块       | 端点                          | 方法 | 描述               |
| ---------- | ----------------------------- | ---- | ------------------ |
| **青蛙**   | `/api/frog`                   | GET  | 获取当前用户的青蛙 |
|            | `/api/frog`                   | POST | 创建/孵化青蛙      |
|            | `/api/frog/accessories`       | GET  | 获取装饰品列表     |
|            | `/api/frog/accessories/equip` | POST | 装备装饰品         |
| **旅行**   | `/api/travel`                 | POST | 开始新旅行         |
|            | `/api/travel/:id`             | GET  | 获取旅行详情       |
|            | `/api/travel/:id/cancel`      | POST | 取消旅行           |
|            | `/api/travel/history`         | GET  | 获取旅行历史       |
| **明信片** | `/api/postcards`              | GET  | 获取明信片列表     |
|            | `/api/postcards/:id`          | GET  | 获取明信片详情     |
|            | `/api/postcards/:id/share`    | POST | 生成分享链接       |
| **纪念品** | `/api/souvenirs`              | GET  | 获取所有纪念品定义 |
|            | `/api/souvenirs/my`           | GET  | 获取已收集的纪念品 |
| **访客**   | `/api/visitors`               | GET  | 获取访客列表       |
|            | `/api/visitors/:id/read`      | POST | 标记已读           |
|            | `/api/visitors/visit`         | POST | 回访               |
| **链数据** | `/api/chain/analyze`          | POST | 分析地址           |
|            | `/api/chain/celebrities`      | GET  | 获取名人地址       |

### 4.2 详细 API 定义

#### 4.2.1 青蛙模块

```typescript
// ===== 获取青蛙 =====
// GET /api/frog
// Headers: Authorization: Bearer <wallet_signature>

interface GetFrogResponse {
  success: boolean;
  data: {
    frog: {
      id: string;
      name: string;
      personality: PersonalityType;
      level: FrogLevel;
      totalTrips: number;
      totalSouvenirs: number;
      tokenId: string | null;
      createdAt: string;
    };
    accessories: {
      equipped: EquippedAccessory[];
      inventory: AccessoryItem[];
    };
    stats: {
      chainsVisited: number;
      addressesVisited: number;
      longestTrip: number; // 秒
    };
  } | null;
}

// ===== 创建青蛙 =====
// POST /api/frog
// Headers: Authorization: Bearer <wallet_signature>

interface CreateFrogRequest {
  name: string; // 可选，不传则自动生成
}

interface CreateFrogResponse {
  success: boolean;
  data: {
    frog: {
      id: string;
      name: string;
      personality: PersonalityType; // 根据钱包历史生成
      level: FrogLevel;
    };
    generationReason: string; // "你的钱包历史显示你是个 DeFi 农民，所以你的青蛙是哲学家性格..."
  };
}

// ===== 装备装饰品 =====
// POST /api/frog/accessories/equip

interface EquipAccessoryRequest {
  accessoryId: string;
  slot: AccessorySlot;
}

interface EquipAccessoryResponse {
  success: boolean;
  data: {
    equipped: EquippedAccessory[];
  };
}
```

#### 4.2.2 旅行模块

```typescript
// ===== 开始旅行 =====
// POST /api/travel

interface StartTravelRequest {
  type: 'random' | 'specific' | 'celebrity';
  targetAddress?: string;  // type=specific 时必填
  targetChain?: ChainType; // type=specific 时可选
  celebrityId?: string;    // type=celebrity 时必填
}

interface StartTravelResponse {
  success: boolean;
  data: {
    travel: {
      id: string;
      status: TravelStatus;
      targetChain: ChainType;
      targetAddress: string | null; // random 时开始为 null
      estimatedDuration: number;
    };
  };
}

// ===== 获取旅行详情 =====
// GET /api/travel/:id

interface GetTravelResponse {
  success: boolean;
  data: {
    travel: {
      id: string;
      type: TravelType;
      status: TravelStatus;
      currentStage: TravelStage;
      progress: number;
      targetChain: ChainType;
      targetAddress: string | null;
      targetENS: string | null;
      estimatedDuration: number;
      startedAt: string | null;
      completedAt: string | null;
      statusMessages: {
        message: string;
        type: MessageType;
        createdAt: string;
      }[];
    };
    postcard: PostcardData | null; // 完成后才有
  };
}

// ===== 获取旅行历史 =====
// GET /api/travel/history?page=1&limit=20

interface GetTravelHistoryResponse {
  success: boolean;
  data: {
    travels: TravelSummary[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

interface TravelSummary {
  id: string;
  targetChain: ChainType;
  targetAddress: string;
  targetENS: string | null;
  status: TravelStatus;
  completedAt: string;
  souvenirCount: number;
}
```

#### 4.2.3 明信片模块

```typescript
// ===== 获取明信片列表 =====
// GET /api/postcards?page=1&limit=20

interface GetPostcardsResponse {
  success: boolean;
  data: {
    postcards: PostcardSummary[];
    pagination: Pagination;
  };
}

interface PostcardSummary {
  id: string;
  targetChain: ChainType;
  targetAddress: string;
  targetENS: string | null;
  mood: MoodType;
  imageUrl: string | null;
  souvenirCount: number;
  createdAt: string;
}

// ===== 获取明信片详情 =====
// GET /api/postcards/:id

interface GetPostcardResponse {
  success: boolean;
  data: {
    postcard: {
      id: string;
      targetAddress: string;
      targetENS: string | null;
      targetChain: ChainType;
      diary: string;
      mood: MoodType;
      highlight: string | null;
      imageUrl: string | null;
      giftLeft: GiftType;
      souvenirs: SouvenirItem[];
      createdAt: string;
    };
    travel: {
      id: string;
      duration: number;
      startedAt: string;
      completedAt: string;
    };
  };
}

// ===== 生成分享链接 =====
// POST /api/postcards/:id/share

interface SharePostcardRequest {
  platform: 'twitter' | 'farcaster' | 'link';
}

interface SharePostcardResponse {
  success: boolean;
  data: {
    shareUrl: string;      // 分享链接
    shareText: string;     // 预填文案
    imageUrl: string;      // 分享图片
  };
}
```

#### 4.2.4 访客模块

```typescript
// ===== 获取访客列表 =====
// GET /api/visitors?unreadOnly=true&page=1&limit=20

interface GetVisitorsResponse {
  success: boolean;
  data: {
    visitors: VisitorItem[];
    unreadCount: number;
    pagination: Pagination;
  };
}

interface VisitorItem {
  id: string;
  guestFrogName: string;
  guestAddress: string;
  fromChain: ChainType;
  message: string | null;
  giftLeft: GiftType;
  isRead: boolean;
  visitedAt: string;
}

// ===== 标记已读 =====
// POST /api/visitors/:id/read

interface MarkReadResponse {
  success: boolean;
}

// ===== 回访 =====
// POST /api/visitors/visit

interface VisitBackRequest {
  targetAddress: string;
  targetChain: ChainType;
  message?: string;
  gift?: GiftType;
}

interface VisitBackResponse {
  success: boolean;
  data: {
    travelId: string; // 开始一次新旅行
  };
}
```

#### 4.2.5 链数据模块

```typescript
// ===== 分析地址 =====
// POST /api/chain/analyze

interface AnalyzeAddressRequest {
  address: string;
  chain: ChainType;
}

interface AnalyzeAddressResponse {
  success: boolean;
  data: {
    analysis: {
      address: string;
      ens: string | null;
      chain: ChainType;
      
      // 基本信息
      accountAge: string;           // "3 年 2 个月"
      firstTxDate: string;
      
      // 资产
      holdings: {
        totalValueUsd: number;
        tokens: TokenHolding[];
        nfts: NFTHolding[];
      };
      
      // 活动
      recentTransactions: Transaction[];
      interactedProtocols: string[];
      
      // 标签
      tags: string[];               // ["巨鲸", "DeFi农民", "NFT收藏家"]
      
      // 特殊发现
      specialFindings: string[];    // ["持有创世 NFT", "从未卖出过"]
    };
    
    // 可获得的纪念品
    availableSouvenirs: SouvenirItem[];
  };
}

// ===== 获取名人地址 =====
// GET /api/chain/celebrities?chain=ethereum&category=founder

interface GetCelebritiesResponse {
  success: boolean;
  data: {
    celebrities: CelebrityItem[];
  };
}

interface CelebrityItem {
  id: string;
  address: string;
  ens: string | null;
  name: string;
  description: string | null;
  chain: ChainType;
  category: string;
}
```

### 4.3 WebSocket API

```typescript
// WebSocket 连接: ws://api.zetafrog.com/ws

// ===== 认证 =====
// 客户端发送
interface WSAuthMessage {
  type: 'auth';
  payload: {
    address: string;
    signature: string;
    timestamp: number;
  };
}

// ===== 订阅旅行状态 =====
// 客户端发送
interface WSSubscribeTravelMessage {
  type: 'subscribe_travel';
  payload: {
    travelId: string;
  };
}

// 服务端推送 - 旅行状态更新
interface WSTravelUpdateMessage {
  type: 'travel_update';
  payload: {
    travelId: string;
    stage: TravelStage;
    progress: number;
    message: {
      text: string;
      type: MessageType;
    };
  };
}

// 服务端推送 - 旅行完成
interface WSTravelCompleteMessage {
  type: 'travel_complete';
  payload: {
    travelId: string;
    postcardId: string;
    souvenirs: SouvenirItem[];
  };
}

// ===== 访客通知 =====
// 服务端推送
interface WSVisitorNotifyMessage {
  type: 'visitor_notify';
  payload: {
    visitorId: string;
    guestFrogName: string;
    fromChain: ChainType;
    giftLeft: GiftType;
  };
}
```

### 4.4 错误码定义

```typescript
enum ErrorCode {
  // 通用错误 1xxx
  UNKNOWN_ERROR = 1000,
  INVALID_PARAMS = 1001,
  UNAUTHORIZED = 1002,
  FORBIDDEN = 1003,
  NOT_FOUND = 1004,
  RATE_LIMITED = 1005,
  
  // 青蛙相关 2xxx
  FROG_NOT_FOUND = 2001,
  FROG_ALREADY_EXISTS = 2002,
  FROG_IS_TRAVELING = 2003,
  
  // 旅行相关 3xxx
  TRAVEL_NOT_FOUND = 3001,
  TRAVEL_ALREADY_IN_PROGRESS = 3002,
  TRAVEL_CANNOT_CANCEL = 3003,
  INVALID_TARGET_ADDRESS = 3004,
  CHAIN_NOT_SUPPORTED = 3005,
  
  // 装饰品相关 4xxx
  ACCESSORY_NOT_FOUND = 4001,
  ACCESSORY_NOT_OWNED = 4002,
  ACCESSORY_SLOT_MISMATCH = 4003,
  
  // 链数据相关 5xxx
  ADDRESS_ANALYSIS_FAILED = 5001,
  CHAIN_RPC_ERROR = 5002,
  
  // AI 相关 6xxx
  AI_GENERATION_FAILED = 6001,
  AI_RATE_LIMITED = 6002,
}

interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
  };
}
```

------

## 5. 核心服务实现

### 5.1 青蛙生成服务

```typescript
// services/frog/frog.generator.ts

import { PrismaClient, PersonalityType } from '@prisma/client';
import { ChainService } from '../chain/chain.service';

interface WalletAnalysis {
  totalTxCount: number;
  defiInteractions: number;
  nftCount: number;
  tradingFrequency: 'low' | 'medium' | 'high';
  holdingStyle: 'diamond_hands' | 'trader' | 'degen';
  mainActivity: string[];
}

export class FrogGenerator {
  constructor(
    private prisma: PrismaClient,
    private chainService: ChainService
  ) {}

  async generateFrog(walletAddress: string): Promise<GeneratedFrog> {
    // 1. 分析钱包历史
    const walletAnalysis = await this.analyzeWallet(walletAddress);
    
    // 2. 确定性格
    const personality = this.determinePersonality(walletAnalysis);
    
    // 3. 生成名字
    const name = this.generateName(personality);
    
    // 4. 生成解释
    const reason = this.generateReason(personality, walletAnalysis);
    
    return {
      name,
      personality,
      reason,
      walletAnalysis,
    };
  }

  private async analyzeWallet(address: string): Promise<WalletAnalysis> {
    // 获取多链数据
    const chains = ['ethereum', 'arbitrum', 'bsc'] as const;
    
    const analyses = await Promise.all(
      chains.map(chain => 
        this.chainService.getAddressActivity(address, chain)
          .catch(() => null)
      )
    );

    // 聚合分析
    const validAnalyses = analyses.filter(Boolean);
    
    const totalTxCount = validAnalyses.reduce(
      (sum, a) => sum + (a?.txCount || 0), 0
    );
    
    const defiInteractions = validAnalyses.reduce(
      (sum, a) => sum + (a?.defiProtocols?.length || 0), 0
    );
    
    const nftCount = validAnalyses.reduce(
      (sum, a) => sum + (a?.nftCount || 0), 0
    );

    // 判断交易频率
    let tradingFrequency: 'low' | 'medium' | 'high';
    if (totalTxCount < 50) tradingFrequency = 'low';
    else if (totalTxCount < 500) tradingFrequency = 'medium';
    else tradingFrequency = 'high';

    // 判断持仓风格
    let holdingStyle: 'diamond_hands' | 'trader' | 'degen';
    // 简化逻辑，实际可更复杂
    if (tradingFrequency === 'low') holdingStyle = 'diamond_hands';
    else if (defiInteractions > 10) holdingStyle = 'degen';
    else holdingStyle = 'trader';

    return {
      totalTxCount,
      defiInteractions,
      nftCount,
      tradingFrequency,
      holdingStyle,
      mainActivity: this.inferMainActivity(validAnalyses),
    };
  }

  private determinePersonality(analysis: WalletAnalysis): PersonalityType {
    // 基于钱包特征确定性格
    
    // 很少交易、长期持有 -> 哲学家
    if (analysis.holdingStyle === 'diamond_hands') {
      return 'PHILOSOPHER';
    }
    
    // NFT 收藏家 -> 诗人
    if (analysis.nftCount > 20) {
      return 'POET';
    }
    
    // DeFi 重度用户 -> 段子手（见多识广）
    if (analysis.defiInteractions > 15) {
      return 'COMEDIAN';
    }
    
    // 高频交易 -> 八卦蛙（消息灵通）
    if (analysis.tradingFrequency === 'high') {
      return 'GOSSIP';
    }
    
    // 默认：随机
    const personalities: PersonalityType[] = [
      'PHILOSOPHER', 'COMEDIAN', 'POET', 'GOSSIP'
    ];
    return personalities[Math.floor(Math.random() * personalities.length)];
  }

  private generateName(personality: PersonalityType): string {
    const namePool: Record<PersonalityType, string[]> = {
      PHILOSOPHER: ['小悟', '思思', '慧慧', '道道', '禅蛙'],
      COMEDIAN: ['皮皮', '乐乐', '哈哈', '逗逗', '笑笑'],
      POET: ['诗诗', '雅雅', '墨墨', '韵韵', '梦蛙'],
      GOSSIP: ['八八', '灵灵', '探探', '消消', '料蛙'],
    };
    
    const pool = namePool[personality];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private generateReason(
    personality: PersonalityType, 
    analysis: WalletAnalysis
  ): string {
    const reasons: Record<PersonalityType, string> = {
      PHILOSOPHER: `你的钱包显示你是一个坚定的 Holder，很少交易但信念坚定。` +
        `这种沉稳的风格让你的青蛙成为了一个爱思考的哲学家。`,
      COMEDIAN: `你在 DeFi 世界里摸爬滚打，见识过各种奇葩协议和土狗项目。` +
        `这些经历让你的青蛙变成了一个段子手，总能讲出有趣的故事。`,
      POET: `你收藏了不少 NFT，说明你有艺术鉴赏力和浪漫情怀。` +
        `你的青蛙继承了这份文艺气质，成为了一个诗人。`,
      GOSSIP: `你在链上非常活跃，消息灵通，什么热点都不会错过。` +
        `你的青蛙也变得爱打听，是个十足的八卦蛙。`,
    };
    
    return reasons[personality];
  }

  private inferMainActivity(analyses: any[]): string[] {
    const activities: string[] = [];
    
    // 简化逻辑
    analyses.forEach(a => {
      if (a?.defiProtocols?.length > 0) {
        activities.push('DeFi');
      }
      if (a?.nftCount > 0) {
        activities.push('NFT');
      }
    });
    
    return [...new Set(activities)];
  }
}
```

### 5.2 旅行执行服务

```typescript
// services/travel/travel.executor.ts

import { PrismaClient, Travel, TravelStage, TravelStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { AIService } from '../ai/ai.service';
import { ChainService } from '../chain/chain.service';
import { SouvenirService } from '../souvenir/souvenir.service';
import { WebSocketManager } from '../../websocket';

export class TravelExecutor {
  constructor(
    private prisma: PrismaClient,
    private aiService: AIService,
    private chainService: ChainService,
    private souvenirService: SouvenirService,
    private wsManager: WebSocketManager,
  ) {}

  async executeTravel(travelId: string): Promise<void> {
    const travel = await this.prisma.travel.findUnique({
      where: { id: travelId },
      include: { user: { include: { frog: true } } },
    });

    if (!travel || !travel.user.frog) {
      throw new Error('Travel or Frog not found');
    }

    try {
      // 阶段 1: 出发
      await this.executeDeparting(travel);
      
      // 阶段 2: 跨链穿越
      await this.executeCrossing(travel);
      
      // 阶段 3: 到达
      await this.executeArriving(travel);
      
      // 阶段 4: 探索
      const analysisResult = await this.executeExploring(travel);
      
      // 阶段 5: 返回
      await this.executeReturning(travel);
      
      // 完成旅行，生成明信片
      await this.completeTravel(travel, analysisResult);
      
    } catch (error) {
      await this.failTravel(travel, error as Error);
    }
  }

  private async executeDeparting(travel: Travel): Promise<void> {
    await this.updateStage(travel.id, 'DEPARTING', 0);
    await this.sendStatusMessage(travel, '收拾好行李，准备出发！', 'INFO');
    
    // 模拟准备时间
    await this.delay(2000);
    
    await this.sendStatusMessage(travel, '便当打包好了，走咯！', 'INFO');
    await this.updateProgress(travel.id, 10);
  }

  private async executeCrossing(travel: Travel): Promise<void> {
    await this.updateStage(travel.id, 'CROSSING', 20);
    await this.sendStatusMessage(travel, '进入 ZetaChain 跨链通道...', 'INFO');
    
    // 模拟跨链时间
    await this.delay(3000);
    
    const chainName = this.getChainDisplayName(travel.targetChain);
    await this.sendStatusMessage(
      travel, 
      `穿越虫洞中，目标：${chainName}！`, 
      'INFO'
    );
    await this.updateProgress(travel.id, 30);
    
    await this.delay(2000);
    await this.updateProgress(travel.id, 40);
  }

  private async executeArriving(travel: Travel): Promise<void> {
    await this.updateStage(travel.id, 'ARRIVING', 50);
    
    const chainName = this.getChainDisplayName(travel.targetChain);
    await this.sendStatusMessage(travel, `到达 ${chainName} 了！`, 'INFO');
    
    // 链特定的吐槽
    const chainComment = this.getChainComment(travel.targetChain);
    if (chainComment) {
      await this.delay(1500);
      await this.sendStatusMessage(travel, chainComment, 'JOKE');
    }
    
    await this.updateProgress(travel.id, 55);
  }

  private async executeExploring(travel: Travel): Promise<AddressAnalysis> {
    await this.updateStage(travel.id, 'EXPLORING', 60);
    
    // 确定目标地址
    let targetAddress = travel.targetAddress;
    if (!targetAddress) {
      targetAddress = await this.selectRandomAddress(travel.targetChain);
      await this.prisma.travel.update({
        where: { id: travel.id },
        data: { targetAddress },
      });
    }
    
    await this.sendStatusMessage(
      travel, 
      `发现目标地址！正在潜入观察...`, 
      'INFO'
    );
    await this.updateProgress(travel.id, 65);
    
    // 分析地址
    const analysis = await this.chainService.analyzeAddress(
      targetAddress, 
      travel.targetChain
    );
    
    // 保存分析结果
    await this.prisma.travel.update({
      where: { id: travel.id },
      data: { addressAnalysis: analysis as any },
    });
    
    await this.updateProgress(travel.id, 75);
    
    // 发送发现
    if (analysis.specialFindings.length > 0) {
      const finding = analysis.specialFindings[0];
      await this.sendStatusMessage(travel, `哇！${finding}`, 'DISCOVERY');
    }
    
    await this.updateProgress(travel.id, 80);
    
    return analysis;
  }

  private async executeReturning(travel: Travel): Promise<void> {
    await this.updateStage(travel.id, 'RETURNING', 85);
    await this.sendStatusMessage(travel, '探索完毕，打包纪念品回家！', 'INFO');
    
    await this.delay(2000);
    await this.updateProgress(travel.id, 90);
    
    await this.sendStatusMessage(travel, '穿越回来中...', 'INFO');
    await this.delay(2000);
    await this.updateProgress(travel.id, 95);
  }

  private async completeTravel(
    travel: Travel, 
    analysis: AddressAnalysis
  ): Promise<void> {
    const frog = await this.prisma.frog.findUnique({
      where: { userId: travel.userId },
    });

    if (!frog) throw new Error('Frog not found');

    // 1. 生成日记
    const diary = await this.aiService.generateDiary({
      frogName: frog.name,
      personality: frog.personality,
      targetAddress: travel.targetAddress!,
      targetENS: travel.targetENS,
      targetChain: travel.targetChain,
      addressAnalysis: analysis,
    });

    // 2. 生成图片
    const imageUrl = await this.aiService.generatePostcardImage({
      chain: travel.targetChain,
      addressTags: analysis.tags,
      mood: diary.mood,
    });

    // 3. 计算获得的纪念品
    const souvenirs = await this.souvenirService.calculateSouvenirs(
      frog.id,
      travel.targetChain,
      travel.targetAddress!,
      analysis
    );

    // 4. 创建明信片
    const postcard = await this.prisma.postcard.create({
      data: {
        userId: travel.userId,
        travelId: travel.id,
        targetAddress: travel.targetAddress!,
        targetENS: travel.targetENS,
        targetChain: travel.targetChain,
        diary: diary.text,
        mood: diary.mood,
        highlight: diary.highlight,
        imageUrl,
        giftLeft: 'POOP',
        souvenirIds: souvenirs.map(s => s.id),
      },
    });

    // 5. 更新旅行状态
    await this.prisma.travel.update({
      where: { id: travel.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // 6. 更新青蛙统计
    await this.prisma.frog.update({
      where: { id: frog.id },
      data: {
        totalTrips: { increment: 1 },
        totalSouvenirs: { increment: souvenirs.length },
        level: this.calculateLevel(frog.totalSouvenirs + souvenirs.length),
      },
    });

    // 7. 推送完成通知
    await this.wsManager.sendToUser(travel.userId, {
      type: 'travel_complete',
      payload: {
        travelId: travel.id,
        postcardId: postcard.id,
        souvenirs,
      },
    });

    await this.updateProgress(travel.id, 100);
  }

  private async failTravel(travel: Travel, error: Error): Promise<void> {
    await this.prisma.travel.update({
      where: { id: travel.id },
      data: { status: 'FAILED' },
    });

    await this.wsManager.sendToUser(travel.userId, {
      type: 'travel_failed',
      payload: {
        travelId: travel.id,
        error: error.message,
      },
    });
  }

  // ===== 辅助方法 =====

  private async updateStage(
    travelId: string, 
    stage: TravelStage, 
    progress: number
  ): Promise<void> {
    await this.prisma.travel.update({
      where: { id: travelId },
      data: { currentStage: stage, progress },
    });
  }

  private async updateProgress(travelId: string, progress: number): Promise<void> {
    await this.prisma.travel.update({
      where: { id: travelId },
      data: { progress },
    });

    const travel = await this.prisma.travel.findUnique({
      where: { id: travelId },
    });

    if (travel) {
      await this.wsManager.sendToUser(travel.userId, {
        type: 'travel_progress',
        payload: { travelId, progress },
      });
    }
  }

  private async sendStatusMessage(
    travel: Travel, 
    message: string, 
    type: 'INFO' | 'DISCOVERY' | 'JOKE' | 'WARNING'
  ): Promise<void> {
    await this.prisma.travelStatusMessage.create({
      data: {
        travelId: travel.id,
        message,
        messageType: type,
      },
    });

    await this.wsManager.sendToUser(travel.userId, {
      type: 'travel_update',
      payload: {
        travelId: travel.id,
        stage: travel.currentStage,
        message: { text: message, type },
      },
    });
  }

  private getChainDisplayName(chain: string): string {
    const names: Record<string, string> = {
      ETHEREUM: '以太坊',
      ZETACHAIN: 'ZetaChain',
      ARBITRUM: 'Arbitrum',
      SOLANA: 'Solana',
      BITCOIN: '比特币',
      BSC: 'BNB Chain',
      BASE: 'Base',
    };
    return names[chain] || chain;
  }

  private getChainComment(chain: string): string | null {
    const comments: Record<string, string> = {
      ETHEREUM: '这里 Gas 费好贵，空气都是钱的味道...',
      SOLANA: '速度好快！感觉自己变成了一道光！',
      BSC: '好多 Degen 在这里冲土狗啊...',
      BITCOIN: '这里好安静，大家都在虔诚地 HODL',
      ARBITRUM: 'L2 的空气真清新，钱包舒服多了',
    };
    return comments[chain] || null;
  }

  private async selectRandomAddress(chain: string): Promise<string> {
    // 从活跃地址池中随机选择
    // 实际实现可以从链上数据或预设列表中选择
    const activeAddresses = await this.chainService.getActiveAddresses(chain, 100);
    const randomIndex = Math.floor(Math.random() * activeAddresses.length);
    return activeAddresses[randomIndex];
  }

  private calculateLevel(souvenirCount: number): string {
    if (souvenirCount <= 5) return 'TADPOLE';
    if (souvenirCount <= 20) return 'SMALL';
    if (souvenirCount <= 50) return 'TRAVELER';
    if (souvenirCount <= 100) return 'EXPLORER';
    return 'MASTER';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 5.3 AI 服务

```typescript
// services/ai/ai.service.ts

import OpenAI from 'openai';
import { DiaryPromptBuilder } from './prompts/diary.prompt';
import { StatusPromptBuilder } from './prompts/status.prompt';
import { ImagePromptBuilder } from './prompts/image.prompt';

export class AIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.AI_BASE_URL, // 可配置为 Qwen 等
    });
  }

  async generateDiary(config: DiaryConfig): Promise<DiaryResult> {
    const prompt = DiaryPromptBuilder.build(config);

    const response = await this.openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: DiaryPromptBuilder.systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('AI returned empty response');

    const result = JSON.parse(content) as DiaryResult;
    return result;
  }

  async generateStatusMessage(config: StatusConfig): Promise<string> {
    const prompt = StatusPromptBuilder.build(config);

    const response = await this.openai.chat.completions.create({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: StatusPromptBuilder.systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 100,
    });

    return response.choices[0].message.content || '呱~';
  }

  async generatePostcardImage(config: ImageConfig): Promise<string> {
    const prompt = ImagePromptBuilder.build(config);

    const response = await this.openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    return response.data[0].url || '';
  }
}

// ===== Prompt 构建器 =====

// services/ai/prompts/diary.prompt.ts
export class DiaryPromptBuilder {
  static systemPrompt = `你是一只可爱的旅行青蛙，名叫「{frog_name}」，性格是「{personality}」。
你刚刚完成了一次跨链旅行，现在要写一篇旅行日记给主人看。

性格说明：
- 哲学家 (PHILOSOPHER)：深沉、爱思考、从链上数据中感悟人生
- 段子手 (COMEDIAN)：吐槽、搞笑、爱玩 Web3 梗
- 诗人 (POET)：浪漫、文艺、用优美语言描述一切
- 八卦蛙 (GOSSIP)：爱打听、爱爆料、专注发现有趣秘密

输出要求：
1. 用第一人称写日记，开头必须有「呱！」
2. 字数 150-250 字
3. 要有趣、有细节、有洞察
4. 敏感数据用模糊词（"好多钱"而非具体金额）
5. 结尾留下祝福或调侃
6. 提到你留下了什么纪念品（便便/贴纸/小花）

输出 JSON 格式：
{
  "text": "日记正文",
  "mood": "excited|curious|shocked|philosophical|amused",
  "highlight": "这个地址最有趣的一点"
}`;

  static build(config: DiaryConfig): string {
    return `
## 青蛙信息
- 名字：${config.frogName}
- 性格：${config.personality}

## 访问的地址信息
- 地址：${config.targetAddress}
- ENS：${config.targetENS || '无'}
- 所在链：${config.targetChain}
- 账户年龄：${config.addressAnalysis.accountAge}
- 主要持仓：${this.formatHoldings(config.addressAnalysis.holdings)}
- 交互协议：${config.addressAnalysis.interactedProtocols.join(', ')}
- 特殊标签：${config.addressAnalysis.tags.join(', ')}
- 特殊发现：${config.addressAnalysis.specialFindings.join('; ')}

请根据以上信息，用青蛙的性格写一篇旅行日记。
    `.trim();
  }

  private static formatHoldings(holdings: any[]): string {
    return holdings
      .slice(0, 5)
      .map(h => `${h.symbol}`)
      .join(', ');
  }
}

// services/ai/prompts/image.prompt.ts
export class ImagePromptBuilder {
  static build(config: ImageConfig): string {
    const chainScene = this.getChainScene(config.chain);
    const moodExpression = this.getMoodExpression(config.mood);
    const tagElements = this.getTagElements(config.addressTags);

    return `A cute cartoon frog in kawaii style, ${moodExpression}, standing in front of ${chainScene}. 
The scene includes ${tagElements}. 
Style: Japanese illustration, soft pastel colors, warm lighting, clean background.
The frog is wearing a small backpack and looks like a happy traveler.
No text or watermarks.`;
  }

  private static getChainScene(chain: string): string {
    const scenes: Record<string, string> = {
      ETHEREUM: 'a purple crystal palace with floating ethereum diamonds',
      SOLANA: 'a neon-lit futuristic city with speed blur effects',
      BITCOIN: 'a golden vault filled with bitcoin coins',
      BSC: 'a busy market with yellow and orange decorations',
      ARBITRUM: 'a blue ethereal bridge in the clouds',
      BASE: 'a clean modern tech hub with blue accents',
    };
    return scenes[chain] || 'a magical blockchain landscape';
  }

  private static getMoodExpression(mood: string): string {
    const expressions: Record<string, string> = {
      excited: 'jumping with joy and sparkling eyes',
      curious: 'tilting head with wide curious eyes',
      shocked: 'mouth open in surprise',
      philosophical: 'sitting in meditation pose looking wise',
      amused: 'laughing with closed eyes',
    };
    return expressions[mood] || 'smiling happily';
  }

  private static getTagElements(tags: string[]): string {
    const elements: string[] = [];
    
    if (tags.includes('巨鲸')) elements.push('piles of gold coins');
    if (tags.includes('NFT收藏家')) elements.push('colorful picture frames');
    if (tags.includes('DeFi农民')) elements.push('farming tools and plants');
    if (tags.includes('钻石手')) elements.push('sparkling diamonds');
    
    return elements.length > 0 
      ? elements.join(', ') 
      : 'magical floating orbs';
  }
}
```

### 5.4 链上数据服务

```typescript
// services/chain/chain.service.ts

import { ChainProvider, getProvider } from './providers';
import { AddressAnalyzer } from './address.analyzer';
import { ProtocolDetector } from './protocol.detector';

export class ChainService {
  private providers: Map<string, ChainProvider> = new Map();
  private analyzer: AddressAnalyzer;
  private protocolDetector: ProtocolDetector;

  constructor() {
    this.analyzer = new AddressAnalyzer();
    this.protocolDetector = new ProtocolDetector();
  }

  private getProvider(chain: string): ChainProvider {
    if (!this.providers.has(chain)) {
      this.providers.set(chain, getProvider(chain));
    }
    return this.providers.get(chain)!;
  }

  async analyzeAddress(
    address: string, 
    chain: string
  ): Promise<AddressAnalysis> {
    const provider = this.getProvider(chain);

    // 并行获取各类数据
    const [
      accountInfo,
      tokenHoldings,
      nftHoldings,
      transactions,
      ensName,
    ] = await Promise.all([
      provider.getAccountInfo(address),
      provider.getTokenHoldings(address),
      provider.getNFTHoldings(address),
      provider.getRecentTransactions(address, 50),
      this.resolveENS(address, chain),
    ]);

    // 检测交互的协议
    const protocols = await this.protocolDetector.detect(transactions);

    // 生成标签
    const tags = this.generateTags({
      tokenHoldings,
      nftHoldings,
      transactions,
      protocols,
      accountInfo,
    });

    // 发现特殊点
    const specialFindings = this.findSpecialThings({
      tokenHoldings,
      nftHoldings,
      transactions,
      accountInfo,
    });

    return {
      address,
      ens: ensName,
      chain,
      accountAge: this.formatAccountAge(accountInfo.firstTxTimestamp),
      firstTxDate: new Date(accountInfo.firstTxTimestamp * 1000).toISOString(),
      holdings: {
        totalValueUsd: this.calculateTotalValue(tokenHoldings),
        tokens: tokenHoldings.slice(0, 10),
        nfts: nftHoldings.slice(0, 10),
      },
      recentTransactions: transactions.slice(0, 20),
      interactedProtocols: protocols,
      tags,
      specialFindings,
    };
  }

  async getActiveAddresses(chain: string, limit: number): Promise<string[]> {
    const provider = this.getProvider(chain);
    return provider.getActiveAddresses(limit);
  }

  async getAddressActivity(
    address: string, 
    chain: string
  ): Promise<AddressActivity> {
    const provider = this.getProvider(chain);
    
    const [txCount, defiProtocols, nftCount] = await Promise.all([
      provider.getTransactionCount(address),
      provider.getDefiProtocols(address),
      provider.getNFTCount(address),
    ]);

    return { txCount, defiProtocols, nftCount };
  }

  private async resolveENS(address: string, chain: string): Promise<string | null> {
    if (chain !== 'ETHEREUM') return null;
    
    try {
      const provider = this.getProvider('ETHEREUM');
      return provider.resolveENS(address);
    } catch {
      return null;
    }
  }

  private generateTags(data: TagInputData): string[] {
    const tags: string[] = [];

    // 巨鲸检测
    const totalValue = this.calculateTotalValue(data.tokenHoldings);
    if (totalValue > 10000000) tags.push('🐋 超级巨鲸');
    else if (totalValue > 1000000) tags.push('🐋 巨鲸');
    else if (totalValue > 100000) tags.push('🦈 大户');

    // NFT 收藏家
    if (data.nftHoldings.length > 100) tags.push('🖼️ NFT大藏家');
    else if (data.nftHoldings.length > 20) tags.push('🖼️ NFT收藏家');

    // DeFi 用户
    const defiProtocols = data.protocols.filter(p => 
      ['Uniswap', 'Aave', 'Compound', 'Curve', 'GMX'].includes(p)
    );
    if (defiProtocols.length > 5) tags.push('🌾 DeFi大农民');
    else if (defiProtocols.length > 2) tags.push('🌾 DeFi农民');

    // 钻石手
    const oldHoldings = data.tokenHoldings.filter(h => h.holdingDays > 365);
    if (oldHoldings.length > 3) tags.push('💎 钻石手');

    // OG
    const accountAgeDays = (Date.now() / 1000 - data.accountInfo.firstTxTimestamp) / 86400;
    if (accountAgeDays > 365 * 5) tags.push('🏛️ 远古OG');
    else if (accountAgeDays > 365 * 3) tags.push('🏛️ OG');

    // 交易频率
    if (data.transactions.length > 1000) tags.push('⚡ 高频交易者');

    return tags;
  }

  private findSpecialThings(data: any): string[] {
    const findings: string[] = [];

    // 检测知名 NFT
    const famousNFTs = ['BAYC', 'CryptoPunks', 'Azuki', 'Pudgy Penguins'];
    data.nftHoldings.forEach((nft: any) => {
      if (famousNFTs.some(name => nft.name?.includes(name))) {
        findings.push(`持有 ${nft.name}！`);
      }
    });

    // 检测从未卖出
    const hasNeverSold = data.transactions.every(
      (tx: any) => tx.type !== 'sell'
    );
    if (hasNeverSold && data.tokenHoldings.length > 0) {
      findings.push('从未卖出过任何代币，是个坚定的 Holder！');
    }

    // 检测慈善捐款
    const charityAddresses = ['0x...', '0x...']; // 预设慈善地址
    const hasDonation = data.transactions.some(
      (tx: any) => charityAddresses.includes(tx.to?.toLowerCase())
    );
    if (hasDonation) {
      findings.push('发现慈善捐款记录，是个好人！');
    }

    // 检测奇怪代币
    const weirdTokens = data.tokenHoldings.filter(
      (t: any) => t.symbol && /meme|inu|elon|doge/i.test(t.symbol)
    );
    if (weirdTokens.length > 10) {
      findings.push(`收到了超多奇怪的空投代币（${weirdTokens.length}种），堆成了小山`);
    }

    return findings;
  }

  private formatAccountAge(timestamp: number): string {
    const now = Date.now() / 1000;
    const ageSeconds = now - timestamp;
    
    const years = Math.floor(ageSeconds / (365 * 24 * 3600));
    const months = Math.floor((ageSeconds % (365 * 24 * 3600)) / (30 * 24 * 3600));
    
    if (years > 0) {
      return months > 0 ? `${years}年${months}个月` : `${years}年`;
    }
    return `${months}个月`;
  }

  private calculateTotalValue(holdings: TokenHolding[]): number {
    return holdings.reduce((sum, h) => sum + (h.valueUsd || 0), 0);
  }
}
```

### 5.5 纪念品规则服务

```typescript
// services/souvenir/souvenir.rules.ts

import { PrismaClient, ChainType } from '@prisma/client';

interface SouvenirRule {
  id: string;
  name: string;
  check: (context: RuleContext) => boolean;
}

interface RuleContext {
  chain: ChainType;
  address: string;
  analysis: AddressAnalysis;
  existingSouvenirs: string[]; // 已有的纪念品 ID
}

export class SouvenirRules {
  private rules: SouvenirRule[] = [
    // ===== 链相关纪念品 =====
    {
      id: 'bitcoin_gold',
      name: '比特金币',
      check: (ctx) => ctx.chain === 'BITCOIN',
    },
    {
      id: 'eth_crystal',
      name: '以太水晶',
      check: (ctx) => ctx.chain === 'ETHEREUM',
    },
    {
      id: 'sol_sunflower',
      name: 'Solana太阳花',
      check: (ctx) => ctx.chain === 'SOLANA',
    },
    {
      id: 'arb_bridge',
      name: 'Arbitrum彩虹桥',
      check: (ctx) => ctx.chain === 'ARBITRUM',
    },
    {
      id: 'bnb_honey',
      name: 'BNB蜂蜜罐',
      check: (ctx) => ctx.chain === 'BSC',
    },
    {
      id: 'base_crystal',
      name: 'Base水晶球',
      check: (ctx) => ctx.chain === 'BASE',
    },
    {
      id: 'zeta_star',
      name: 'Zeta星星',
      check: (ctx) => ctx.chain === 'ZETACHAIN',
    },

    // ===== 地址特征纪念品 =====
    {
      id: 'whale_crown',
      name: '巨鲸皇冠',
      check: (ctx) => ctx.analysis.holdings.totalValueUsd > 1000000,
    },
    {
      id: 'og_scroll',
      name: 'OG卷轴',
      check: (ctx) => {
        const ageMatch = ctx.analysis.accountAge.match(/(\d+)年/);
        return ageMatch ? parseInt(ageMatch[1]) >= 5 : false;
      },
    },
    {
      id: 'diamond_gloves',
      name: '钻石手套',
      check: (ctx) => ctx.analysis.tags.includes('💎 钻石手'),
    },
    {
      id: 'nft_mask',
      name: 'NFT面具',
      check: (ctx) => ctx.analysis.holdings.nfts.length > 50,
    },
    {
      id: 'defi_hoe',
      name: 'DeFi锄头',
      check: (ctx) => ctx.analysis.interactedProtocols.length > 10,
    },
    {
      id: 'degen_glasses',
      name: 'Degen墨镜',
      check: (ctx) => {
        // 检测是否有 meme 币
        const memeTokens = ctx.analysis.holdings.tokens.filter(
          t => /meme|inu|pepe|doge/i.test(t.symbol)
        );
        return memeTokens.length > 5;
      },
    },

    // ===== 协议相关纪念品 =====
    {
      id: 'uniswap_unicorn',
      name: 'Uniswap独角兽',
      check: (ctx) => ctx.analysis.interactedProtocols.includes('Uniswap'),
    },
    {
      id: 'aave_ghost',
      name: 'Aave小幽灵',
      check: (ctx) => ctx.analysis.interactedProtocols.includes('Aave'),
    },
    {
      id: 'ens_badge',
      name: 'ENS徽章',
      check: (ctx) => ctx.analysis.ens !== null,
    },

    // ===== 特殊发现纪念品 =====
    {
      id: 'charity_heart',
      name: '慈善爱心',
      check: (ctx) => ctx.analysis.specialFindings.some(
        f => f.includes('慈善') || f.includes('捐款')
      ),
    },
    {
      id: 'bayc_banana',
      name: 'BAYC香蕉',
      check: (ctx) => ctx.analysis.holdings.nfts.some(
        nft => nft.name?.includes('BAYC') || nft.name?.includes('Bored Ape')
      ),
    },
    {
      id: 'punk_mohawk',
      name: 'Punk莫西干',
      check: (ctx) => ctx.analysis.holdings.nfts.some(
        nft => nft.name?.includes('CryptoPunk')
      ),
    },

    // ===== 成就类纪念品 =====
    {
      id: 'rainbow_feather',
      name: '全链彩虹羽毛',
      check: (ctx) => {
        // 需要访问过 5 条以上不同链
        // 这个需要从用户历史中判断，这里简化
        return false; // 在 SouvenirService 中特殊处理
      },
    },
    {
      id: 'builder_trophy',
      name: 'Builder奖杯',
      check: (ctx) => {
        // 检测是否是开发者（部署过合约）
        return ctx.analysis.tags.includes('开发者');
      },
    },
  ];

  evaluate(context: RuleContext): string[] {
    const earnedSouvenirs: string[] = [];

    for (const rule of this.rules) {
      // 跳过已有的
      if (context.existingSouvenirs.includes(rule.id)) {
        continue;
      }

      try {
        if (rule.check(context)) {
          earnedSouvenirs.push(rule.id);
        }
      } catch (error) {
        console.error(`Error evaluating rule ${rule.id}:`, error);
      }
    }

    return earnedSouvenirs;
  }

  getAllRules(): SouvenirRule[] {
    return this.rules;
  }
}

// services/souvenir/souvenir.service.ts
export class SouvenirService {
  private rules: SouvenirRules;

  constructor(private prisma: PrismaClient) {
    this.rules = new SouvenirRules();
  }

  async calculateSouvenirs(
    frogId: string,
    chain: ChainType,
    address: string,
    analysis: AddressAnalysis
  ): Promise<Souvenir[]> {
    // 获取已有的纪念品
    const existingSouvenirs = await this.prisma.frogSouvenir.findMany({
      where: { frogId },
      select: { souvenirId: true },
    });
    const existingIds = existingSouvenirs.map(s => s.souvenirId);

    // 评估规则
    const earnedIds = this.rules.evaluate({
      chain,
      address,
      analysis,
      existingSouvenirs: existingIds,
    });

    if (earnedIds.length === 0) {
      return [];
    }

    // 获取纪念品详情
    const souvenirs = await this.prisma.souvenir.findMany({
      where: { id: { in: earnedIds } },
    });

    // 创建获得记录
    await this.prisma.frogSouvenir.createMany({
      data: earnedIds.map(id => ({
        frogId,
        souvenirId: id,
        obtainedFrom: address,
        obtainedChain: chain,
      })),
    });

    return souvenirs;
  }

  async checkSpecialAchievements(frogId: string): Promise<Souvenir[]> {
    const frog = await this.prisma.frog.findUnique({
      where: { id: frogId },
      include: {
        souvenirs: {
          include: { souvenir: true },
        },
      },
    });

    if (!frog) return [];

    const earnedSouvenirs: Souvenir[] = [];

    // 检查全链彩虹羽毛
    const visitedChains = new Set(
      frog.souvenirs.map(s => s.obtainedChain)
    );
    if (visitedChains.size >= 5) {
      const hasRainbow = frog.souvenirs.some(
        s => s.souvenirId === 'rainbow_feather'
      );
      if (!hasRainbow) {
        const rainbow = await this.awardSouvenir(frogId, 'rainbow_feather', 'ZETACHAIN', 'achievement');
        if (rainbow) earnedSouvenirs.push(rainbow);
      }
    }

    return earnedSouvenirs;
  }

  private async awardSouvenir(
    frogId: string,
    souvenirId: string,
    chain: ChainType,
    source: string
  ): Promise<Souvenir | null> {
    const souvenir = await this.prisma.souvenir.findUnique({
      where: { id: souvenirId },
    });

    if (!souvenir) return null;

    await this.prisma.frogSouvenir.create({
      data: {
        frogId,
        souvenirId,
        obtainedFrom: source,
        obtainedChain: chain,
      },
    });

    return souvenir;
  }
}
```

------

## 6. 智能合约设计

### 6.1 ZetaFrogNFT 合约

```solidity
// contracts/ZetaFrogNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@zetachain/protocol-contracts/contracts/zevm/SystemContract.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/zContract.sol";

contract ZetaFrogNFT is ERC721, ERC721URIStorage, Ownable, zContract {
    uint256 private _nextTokenId;
    
    // 系统合约
    SystemContract public systemContract;
    
    // 青蛙数据
    struct FrogData {
        string name;
        uint8 personality;  // 0: Philosopher, 1: Comedian, 2: Poet, 3: Gossip
        uint8 level;        // 0-4
        uint256 totalTrips;
        uint256 createdAt;
    }
    
    // tokenId => FrogData
    mapping(uint256 => FrogData) public frogs;
    
    // 用户地址 => tokenId (每个地址只能有一只)
    mapping(address => uint256) public userFrog;
    
    // 事件
    event FrogMinted(address indexed owner, uint256 tokenId, string name, uint8 personality);
    event FrogLevelUp(uint256 tokenId, uint8 newLevel);
    event TripCompleted(uint256 tokenId, uint256 totalTrips);

    constructor(
        address _systemContract
    ) ERC721("ZetaFrog", "ZFROG") Ownable(msg.sender) {
        systemContract = SystemContract(_systemContract);
    }

    // ===== 铸造青蛙 =====
    function mint(
        string memory name,
        uint8 personality,
        string memory tokenURI_
    ) public returns (uint256) {
        require(userFrog[msg.sender] == 0, "Already have a frog");
        require(personality < 4, "Invalid personality");

        uint256 tokenId = ++_nextTokenId;
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        
        frogs[tokenId] = FrogData({
            name: name,
            personality: personality,
            level: 0,
            totalTrips: 0,
            createdAt: block.timestamp
        });
        
        userFrog[msg.sender] = tokenId;
        
        emit FrogMinted(msg.sender, tokenId, name, personality);
        
        return tokenId;
    }

    // ===== 更新旅行次数（仅后端调用）=====
    function recordTrip(uint256 tokenId) public onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Frog not exists");
        
        frogs[tokenId].totalTrips++;
        
        // 检查升级
        uint8 newLevel = _calculateLevel(frogs[tokenId].totalTrips);
        if (newLevel > frogs[tokenId].level) {
            frogs[tokenId].level = newLevel;
            emit FrogLevelUp(tokenId, newLevel);
        }
        
        emit TripCompleted(tokenId, frogs[tokenId].totalTrips);
    }

    // ===== 跨链消息处理 =====
    function onCrossChainCall(
        zContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external override {
        // 处理来自其他链的消息
        // 例如：记录跨链访问事件
        
        (uint256 tokenId, string memory action) = abi.decode(message, (uint256, string));
        
        if (keccak256(bytes(action)) == keccak256(bytes("visit"))) {
            // 记录访问
            emit CrossChainVisit(context.chainID, tokenId);
        }
    }
    
    event CrossChainVisit(uint256 indexed sourceChain, uint256 indexed tokenId);

    // ===== 查询函数 =====
    function getFrogData(uint256 tokenId) public view returns (FrogData memory) {
        require(_ownerOf(tokenId) != address(0), "Frog not exists");
        return frogs[tokenId];
    }
    
    function getFrogByOwner(address owner) public view returns (uint256, FrogData memory) {
        uint256 tokenId = userFrog[owner];
        require(tokenId != 0, "No frog found");
        return (tokenId, frogs[tokenId]);
    }

    // ===== 内部函数 =====
    function _calculateLevel(uint256 trips) internal pure returns (uint8) {
        if (trips >= 100) return 4; // Master
        if (trips >= 50) return 3;  // Explorer
        if (trips >= 20) return 2;  // Traveler
        if (trips >= 5) return 1;   // Small
        return 0;                   // Tadpole
    }

    // ===== Override 函数 =====
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // 禁止转让（灵魂绑定）
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        // 只允许铸造，不允许转让
        if (from != address(0) && to != address(0)) {
            revert("ZetaFrog: transfer not allowed");
        }
        
        return super._update(to, tokenId, auth);
    }
}
```

### 6.2 VisitorBook 合约

```solidity
// contracts/VisitorBook.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@zetachain/protocol-contracts/contracts/zevm/interfaces/zContract.sol";

contract VisitorBook is Ownable, zContract {
    // 访问记录
    struct Visit {
        address visitor;        // 访问者地址
        uint256 visitorFrogId;  // 访问者青蛙 ID
        uint256 sourceChain;    // 来源链
        uint8 giftType;         // 礼物类型: 0=poop, 1=sticker, 2=flower, 3=note
        string message;         // 留言
        uint256 timestamp;
    }
    
    // 用户地址 => 访问记录列表
    mapping(address => Visit[]) public visitorBook;
    
    // 用户地址 => 未读访问数
    mapping(address => uint256) public unreadCount;
    
    // 事件
    event NewVisit(
        address indexed host,
        address indexed visitor,
        uint256 visitorFrogId,
        uint256 sourceChain,
        uint8 giftType
    );

    constructor() Ownable(msg.sender) {}

    // ===== 记录访问 =====
    function recordVisit(
        address host,
        address visitor,
        uint256 visitorFrogId,
        uint256 sourceChain,
        uint8 giftType,
        string memory message
    ) public onlyOwner {
        Visit memory visit = Visit({
            visitor: visitor,
            visitorFrogId: visitorFrogId,
            sourceChain: sourceChain,
            giftType: giftType,
            message: message,
            timestamp: block.timestamp
        });
        
        visitorBook[host].push(visit);
        unreadCount[host]++;
        
        emit NewVisit(host, visitor, visitorFrogId, sourceChain, giftType);
    }

    // ===== 跨链访问 =====
    function onCrossChainCall(
        zContext calldata context,
        address zrc20,
        uint256 amount,
        bytes calldata message
    ) external override {
        // 解码消息
        (
            address host,
            address visitor,
            uint256 visitorFrogId,
            uint8 giftType,
            string memory visitMessage
        ) = abi.decode(message, (address, address, uint256, uint8, string));
        
        // 记录跨链访问
        Visit memory visit = Visit({
            visitor: visitor,
            visitorFrogId: visitorFrogId,
            sourceChain: context.chainID,
            giftType: giftType,
            message: visitMessage,
            timestamp: block.timestamp
        });
        
        visitorBook[host].push(visit);
        unreadCount[host]++;
        
        emit NewVisit(host, visitor, visitorFrogId, context.chainID, giftType);
    }

    // ===== 标记已读 =====
    function markAsRead(address user) public onlyOwner {
        unreadCount[user] = 0;
    }

    // ===== 查询函数 =====
    function getVisits(
        address host, 
        uint256 offset, 
        uint256 limit
    ) public view returns (Visit[] memory) {
        Visit[] storage allVisits = visitorBook[host];
        
        if (offset >= allVisits.length) {
            return new Visit[](0);
        }
        
        uint256 end = offset + limit;
        if (end > allVisits.length) {
            end = allVisits.length;
        }
        
        Visit[] memory result = new Visit[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = allVisits[i];
        }
        
        return result;
    }
    
    function getVisitCount(address host) public view returns (uint256) {
        return visitorBook[host].length;
    }
    
    function getUnreadCount(address host) public view returns (uint256) {
        return unreadCount[host];
    }
}
```

------

## 7. 任务队列设计

### 7.1 旅行队列

```typescript
// queues/travel.queue.ts

import { Queue, Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { TravelExecutor } from '../services/travel/travel.executor';

// 队列定义
export const travelQueue = new Queue('travel', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

// Job 类型
interface TravelJobData {
  travelId: string;
  userId: string;
}

// 添加旅行任务
export async function addTravelJob(data: TravelJobData): Promise<Job> {
  return travelQueue.add('execute', data, {
    jobId: `travel-${data.travelId}`,
    delay: 0,
  });
}

// Worker
export function createTravelWorker(executor: TravelExecutor): Worker {
  return new Worker<TravelJobData>(
    'travel',
    async (job) => {
      console.log(`Processing travel job: ${job.data.travelId}`);
      await executor.executeTravel(job.data.travelId);
    },
    {
      connection: redisConnection,
      concurrency: 10, // 同时处理 10 个旅行
    }
  );
}
```

### 7.2 AI 生成队列

```typescript
// queues/ai.queue.ts

import { Queue, Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { AIService } from '../services/ai/ai.service';

export const aiQueue = new Queue('ai', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 10000,
    },
  },
});

// Job 类型
interface DiaryJobData {
  type: 'diary';
  travelId: string;
  config: DiaryConfig;
}

interface ImageJobData {
  type: 'image';
  postcardId: string;
  config: ImageConfig;
}

type AIJobData = DiaryJobData | ImageJobData;

export function createAIWorker(aiService: AIService): Worker {
  return new Worker<AIJobData>(
    'ai',
    async (job) => {
      const { type } = job.data;
      
      if (type === 'diary') {
        const result = await aiService.generateDiary(job.data.config);
        return result;
      }
      
      if (type === 'image') {
        const imageUrl = await aiService.generatePostcardImage(job.data.config);
        return { imageUrl };
      }
    },
    {
      connection: redisConnection,
      concurrency: 5, // AI 请求限制并发
      limiter: {
        max: 10,        // 每分钟最多 10 个
        duration: 60000,
      },
    }
  );
}
```

------

## 8. WebSocket 实现

```typescript
// websocket/index.ts

import { FastifyInstance } from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import { WebSocket } from 'ws';
import { verifySignature } from '../utils/crypto';

interface Connection {
  ws: WebSocket;
  userId: string;
  address: string;
  subscribedTravels: Set<string>;
}

export class WebSocketManager {
  private connections: Map<string, Connection> = new Map();
  private userConnections: Map<string, string[]> = new Map(); // userId => connectionIds

  async register(app: FastifyInstance): Promise<void> {
    await app.register(fastifyWebsocket);

    app.get('/ws', { websocket: true }, (connection, req) => {
      const connectionId = this.generateConnectionId();
      
      connection.socket.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          await this.handleMessage(connectionId, connection.socket, data);
        } catch (error) {
          this.sendError(connection.socket, 'Invalid message format');
        }
      });

      connection.socket.on('close', () => {
        this.removeConnection(connectionId);
      });
    });
  }

  private async handleMessage(
    connectionId: string,
    ws: WebSocket,
    data: any
  ): Promise<void> {
    switch (data.type) {
      case 'auth':
        await this.handleAuth(connectionId, ws, data.payload);
        break;
        
      case 'subscribe_travel':
        this.handleSubscribeTravel(connectionId, data.payload.travelId);
        break;
        
      case 'unsubscribe_travel':
        this.handleUnsubscribeTravel(connectionId, data.payload.travelId);
        break;
        
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
        
      default:
        this.sendError(ws, 'Unknown message type');
    }
  }

  private async handleAuth(
    connectionId: string,
    ws: WebSocket,
    payload: { address: string; signature: string; timestamp: number }
  ): Promise<void> {
    // 验证时间戳（5 分钟内）
    const now = Date.now();
    if (Math.abs(now - payload.timestamp) > 5 * 60 * 1000) {
      this.sendError(ws, 'Signature expired');
      return;
    }

    // 验证签名
    const message = `ZetaFrog Auth: ${payload.timestamp}`;
    const isValid = await verifySignature(message, payload.signature, payload.address);
    
    if (!isValid) {
      this.sendError(ws, 'Invalid signature');
      return;
    }

    // 查找用户
    const user = await this.findUserByAddress(payload.address);
    if (!user) {
      this.sendError(ws, 'User not found');
      return;
    }

    // 保存连接
    const conn: Connection = {
      ws,
      userId: user.id,
      address: payload.address,
      subscribedTravels: new Set(),
    };
    
    this.connections.set(connectionId, conn);
    
    // 记录用户连接
    const userConns = this.userConnections.get(user.id) || [];
    userConns.push(connectionId);
    this.userConnections.set(user.id, userConns);

    // 发送成功消息
    ws.send(JSON.stringify({
      type: 'auth_success',
      payload: { userId: user.id },
    }));
  }

  private handleSubscribeTravel(connectionId: string, travelId: string): void {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.subscribedTravels.add(travelId);
    }
  }

  private handleUnsubscribeTravel(connectionId: string, travelId: string): void {
    const conn = this.connections.get(connectionId);
    if (conn) {
      conn.subscribedTravels.delete(travelId);
    }
  }

  // ===== 推送方法 =====
  
  async sendToUser(userId: string, message: any): Promise<void> {
    const connectionIds = this.userConnections.get(userId) || [];
    
    for (const connId of connectionIds) {
      const conn = this.connections.get(connId);
      if (conn && conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(JSON.stringify(message));
      }
    }
  }

  async sendToTravelSubscribers(travelId: string, message: any): Promise<void> {
    for (const [, conn] of this.connections) {
      if (conn.subscribedTravels.has(travelId) && conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(JSON.stringify(message));
      }
    }
  }

  async broadcast(message: any): Promise<void> {
    for (const [, conn] of this.connections) {
      if (conn.ws.readyState === WebSocket.OPEN) {
        conn.ws.send(JSON.stringify(message));
      }
    }
  }

  // ===== 辅助方法 =====

  private removeConnection(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (conn) {
      // 从用户连接列表中移除
      const userConns = this.userConnections.get(conn.userId) || [];
      const index = userConns.indexOf(connectionId);
      if (index > -1) {
        userConns.splice(index, 1);
        if (userConns.length === 0) {
          this.userConnections.delete(conn.userId);
        } else {
          this.userConnections.set(conn.userId, userConns);
        }
      }
    }
    this.connections.delete(connectionId);
  }

  private sendError(ws: WebSocket, message: string): void {
    ws.send(JSON.stringify({ type: 'error', payload: { message } }));
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async findUserByAddress(address: string): Promise<{ id: string } | null> {
    // 从数据库查找用户
    // 这里简化，实际需要注入 prisma
    return null;
  }
}
```

------

## 9. 部署配置

### 9.1 Docker 配置

```dockerfile
# docker/Dockerfile

FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# 构建
COPY . .
RUN npm run build
RUN npx prisma generate

# 生产镜像
FROM node:20-alpine AS runner

WORKDIR /app

# 只复制必要文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
```

### 9.2 Docker Compose

```yaml
# docker/docker-compose.yml

version: '3.8'

services:
  api:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/zetafrog
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    depends_on:
      - db
      - redis
    restart: unless-stopped

  worker:
    build:
      context: ..
      dockerfile: docker/Dockerfile
    command: npm run worker
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/zetafrog
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=zetafrog
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

volumes:
  postgres_data:
  redis_data:
```

### 9.3 环境变量

```bash
# .env.example

# 应用
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

# 数据库
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/zetafrog

# Redis
REDIS_URL=redis://localhost:6379

# AI 服务
OPENAI_API_KEY=sk-xxx
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini

# 图片生成
IMAGE_GEN_API_KEY=xxx
IMAGE_GEN_MODEL=dall-e-3

# 区块链 RPC
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/xxx
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/xxx
ZETACHAIN_RPC_URL=https://zetachain-evm.blockpi.network/v1/rpc/public

# API Keys
ETHERSCAN_API_KEY=xxx
ARBISCAN_API_KEY=xxx

# 合约地址
ZETAFROG_NFT_ADDRESS=0x...
VISITOR_BOOK_ADDRESS=0x...

# JWT
JWT_SECRET=your-secret-key

# 跨域
CORS_ORIGINS=http://localhost:5173,https://zetafrog.com
```

------

## 10. 开发与测试

### 10.1 本地开发

```bash
# 安装依赖
npm install

# 启动数据库
docker-compose up -d db redis

# 数据库迁移
npx prisma migrate dev

# 种子数据
npm run seed

# 启动开发服务器
npm run dev

# 启动 Worker（另一个终端）
npm run dev:worker
```

### 10.2 测试

```typescript
// tests/unit/services/frog.generator.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FrogGenerator } from '../../../src/services/frog/frog.generator';

describe('FrogGenerator', () => {
  let generator: FrogGenerator;

  beforeEach(() => {
    generator = new FrogGenerator(mockPrisma, mockChainService);
  });

  describe('determinePersonality', () => {
    it('should return PHILOSOPHER for diamond hands', () => {
      const analysis = {
        holdingStyle: 'diamond_hands',
        tradingFrequency: 'low',
        nftCount: 5,
        defiInteractions: 2,
      };
      
      expect(generator['determinePersonality'](analysis)).toBe('PHILOSOPHER');
    });

    it('should return POET for NFT collectors', () => {
      const analysis = {
        holdingStyle: 'trader',
        tradingFrequency: 'medium',
        nftCount: 50,
        defiInteractions: 5,
      };
      
      expect(generator['determinePersonality'](analysis)).toBe('POET');
    });
  });

  describe('generateFrog', () => {
    it('should generate a frog with correct properties', async () => {
      vi.spyOn(generator, 'analyzeWallet').mockResolvedValue({
        totalTxCount: 100,
        defiInteractions: 5,
        nftCount: 10,
        tradingFrequency: 'medium',
        holdingStyle: 'trader',
        mainActivity: ['DeFi'],
      });

      const result = await generator.generateFrog('0x1234...');

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('personality');
      expect(result).toHaveProperty('reason');
    });
  });
});
```

------

## 11. 交付清单

### 11.1 P0（必须完成）

-  数据库 Schema 设计 & 迁移
-  青蛙创建 API
-  旅行执行流程
-  AI 日记生成
-  WebSocket 状态推送
-  基础链数据获取（Ethereum）
-  明信片 CRUD

### 11.2 P1（应该完成）

-  纪念品规则引擎
-  多链支持（Arbitrum, Solana）
-  访客系统
-  图片生成
-  ZetaChain 合约部署
-  任务队列

### 11.3 P2（可选完成）

-  名人地址库
-  高级地址分析
-  分享功能
-  合约跨链消息

------

*文档版本 v1.0 | 最后更新 2024-12-17*