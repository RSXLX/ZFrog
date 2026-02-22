/**
 * 个性化青蛙外观系统类型定义
 * 
 * 用于 LLM 驱动的个性化 SVG 生成功能
 */

// ============ 稀有度相关 ============

/** 稀有度等级 */
export type RarityTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'hidden';

/** 稀有度计算结果 */
export interface RarityResult {
  tier: RarityTier;
  score: number;    // 0-100
  isHidden: boolean;
}

// ============ 配件相关 ============

/** 帽子类型 */
export type HatType = 'none' | 'cap' | 'crown' | 'flower' | 'bow' | 'antenna' | 'halo';

/** 眼镜类型 */
export type GlassesType = 'none' | 'round' | 'sunglasses' | 'heart' | 'star' | 'monocle';

/** 项链类型 */
export type NecklaceType = 'none' | 'pearl' | 'chain' | 'scarf' | 'diamond';

/** 花纹类型 */
export type MarkingsType = 'none' | 'spots' | 'stripes' | 'heart' | 'star' | 'galaxy';

/** 表情基调 */
export type BaseExpression = 'happy' | 'curious' | 'sleepy' | 'cool' | 'shy';

/** 配件定义 */
export interface FrogAccessories {
  hat?: HatType;
  glasses?: GlassesType;
  necklace?: NecklaceType;
  markings?: MarkingsType;
}

// ============ 颜色相关 ============

/** 颜色系统 */
export interface FrogColors {
  primaryColor: string;    // #RRGGBB
  secondaryColor: string;
  accentColor: string;
  cheekColor: string;
  eyeColor: string;
}

/** 特效系统 */
export interface FrogEffects {
  sparkle: boolean;
  blush: boolean;
  glow: boolean;
  rainbow: boolean;  // 隐藏款专属
}

// ============ 完整外观参数 ============

/** 完整外观参数 */
export interface FrogAppearanceParams {
  // 稀有度
  rarity: {
    score: number;
    tier: RarityTier;
  };
  
  // 颜色系统
  colors: FrogColors;
  
  // 配件
  accessories: FrogAccessories;
  
  // 表情基调
  baseExpression: BaseExpression;
  
  // 特效
  effects: FrogEffects;
  
  // 描述 (LLM 生成)
  description: string;
  
  // 隐藏款标记
  isHidden: boolean;
}

// ============ API 相关 ============

/** 生成外观请求 */
export interface GenerateAppearanceRequest {
  walletAddress: string;
  signature: string;
  message: string;
  regenerateToken?: string;
}

/** 生成外观响应 */
export interface GenerateAppearanceResponse {
  success: boolean;
  params: FrogAppearanceParams;
  regenerateRemaining: number;
  regenerateToken: string;
  isHidden: boolean;
  cooldownUntil?: number;
  descriptionPending: boolean;
}

/** 获取外观响应 */
export interface GetAppearanceResponse {
  success: boolean;
  params: FrogAppearanceParams | null;
}

// ============ OpenSea 元数据 ============

/** OpenSea Attribute */
export interface OpenSeaAttribute {
  trait_type: string;
  value: string | number;
  display_type?: 'number' | 'boost_percentage' | 'boost_number' | 'date';
}

/** OpenSea 元数据格式 */
export interface OpenSeaMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
  attributes: OpenSeaAttribute[];
}

// ============ 配件约束 ============

/** 配件约束定义 */
export interface AccessoryConstraints {
  allowedHats: HatType[];
  allowedGlasses: GlassesType[];
  allowedNecklaces: NecklaceType[];
  allowedMarkings: MarkingsType[];
  allowedEffects: ('sparkle' | 'blush' | 'glow' | 'rainbow')[];
}

// ============ 色板定义 ============

/** 色板 */
export interface ColorPalette {
  primary: string[];
  secondary: string[];
  accent: string[];
  cheek: string[];
  eye: string[];
}
