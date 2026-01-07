# 🐸 ZetaFrog Phase 1 详细开发文档

## AI 对话 + 价格查询 + 资产查询

---

## 一、现有数据结构分析

### 1.1 当前 Prisma Schema

```prisma
// 青蛙模型
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

// 旅行模型
model Travel {
  id                 Int         @id @default(autoincrement())
  frogId             Int
  targetWallet       String
  chainId            Int         @default(1)
  startTime          DateTime
  endTime            DateTime
  status             TravelStatus @default(Active)
  observedTxCount    Int?
  observedTotalValue String?
  journalHash        String?
  journalContent     String?
  souvenirId         Int?
  completedAt        DateTime?
  // ...
}

// 钱包观察模型
model WalletObservation {
  id            Int      @id @default(autoincrement())
  travelId      Int
  walletAddress String
  chainId       Int
  transactions  Json
  totalTxCount  Int
  totalValueWei String
  notableEvents Json?
  // ...
}

enum FrogStatus { Idle, Traveling, Returning }
enum TravelStatus { Active, Processing, Completed, Cancelled, Failed }
enum Rarity { Common, Uncommon, Rare }
```

### 1.2 Phase 1 需要新增的数据结构

```prisma
// ============ 新增：聊天相关 ============

// 聊天会话
model ChatSession {
  id           Int           @id @default(autoincrement())
  frogId       Int
  ownerAddress String
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  
  frog         Frog          @relation(fields: [frogId], references: [id])
  messages     ChatMessage[]
  
  @@index([ownerAddress])
  @@index([frogId])
}

// 聊天消息
model ChatMessage {
  id           Int           @id @default(autoincrement())
  sessionId    Int
  role         MessageRole   // user | assistant
  content      String        @db.Text
  intent       ChatIntent?   // 识别出的意图
  intentParams Json?         // 意图参数
  createdAt    DateTime      @default(now())
  
  session      ChatSession   @relation(fields: [sessionId], references: [id])
  
  @@index([sessionId])
}

// 价格缓存（减少 API 调用）
model PriceCache {
  id           Int      @id @default(autoincrement())
  symbol       String   // ETH, BTC, ZETA...
  priceUsd     Float
  change24h    Float?   // 24h 涨跌幅
  source       String   // coingecko, dexscreener...
  updatedAt    DateTime @updatedAt
  
  @@unique([symbol, source])
  @@index([symbol])
}

// 用户资产快照（可选，用于快速查询）
model AssetSnapshot {
  id           Int      @id @default(autoincrement())
  ownerAddress String
  chainId      Int
  assets       Json     // { tokens: [...], nfts: [...], totalValueUsd: ... }
  updatedAt    DateTime @updatedAt
  
  @@unique([ownerAddress, chainId])
  @@index([ownerAddress])
}

// ============ 新增枚举 ============

enum MessageRole {
  user
  assistant
}

enum ChatIntent {
  price_query      // 价格查询
  asset_query      // 资产查询
  frog_status      // 青蛙状态
  travel_info      // 旅行信息
  chitchat         // 闲聊
  help             // 帮助
  unknown          // 未识别
}
```

### 1.3 Frog 模型扩展

```prisma
model Frog {
  // ... 现有字段 ...
  
  // 新增：性格（影响回复风格）
  personality  Personality @default(PHILOSOPHER)
  
  // 新增：关联聊天会话
  chatSessions ChatSession[]
}

enum Personality {
  PHILOSOPHER  // 哲学家：深沉、爱思考
  COMEDIAN     // 段子手：吐槽、搞笑
  POET         // 诗人：浪漫、文艺
  GOSSIP       // 八卦蛙：爱打听、爱爆料
}
```

---

## 二、目录结构新增

```
backend/src/
├── api/routes/
│   ├── chat.routes.ts          # 新增：聊天路由
│   └── price.routes.ts         # 新增：价格路由
│
├── services/
│   ├── ai/                     # 新增目录
│   │   ├── chat.service.ts     # 聊天服务
│   │   ├── intent.service.ts   # 意图识别
│   │   └── prompts/
│   │       ├── system.prompt.ts    # 系统提示词
│   │       ├── intent.prompt.ts    # 意图分类提示词
│   │       └── response.prompt.ts  # 回复生成提示词
│   │
│   ├── defi/                   # 新增目录
│   │   ├── price.service.ts    # 价格查询服务
│   │   └── asset.service.ts    # 资产查询服务
│   │
│   └── dashscope-image.service.ts  # 现有
│
├── types/
│   ├── chat.types.ts           # 新增：聊天类型
│   └── defi.types.ts           # 新增：DeFi 类型
│
└── utils/
    └── price-formatter.ts      # 新增：价格格式化工具
```

---

## 三、核心模块详细设计

### 3.1 聊天路由 (chat.routes.ts)

```typescript
// backend/src/api/routes/chat.routes.ts

import { Router } from 'express';
import { ChatService } from '../../services/ai/chat.service';
import { authMiddleware } from '../../middlewares/auth.middleware';

const router = Router();
const chatService = new ChatService();

/**
 * POST /api/chat/message
 * 发送消息给青蛙
 */
router.post('/message', authMiddleware, async (req, res) => {
  // 请求体
  interface SendMessageRequest {
    frogId: number;          // 青蛙 ID
    message: string;         // 用户消息
    sessionId?: number;      // 会话 ID（可选，不传则创建新会话）
  }
  
  // 响应体
  interface SendMessageResponse {
    success: boolean;
    data: {
      sessionId: number;
      reply: {
        content: string;       // 青蛙回复内容
        intent: string;        // 识别的意图
        data?: any;            // 附加数据（如价格信息）
      };
      frogMood: string;        // 青蛙心情（用于前端动画）
    };
  }
});

/**
 * GET /api/chat/history/:sessionId
 * 获取聊天历史
 */
router.get('/history/:sessionId', authMiddleware, async (req, res) => {
  // 响应体
  interface ChatHistoryResponse {
    success: boolean;
    data: {
      messages: Array<{
        id: number;
        role: 'user' | 'assistant';
        content: string;
        intent?: string;
        createdAt: string;
      }>;
    };
  }
});

/**
 * GET /api/chat/sessions
 * 获取用户所有会话
 */
router.get('/sessions', authMiddleware, async (req, res) => {
  // 响应体
  interface SessionsResponse {
    success: boolean;
    data: {
      sessions: Array<{
        id: number;
        frogId: number;
        frogName: string;
        lastMessage: string;
        updatedAt: string;
      }>;
    };
  }
});

export default router;
```

### 3.2 价格路由 (price.routes.ts)

```typescript
// backend/src/api/routes/price.routes.ts

import { Router } from 'express';
import { PriceService } from '../../services/defi/price.service';

const router = Router();
const priceService = new PriceService();

/**
 * GET /api/price/:symbol
 * 获取单个代币价格
 */
router.get('/:symbol', async (req, res) => {
  // 响应体
  interface PriceResponse {
    success: boolean;
    data: {
      symbol: string;          // ETH
      priceUsd: number;        // 3847.52
      change24h: number;       // 2.35
      change24hPercent: string;// "+2.35%"
      updatedAt: string;
    };
  }
});

/**
 * GET /api/price/batch?symbols=ETH,BTC,ZETA
 * 批量获取价格
 */
router.get('/batch', async (req, res) => {
  // 响应体
  interface BatchPriceResponse {
    success: boolean;
    data: {
      prices: Array<{
        symbol: string;
        priceUsd: number;
        change24h: number;
      }>;
    };
  }
});

/**
 * GET /api/price/trending
 * 获取热门代币价格
 */
router.get('/trending', async (req, res) => {
  // 返回 ETH, BTC, ZETA 等热门代币
});

export default router;
```

---

### 3.3 意图识别服务 (intent.service.ts)

```typescript
// backend/src/services/ai/intent.service.ts

import { ChatIntent } from '@prisma/client';

// 意图识别结果
interface IntentResult {
  intent: ChatIntent;
  confidence: number;      // 0-1 置信度
  params: IntentParams;    // 提取的参数
}

// 不同意图的参数
type IntentParams = 
  | PriceQueryParams 
  | AssetQueryParams 
  | FrogStatusParams 
  | ChitchatParams;

interface PriceQueryParams {
  symbol?: string;         // 代币符号 (ETH, BTC)
  comparison?: boolean;    // 是否需要对比
}

interface AssetQueryParams {
  chainId?: number;        // 指定链
  assetType?: 'all' | 'tokens' | 'nfts';
}

interface FrogStatusParams {
  frogId?: number;
}

interface ChitchatParams {
  topic?: string;
}

export class IntentService {
  
  /**
   * 使用 Qwen 识别用户意图
   */
  async classifyIntent(userMessage: string): Promise<IntentResult> {
    // 方案 1：使用 Qwen Function Calling
    // 方案 2：使用关键词规则 + AI 兜底
  }
  
  /**
   * 规则引擎快速匹配（优先使用，节省 API 调用）
   */
  private quickMatch(message: string): IntentResult | null {
    const lowerMsg = message.toLowerCase();
    
    // 价格查询关键词
    const priceKeywords = ['价格', '多少钱', '行情', 'price', '涨', '跌'];
    const priceTokens = this.extractTokenSymbol(message);
    
    if (priceKeywords.some(k => lowerMsg.includes(k)) && priceTokens) {
      return {
        intent: 'price_query',
        confidence: 0.9,
        params: { symbol: priceTokens }
      };
    }
    
    // 资产查询关键词
    const assetKeywords = ['余额', '资产', '钱包', '有多少', '我的'];
    if (assetKeywords.some(k => lowerMsg.includes(k))) {
      return {
        intent: 'asset_query',
        confidence: 0.85,
        params: { assetType: 'all' }
      };
    }
    
    // 青蛙状态关键词
    const frogKeywords = ['青蛙', '在干嘛', '状态', '在哪'];
    if (frogKeywords.some(k => lowerMsg.includes(k))) {
      return {
        intent: 'frog_status',
        confidence: 0.85,
        params: {}
      };
    }
    
    return null; // 需要 AI 进一步分析
  }
  
  /**
   * 从消息中提取代币符号
   */
  private extractTokenSymbol(message: string): string | null {
    const tokens = ['ETH', 'BTC', 'ZETA', 'USDT', 'USDC', 'ARB', 'OP', 'SOL'];
    const upperMsg = message.toUpperCase();
    
    // 中文映射
    const cnMap: Record<string, string> = {
      '以太坊': 'ETH', '以太': 'ETH',
      '比特币': 'BTC', '大饼': 'BTC',
      // ...
    };
    
    for (const [cn, symbol] of Object.entries(cnMap)) {
      if (message.includes(cn)) return symbol;
    }
    
    for (const token of tokens) {
      if (upperMsg.includes(token)) return token;
    }
    
    return null;
  }
}
```

---

### 3.4 聊天服务 (chat.service.ts)

```typescript
// backend/src/services/ai/chat.service.ts

import { PrismaClient, ChatIntent, Personality } from '@prisma/client';
import { IntentService } from './intent.service';
import { PriceService } from '../defi/price.service';
import { AssetService } from '../defi/asset.service';
import { QwenClient } from './qwen.client';
import { buildSystemPrompt, buildResponsePrompt } from './prompts';

export class ChatService {
  private prisma: PrismaClient;
  private intentService: IntentService;
  private priceService: PriceService;
  private assetService: AssetService;
  private qwen: QwenClient;
  
  constructor() {
    this.prisma = new PrismaClient();
    this.intentService = new IntentService();
    this.priceService = new PriceService();
    this.assetService = new AssetService();
    this.qwen = new QwenClient();
  }
  
  /**
   * 处理用户消息
   */
  async processMessage(
    frogId: number,
    ownerAddress: string,
    userMessage: string,
    sessionId?: number
  ): Promise<ChatResponse> {
    
    // 1. 获取或创建会话
    const session = await this.getOrCreateSession(frogId, ownerAddress, sessionId);
    
    // 2. 获取青蛙信息（包括性格）
    const frog = await this.prisma.frog.findUnique({
      where: { id: frogId }
    });
    
    if (!frog) throw new Error('Frog not found');
    
    // 3. 保存用户消息
    await this.saveMessage(session.id, 'user', userMessage);
    
    // 4. 识别意图
    const intentResult = await this.intentService.classifyIntent(userMessage);
    
    // 5. 根据意图获取数据
    const intentData = await this.fetchIntentData(intentResult, ownerAddress);
    
    // 6. 生成青蛙回复
    const reply = await this.generateReply(
      frog,
      userMessage,
      intentResult,
      intentData
    );
    
    // 7. 保存青蛙回复
    await this.saveMessage(
      session.id, 
      'assistant', 
      reply.content,
      intentResult.intent,
      intentResult.params
    );
    
    // 8. 返回响应
    return {
      sessionId: session.id,
      reply: {
        content: reply.content,
        intent: intentResult.intent,
        data: intentData
      },
      frogMood: this.determineMood(intentResult.intent)
    };
  }
  
  /**
   * 根据意图获取相关数据
   */
  private async fetchIntentData(
    intentResult: IntentResult,
    ownerAddress: string
  ): Promise<any> {
    
    switch (intentResult.intent) {
      case 'price_query':
        const symbol = intentResult.params.symbol || 'ETH';
        return await this.priceService.getPrice(symbol);
        
      case 'asset_query':
        return await this.assetService.getAssets(ownerAddress);
        
      case 'frog_status':
        // 返回青蛙当前状态
        return await this.getFrogStatus(ownerAddress);
        
      default:
        return null;
    }
  }
  
  /**
   * 生成青蛙风格回复
   */
  private async generateReply(
    frog: Frog,
    userMessage: string,
    intent: IntentResult,
    data: any
  ): Promise<{ content: string }> {
    
    // 构建提示词
    const systemPrompt = buildSystemPrompt(frog.name, frog.personality);
    const responsePrompt = buildResponsePrompt(
      userMessage,
      intent.intent,
      data
    );
    
    // 调用 Qwen 生成回复
    const response = await this.qwen.chat({
      model: 'qwen-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: responsePrompt }
      ],
      temperature: 0.8,
      max_tokens: 300
    });
    
    return { content: response.content };
  }
  
  /**
   * 根据意图确定青蛙心情（用于前端动画）
   */
  private determineMood(intent: ChatIntent): string {
    const moodMap: Record<ChatIntent, string> = {
      price_query: 'thinking',      // 思考
      asset_query: 'counting',      // 数钱
      frog_status: 'happy',         // 开心
      travel_info: 'adventurous',   // 冒险
      chitchat: 'relaxed',          // 放松
      help: 'helpful',              // 乐于助人
      unknown: 'confused'           // 困惑
    };
    return moodMap[intent] || 'neutral';
  }
}
```

---

### 3.5 Prompt 模板设计

```typescript
// backend/src/services/ai/prompts/system.prompt.ts

import { Personality } from '@prisma/client';

/**
 * 构建系统提示词（定义青蛙性格）
 */
export function buildSystemPrompt(
  frogName: string, 
  personality: Personality
): string {
  
  const personalityTraits: Record<Personality, string> = {
    PHILOSOPHER: `你是一只深沉、爱思考的青蛙。
      - 说话风格：沉稳、富有哲理、偶尔引用名言
      - 常用语：「呱...让我想想」「世事如链，涨跌皆空」
      - 看待价格：不追涨杀跌，强调长期价值`,
      
    COMEDIAN: `你是一只爱吐槽、搞笑的青蛙。
      - 说话风格：幽默、爱玩梗、Web3 圈子笑话
      - 常用语：「呱哈哈！」「又是韭菜收割季」「WAGMI！」
      - 看待价格：用段子化解涨跌焦虑`,
      
    POET: `你是一只浪漫、文艺的青蛙。
      - 说话风格：优美、富有诗意、爱用比喻
      - 常用语：「呱~」「价格如月，有圆有缺」
      - 看待价格：用诗意语言描述市场`,
      
    GOSSIP: `你是一只爱打听、消息灵通的青蛙。
      - 说话风格：热情、爱分享内幕、八卦味十足
      - 常用语：「呱！我跟你说个事！」「据我所知...」
      - 看待价格：爱分析背后原因和大户动向`
  };
  
  return `你是一只名叫「${frogName}」的桌面宠物青蛙，是用户的 Web3 小助手。

## 性格特点
${personalityTraits[personality]}

## 核心规则
1. 每次回复必须以「呱」开头（可以是「呱！」「呱~」「呱...」等变体）
2. 回复简洁，控制在 100 字以内
3. 保持角色一致性，用青蛙视角看待区块链世界
4. 遇到不确定的信息，诚实说「这个我不太清楚呢」
5. 提到具体数字时要准确，不要编造

## 知识范围
- 加密货币价格和市场行情
- 用户钱包资产情况
- DeFi 基础概念
- ZetaChain 跨链知识

## 禁止事项
- 不提供投资建议
- 不承诺收益
- 不透露用户隐私信息`;
}
```

```typescript
// backend/src/services/ai/prompts/response.prompt.ts

import { ChatIntent } from '@prisma/client';

/**
 * 构建回复生成提示词
 */
export function buildResponsePrompt(
  userMessage: string,
  intent: ChatIntent,
  data: any
): string {
  
  let dataContext = '';
  
  switch (intent) {
    case 'price_query':
      dataContext = `
## 价格数据
- 代币：${data.symbol}
- 当前价格：\${data.priceUsd.toLocaleString()}
- 24h 涨跌：${data.change24h > 0 ? '+' : ''}${data.change24h.toFixed(2)}%
- 数据时间：刚刚更新`;
      break;
      
    case 'asset_query':
      dataContext = `
## 用户资产
- 总价值：\${data.totalValueUsd.toLocaleString()}
- 主要持仓：
${data.tokens.slice(0, 5).map((t: any) => 
  `  - ${t.symbol}: ${t.balance} (\${t.valueUsd})`
).join('\n')}`;
      break;
      
    case 'frog_status':
      dataContext = `
## 青蛙状态
- 当前状态：${data.status}
- 等级：Lv.${data.level}
- 经验值：${data.xp}
- 总旅行次数：${data.totalTravels}`;
      break;
      
    default:
      dataContext = '（无特定数据，自由发挥即可）';
  }
  
  return `用户说：「${userMessage}」

${dataContext}

请根据你的性格，用简洁有趣的方式回复用户。记住以「呱」开头！`;
}
```

---

### 3.6 价格服务 (price.service.ts)

```typescript
// backend/src/services/defi/price.service.ts

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

// CoinGecko ID 映射
const COINGECKO_IDS: Record<string, string> = {
  'ETH': 'ethereum',
  'BTC': 'bitcoin',
  'ZETA': 'zetachain',
  'USDT': 'tether',
  'USDC': 'usd-coin',
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'SOL': 'solana',
  'BNB': 'binancecoin',
  'MATIC': 'matic-network'
};

export interface PriceData {
  symbol: string;
  priceUsd: number;
  change24h: number;
  marketCap?: number;
  volume24h?: number;
  updatedAt: Date;
}

export class PriceService {
  private prisma: PrismaClient;
  private cacheSeconds = 60; // 缓存 60 秒
  
  constructor() {
    this.prisma = new PrismaClient();
  }
  
  /**
   * 获取单个代币价格
   */
  async getPrice(symbol: string): Promise<PriceData> {
    const upperSymbol = symbol.toUpperCase();
    
    // 1. 先查缓存
    const cached = await this.getCachedPrice(upperSymbol);
    if (cached) return cached;
    
    // 2. 缓存未命中，调用 API
    const fresh = await this.fetchFromCoinGecko(upperSymbol);
    
    // 3. 更新缓存
    await this.updateCache(fresh);
    
    return fresh;
  }
  
  /**
   * 批量获取价格
   */
  async getBatchPrices(symbols: string[]): Promise<PriceData[]> {
    const upperSymbols = symbols.map(s => s.toUpperCase());
    
    // CoinGecko 支持批量查询
    const ids = upperSymbols
      .map(s => COINGECKO_IDS[s])
      .filter(Boolean)
      .join(',');
    
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price',
      {
        params: {
          ids,
          vs_currencies: 'usd',
          include_24hr_change: true
        }
      }
    );
    
    return upperSymbols.map(symbol => {
      const id = COINGECKO_IDS[symbol];
      const data = response.data[id];
      
      return {
        symbol,
        priceUsd: data?.usd || 0,
        change24h: data?.usd_24h_change || 0,
        updatedAt: new Date()
      };
    });
  }
  
  /**
   * 从缓存获取价格
   */
  private async getCachedPrice(symbol: string): Promise<PriceData | null> {
    const cached = await this.prisma.priceCache.findFirst({
      where: {
        symbol,
        updatedAt: {
          gte: new Date(Date.now() - this.cacheSeconds * 1000)
        }
      }
    });
    
    if (!cached) return null;
    
    return {
      symbol: cached.symbol,
      priceUsd: cached.priceUsd,
      change24h: cached.change24h || 0,
      updatedAt: cached.updatedAt
    };
  }
  
  /**
   * 调用 CoinGecko API
   */
  private async fetchFromCoinGecko(symbol: string): Promise<PriceData> {
    const id = COINGECKO_IDS[symbol];
    
    if (!id) {
      throw new Error(`Unsupported token: ${symbol}`);
    }
    
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price`,
      {
        params: {
          ids: id,
          vs_currencies: 'usd',
          include_24hr_change: true,
          include_market_cap: true,
          include_24hr_vol: true
        }
      }
    );
    
    const data = response.data[id];
    
    return {
      symbol,
      priceUsd: data.usd,
      change24h: data.usd_24h_change || 0,
      marketCap: data.usd_market_cap,
      volume24h: data.usd_24hr_vol,
      updatedAt: new Date()
    };
  }
  
  /**
   * 更新缓存
   */
  private async updateCache(price: PriceData): Promise<void> {
    await this.prisma.priceCache.upsert({
      where: {
        symbol_source: {
          symbol: price.symbol,
          source: 'coingecko'
        }
      },
      update: {
        priceUsd: price.priceUsd,
        change24h: price.change24h
      },
      create: {
        symbol: price.symbol,
        priceUsd: price.priceUsd,
        change24h: price.change24h,
        source: 'coingecko'
      }
    });
  }
}
```

---

### 3.7 资产查询服务 (asset.service.ts)

```typescript
// backend/src/services/defi/asset.service.ts

import { PrismaClient } from '@prisma/client';
import { createPublicClient, http, formatEther, formatUnits } from 'viem';
import { mainnet, arbitrum, base, zeta } from 'viem/chains';

// ERC20 ABI（简化版）
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }]
  },
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }]
  }
] as const;

// 常见代币地址
const TOKEN_ADDRESSES: Record<number, Record<string, string>> = {
  1: { // Ethereum
    'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  42161: { // Arbitrum
    'USDT': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    'USDC': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  }
};

export interface AssetData {
  totalValueUsd: number;
  tokens: TokenBalance[];
  nfts?: NFTBalance[];
}

export interface TokenBalance {
  symbol: string;
  balance: string;
  valueUsd: number;
  chainId: number;
}

export interface NFTBalance {
  name: string;
  count: number;
  chainId: number;
}

export class AssetService {
  private prisma: PrismaClient;
  private clients: Map<number, any>;
  
  constructor() {
    this.prisma = new PrismaClient();
    this.clients = new Map([
      [1, createPublicClient({ chain: mainnet, transport: http() })],
      [42161, createPublicClient({ chain: arbitrum, transport: http() })],
      [8453, createPublicClient({ chain: base, transport: http() })],
      [7000, createPublicClient({ chain: zeta, transport: http() })],
    ]);
  }
  
  /**
   * 获取用户资产（简化版，只查主要链）
   */
  async getAssets(
    ownerAddress: string, 
    chainIds: number[] = [1, 7000]
  ): Promise<AssetData> {
    
    const tokens: TokenBalance[] = [];
    
    for (const chainId of chainIds) {
      const client = this.clients.get(chainId);
      if (!client) continue;
      
      // 查询原生代币余额
      const nativeBalance = await client.getBalance({
        address: ownerAddress as `0x${string}`
      });
      
      const symbol = this.getNativeSymbol(chainId);
      const balanceFormatted = formatEther(nativeBalance);
      
      // 获取价格
      const price = await this.getTokenPrice(symbol);
      
      tokens.push({
        symbol,
        balance: parseFloat(balanceFormatted).toFixed(4),
        valueUsd: parseFloat(balanceFormatted) * price,
        chainId
      });
    }
    
    // 计算总价值
    const totalValueUsd = tokens.reduce((sum, t) => sum + t.valueUsd, 0);
    
    return {
      totalValueUsd,
      tokens
    };
  }
  
  /**
   * 获取链的原生代币符号
   */
  private getNativeSymbol(chainId: number): string {
    const symbols: Record<number, string> = {
      1: 'ETH',
      42161: 'ETH',
      8453: 'ETH',
      7000: 'ZETA',
      56: 'BNB'
    };
    return symbols[chainId] || 'ETH';
  }
  
  /**
   * 获取代币价格（复用 PriceService）
   */
  private async getTokenPrice(symbol: string): Promise<number> {
    // 简化实现，实际应调用 PriceService
    const prices: Record<string, number> = {
      'ETH': 3800,
      'ZETA': 0.8,
      'BNB': 600
    };
    return prices[symbol] || 0;
  }
}
```

---

## 四、前端改动

### 4.1 新增组件

```
frontend/src/
├── components/
│   └── chat/                    # 新增目录
│       ├── ChatPanel.tsx        # 聊天面板
│       ├── ChatInput.tsx        # 输入框
│       ├── ChatMessage.tsx      # 消息气泡
│       ├── FrogAvatar.tsx       # 青蛙头像（带动画）
│       └── PriceCard.tsx        # 价格卡片
│
├── hooks/
│   ├── useChat.ts               # 新增：聊天 Hook
│   └── usePrice.ts              # 新增：价格 Hook
│
└── services/
    ├── chat.api.ts              # 新增：聊天 API
    └── price.api.ts             # 新增：价格 API
```

### 4.2 聊天面板设计

```tsx
// frontend/src/components/chat/ChatPanel.tsx

interface ChatPanelProps {
  frogId: number;
  frogName: string;
  personality: string;
}

export function ChatPanel({ frogId, frogName, personality }: ChatPanelProps) {
  // 状态管理
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [frogMood, setFrogMood] = useState('idle');
  
  // 发送消息
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    // 添加用户消息
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setIsLoading(true);
    setFrogMood('thinking');
    
    // 调用 API
    const response = await chatApi.sendMessage(frogId, input);
    
    // 添加青蛙回复
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: response.reply.content,
      data: response.reply.data
    }]);
    
    setFrogMood(response.frogMood);
    setIsLoading(false);
    setInput('');
  };
  
  return (
    <div className="chat-panel">
      {/* 青蛙头像区 */}
      <FrogAvatar name={frogName} mood={frogMood} />
      
      {/* 消息列表 */}
      <div className="messages">
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {isLoading && <TypingIndicator />}
      </div>
      
      {/* 快捷按钮 */}
      <div className="quick-actions">
        <button onClick={() => setInput('ETH 多少钱？')}>
          💰 查价格
        </button>
        <button onClick={() => setInput('我有多少钱？')}>
          👛 查资产
        </button>
        <button onClick={() => setInput('你在干嘛？')}>
          🐸 问青蛙
        </button>
      </div>
      
      {/* 输入框 */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={sendMessage}
        disabled={isLoading}
      />
    </div>
  );
}
```

---

## 五、开发任务清单

### Day 1 上午：基础搭建（4h）

| 序号 | 任务 | 预估时间 |
|-----|------|---------|
| 1 | Prisma Schema 新增（ChatSession, ChatMessage, PriceCache） | 30min |
| 2 | 运行 `prisma migrate` 创建表 | 10min |
| 3 | 创建 `chat.routes.ts` 路由框架 | 30min |
| 4 | 创建 `price.routes.ts` 路由框架 | 30min |
| 5 | 实现 `PriceService` 价格查询 | 1h |
| 6 | 测试价格 API | 30min |

### Day 1 下午：AI 集成（4h）

| 序号 | 任务 | 预估时间 |
|-----|------|---------|
| 7 | 创建 `QwenClient` 封装 Qwen API | 1h |
| 8 | 实现 `IntentService` 意图识别 | 1.5h |
| 9 | 编写 Prompt 模板 | 1h |
| 10 | 测试意图识别准确度 | 30min |

### Day 2 上午：聊天服务（4h）

| 序号 | 任务 | 预估时间 |
|-----|------|---------|
| 11 | 实现 `ChatService` 核心逻辑 | 2h |
| 12 | 实现 `AssetService` 资产查询 | 1.5h |
| 13 | 集成测试：完整对话流程 | 30min |

### Day 2 下午：前端开发（4h）

| 序号 | 任务 | 预估时间 |
|-----|------|---------|
| 14 | 创建 `ChatPanel` 组件 | 1.5h |
| 15 | 创建 `ChatMessage` 组件 | 30min |
| 16 | 创建 `FrogAvatar` 动画组件 | 1h |
| 17 | 集成 API 调用 | 30min |
| 18 | 样式美化和调试 | 30min |

---

## 六、测试用例

### 6.1 意图识别测试

| 输入 | 期望意图 | 期望参数 |
|-----|---------|---------|
| "ETH 多少钱" | price_query | { symbol: 'ETH' } |
| "以太坊现在什么价格" | price_query | { symbol: 'ETH' } |
| "帮我看看比特币行情" | price_query | { symbol: 'BTC' } |
| "我钱包里有多少钱" | asset_query | { assetType: 'all' } |
| "我的资产" | asset_query | { assetType: 'all' } |
| "青蛙在干嘛" | frog_status | {} |
| "你好呀" | chitchat | {} |
| "今天天气真好" | chitchat | {} |

### 6.2 端到端测试流程

```
1. 用户连接钱包
2. 选择一只青蛙开始聊天
3. 发送 "ETH 多少钱"
4. 验证：
   - 返回正确价格
   - 青蛙回复包含 "呱"
   - 青蛙动画变为 "thinking"
5. 发送 "我有多少钱"
6. 验证：
   - 返回正确余额
   - 青蛙动画变为 "counting"
```

---

## 七、风险与对策

| 风险 | 概率 | 影响 | 对策 |
|-----|------|------|-----|
| Qwen API 调用失败 | 中 | 高 | 预设回复兜底 |
| CoinGecko 限流 | 中 | 中 | 本地缓存 60s |
| 意图识别不准 | 高 | 中 | 规则引擎 + AI 双重保障 |
| 前端动画卡顿 | 低 | 低 | 简化动画效果 |

---

## 八、交付检查清单

- [ ] Prisma Schema 更新并迁移成功
- [ ] `/api/chat/message` 接口正常工作
- [ ] `/api/price/:symbol` 接口正常工作
- [ ] 青蛙能识别价格查询意图
- [ ] 青蛙能识别资产查询意图
- [ ] 青蛙回复风格符合性格设定
- [ ] 前端聊天面板可用
- [ ] 青蛙动画根据心情变化
- [ ] 快捷按钮可用

---

**完成 Phase 1 后，你将拥有一只能聊天、能查价格、能看资产的智能青蛙！** 🐸💬