---
status: 已审核
version: 1.1
last_updated: 2026-01-14
reviewer: 用户
---

# 个性化青蛙 SVG 生成技术设计

> 本文档定义 LLM 驱动的个性化青蛙 SVG 生成功能的技术实现方案。

---

## 一、模块概述

实现每个用户拥有独特的青蛙 NFT 外观。通过 LLM 控制 SVG 参数生成，结合稀有度系统和 OpenSea 元数据标准，打造独一无二的 NFT 青蛙。

---

## 二、可行性评估

### 2.1 技术可行性

| 技术点 | 可行性 | 说明 |
|--------|--------|------|
| LLM 参数生成 | ✅ 高 | 已有 Qwen API 集成 (`ai.service.ts`)，支持 JSON 输出 |
| 前端 SVG 渲染 | ✅ 高 | 已有 `FrogSvg.tsx` 组件，支持动态参数 |
| 稀有度算法 | ✅ 高 | 纯前端/后端计算，无外部依赖 |
| OpenSea 元数据 | ✅ 高 | 标准 JSON 格式，无技术障碍 |
| 数据库扩展 | ✅ 高 | Prisma 支持 JSON 字段 |

### 2.2 工作量预估

| 任务 | 预估 | 说明 |
|------|------|------|
| 后端 API 开发 | 5h | 生成/保存/获取参数接口 + 优化 |
| 前端组件改造 | 7h | 支持参数化渲染 + 配件系统 + 滤镜 |
| 稀有度系统 | 2h | 算法实现 + 配件映射 |
| OpenSea 元数据 | 2h | 格式转换接口 |
| 安全与防刷 | 2h | 签名校验 + 冷却时间 |
| 联调测试 | 3h | 端到端测试 |
| **总计** | **21h** | 约 3 个工作日 |

### 2.3 风险识别

| 风险 | 级别 | 应对策略 |
|------|------|----------|
| LLM 生成不稳定 | 中 | 定义严格 Schema + Sanitizer + 降级随机算法 |
| 颜色配色不和谐 | 低 | 预定义色板 + LLM 选择 |
| 隐藏款滥用 | 低 | Seed 绑定用户地址 + 签名校验 |
| 性能问题 | 低 | 混合生成模式 + 缓存已生成参数 |
| 接口滥用 | 低 | 冷却时间 + 签名校验 |

---

## 三、系统架构

### 3.1 混合生成模式 (Hybrid Mode)

> [!IMPORTANT]
> 采用分层生成策略，优化用户体验

```
┌────────────────────────────────────────────────────────────────────────────┐
│                            混合生成架构                                      │
└────────────────────────────────────────────────────────────────────────────┘

                  ┌──────────────────────────────────────┐
                  │          POST /generate              │
                  └──────────────────┬───────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                 ▼
         ┌──────────────────┐              ┌──────────────────┐
         │  Level 1 (同步)   │              │  Level 2 (异步)   │
         │  规则引擎 < 50ms  │              │  LLM 生成描述     │
         ├──────────────────┤              ├──────────────────┤
         │ • Seed 计算       │              │ • 个性化描述      │
         │ • 稀有度 roll     │              │ • appearanceDesc │
         │ • 色板选择        │              │ • 可后台更新      │
         │ • 配件分配        │              └────────┬─────────┘
         │ • 特效确定        │                       │
         └────────┬─────────┘                       │
                  │                                  │
                  ▼                                  ▼
         ┌──────────────────┐              ┌──────────────────┐
         │ 立即返回前端渲染  │              │ WebSocket 推送    │
         │ (用户秒见青蛙)   │              │ 或轮询获取描述    │
         └──────────────────┘              └──────────────────┘
```

**Level 1 (规则引擎 - 同步)**:
- 基于 Seed 确定性计算颜色、配件、特效
- 耗时 < 50ms
- 立即返回，用户第一时间看到青蛙

**Level 2 (LLM - 异步)**:
- 仅生成个性化描述 `appearanceDesc`
- 后台异步执行，不阻塞用户体验
- 完成后通过 WebSocket 推送或前端轮询获取

### 3.2 模块依赖关系

```
┌─────────────────────────────────────────────────────────────┐
│                       前端 (React)                           │
│  ┌───────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │  FrogMint.tsx │  │ FrogSvgGen.tsx│  │  FrogDetail.tsx │  │
│  │  (铸造预览)   │  │  (参数化渲染) │  │   (详情展示)    │  │
│  │  + 孵化动画   │  │  + 动态滤镜   │  │   + 稀有边框    │  │
│  └───────┬───────┘  └───────┬───────┘  └────────┬────────┘  │
│          │                  │                   │           │
│          ▼                  ▼                   ▼           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              useFrogAppearance Hook                 │    │
│  └──────────────────────────┬──────────────────────────┘    │
└─────────────────────────────┼───────────────────────────────┘
                              │ API 调用
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       后端 (Express)                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 appearance.routes.ts                   │  │
│  │   POST /generate  |  GET /:tokenId  |  GET /metadata   │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                              │
│  ┌───────────────────────────┴───────────────────────────┐  │
│  │               appearance.service.ts                    │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │  │
│  │  │ rollRarity  │  │ Sanitizer   │  │ mapToOpenSea  │  │  │
│  │  │ generateL1  │  │ (参数校验)  │  │               │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────────┘  │  │
│  └──────────────────────────┼────────────────────────────┘  │
│                             │                               │
│  ┌──────────────────────────┴────────────────────────────┐  │
│  │                    ai.service.ts                       │  │
│  │          (Qwen json_object 模式 + 异步描述生成)        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 业务流程图 (优化版)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      铸造青蛙流程 (混合模式)                              │
└──────────────────────────────────────────────────────────────────────────┘

用户                    前端                      后端                    LLM
 │                       │                        │                       │
 │  点击"铸造青蛙"       │                        │                       │
 ├──────────────────────▶│                        │                       │
 │                       │  显示"孵化中"动画     │                       │
 │◀──────────────────────┤                        │                       │
 │                       │  POST /generate        │                       │
 │                       │  + 签名校验            │                       │
 │                       ├───────────────────────▶│                       │
 │                       │                        │  ┌─────────────────┐  │
 │                       │                        │  │ Level 1 (同步)  │  │
 │                       │                        │  │ • 验证签名      │  │
 │                       │                        │  │ • 检查冷却时间  │  │
 │                       │                        │  │ • 生成 Seed     │  │
 │                       │                        │  │ • rollRarity()  │  │
 │                       │                        │  │ • 规则引擎生成  │  │
 │                       │                        │  │ • Sanitize 校验 │  │
 │                       │                        │  └────────┬────────┘  │
 │                       │◀───────────────────────┤          │           │
 │                       │  响应 (< 100ms):       │          │           │
 │                       │  params + 稀有度       │          │           │
 │  预览 SVG (秒出)      │                        │          │           │
 │◀──────────────────────┤                        │          ▼           │
 │                       │                        │  ┌─────────────────┐  │
 │                       │                        │  │ Level 2 (异步)  │──▶│
 │                       │                        │  │ 生成描述        │  │
 │                       │                        │  └─────────────────┘  │
 │  点击"换一只"        │                        │                       │
 │  (5s 冷却)            │                        │                       │
 ├──────────────────────▶│                        │                       │
 │                       │  检查冷却时间          │                       │
 │                       ├───────────────────────▶│  ...(重复)...         │
 │                       │                        │                       │
 │  确认铸造             │                        │  ◀─────────────────────┤
 ├──────────────────────▶│                        │  描述生成完成         │
 │                       │  链上交易 → 成功       │                       │
 │                       │  POST /frogs/sync      │                       │
 │                       ├───────────────────────▶│  保存完整参数         │
 │                       │◀───────────────────────┤                       │
 │  完成                 │                        │                       │
 │◀──────────────────────┤                        │                       │
```

---

## 四、数据结构设计

### 4.1 数据库变更 (Prisma Schema)

```prisma
model Frog {
  // ... 现有字段 ...
  
  // 🆕 个性化外观系统
  appearanceParams  Json?       // FrogAppearanceParams JSON
  appearanceDesc    String?     // LLM 生成的描述 (中文)
  rarityTier        String?     // common/uncommon/rare/epic/legendary/hidden
  rarityScore       Int?        // 0-100 稀有度分数
  isHiddenEdition   Boolean     @default(false)  // 是否隐藏款
}
```

### 4.2 TypeScript 类型定义

```typescript
// backend/src/types/appearance.ts

// 稀有度等级
export type RarityTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'hidden';

// 配件类型定义
export interface FrogAccessories {
  hat?: 'none' | 'cap' | 'crown' | 'flower' | 'bow' | 'antenna' | 'halo';
  glasses?: 'none' | 'round' | 'sunglasses' | 'heart' | 'star' | 'monocle';
  necklace?: 'none' | 'pearl' | 'chain' | 'scarf' | 'diamond';
  markings?: 'none' | 'spots' | 'stripes' | 'heart' | 'star' | 'galaxy';
}

// 完整外观参数
export interface FrogAppearanceParams {
  // 稀有度
  rarity: {
    score: number;    // 0-100
    tier: RarityTier;
  };
  
  // 颜色系统
  colors: {
    primaryColor: string;    // #RRGGBB
    secondaryColor: string;
    accentColor: string;
    cheekColor: string;
    eyeColor: string;
  };
  
  // 配件
  accessories: FrogAccessories;
  
  // 表情基调
  baseExpression: 'happy' | 'curious' | 'sleepy' | 'cool' | 'shy';
  
  // 特效
  effects: {
    sparkle: boolean;
    blush: boolean;
    glow: boolean;
    rainbow: boolean;  // 隐藏款专属
  };
  
  // 描述 (Level 2 异步生成)
  description: string;
  
  // 隐藏款标记
  isHidden: boolean;
}

// OpenSea 元数据格式
export interface OpenSeaMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes: {
    trait_type: string;
    value: string | number;
    display_type?: 'number' | 'boost_percentage' | 'boost_number' | 'date';
  }[];
}
```

---

## 五、接口设计

### 5.1 生成外观参数

```
POST /api/frogs/appearance/generate
```

**请求参数**:
```typescript
{
  walletAddress: string;      // 用户钱包地址
  signature: string;          // 钱包签名 (防刷)
  message: string;            // 被签名的消息
  regenerateToken?: string;   // 重新生成令牌 (可选)
}
```

**响应**:
```typescript
{
  success: boolean;
  params: FrogAppearanceParams;  // 描述字段可能为空，等待异步填充
  regenerateRemaining: number;   // 剩余重新生成次数
  regenerateToken: string;       // 用于重新生成的令牌
  isHidden: boolean;
  cooldownUntil?: number;        // 下次可重新生成的时间戳
  descriptionPending: boolean;   // 描述是否还在生成中
}
```

**业务逻辑**:
1. **签名校验** - 验证请求确实来自钱包所有者
2. **冷却检查** - 防止频繁调用（5 秒冷却）
3. 检查是否已有青蛙（已铸造则不允许重新生成）
4. 生成/验证 regenerateToken（限制 3 次）
5. 计算 Seed = sha256(walletAddress + regenerateCount)
6. **Level 1 同步生成** - 颜色、配件、特效（< 50ms）
7. **Sanitizer 校验** - 确保参数合法
8. **Level 2 异步生成** - 触发 LLM 生成描述（后台）
9. 缓存结果（用于铸造确认）

### 5.2 获取外观参数

```
GET /api/frogs/:tokenId/appearance
```

**响应**:
```typescript
{
  success: boolean;
  params: FrogAppearanceParams | null;
}
```

### 5.3 获取 OpenSea 元数据

```
GET /api/frogs/:tokenId/metadata
```

**响应**: 标准 OpenSea JSON 格式

```json
{
  "name": "ZetaFrog #123",
  "description": "一只戴着小皇冠的优雅青蛙",
  "image": "https://api.zetafrog.xyz/frogs/123/image.svg",
  "external_url": "https://zetafrog.xyz/frog/123",
  "attributes": [
    { "trait_type": "Rarity", "value": "Epic" },
    { "trait_type": "Rarity Score", "value": 87, "display_type": "number" },
    { "trait_type": "Hat", "value": "Crown" },
    { "trait_type": "Glasses", "value": "None" },
    { "trait_type": "Markings", "value": "Galaxy" },
    { "trait_type": "Expression", "value": "Cool" },
    { "trait_type": "Primary Color", "value": "#FFD700" },
    { "trait_type": "Hidden Edition", "value": "No" }
  ]
}
```

---

## 六、核心算法

### 6.1 稀有度算法

```typescript
// backend/src/services/appearance.service.ts

import crypto from 'crypto';

interface RarityResult {
  tier: RarityTier;
  score: number;
  isHidden: boolean;
}

export function rollRarity(seed: string): RarityResult {
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  const roll = parseInt(hash.slice(0, 8), 16) % 10000;
  
  // 稀有度分布
  // Hidden: 0.1% (0-9)
  // Legendary: 0.9% (10-99)
  // Epic: 4% (100-499)
  // Rare: 15% (500-1999)
  // Uncommon: 30% (2000-4999)
  // Common: 50% (5000-9999)
  
  let tier: RarityTier;
  let score: number;
  let isHidden = false;
  
  if (roll < 10) {
    tier = 'hidden';
    score = 100;
    isHidden = true;
  } else if (roll < 100) {
    tier = 'legendary';
    score = 95 + Math.floor((roll - 10) / 18); // 95-99
  } else if (roll < 500) {
    tier = 'epic';
    score = 80 + Math.floor((roll - 100) / 26.67); // 80-94
  } else if (roll < 2000) {
    tier = 'rare';
    score = 50 + Math.floor((roll - 500) / 50); // 50-79
  } else if (roll < 5000) {
    tier = 'uncommon';
    score = 20 + Math.floor((roll - 2000) / 100); // 20-49
  } else {
    tier = 'common';
    score = Math.floor((roll - 5000) / 250); // 0-19
  }
  
  return { tier, score, isHidden };
}
```

### 6.2 参数 Sanitizer (鲁棒性保障)

```typescript
// backend/src/services/appearance.service.ts

const DEFAULT_COLORS = {
  primaryColor: '#4ADE80',
  secondaryColor: '#FCD34D',
  accentColor: '#FDBA74',
  cheekColor: '#FDA4AF',
  eyeColor: '#FEF9C3',
};

const isValidHex = (hex: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(hex);

export function sanitizeAppearanceParams(
  params: Partial<FrogAppearanceParams>,
  rarity: RarityResult
): FrogAppearanceParams {
  const constraints = ACCESSORY_CONSTRAINTS[rarity.tier];
  
  // 颜色校验 - 非法则回退到默认值
  const colors = {
    primaryColor: isValidHex(params.colors?.primaryColor || '') 
      ? params.colors!.primaryColor 
      : DEFAULT_COLORS.primaryColor,
    secondaryColor: isValidHex(params.colors?.secondaryColor || '') 
      ? params.colors!.secondaryColor 
      : DEFAULT_COLORS.secondaryColor,
    accentColor: isValidHex(params.colors?.accentColor || '') 
      ? params.colors!.accentColor 
      : DEFAULT_COLORS.accentColor,
    cheekColor: isValidHex(params.colors?.cheekColor || '') 
      ? params.colors!.cheekColor 
      : DEFAULT_COLORS.cheekColor,
    eyeColor: isValidHex(params.colors?.eyeColor || '') 
      ? params.colors!.eyeColor 
      : DEFAULT_COLORS.eyeColor,
  };
  
  // 配件校验 - 确保在允许范围内
  const accessories: FrogAccessories = {
    hat: constraints.allowedHats.includes(params.accessories?.hat || 'none') 
      ? params.accessories?.hat 
      : constraints.allowedHats[0] as any,
    glasses: constraints.allowedGlasses.includes(params.accessories?.glasses || 'none') 
      ? params.accessories?.glasses 
      : constraints.allowedGlasses[0] as any,
    necklace: constraints.allowedNecklaces.includes(params.accessories?.necklace || 'none') 
      ? params.accessories?.necklace 
      : constraints.allowedNecklaces[0] as any,
    markings: constraints.allowedMarkings.includes(params.accessories?.markings || 'none') 
      ? params.accessories?.markings 
      : constraints.allowedMarkings[0] as any,
  };
  
  // 特效校验
  const effects = {
    sparkle: constraints.allowedEffects.includes('sparkle') && !!params.effects?.sparkle,
    blush: constraints.allowedEffects.includes('blush') && !!params.effects?.blush,
    glow: constraints.allowedEffects.includes('glow') && !!params.effects?.glow,
    rainbow: rarity.isHidden && !!params.effects?.rainbow,  // 彩虹仅隐藏款
  };
  
  return {
    rarity: {
      tier: rarity.tier,
      score: rarity.score,
    },
    colors,
    accessories,
    baseExpression: ['happy', 'curious', 'sleepy', 'cool', 'shy'].includes(params.baseExpression || '')
      ? params.baseExpression!
      : 'happy',
    effects,
    description: params.description || '',
    isHidden: rarity.isHidden,
  };
}
```

### 6.3 Level 1 规则引擎 (同步生成)

```typescript
// backend/src/services/appearance.service.ts

export function generateLevel1(seed: string, rarity: RarityResult): Partial<FrogAppearanceParams> {
  const hash = crypto.createHash('sha256').update(seed + 'appearance').digest('hex');
  
  // 确定色板
  let paletteName: string;
  if (rarity.isHidden) {
    paletteName = 'galaxy';
  } else if (rarity.tier === 'legendary') {
    paletteName = 'gold';
  } else {
    const paletteNames = ['forest', 'ocean', 'sunset'];
    const paletteIndex = parseInt(hash.slice(0, 2), 16) % paletteNames.length;
    paletteName = paletteNames[paletteIndex];
  }
  
  const palette = COLOR_PALETTES[paletteName];
  const constraints = ACCESSORY_CONSTRAINTS[rarity.tier];
  
  // 基于 seed 确定性选择
  const pickFromArray = <T>(arr: T[], offset: number): T => {
    const index = parseInt(hash.slice(offset, offset + 2), 16) % arr.length;
    return arr[index];
  };
  
  return {
    colors: {
      primaryColor: pickFromArray(palette.primary, 2),
      secondaryColor: pickFromArray(palette.secondary, 4),
      accentColor: pickFromArray(palette.accent, 6),
      cheekColor: pickFromArray(palette.cheek, 8),
      eyeColor: pickFromArray(palette.eye, 10),
    },
    accessories: {
      hat: pickFromArray(constraints.allowedHats, 12) as any,
      glasses: pickFromArray(constraints.allowedGlasses, 14) as any,
      necklace: pickFromArray(constraints.allowedNecklaces, 16) as any,
      markings: pickFromArray(constraints.allowedMarkings, 18) as any,
    },
    baseExpression: pickFromArray(['happy', 'curious', 'sleepy', 'cool', 'shy'], 20) as any,
    effects: {
      sparkle: constraints.allowedEffects.includes('sparkle') && parseInt(hash.slice(22, 24), 16) % 2 === 0,
      blush: constraints.allowedEffects.includes('blush') && parseInt(hash.slice(24, 26), 16) % 2 === 0,
      glow: constraints.allowedEffects.includes('glow') && parseInt(hash.slice(26, 28), 16) % 2 === 0,
      rainbow: rarity.isHidden,
    },
    isHidden: rarity.isHidden,
  };
}
```

### 6.4 签名校验 (安全防刷)

```typescript
// backend/src/services/appearance.service.ts

import { ethers } from 'ethers';

export function verifySignature(
  walletAddress: string,
  message: string,
  signature: string
): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
  } catch {
    return false;
  }
}

// 冷却时间管理 (内存缓存，生产环境建议用 Redis)
const cooldownMap = new Map<string, number>();
const COOLDOWN_MS = 5000; // 5 秒

export function checkCooldown(walletAddress: string): { allowed: boolean; cooldownUntil?: number } {
  const now = Date.now();
  const lastCall = cooldownMap.get(walletAddress.toLowerCase());
  
  if (lastCall && now - lastCall < COOLDOWN_MS) {
    return {
      allowed: false,
      cooldownUntil: lastCall + COOLDOWN_MS,
    };
  }
  
  cooldownMap.set(walletAddress.toLowerCase(), now);
  return { allowed: true };
}
```

### 6.5 配件约束规则

```typescript
// 根据稀有度限制配件选择
export const ACCESSORY_CONSTRAINTS: Record<RarityTier, {
  allowedHats: string[];
  allowedGlasses: string[];
  allowedNecklaces: string[];
  allowedMarkings: string[];
  allowedEffects: string[];
}> = {
  common: {
    allowedHats: ['none', 'cap', 'flower'],
    allowedGlasses: ['none', 'round'],
    allowedNecklaces: ['none', 'pearl'],
    allowedMarkings: ['none', 'spots', 'stripes'],
    allowedEffects: [],
  },
  uncommon: {
    allowedHats: ['none', 'cap', 'flower', 'bow'],
    allowedGlasses: ['none', 'round', 'sunglasses'],
    allowedNecklaces: ['none', 'pearl', 'chain'],
    allowedMarkings: ['none', 'spots', 'stripes', 'heart'],
    allowedEffects: ['blush'],
  },
  rare: {
    allowedHats: ['none', 'cap', 'flower', 'bow', 'antenna'],
    allowedGlasses: ['none', 'round', 'sunglasses', 'heart'],
    allowedNecklaces: ['none', 'pearl', 'chain', 'scarf'],
    allowedMarkings: ['none', 'spots', 'stripes', 'heart', 'star'],
    allowedEffects: ['blush', 'sparkle'],
  },
  epic: {
    allowedHats: ['none', 'cap', 'flower', 'bow', 'antenna', 'crown'],
    allowedGlasses: ['none', 'round', 'sunglasses', 'heart', 'star'],
    allowedNecklaces: ['none', 'pearl', 'chain', 'scarf', 'diamond'],
    allowedMarkings: ['none', 'spots', 'stripes', 'heart', 'star', 'galaxy'],
    allowedEffects: ['blush', 'sparkle', 'glow'],
  },
  legendary: {
    allowedHats: ['crown', 'halo'],  // 必须稀有帽子
    allowedGlasses: ['monocle', 'star'],
    allowedNecklaces: ['diamond'],
    allowedMarkings: ['galaxy'],
    allowedEffects: ['blush', 'sparkle', 'glow'],
  },
  hidden: {
    allowedHats: ['halo'],
    allowedGlasses: ['none', 'monocle'],
    allowedNecklaces: ['diamond'],
    allowedMarkings: ['galaxy'],
    allowedEffects: ['blush', 'sparkle', 'glow', 'rainbow'],  // 彩虹专属
  },
};
```

### 6.6 预定义色板

```typescript
// 色板定义，避免刺眼配色
export const COLOR_PALETTES: Record<string, {
  primary: string[];
  secondary: string[];
  accent: string[];
  cheek: string[];
  eye: string[];
}> = {
  forest: {
    primary: ['#4ADE80', '#22C55E', '#16A34A'],
    secondary: ['#FCD34D', '#FBBF24', '#F59E0B'],
    accent: ['#FDBA74', '#FB923C', '#F97316'],
    cheek: ['#FDA4AF', '#FB7185'],
    eye: ['#FEF9C3', '#FEF08A'],
  },
  ocean: {
    primary: ['#38BDF8', '#0EA5E9', '#0284C7'],
    secondary: ['#67E8F9', '#22D3EE', '#06B6D4'],
    accent: ['#A5F3FC', '#67E8F9'],
    cheek: ['#F0ABFC', '#E879F9'],
    eye: ['#E0F2FE', '#BAE6FD'],
  },
  sunset: {
    primary: ['#FB923C', '#F97316', '#EA580C'],
    secondary: ['#FBBF24', '#F59E0B', '#D97706'],
    accent: ['#FCD34D', '#FBBF24'],
    cheek: ['#FCA5A5', '#F87171'],
    eye: ['#FEF3C7', '#FDE68A'],
  },
  galaxy: {  // 隐藏款专用
    primary: ['#8B5CF6', '#7C3AED', '#6D28D9'],
    secondary: ['#A78BFA', '#8B5CF6', '#7C3AED'],
    accent: ['#C4B5FD', '#A78BFA'],
    cheek: ['#F0ABFC', '#E879F9'],
    eye: ['#DDD6FE', '#C4B5FD'],
  },
  gold: {  // Legendary 专用
    primary: ['#FFD700', '#FFC107', '#FFB300'],
    secondary: ['#FFECB3', '#FFE082', '#FFD54F'],
    accent: ['#FFF8E1', '#FFECB3'],
    cheek: ['#FFAB91', '#FF8A65'],
    eye: ['#FFFDE7', '#FFF9C4'],
  },
};
```

---

## 七、前端视觉增强

### 7.1 SVG 插槽式图层架构

> [!IMPORTANT]
> 采用标准化 6 层插槽架构，每个配件组件只需关心自己的 viewBox 相对坐标

```tsx
// frontend/src/components/frog/FrogSvgGenerated.tsx

// 标准 6 层插槽定义
const SVG_LAYER_SLOTS = {
  // Layer 1: 基础身体
  Base: {
    zIndex: 10,
    description: '青蛙身体主体轮廓',
    viewBox: '0 0 200 200',
  },
  // Layer 2: 纹理图案
  Markings: {
    zIndex: 20,
    description: '斑点/条纹/星星等纹理',
    viewBox: '0 0 200 200',
  },
  // Layer 3: 眼睛
  Eyes: {
    zIndex: 30,
    description: '眼睛 + 瞳孔 + 高光',
    viewBox: '0 0 200 200',
  },
  // Layer 4: 嘴巴 + 腮红
  Mouth: {
    zIndex: 40,
    description: '嘴巴表情 + 腮红 + 鼻孔',
    viewBox: '0 0 200 200',
  },
  // Layer 5: 服装配饰
  Clothes: {
    zIndex: 60,
    description: '项链/围巾等身体配饰',
    viewBox: '0 0 200 200',
  },
  // Layer 6: 头饰
  Headgear: {
    zIndex: 80,
    description: '帽子/眼镜/光环等头部配饰',
    viewBox: '0 0 200 200',
  },
};

// 特效层 (独立于插槽)
const EFFECT_LAYERS = {
  glow: 5,        // 在 Base 之下发光
  sparkle: 90,    // 最上层闪光
  rainbow: 100,   // 隐藏款彩虹光环
};

// 插槽式组件架构
interface FrogSvgGeneratedProps {
  params: FrogAppearanceParams;
  size?: number;
  animated?: boolean;
}

export const FrogSvgGenerated: React.FC<FrogSvgGeneratedProps> = ({
  params,
  size = 200,
  animated = true,
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 特效层: Glow (底层) */}
      {params.effects.glow && <GlowEffect />}
      
      {/* Layer 1: Base 身体 */}
      <g style={{ zIndex: SVG_LAYER_SLOTS.Base.zIndex }}>
        <BaseBody colors={params.colors} />
      </g>
      
      {/* Layer 2: Markings 纹理 */}
      <g style={{ zIndex: SVG_LAYER_SLOTS.Markings.zIndex }}>
        <MarkingsLayer type={params.accessories.markings} />
      </g>
      
      {/* Layer 3: Eyes 眼睛 */}
      <g style={{ zIndex: SVG_LAYER_SLOTS.Eyes.zIndex }}>
        <EyesLayer 
          eyeColor={params.colors.eyeColor} 
          expression={params.baseExpression}
          animated={animated}
        />
      </g>
      
      {/* Layer 4: Mouth 嘴巴 + 腮红 */}
      <g style={{ zIndex: SVG_LAYER_SLOTS.Mouth.zIndex }}>
        <MouthLayer expression={params.baseExpression} />
        <CheekLayer 
          cheekColor={params.colors.cheekColor}
          blush={params.effects.blush}
        />
      </g>
      
      {/* Layer 5: Clothes 服装 */}
      <g style={{ zIndex: SVG_LAYER_SLOTS.Clothes.zIndex }}>
        <NecklaceSlot type={params.accessories.necklace} />
      </g>
      
      {/* Layer 6: Headgear 头饰 */}
      <g style={{ zIndex: SVG_LAYER_SLOTS.Headgear.zIndex }}>
        <GlassesSlot type={params.accessories.glasses} />
        <HatSlot type={params.accessories.hat} />
      </g>
      
      {/* 特效层: Sparkle / Rainbow (顶层) */}
      {params.effects.sparkle && <SparkleEffect />}
      {params.effects.rainbow && <RainbowEffect />}
    </svg>
  );
};
```

### 7.2 配件插槽组件示例

```tsx
// frontend/src/components/frog/accessories/HatSlot.tsx

interface HatSlotProps {
  type: 'none' | 'cap' | 'crown' | 'flower' | 'bow' | 'antenna' | 'halo';
}

export const HatSlot: React.FC<HatSlotProps> = ({ type }) => {
  // 每个帽子组件只需定义自己相对于 viewBox 的坐标
  // 无需关心其他层级
  const HAT_COMPONENTS: Record<string, React.FC> = {
    none: () => null,
    cap: () => (
      <g transform="translate(60, 5)">
        <ellipse cx="40" cy="15" rx="45" ry="12" fill="#E53E3E" />
        <rect x="10" y="10" width="60" height="20" rx="5" fill="#E53E3E" />
        <rect x="5" y="25" width="70" height="8" fill="#C53030" />
      </g>
    ),
    crown: () => (
      <g transform="translate(65, 0)">
        <path 
          d="M0 35 L15 10 L35 25 L55 10 L70 35 Z" 
          fill="#FFD700" 
          stroke="#B8860B" 
          strokeWidth="1"
        />
        <circle cx="15" cy="15" r="4" fill="#FF6B6B" />
        <circle cx="35" cy="8" r="4" fill="#4ECDC4" />
        <circle cx="55" cy="15" r="4" fill="#9B59B6" />
      </g>
    ),
    halo: () => (
      <g transform="translate(50, -15)">
        <ellipse 
          cx="50" cy="25" rx="40" ry="10" 
          fill="none" 
          stroke="url(#haloGradient)" 
          strokeWidth="4"
          opacity="0.8"
        >
          <animate 
            attributeName="opacity" 
            values="0.6;1;0.6" 
            dur="2s" 
            repeatCount="indefinite" 
          />
        </ellipse>
        <defs>
          <linearGradient id="haloGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#FFF8DC" />
            <stop offset="100%" stopColor="#FFD700" />
          </linearGradient>
        </defs>
      </g>
    ),
    // ... 其他帽子
  };
  
  const HatComponent = HAT_COMPONENTS[type] || HAT_COMPONENTS.none;
  return <HatComponent />;
};
```

### 7.2 隐藏款动态滤镜

```tsx
// frontend/src/components/frog/effects/RainbowEffect.tsx

export const RainbowFilterDefs = () => (
  <defs>
    {/* 彩虹渐变动画 */}
    <linearGradient id="rainbowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#FF6B6B">
        <animate attributeName="stop-color" 
          values="#FF6B6B;#4ECDC4;#45B7D1;#96CEB4;#FFEAA7;#DDA0DD;#FF6B6B" 
          dur="3s" repeatCount="indefinite" />
      </stop>
      <stop offset="50%" stopColor="#4ECDC4">
        <animate attributeName="stop-color" 
          values="#4ECDC4;#45B7D1;#96CEB4;#FFEAA7;#DDA0DD;#FF6B6B;#4ECDC4" 
          dur="3s" repeatCount="indefinite" />
      </stop>
      <stop offset="100%" stopColor="#45B7D1">
        <animate attributeName="stop-color" 
          values="#45B7D1;#96CEB4;#FFEAA7;#DDA0DD;#FF6B6B;#4ECDC4;#45B7D1" 
          dur="3s" repeatCount="indefinite" />
      </stop>
    </linearGradient>
    
    {/* 发光边缘滤镜 */}
    <filter id="rainbowGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
      <feColorMatrix in="blur" type="hueRotate" values="0">
        <animate attributeName="values" from="0" to="360" dur="2s" repeatCount="indefinite" />
      </feColorMatrix>
      <feMerge>
        <feMergeNode />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
);

// 使用方式
{params.effects.rainbow && (
  <>
    <RainbowFilterDefs />
    <g filter="url(#rainbowGlow)">
      {/* 青蛙主体 */}
    </g>
    <circle 
      cx="100" cy="100" r="95" 
      fill="none" 
      stroke="url(#rainbowGradient)" 
      strokeWidth="3" 
      opacity="0.6"
    />
  </>
)}
```

### 7.4 DNA 读取进度条 (生成感暗示)

> [!TIP]
> 设计为"正在读取 DNA"的进度条，配合 Level 1 → Level 2 状态流转，让用户感觉青蛙是由其地址实时计算出来的

```tsx
// frontend/src/components/frog/FrogHatchingLoader.tsx

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface FrogHatchingLoaderProps {
  walletAddress: string;
  stage: 'init' | 'reading' | 'computing' | 'generating' | 'done';
  progress: number;  // 0-100
}

const STAGE_MESSAGES = {
  init: '准备读取你的链上 DNA...',
  reading: '正在扫描钱包特征...',
  computing: '计算稀有度...',
  generating: '生成独特外观...',
  done: '你的专属蛙蛙已诞生！',
};

export const FrogHatchingLoader: React.FC<FrogHatchingLoaderProps> = ({
  walletAddress,
  stage,
  progress,
}) => {
  const [displayAddress, setDisplayAddress] = useState('');
  
  // 模拟 DNA 读取效果 - 逐字符显示地址
  useEffect(() => {
    if (stage === 'reading') {
      let index = 0;
      const interval = setInterval(() => {
        setDisplayAddress(walletAddress.slice(0, index + 1));
        index++;
        if (index >= walletAddress.length) {
          clearInterval(interval);
        }
      }, 50);
      return () => clearInterval(interval);
    }
  }, [stage, walletAddress]);
  
  return (
    <div className="frog-hatching-container">
      {/* 蛋壳动画 */}
      <div className="egg-container">
        <motion.div 
          className="egg-shell"
          animate={{ 
            rotateZ: stage === 'computing' ? [-2, 2, -2] : 0,
          }}
          transition={{ duration: 0.3, repeat: stage === 'computing' ? Infinity : 0 }}
        >
          <svg viewBox="0 0 100 120" className="egg-svg">
            {/* 蛋壳 */}
            <ellipse cx="50" cy="70" rx="40" ry="50" fill="#FEF9C3" stroke="#FCD34D" strokeWidth="2" />
            
            {/* 裂纹 - 随进度增加 */}
            <motion.path
              d={`M 30 40 L 35 55 L 28 70 L 38 85`}
              stroke="#92400E"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: progress / 100,
                opacity: progress > 20 ? 1 : 0,
              }}
            />
            <motion.path
              d={`M 70 35 L 65 50 L 72 65 L 62 80`}
              stroke="#92400E"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: Math.max(0, (progress - 30) / 70),
                opacity: progress > 50 ? 1 : 0,
              }}
            />
            
            {/* 顶部裂口 */}
            {progress > 80 && (
              <motion.path
                d="M 35 25 L 50 15 L 65 25"
                stroke="#92400E"
                strokeWidth="3"
                fill="none"
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: 1, y: [-2, 2, -2] }}
                transition={{ y: { duration: 0.5, repeat: Infinity } }}
              />
            )}
          </svg>
        </motion.div>
      </div>
      
      {/* DNA 读取显示 */}
      <div className="dna-display">
        <div className="dna-label">🧬 DNA Seed</div>
        <div className="dna-address">
          <code>
            {displayAddress || '0x...'}
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              _
            </motion.span>
          </code>
        </div>
      </div>
      
      {/* 进度条 */}
      <div className="progress-container">
        <div className="progress-bar">
          <motion.div 
            className="progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="progress-text">{progress}%</div>
      </div>
      
      {/* 阶段提示文字 */}
      <AnimatePresence mode="wait">
        <motion.p 
          key={stage}
          className="stage-message"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {STAGE_MESSAGES[stage]}
        </motion.p>
      </AnimatePresence>
      
      {/* Level 指示器 */}
      <div className="level-indicator">
        <div className={`level ${progress >= 0 ? 'active' : ''}`}>
          <span className="level-icon">⚙️</span>
          <span className="level-text">Level 1: 规则计算</span>
        </div>
        <div className="level-connector" />
        <div className={`level ${progress >= 60 ? 'active' : ''}`}>
          <span className="level-icon">🤖</span>
          <span className="level-text">Level 2: AI 润色</span>
        </div>
      </div>
    </div>
  );
};

// 样式
const styles = `
.frog-hatching-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
}

.egg-container {
  width: 120px;
  height: 150px;
}

.dna-display {
  text-align: center;
}

.dna-label {
  font-size: 12px;
  color: #6B7280;
  margin-bottom: 4px;
}

.dna-address code {
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: #4ADE80;
  background: #1F2937;
  padding: 4px 8px;
  border-radius: 4px;
}

.progress-container {
  width: 200px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #374151;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4ADE80, #22D3EE);
  border-radius: 4px;
}

.stage-message {
  font-size: 14px;
  color: #9CA3AF;
}

.level-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.level {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #374151;
  border-radius: 4px;
  opacity: 0.5;
  transition: opacity 0.3s;
}

.level.active {
  opacity: 1;
  background: #065F46;
}

.level-connector {
  width: 20px;
  height: 2px;
  background: #4B5563;
}
`;
```

---

## 八、代码变更清单

### 8.1 后端新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/types/appearance.ts` | 类型定义 |
| `src/services/appearance.service.ts` | 核心服务 (含 Sanitizer) |
| `src/api/routes/appearance.routes.ts` | API 路由 |

### 8.2 后端修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `prisma/schema.prisma` | Frog 模型添加外观字段 |
| `src/index.ts` | 注册 appearance 路由 |
| `src/api/routes/frog.routes.ts` | 铸造成功后保存 appearance |

### 8.3 前端新增文件

| 文件路径 | 说明 |
|----------|------|
| `src/components/frog/FrogSvgGenerated.tsx` | 参数化 SVG 渲染组件 |
| `src/components/frog/FrogHatchingLoader.tsx` | 孵化加载动画 |
| `src/components/frog/effects/RainbowEffect.tsx` | 彩虹滤镜 |
| `src/components/frog/accessories/*.tsx` | 配件 SVG 组件 |
| `src/hooks/useFrogAppearance.ts` | 外观数据 Hook |
| `src/services/appearance.api.ts` | API 调用 |

### 8.4 前端修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `src/components/frog/FrogMint.tsx` | 集成预览、重新生成、签名 |
| `src/pages/FrogDetail.tsx` | 使用参数化组件 |
| `src/components/frog/FrogSvg.tsx` | 支持外部颜色参数 |

---

## 九、验证计划

### 9.1 自动化测试

```bash
# 1. 后端单元测试
npm run test -- --grep "appearance"

# 2. 稀有度分布测试（统计 10000 次生成）
npm run test:rarity-distribution

# 3. Sanitizer 测试
npm run test -- --grep "sanitizer"

# 4. 编译验证
npm run build
```

### 9.2 手动验证

| 测试用例 | 预期结果 |
|----------|----------|
| 首次生成外观 | 返回完整参数 + 剩余 3 次 (< 100ms) |
| 5 秒内重新生成 | 返回冷却时间错误 |
| 无签名请求 | 返回 401 授权错误 |
| 重新生成 3 次后 | 返回剩余 0 次，禁止再生成 |
| 铸造后查询外观 | 返回已保存的参数 |
| 获取 OpenSea 元数据 | 返回标准 JSON 格式 |
| 隐藏款触发 | rainbow 效果 + 彩虹滤镜 |
| 颜色非法值 | Sanitizer 自动回退默认值 |

---

## 十、变更记录

| 日期 | 内容 |
|------|------|
| 2026-01-14 | 创建技术设计文档 |
| 2026-01-14 | v1.1: 新增混合生成模式、Sanitizer、签名校验、冷却时间、彩虹滤镜 |

---
