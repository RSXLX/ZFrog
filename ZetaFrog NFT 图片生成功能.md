
# 🎨 ZetaFrog NFT 图片生成功能 - 完整开发文档（阿里云百炼版）

## 📋 文档概览

```
┌─────────────────────────────────────────────────────────────┐
│          ZetaFrog NFT 图片生成系统 (阿里云百炼)              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🎯 目标：为旅行纪念品 NFT 生成独特的 AI 艺术图片            │
│                                                             │
│  📊 开发难度：⭐⭐⭐☆☆ (中等偏易)                           │
│  ⏱️ 预估工时：3-4 天（全功能实现）                          │
│                                                             │
│  ✅ 推荐模型：wan2.2-t2i-flash                              │
│     • 速度：比 2.1 版本快 50%                               │
│     • 价格：0.04 元/张（最便宜）                            │
│     • 效果：稳定性与成功率全面提升                          │
│                                                             │
│  💰 成本估算（每月 10,000 张）：                            │
│     • 图片生成：10,000 × ¥0.04 = ¥400                      │
│     • IPFS 存储：免费额度 / $20 月                          │
│     • 总计：约 ¥500-600/月                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. 模型选型对比

### 1.1 通义万相文生图模型对比

| 模型名称 | 版本 | 速度 | 价格 | 分辨率范围 | 推荐场景 |
|---------|------|------|------|-----------|---------|
| **wan2.2-t2i-flash** | 极速版 | ⚡⚡⚡⚡⚡ | **0.04元/张** | 512-1440px | **✅ 首选推荐** |
| wan2.2-t2i-plus | 专业版 | ⚡⚡⚡ | 0.08元/张 | 512-1440px | 高质量需求 |
| wan2.5-t2i-preview | 预览版 | ⚡⚡ | 0.10元/张 | 768-2700px | 超长尺寸 |
| wanx2.1-t2i-turbo | 极速版 | ⚡⚡⚡⚡ | 0.06元/张 | 512-1440px | 备选 |
| wanx-v1 | V1版 | ⚡⚡ | 0.16元/张 | 720-1280px | 不推荐 |

### 1.2 推荐配置

```typescript
// 推荐配置：wan2.2-t2i-flash
const RECOMMENDED_CONFIG = {
  model: 'wan2.2-t2i-flash',     // 最快最便宜
  size: '512*512',               // NFT 标准尺寸
  n: 1,                          // 每次生成1张
  prompt_extend: true,           // 开启智能改写
  watermark: false,              // 不添加水印
};
```

---

## 2. API 调用流程

### 2.1 调用流程图

```
┌─────────────────────────────────────────────────────────────┐
│                  异步 API 调用流程                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐  │
│  │ 1. 提交任务  │ --> │ 2. 获取     │ --> │ 3. 轮询     │  │
│  │ POST /...   │     │ task_id     │     │ 任务状态    │  │
│  └─────────────┘     └─────────────┘     └─────────────┘  │
│                                                   │        │
│                                                   ▼        │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐  │
│  │ 6. 更新NFT  │ <-- │ 5. 上传IPFS │ <-- │ 4. 获取     │  │
│  │ 元数据      │     │             │     │ 图片URL     │  │
│  └─────────────┘     └─────────────┘     └─────────────┘  │
│                                                             │
│  ⏱️ 典型耗时：15-30秒（flash模型）                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 API 端点

| 步骤 | 方法 | 端点 |
|------|------|------|
| 创建任务 | POST | `https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis` |
| 查询结果 | GET | `https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}` |

---

## 3. 提示词（Prompt）设计系统

### 3.1 ZetaFrog 专用提示词模板

```typescript
// src/config/prompt-templates.ts

/**
 * ZetaFrog 提示词构建系统
 * 
 * 设计原则：
 * 1. 统一品牌风格 - 卡通、可爱、明亮
 * 2. 突出跨链主题 - 区块链元素
 * 3. 稀有度区分 - 视觉复杂度递增
 */

// 基础风格前缀（所有图片共用）
export const STYLE_PREFIX = `
cute kawaii cartoon style, 
chibi frog character,
soft rounded shapes,
bright vibrant colors,
clean digital illustration,
transparent background,
high quality, 4K detailed
`.trim().replace(/\s+/g, ' ');

// 负面提示词（避免生成不良内容）
export const NEGATIVE_PROMPT = `
realistic, photorealistic, 3d render,
dark, gloomy, scary, horror,
blurry, low quality, distorted,
text, watermark, signature,
bad anatomy, deformed,
multiple frogs, crowded
`.trim().replace(/\s+/g, ' ');

// 纪念品类型配置
export const SOUVENIR_PROMPTS: Record<string, SouvenirPromptConfig> = {
  ETHEREUM_POSTCARD: {
    name: 'Ethereum Postcard',
    nameZh: '以太坊明信片',
    basePrompt: 'vintage postcard design, Ethereum diamond logo, blockchain network background, stamp corner decoration',
    colors: 'purple and blue gradient, silver accents',
    rarityEnhance: {
      COMMON: 'simple flat design',
      UNCOMMON: 'subtle glow effects, soft shadows',
      RARE: 'holographic shimmer, metallic accents',
      EPIC: 'golden frame, aurora glow, sparkles',
      LEGENDARY: 'rainbow holographic, crystal elements, divine light rays',
    }
  },

  GAS_FEE_RECEIPT: {
    name: 'Gas Fee Receipt',
    nameZh: 'Gas费收据',
    basePrompt: 'paper receipt design, gas pump icon, transaction data display, crypto symbols',
    colors: 'warm yellow and orange, white paper texture',
    rarityEnhance: {
      COMMON: 'basic receipt paper',
      UNCOMMON: 'decorated borders, cute doodles',
      RARE: 'golden seal stamp, premium paper texture',
      EPIC: 'holographic receipt, glowing numbers',
      LEGENDARY: 'mythical scroll, floating in gas clouds, cosmic energy',
    }
  },

  BLOCKCHAIN_SNOWGLOBE: {
    name: 'Blockchain Snowglobe',
    nameZh: '区块链水晶球',
    basePrompt: 'magical snow globe, miniature blockchain city inside, digital snowflakes falling, glowing base',
    colors: 'crystal blue, white sparkles, soft purple glow',
    rarityEnhance: {
      COMMON: 'simple glass sphere, basic scene',
      UNCOMMON: 'animated snow particles, multiple buildings',
      RARE: 'magical aurora inside, floating crypto symbols',
      EPIC: 'enchanted globe, swirling energy vortex',
      LEGENDARY: 'cosmic globe, entire universe inside, rainbow nebula',
    }
  },

  CRYPTO_STAMP: {
    name: 'Crypto Stamp',
    nameZh: '加密邮票',
    basePrompt: 'collectible postage stamp, perforated edges, denomination value, blockchain themed artwork',
    colors: 'vintage sepia, royal purple, gold foil',
    rarityEnhance: {
      COMMON: 'standard stamp design',
      UNCOMMON: 'commemorative edition mark',
      RARE: 'metallic foil printing, embossed details',
      EPIC: 'holographic stamp, 3D depth effect',
      LEGENDARY: 'animated elements, ultra-rare limited edition',
    }
  },

  CHAIN_COMPASS: {
    name: 'Chain Compass',
    nameZh: '链上指南针',
    basePrompt: 'magical compass, ornate design, multiple chain indicators, glowing needle, map background',
    colors: 'brass gold, deep blue, emerald green',
    rarityEnhance: {
      COMMON: 'basic wooden compass',
      UNCOMMON: 'brass compass with engravings',
      RARE: 'golden compass, gem-studded face',
      EPIC: 'magical floating holographic display',
      LEGENDARY: 'ancient artifact, reality-bending effects, cosmic symbols',
    }
  },

  DEFI_TREASURE_MAP: {
    name: 'DeFi Treasure Map',
    nameZh: 'DeFi藏宝图',
    basePrompt: 'ancient treasure map, aged parchment paper, protocol landmarks, yield farming spots, X marks the spot',
    colors: 'parchment brown, ink black, gold highlights, red X',
    rarityEnhance: {
      COMMON: 'simple hand-drawn routes',
      UNCOMMON: 'multiple treasure locations, detailed paths',
      RARE: 'hidden secrets revealed, glowing trails',
      EPIC: 'animated path indicators, magical symbols',
      LEGENDARY: 'legendary map showing all DeFi treasures, cosmic overlay',
    }
  },

  NFT_POLAROID: {
    name: 'NFT Polaroid',
    nameZh: 'NFT拍立得',
    basePrompt: 'Polaroid instant photo, white frame, captured crypto moment, handwritten caption, date stamp',
    colors: 'white frame, vibrant photo colors, vintage filter',
    rarityEnhance: {
      COMMON: 'standard polaroid',
      UNCOMMON: 'special filter effects, color enhancement',
      RARE: 'golden frame, memorable scene',
      EPIC: 'animated living memory, sparkle effects',
      LEGENDARY: 'multidimensional showing parallel realities, cosmic frame',
    }
  },

  SMART_CONTRACT_SCROLL: {
    name: 'Smart Contract Scroll',
    nameZh: '智能合约卷轴',
    basePrompt: 'ancient scroll, rolled parchment, glowing code text, magical seals, contract symbols',
    colors: 'ancient gold, magical blue glow, code green',
    rarityEnhance: {
      COMMON: 'basic scroll with code snippets',
      UNCOMMON: 'decorated scroll, syntax highlighting',
      RARE: 'enchanted scroll, animated code',
      EPIC: 'powerful scroll, reality-altering runes',
      LEGENDARY: 'primordial scroll, genesis contract, divine light',
    }
  },

  CROSS_CHAIN_PORTAL: {
    name: 'Cross-chain Portal',
    nameZh: '跨链传送门',
    basePrompt: 'mystical portal, swirling energy vortex, chain symbols around, dimensional rift, energy streams',
    colors: 'void purple, energy cyan, portal orange, star white',
    rarityEnhance: {
      COMMON: 'small portal, single destination',
      UNCOMMON: 'medium portal, multiple chain connections',
      RARE: 'large stable wormhole, bright energy',
      EPIC: 'massive portal, cosmic energy flow',
      LEGENDARY: 'ultimate portal connecting all realities, rainbow cosmic energy',
    }
  },
};

// 链主题配置
export const CHAIN_THEMES: Record<number, ChainTheme> = {
  1: {
    name: 'Ethereum',
    symbol: 'ETH',
    colors: 'purple and blue, silver diamond',
    elements: 'Ethereum diamond logo, purple energy waves',
  },
  56: {
    name: 'BNB Chain',
    symbol: 'BNB',
    colors: 'golden yellow, warm orange',
    elements: 'BNB coin, golden glow',
  },
  137: {
    name: 'Polygon',
    symbol: 'MATIC',
    colors: 'purple gradient, violet',
    elements: 'polygon shapes, purple energy',
  },
  8453: {
    name: 'Base',
    symbol: 'ETH',
    colors: 'blue, clean white',
    elements: 'Base logo, minimalist design',
  },
  7001: {
    name: 'ZetaChain',
    symbol: 'ZETA',
    colors: 'green and teal, omnichain glow',
    elements: 'Zeta symbol, cross-chain bridges, universal connection',
  },
};

// 类型定义
interface SouvenirPromptConfig {
  name: string;
  nameZh: string;
  basePrompt: string;
  colors: string;
  rarityEnhance: Record<string, string>;
}

interface ChainTheme {
  name: string;
  symbol: string;
  colors: string;
  elements: string;
}
```

### 3.2 Prompt 构建服务

```typescript
// src/services/prompt-builder.service.ts

import {
  STYLE_PREFIX,
  NEGATIVE_PROMPT,
  SOUVENIR_PROMPTS,
  CHAIN_THEMES,
} from '../config/prompt-templates';

export interface PromptBuildInput {
  souvenirType: string;        // 纪念品类型
  rarity: string;              // 稀有度
  chainId?: number;            // 链 ID（可选）
  customElements?: string[];   // 自定义元素
}

export interface BuiltPrompt {
  prompt: string;
  negative_prompt: string;
}

export class PromptBuilderService {
  /**
   * 构建完整的图片生成 Prompt
   */
  buildPrompt(input: PromptBuildInput): BuiltPrompt {
    const souvenirConfig = SOUVENIR_PROMPTS[input.souvenirType];
    
    if (!souvenirConfig) {
      throw new Error(`Unknown souvenir type: ${input.souvenirType}`);
    }

    const parts: string[] = [];

    // 1. 风格前缀
    parts.push(STYLE_PREFIX);

    // 2. 纪念品基础描述
    parts.push(souvenirConfig.basePrompt);

    // 3. 颜色方案
    parts.push(souvenirConfig.colors);

    // 4. 稀有度增强
    const rarityEnhance = souvenirConfig.rarityEnhance[input.rarity];
    if (rarityEnhance) {
      parts.push(rarityEnhance);
    }

    // 5. 链主题（如果指定）
    if (input.chainId && CHAIN_THEMES[input.chainId]) {
      const chainTheme = CHAIN_THEMES[input.chainId];
      parts.push(`${chainTheme.name} blockchain themed`);
      parts.push(chainTheme.colors);
      parts.push(chainTheme.elements);
    }

    // 6. 自定义元素
    if (input.customElements?.length) {
      parts.push(...input.customElements);
    }

    // 7. 质量关键词
    parts.push('masterpiece', 'best quality', 'highly detailed');

    return {
      prompt: parts.join(', '),
      negative_prompt: NEGATIVE_PROMPT,
    };
  }

  /**
   * 构建简化的中文 Prompt（利用智能改写功能）
   * 
   * 注意：开启 prompt_extend=true 时，可以使用简短的中文描述，
   * 系统会自动扩展为详细的英文提示词
   */
  buildSimplePrompt(input: PromptBuildInput): BuiltPrompt {
    const souvenirConfig = SOUVENIR_PROMPTS[input.souvenirType];
    
    if (!souvenirConfig) {
      throw new Error(`Unknown souvenir type: ${input.souvenirType}`);
    }

    // 使用简洁的中文描述，让 AI 智能扩展
    const rarityDesc = this.getRarityDescription(input.rarity);
    const chainDesc = input.chainId ? this.getChainDescription(input.chainId) : '';

    const prompt = `
      可爱卡通风格的${souvenirConfig.nameZh}，
      ${rarityDesc}效果，
      ${chainDesc}
      明亮的色彩，精致的细节，
      透明背景，高清画质
    `.trim().replace(/\s+/g, ' ');

    return {
      prompt,
      negative_prompt: '模糊、低质量、变形、文字、水印、恐怖、黑暗',
    };
  }

  private getRarityDescription(rarity: string): string {
    const descriptions: Record<string, string> = {
      COMMON: '简洁',
      UNCOMMON: '精美',
      RARE: '闪耀的',
      EPIC: '华丽的魔法',
      LEGENDARY: '传奇的宇宙级',
    };
    return descriptions[rarity] || '精美';
  }

  private getChainDescription(chainId: number): string {
    const chain = CHAIN_THEMES[chainId];
    return chain ? `${chain.name}区块链主题，` : '';
  }
}
```

---

## 4. 图片生成服务（核心实现）

### 4.1 阿里云百炼 API 服务

```typescript
// src/services/dashscope-image.service.ts

import axios, { AxiosInstance } from 'axios';

// API 配置
const API_CONFIG = {
  baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
  createTaskEndpoint: '/services/aigc/text2image/image-synthesis',
  queryTaskEndpoint: '/tasks',
};

// 模型配置
export const MODEL_CONFIG = {
  // ✅ 推荐：最快最便宜
  FLASH: {
    model: 'wan2.2-t2i-flash',
    price: 0.04,  // 元/张
    speed: '⚡⚡⚡⚡⚡',
    description: '极速版，速度最快，性价比最高',
  },
  // 高质量选择
  PLUS: {
    model: 'wan2.2-t2i-plus',
    price: 0.08,
    speed: '⚡⚡⚡',
    description: '专业版，质量更高',
  },
};

// 图片尺寸配置
export const SIZE_OPTIONS = {
  SQUARE_512: '512*512',     // NFT 标准
  SQUARE_1024: '1024*1024',  // 高清
  PORTRAIT: '720*1280',      // 竖版
  LANDSCAPE: '1280*720',     // 横版
};

// 请求参数接口
export interface GenerateImageRequest {
  prompt: string;
  negative_prompt?: string;
  model?: string;
  size?: string;
  n?: number;
  seed?: number;
  prompt_extend?: boolean;
  watermark?: boolean;
}

// 任务结果接口
export interface TaskResult {
  task_id: string;
  task_status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  results?: Array<{
    url: string;
    orig_prompt?: string;
    actual_prompt?: string;
  }>;
  task_metrics?: {
    TOTAL: number;
    SUCCEEDED: number;
    FAILED: number;
  };
  code?: string;
  message?: string;
}

export class DashScopeImageService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: API_CONFIG.baseUrl,
      timeout: 120000, // 2分钟超时
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    });
  }

  /**
   * 创建图片生成任务（异步）
   */
  async createTask(request: GenerateImageRequest): Promise<string> {
    const payload = {
      model: request.model || MODEL_CONFIG.FLASH.model,
      input: {
        prompt: request.prompt,
        negative_prompt: request.negative_prompt || '',
      },
      parameters: {
        size: request.size || SIZE_OPTIONS.SQUARE_512,
        n: request.n || 1,
        seed: request.seed,
        prompt_extend: request.prompt_extend ?? true,
        watermark: request.watermark ?? false,
      },
    };

    console.log(`[DashScope] 创建任务，模型: ${payload.model}`);
    console.log(`[DashScope] Prompt: ${request.prompt.substring(0, 100)}...`);

    const response = await this.client.post(
      API_CONFIG.createTaskEndpoint,
      payload,
      {
        headers: {
          'X-DashScope-Async': 'enable', // 必须：异步模式
        },
      }
    );

    if (response.data.output?.task_id) {
      console.log(`[DashScope] 任务创建成功: ${response.data.output.task_id}`);
      return response.data.output.task_id;
    }

    throw new Error(response.data.message || 'Failed to create task');
  }

  /**
   * 查询任务结果
   */
  async queryTask(taskId: string): Promise<TaskResult> {
    const response = await this.client.get(
      `${API_CONFIG.queryTaskEndpoint}/${taskId}`
    );

    return {
      task_id: response.data.output?.task_id,
      task_status: response.data.output?.task_status,
      results: response.data.output?.results,
      task_metrics: response.data.output?.task_metrics,
      code: response.data.output?.code,
      message: response.data.output?.message,
    };
  }

  /**
   * 等待任务完成（轮询）
   */
  async waitForCompletion(
    taskId: string,
    options: {
      maxAttempts?: number;
      intervalMs?: number;
      onProgress?: (status: string, attempt: number) => void;
    } = {}
  ): Promise<TaskResult> {
    const { 
      maxAttempts = 60,      // 最多等待 2 分钟
      intervalMs = 2000,     // 每 2 秒查询一次
      onProgress 
    } = options;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await this.queryTask(taskId);

      onProgress?.(result.task_status, attempt);

      if (result.task_status === 'SUCCEEDED') {
        console.log(`[DashScope] 任务完成，耗时约 ${attempt * 2} 秒`);
        return result;
      }

      if (result.task_status === 'FAILED') {
        throw new Error(result.message || 'Task failed');
      }

      // 继续等待
      await this.sleep(intervalMs);
    }

    throw new Error('Task timeout');
  }

  /**
   * 一键生成图片（创建任务 + 等待完成）
   */
  async generateImage(request: GenerateImageRequest): Promise<{
    imageUrl: string;
    originalPrompt: string;
    expandedPrompt?: string;
  }> {
    // 1. 创建任务
    const taskId = await this.createTask(request);

    // 2. 等待完成
    const result = await this.waitForCompletion(taskId, {
      onProgress: (status, attempt) => {
        console.log(`[DashScope] 状态: ${status}, 轮询次数: ${attempt}`);
      },
    });

    // 3. 提取结果
    if (!result.results || result.results.length === 0) {
      throw new Error('No image generated');
    }

    const imageResult = result.results[0];
    
    return {
      imageUrl: imageResult.url,
      originalPrompt: imageResult.orig_prompt || request.prompt,
      expandedPrompt: imageResult.actual_prompt,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 4.2 使用示例

```typescript
// 使用示例
import { DashScopeImageService, MODEL_CONFIG, SIZE_OPTIONS } from './dashscope-image.service';
import { PromptBuilderService } from './prompt-builder.service';

async function generateSouvenirImage() {
  const apiKey = process.env.DASHSCOPE_API_KEY!;
  const imageService = new DashScopeImageService(apiKey);
  const promptBuilder = new PromptBuilderService();

  // 构建 Prompt
  const { prompt, negative_prompt } = promptBuilder.buildPrompt({
    souvenirType: 'CROSS_CHAIN_PORTAL',
    rarity: 'EPIC',
    chainId: 7001, // ZetaChain
  });

  console.log('生成 Prompt:', prompt);

  // 生成图片
  const result = await imageService.generateImage({
    prompt,
    negative_prompt,
    model: MODEL_CONFIG.FLASH.model,  // 使用最快最便宜的模型
    size: SIZE_OPTIONS.SQUARE_512,
    n: 1,
    prompt_extend: true,  // 开启智能改写
    watermark: false,
  });

  console.log('图片 URL:', result.imageUrl);
  console.log('扩展后 Prompt:', result.expandedPrompt);

  return result;
}
```

---

## 5. 完整的 NFT 图片编排服务

```typescript
// src/services/nft-image-orchestrator.service.ts

import { PrismaClient, ImageGenerationStatus } from '@prisma/client';
import { DashScopeImageService, MODEL_CONFIG, SIZE_OPTIONS } from './dashscope-image.service';
import { PromptBuilderService } from './prompt-builder.service';
import { IPFSUploaderService } from './ipfs-uploader.service';
import { ImageProcessorService } from './image-processor.service';

const prisma = new PrismaClient();

export interface GenerateSouvenirImageInput {
  odosId: string;             // 青蛙 ID
  travelId: string;           // 旅行 ID
  souvenirId: string;         // 纪念品 ID
  souvenirType: string;       // 纪念品类型
  rarity: string;             // 稀有度
  chainId?: number;           // 链 ID
}

export class NFTImageOrchestratorService {
  private imageService: DashScopeImageService;
  private promptBuilder: PromptBuilderService;
  private ipfsUploader: IPFSUploaderService;
  private imageProcessor: ImageProcessorService;

  constructor() {
    const apiKey = process.env.DASHSCOPE_API_KEY!;
    this.imageService = new DashScopeImageService(apiKey);
    this.promptBuilder = new PromptBuilderService();
    this.ipfsUploader = new IPFSUploaderService();
    this.imageProcessor = new ImageProcessorService();
  }

  /**
   * 生成纪念品 NFT 图片（完整流程）
   */
  async generateSouvenirImage(input: GenerateSouvenirImageInput) {
    console.log(`[Orchestrator] 开始生成: ${input.souvenirType} - ${input.rarity}`);

    // 1. 创建数据库记录
    const record = await this.createRecord(input);

    try {
      // 2. 构建 Prompt
      const { prompt, negative_prompt } = this.promptBuilder.buildPrompt({
        souvenirType: input.souvenirType,
        rarity: input.rarity,
        chainId: input.chainId,
      });

      await this.updateRecord(record.id, {
        prompt,
        negativePrompt: negative_prompt,
        status: ImageGenerationStatus.GENERATING,
      });

      // 3. 调用 AI 生成图片
      console.log(`[Orchestrator] 调用 AI 生成...`);
      const result = await this.imageService.generateImage({
        prompt,
        negative_prompt,
        model: MODEL_CONFIG.FLASH.model,
        size: SIZE_OPTIONS.SQUARE_512,
        n: 1,
        prompt_extend: true,
        watermark: false,
        seed: this.generateSeed(input),
      });

      await this.updateRecord(record.id, {
        imageUrl: result.imageUrl,
        actualPrompt: result.expandedPrompt,
        status: ImageGenerationStatus.PROCESSING,
        generatedAt: new Date(),
      });

      // 4. 下载并处理图片
      console.log(`[Orchestrator] 处理图片...`);
      const processed = await this.imageProcessor.processImage({
        imageUrl: result.imageUrl,
        targetWidth: 512,
        targetHeight: 512,
        format: 'png',
      });

      // 5. 上传到 IPFS
      console.log(`[Orchestrator] 上传 IPFS...`);
      await this.updateRecord(record.id, {
        status: ImageGenerationStatus.UPLOADING,
      });

      const ipfsResult = await this.ipfsUploader.uploadImage({
        buffer: processed.buffer,
        filename: `zetafrog-${input.souvenirType}-${input.rarity}-${Date.now()}.png`,
      });

      // 6. 更新记录为完成
      const finalRecord = await this.updateRecord(record.id, {
        ipfsHash: ipfsResult.ipfsHash,
        ipfsUrl: ipfsResult.ipfsUrl,
        gatewayUrl: ipfsResult.gatewayUrl,
        fileSize: processed.fileSize,
        status: ImageGenerationStatus.COMPLETED,
        uploadedAt: new Date(),
      });

      console.log(`[Orchestrator] ✅ 完成: ${ipfsResult.ipfsHash}`);

      return {
        success: true,
        record: finalRecord,
        imageUrl: ipfsResult.gatewayUrl,
        ipfsHash: ipfsResult.ipfsHash,
      };

    } catch (error: any) {
      console.error(`[Orchestrator] ❌ 失败: ${error.message}`);

      await this.updateRecord(record.id, {
        status: ImageGenerationStatus.FAILED,
        errorMessage: error.message,
        retryCount: { increment: 1 },
      });

      return {
        success: false,
        error: error.message,
        record,
      };
    }
  }

  /**
   * 生成唯一种子
   */
  private generateSeed(input: GenerateSouvenirImageInput): number {
    const str = `${input.odosId}-${input.souvenirId}-${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % 2147483647;
  }

  private async createRecord(input: GenerateSouvenirImageInput) {
    return prisma.souvenirImage.create({
      data: {
        odosId: input.odosId,
        travelId: input.travelId,
        souvenirId: input.souvenirId,
        souvenirType: input.souvenirType,
        souvenirName: `${input.souvenirType}_${input.rarity}`,
        rarity: input.rarity,
        prompt: '',
        seed: 0,
        stylePreset: 'ZETAFROG_CARTOON',
        status: ImageGenerationStatus.PENDING,
      },
    });
  }

  private async updateRecord(id: string, data: any) {
    return prisma.souvenirImage.update({
      where: { id },
      data,
    });
  }
}
```

---

## 6. 环境配置

### 6.1 环境变量

```bash
# .env

# ==================== 阿里云百炼 ====================
# 获取方式：https://bailian.console.aliyun.com/ -> API-KEY管理
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx

# ==================== IPFS 存储 ====================
# Pinata (推荐，有免费额度)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key

# NFT.Storage (备用，免费)
NFT_STORAGE_KEY=your_nft_storage_key

# ==================== 数据库 ====================
DATABASE_URL="postgresql://user:password@localhost:5432/zetafrog"

# ==================== Redis (可选，用于队列) ====================
REDIS_URL="redis://localhost:6379"
```

### 6.2 安装依赖

```bash
npm install axios sharp form-data
npm install -D @types/sharp
```

---

## 7. API 路由

```typescript
// src/routes/nft-image.routes.ts

import { Router } from 'express';
import { NFTImageOrchestratorService } from '../services/nft-image-orchestrator.service';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const orchestrator = new NFTImageOrchestratorService();

/**
 * POST /api/nft-image/generate
 * 生成纪念品图片
 */
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { odosId, travelId, souvenirId, souvenirType, rarity, chainId } = req.body;

    const result = await orchestrator.generateSouvenirImage({
      odosId,
      travelId,
      souvenirId,
      souvenirType,
      rarity,
      chainId,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/nft-image/status/:souvenirId
 * 查询某个纪念品的生成状态
 */
router.get('/status/:souvenirId', async (req, res) => {
  try {
    const { souvenirId } = req.params;

    const record = await prisma.souvenirImage.findFirst({
      where: { souvenirId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        odosId: true,
        souvenirId: true,
        souvenirType: true,
        rarity: true,
        status: true,
        imageUrl: true,
        ipfsHash: true,
        gatewayUrl: true,
        errorMessage: true,
        createdAt: true,
        generatedAt: true,
        uploadedAt: true,
      },
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Generation record for this souvenir not found',
      });
    }

    res.json({
      success: true,
      record,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

---

## 8. 成本计算器

```typescript
// src/utils/cost-calculator.ts

export const COST_CONFIG = {
  // 图片生成成本（元/张）
  IMAGE_GENERATION: {
    'wan2.2-t2i-flash': 0.04,
    'wan2.2-t2i-plus': 0.08,
    'wan2.5-t2i-preview': 0.10,
    'wanx2.1-t2i-turbo': 0.06,
  },

  // IPFS 存储（估算）
  IPFS_STORAGE: {
    freeQuota: 1024 * 1024 * 1024, // 1GB 免费
    pricePerGB: 0.1, // 美元/GB
  },
};

export function calculateMonthlyCost(
  imageCount: number,
  model: string = 'wan2.2-t2i-flash'
): {
  imageCost: number;
  storageCost: number;
  totalCost: number;
  currency: string;
} {
  const pricePerImage = COST_CONFIG.IMAGE_GENERATION[model] || 0.04;
  const imageCost = imageCount * pricePerImage;

  // 假设每张图片 300KB
  const totalStorageMB = (imageCount * 300) / 1024;
  const storageCostUSD = totalStorageMB > 1024 
    ? ((totalStorageMB - 1024) / 1024) * COST_CONFIG.IPFS_STORAGE.pricePerGB 
    : 0;
  const storageCost = storageCostUSD * 7.2; // 美元转人民币

  return {
    imageCost,
    storageCost,
    totalCost: imageCost + storageCost,
    currency: 'CNY',
  };
}

// 示例：计算每月 10,000 张图片的成本
// calculateMonthlyCost(10000, 'wan2.2-t2i-flash')
// => { imageCost: 400, storageCost: ~0, totalCost: ~400, currency: 'CNY' }
```

---

## 9. 开发计划

```
┌─────────────────────────────────────────────────────────────┐
│                    开发计划 (3-4天)                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Day 1: 基础设施                                            │
│  ☐ 配置阿里云百炼 API Key                                   │
│  ☐ 实现 DashScopeImageService                              │
│  ☐ 测试基础图片生成                                         │
│  ☐ 实现 Prompt 构建系统                                     │
│                                                             │
│  Day 2: 核心功能                                            │
│  ☐ 配置 9 种纪念品 Prompt 模板                              │
│  ☐ 实现图片处理服务                                         │
│  ☐ 配置 IPFS 存储                                           │
│  ☐ 实现编排服务                                             │
│                                                             │
│  Day 3: 集成测试                                            │
│  ☐ 实现 API 路由                                            │
│  ☐ 端到端测试所有纪念品类型                                 │
│  ☐ 测试不同稀有度效果                                       │
│  ☐ 错误处理优化                                             │
│                                                             │
│  Day 4: 优化部署                                            │
│  ☐ 添加异步队列（可选）                                     │
│  ☐ 性能优化                                                 │
│  ☐ 部署测试                                                 │
│  ☐ 文档完善                                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. 测试用例

### 10.1 单元测试

```typescript
// tests/services/dashscope-image.service.test.ts

import { DashScopeImageService } from '../../src/services/dashscope-image.service';
import { MODEL_CONFIG, SIZE_OPTIONS } from '../../src/services/dashscope-image.service';

describe('DashScopeImageService', () => {
  let service: DashScopeImageService;
  
  beforeEach(() => {
    service = new DashScopeImageService(process.env.DASHSCOPE_API_KEY!);
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const taskId = await service.createTask({
        prompt: 'A cute frog',
        model: MODEL_CONFIG.FLASH.model,
        size: SIZE_OPTIONS.SQUARE_512,
      });

      expect(taskId).toBeDefined();
      expect(typeof taskId).toBe('string');
    });
  });

  describe('generateImage', () => {
    it('should generate an image successfully', async () => {
      const result = await service.generateImage({
        prompt: 'cute cartoon frog, blockchain theme',
        model: MODEL_CONFIG.FLASH.model,
        size: SIZE_OPTIONS.SQUARE_512,
        prompt_extend: true,
      });

      expect(result.imageUrl).toBeDefined();
      expect(result.imageUrl).toMatch(/^https?:\/\//);
    }, 60000); // 60秒超时
  });
});
```

### 10.2 集成测试

```typescript
// tests/integration/nft-image-generation.test.ts

import { NFTImageOrchestratorService } from '../../src/services/nft-image-orchestrator.service';

describe('NFT Image Generation Integration', () => {
  let orchestrator: NFTImageOrchestratorService;

  beforeAll(() => {
    orchestrator = new NFTImageOrchestratorService();
  });

  it('should generate Ethereum postcard souvenir', async () => {
    const result = await orchestrator.generateSouvenirImage({
      odosId: 'test-odos-1',
      travelId: 'test-travel-1',
      souvenirId: 'test-souvenir-1',
      souvenirType: 'ETHEREUM_POSTCARD',
      rarity: 'RARE',
      chainId: 1, // Ethereum
    });

    expect(result.success).toBe(true);
    expect(result.ipfsHash).toBeDefined();
    expect(result.imageUrl).toMatch(/^https:\/\/ipfs.io\/ipfs\//);
  }, 120000); // 2分钟超时

  it('should generate ZetaChain legendary portal', async () => {
    const result = await orchestrator.generateSouvenirImage({
      odosId: 'test-odos-2',
      travelId: 'test-travel-2',
      souvenirId: 'test-souvenir-2',
      souvenirType: 'CROSS_CHAIN_PORTAL',
      rarity: 'LEGENDARY',
      chainId: 7001, // ZetaChain
    });

    expect(result.success).toBe(true);
    expect(result.ipfsHash).toBeDefined();
  }, 120000);
});
```

### 10.3 性能测试

```typescript
// tests/performance/load.test.ts

import { DashScopeImageService } from '../../src/services/dashscope-image.service';

describe('Load Testing', () => {
  const service = new DashScopeImageService(process.env.DASHSCOPE_API_KEY!);

  it('should handle 10 concurrent requests', async () => {
    const promises = Array.from({ length: 10 }, (_, i) => 
      service.generateImage({
        prompt: `Test frog ${i}`,
        model: 'wan2.2-t2i-flash',
        size: '512*512',
      })
    );

    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`成功: ${successful}, 失败: ${failed}`);
    expect(successful).toBeGreaterThan(5); // 至少50%成功
  }, 300000); // 5分钟超时
});
```

---

## 11. 部署指南

### 11.1 生产环境配置

```bash
# .env.production
NODE_ENV=production

# 使用高并发配置
DASHSCOPE_API_KEY=your_production_key
DATABASE_URL=postgresql://user:pass@prod-db:5432/zetafrog
REDIS_URL=redis://prod-redis:6379

# 启用监控
LOG_LEVEL=info
METRICS_ENABLED=true
```

### 11.2 Docker 部署

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装系统依赖（图片处理）
RUN apk add --no-cache \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: zetafrog
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  postgres_data:
```

### 11.3 监控和日志

```typescript
// src/utils/monitoring.ts

import { logger } from './logger';

export class ImageGenerationMonitor {
  static trackGeneration(type: string, rarity: string, duration: number) {
    // 记录生成时间
    logger.info(`Image generated`, {
      type,
      rarity,
      duration: `${duration}ms`,
    });

    // 发送到监控系统
    if (process.env.METRICS_ENABLED) {
      // Prometheus metrics
      // metrics.histogram('image_generation_duration', duration, { type, rarity });
    }
  }

  static trackError(type: string, error: Error) {
    logger.error(`Image generation failed`, {
      type,
      error: error.message,
      stack: error.stack,
    });
  }
}
```

---

## 12. 总结

### 关键决策

| 决策项 | 选择 | 理由 |
|-------|------|------|
| **AI 模型** | wan2.2-t2i-flash | 最快(50%+)、最便宜(¥0.04/张) |
| **图片尺寸** | 512×512 | NFT 标准尺寸，成本最低 |
| **Prompt 策略** | 英文 + 智能改写 | 效果更好，自动扩展 |
| **存储方案** | IPFS (Pinata) | 去中心化，永久存储 |

### 成本分析

- **图片生成**：¥0.04/张（flash模型）
- **月度成本**（10,000张）：约¥400
- **年总成本**：约¥5,000（包含存储）

### 技术亮点

1. **异步处理**：避免阻塞，提升用户体验
2. **智能Prompt**：自动扩展，确保生成质量
3. **成本优化**：选择最优模型，控制成本
4. **错误恢复**：完善的错误处理和重试机制
5. **可扩展性**：支持添加新的纪念品类型

### 后续优化

1. **缓存机制**：相似Prompt复用结果
2. **批量生成**：降低API调用成本
3. **用户定制**：允许自定义Prompt元素
4. **A/B测试**：对比不同模型效果
5. **本地部署**：考虑Stable Diffusion本地化

---

## 13. 快速开始

```bash
# 1. 克隆项目
git clone https://github.com/RSXLX/ZFrog.git
cd ZFrog

# 2. 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env，添加 DASHSCOPE_API_KEY

# 3. 安装依赖
cd backend
npm install

# 4. 运行数据库迁移
npx prisma migrate dev

# 5. 启动开发服务器
npm run dev

# 6. 测试图片生成
curl -X POST http://localhost:3001/api/nft-image/generate \
  -H "Content-Type: application/json" \
  -d '{
    "odosId": "test-1",
    "travelId": "travel-1",
    "souvenirId": "souvenir-1",
    "souvenirType": "ETHEREUM_POSTCARD",
    "rarity": "RARE",
    "chainId": 1
  }'
```

---

## 14. 常见问题

### Q1: 图片生成失败怎么办？
A: 检查API Key是否正确，网络是否正常，Prompt是否包含敏感词。

### Q2: 如何降低成本？
A: 使用flash模型，控制生成数量，复用相似Prompt结果。

### Q3: IPFS 上传失败？
A: 检查Pinata配置，确保有足够空间，重试机制会自动处理。

### Q4: 如何自定义纪念品类型？
A: 在 `src/config/prompt-templates.ts` 添加新的配置即可。

---

## 15. 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 发起 Pull Request

---

**文档版本**: v1.0  
**最后更新**: 2025-12-19  
**维护者**: ZetaFrog Team

