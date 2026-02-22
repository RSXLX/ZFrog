---
status: 已审核
version: 1.1
last_updated: 2026-01-14
reviewer: 用户
---

# 个性化青蛙 SVG 生成需求设计

> 本文档定义 LLM 驱动的个性化青蛙 SVG 生成功能需求。

---

## 一、模块概述

实现每个用户拥有独特的青蛙 NFT 外观。通过 LLM 控制 SVG 参数生成，确保每只青蛙在保持基础形态一致的同时，拥有独特的个性化样式。

### 1.1 核心价值

| 维度 | 价值 |
|------|------|
| 用户体验 | 每只青蛙独一无二，增强用户情感连接 |
| 收藏价值 | 个性化外观 + 稀有度系统提升 NFT 收藏价值 |
| 差异化 | 区别于千篇一律的 NFT 项目 |
| 二级市场 | OpenSea 标准元数据格式，便于交易展示 |

---

## 二、内部讨论记录

### 讨论主题：个性化 SVG 生成方案选型

**产品经理**：
- 用户需要每只青蛙看起来不同，但又要保持 "ZetaFrog" 的品牌识别度
- 个性化元素应该在铸造时确定，不可更改，体现 NFT 的唯一性
- 需要考虑生成效率，不能让用户等待太久

**架构师**：
- 方案 A: LLM 生成完整 SVG 代码 → 风险高，生成不稳定，可能产生无效 SVG
- 方案 B: LLM 生成参数，前端渲染 SVG → 可控性好，稳定性高
- 方案 C: 预定义特征组合，LLM 选择组合 → 最稳定，但创意有限
- 推荐方案 B，在可控性和个性化间取得平衡

**测试工程师**：
- 需要验证生成的参数在边界值时 SVG 是否正常渲染
- 颜色值需要约束在合法范围
- 需要考虑多次生成的幂等性（同一用户重新请求应返回相同结果）

**用户代言人**：
- 用户希望能在铸造前预览自己的青蛙样式
- 应该有 "重新生成" 的机会（在铸造前）
- 青蛙外观应该有可描述的特征（如 "戴着红色帽子的开心蛙"）

### 最终决策

1. 采用 **方案 B: LLM 生成参数，前端渲染 SVG**
2. 定义**结构化参数 Schema**，LLM 只能在约束范围内生成
3. 参数在铸造确认后**写入数据库**，确保持久化，**不可更改**
4. 前端 **React 组件直接渲染 SVG**，支持 CSS 动画
5. 引入**稀有度系统**，部分配件为稀有品
6. 参数支持**OpenSea 元数据格式**映射

---

## 三、用户场景

### 3.1 铸造新青蛙

**场景描述**：
1. 用户点击"铸造青蛙"
2. 系统调用 LLM 生成个性化参数（含稀有度计算）
3. 前端 React 组件实时渲染预览
4. 用户可选择"换一只"重新生成（**最多 3 次**）
5. 用户确认后发起链上铸造
6. 铸造成功后保存参数到数据库，**参数永久固化**

**边界条件**：
- LLM 服务不可用时，使用随机参数生成（降级方案）
- 重新生成次数限制 **3 次**（防止滥用）
- 铸造确认后参数**不可更改**
- **1% 概率触发隐藏款**（盲盒机制）

### 3.2 查看青蛙详情

**场景描述**：
1. 用户访问青蛙详情页
2. 从后端获取青蛙个性化参数
3. 前端 React 组件渲染个性化 SVG（支持动画）
4. 展示稀有度标签和属性列表

### 3.3 在社区花园/世界列表展示

**场景描述**：
1. 加载用户列表时批量获取青蛙参数
2. 前端渲染多只不同样式的青蛙
3. 每只青蛙外观各异，稀有青蛙带特殊边框

### 3.4 NFT 二级市场展示

**场景描述**：
1. 青蛙参数转换为 OpenSea 标准元数据格式
2. 外部平台可正确解析并展示属性
3. 稀有度在市场显示为 Trait

---

## 四、功能需求

### 4.1 个性化参数定义

```typescript
interface FrogAppearanceParams {
  // 稀有度系统
  rarity: {
    score: number;           // 稀有度分数 (0-100)
    tier: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'hidden';
  };
  
  // 颜色系统
  colors: {
    primaryColor: string;      // 主色调 (身体上半部分)
    secondaryColor: string;    // 辅色调 (身体下半部分)
    accentColor: string;       // 强调色 (渐变过渡)
    cheekColor: string;        // 腮红颜色
    eyeColor: string;          // 眼睛颜色
  };
  
  // 配件系统 (部分为稀有配件)
  accessories: {
    hat?: 'none' | 'cap' | 'crown' | 'flower' | 'bow' | 'antenna' | 'halo';
    glasses?: 'none' | 'round' | 'sunglasses' | 'heart' | 'star' | 'monocle';
    necklace?: 'none' | 'pearl' | 'chain' | 'scarf' | 'diamond';
    markings?: 'none' | 'spots' | 'stripes' | 'heart' | 'star' | 'galaxy';
  };
  
  // 表情基调
  baseExpression: 'happy' | 'curious' | 'sleepy' | 'cool' | 'shy';
  
  // 特殊效果
  effects?: {
    sparkle?: boolean;  // 闪亮效果
    blush?: boolean;    // 额外腮红
    glow?: boolean;     // 发光边框
    rainbow?: boolean;  // 彩虹光环 (隐藏款专属)
  };
  
  // 描述文本 (LLM 生成)
  description: string;  // 如 "一只戴着小皇冠的优雅青蛙"
  
  // 是否为隐藏款
  isHidden: boolean;
}
```

### 4.2 稀有度系统

| 稀有度 | 概率 | 特征 |
|--------|------|------|
| Common | 50% | 基础配件，普通颜色 |
| Uncommon | 30% | 1个特殊配件 |
| Rare | 15% | 2个特殊配件 + 特效 |
| Epic | 4% | 稀有配件(crown/diamond) + 多特效 |
| Legendary | 0.9% | 全稀有配件 + 全特效 |
| Hidden | 0.1% | 隐藏款，预设外颜色 + rainbow 效果 |

**稀有配件列表**：
- 帽子：`crown`（皇冠）、`halo`（光环）
- 眼镜：`monocle`（单片眼镜）
- 项链：`diamond`（钻石项链）
- 花纹：`galaxy`（星系）

### 4.3 OpenSea 元数据映射

```typescript
interface OpenSeaMetadata {
  name: string;              // "ZetaFrog #123"
  description: string;       // LLM 生成的描述
  image: string;             // SVG 渲染图或 IPFS 链接
  attributes: {
    trait_type: string;
    value: string;
    display_type?: string;
  }[];
}

// 映射示例
const mapToOpenSea = (params: FrogAppearanceParams): OpenSeaMetadata => ({
  name: `ZetaFrog #${tokenId}`,
  description: params.description,
  image: `https://api.zetafrog.xyz/frogs/${tokenId}/image`,
  attributes: [
    { trait_type: 'Rarity', value: params.rarity.tier },
    { trait_type: 'Rarity Score', value: params.rarity.score, display_type: 'number' },
    { trait_type: 'Hat', value: params.accessories.hat || 'none' },
    { trait_type: 'Glasses', value: params.accessories.glasses || 'none' },
    { trait_type: 'Necklace', value: params.accessories.necklace || 'none' },
    { trait_type: 'Markings', value: params.accessories.markings || 'none' },
    { trait_type: 'Expression', value: params.baseExpression },
    { trait_type: 'Primary Color', value: params.colors.primaryColor },
    { trait_type: 'Hidden Edition', value: params.isHidden ? 'Yes' : 'No' },
  ]
});
```

### 4.4 后端功能

| 功能 | 描述 | 接口 |
|------|------|------|
| 生成外观参数 | 调用 LLM 生成参数 | POST /api/frogs/generate-appearance |
| 保存外观参数 | 铸造确认后保存 | 内部调用 |
| 获取外观参数 | 展示时获取 | GET /api/frogs/:tokenId/appearance |
| 获取 OpenSea 元数据 | 二级市场读取 | GET /api/frogs/:tokenId/metadata |

### 4.5 前端功能

| 功能 | 描述 |
|------|------|
| 动态 SVG 渲染 | React 组件根据参数渲染个性化青蛙，支持 CSS 动画 |
| 预览界面 | 铸造前展示生成效果 |
| 重新生成按钮 | 用户可换一个样式（最多 3 次） |
| 加载状态 | 生成过程中的 loading 动画 |
| 稀有度标签 | 展示稀有度等级和特殊边框 |

---

## 五、数据结构

### 5.1 数据库扩展

```prisma
// 在 Frog 模型中添加
model Frog {
  // ... 现有字段
  
  // 个性化外观参数 (JSON，铸造后不可更改)
  appearanceParams  Json?
  
  // 外观描述文本
  appearanceDesc    String?
  
  // 稀有度等级
  rarityTier        String?   // common/uncommon/rare/epic/legendary/hidden
  
  // 稀有度分数
  rarityScore       Int?      // 0-100
  
  // 是否为隐藏款
  isHiddenEdition   Boolean   @default(false)
}
```

### 5.2 接口响应

```typescript
// 生成外观参数响应
interface GenerateAppearanceResponse {
  success: boolean;
  params: FrogAppearanceParams;
  regenerateRemaining: number;  // 剩余重新生成次数 (初始 3)
  isHidden: boolean;            // 是否触发隐藏款
}

// 获取青蛙时包含外观参数
interface FrogResponse {
  // ... 现有字段
  appearance?: FrogAppearanceParams;
  metadata?: OpenSeaMetadata;   // 可选返回 OpenSea 格式
}
```

---

## 六、LLM Prompt 设计

### 6.1 系统提示词

```
You are a creative frog appearance designer for ZetaFrog NFT project.
Your task is to generate unique, cute frog appearance parameters.

Rules:
1. Colors must be valid hex codes (#RRGGBB)
2. Use harmonious color combinations
3. Accessories should match the overall style
4. Each frog should have a distinct personality
5. Description should be in Chinese, under 30 characters
6. Rarity tier affects accessory selection:
   - Common: basic accessories only (cap, round glasses, pearl, spots/stripes)
   - Rare+: can include special accessories
   - Legendary: must include rare accessories (crown, diamond, galaxy)
7. If isHidden=true, use unusual colors and add rainbow effect

Output format: JSON only, no explanation.
```

### 6.2 用户提示词

```
Generate a unique frog appearance. 
Seed: {userAddress}-{timestamp}
Rarity Roll: {rarityTier}
Is Hidden: {isHidden}

Required JSON schema:
{schema}
```

### 6.3 稀有度算法

```typescript
function rollRarity(seed: string): { tier: RarityTier; isHidden: boolean } {
  const hash = sha256(seed);
  const roll = parseInt(hash.slice(0, 8), 16) % 10000;
  
  if (roll < 10) return { tier: 'hidden', isHidden: true };     // 0.1%
  if (roll < 100) return { tier: 'legendary', isHidden: false }; // 0.9%
  if (roll < 500) return { tier: 'epic', isHidden: false };      // 4%
  if (roll < 2000) return { tier: 'rare', isHidden: false };     // 15%
  if (roll < 5000) return { tier: 'uncommon', isHidden: false }; // 30%
  return { tier: 'common', isHidden: false };                    // 50%
}
```

---

## 七、假设清单

| 假设 | 说明 | 状态 |
|------|------|------|
| LLM 可用性 | 使用已有的 Qwen API | ✅ 已确认 |
| 生成次数限制 | 铸造前最多重新生成 3 次 | ✅ 已确认 |
| 参数不可变 | 铸造后外观参数永久不可更改 | ✅ 已确认 |
| 预览技术 | React 组件直接渲染 SVG，支持 CSS 动画 | ✅ 已确认 |
| 元数据格式 | 支持 OpenSea 标准格式 | ✅ 已确认 |
| 盲盒机制 | 1% 几率生成隐藏款 | ✅ 已确认 |

---

## 八、非功能需求

| 需求 | 目标 |
|------|------|
| 响应时间 | 生成参数 < 3 秒 |
| 降级能力 | LLM 不可用时使用随机算法 |
| 缓存策略 | 已生成参数缓存，无需重复调用 LLM |
| 动画性能 | SVG 动画 60fps，低端设备可降级 |

---

## 九、变更记录

| 日期 | 内容 |
|------|------|
| 2026-01-14 | 创建需求设计文档 |
| 2026-01-14 | v1.1: 新增稀有度系统、OpenSea 元数据映射、盲盒机制；调整重新生成次数为 3 次 |

---
