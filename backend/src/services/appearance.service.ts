/**
 * 个性化青蛙外观生成服务
 * 
 * 实现混合生成模式：
 * - Level 1 (规则引擎): 同步生成颜色、配件、特效 (< 50ms)
 * - Level 2 (LLM 异步): 生成个性化描述
 */

import crypto from 'crypto';
import { ethers } from 'ethers';
import {
  RarityTier,
  RarityResult,
  FrogAppearanceParams,
  FrogAccessories,
  FrogColors,
  FrogEffects,
  AccessoryConstraints,
  ColorPalette,
  OpenSeaMetadata,
  OpenSeaAttribute,
  HatType,
  GlassesType,
  NecklaceType,
  MarkingsType,
  BaseExpression,
} from '../types/appearance';
import { aiService } from './ai.service';
import { logger } from '../utils/logger';

// ============ 常量定义 ============

/** 默认颜色 (降级使用) */
const DEFAULT_COLORS: FrogColors = {
  primaryColor: '#4ADE80',
  secondaryColor: '#FCD34D',
  accentColor: '#FDBA74',
  cheekColor: '#FDA4AF',
  eyeColor: '#FEF9C3',
};

/** 冷却时间 (毫秒) */
const COOLDOWN_MS = 5000;

/** 最大重新生成次数 */
const MAX_REGENERATE_COUNT = 3;

// ============ 色板定义 ============

export const COLOR_PALETTES: Record<string, ColorPalette> = {
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

// ============ 配件约束规则 ============

export const ACCESSORY_CONSTRAINTS: Record<RarityTier, AccessoryConstraints> = {
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
    allowedHats: ['crown', 'halo'],
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
    allowedEffects: ['blush', 'sparkle', 'glow', 'rainbow'],
  },
};

// ============ 冷却时间管理 ============

const cooldownMap = new Map<string, number>();
const regenerateCountMap = new Map<string, number>();
const regenerateTokenMap = new Map<string, string>();
const pendingParamsMap = new Map<string, FrogAppearanceParams>();

// ============ 工具函数 ============

/** 验证 hex 颜色格式 */
const isValidHex = (hex: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(hex);

/** 从数组中基于 hash 确定性选择 */
function pickFromArray<T>(arr: T[], hash: string, offset: number): T {
  const index = parseInt(hash.slice(offset, offset + 2), 16) % arr.length;
  return arr[index];
}

// ============ 核心算法 ============

/**
 * B3: 稀有度算法
 * 基于 seed 确定性计算稀有度
 */
export function rollRarity(seed: string): RarityResult {
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  const roll = parseInt(hash.slice(0, 8), 16) % 10000;
  
  // 稀有度分布:
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
    score = 95 + Math.floor((roll - 10) / 18);
  } else if (roll < 500) {
    tier = 'epic';
    score = 80 + Math.floor((roll - 100) / 26.67);
  } else if (roll < 2000) {
    tier = 'rare';
    score = 50 + Math.floor((roll - 500) / 50);
  } else if (roll < 5000) {
    tier = 'uncommon';
    score = 20 + Math.floor((roll - 2000) / 100);
  } else {
    tier = 'common';
    score = Math.floor((roll - 5000) / 250);
  }
  
  return { tier, score, isHidden };
}

/**
 * B4: Level 1 规则引擎 (同步生成)
 * 基于 seed 确定性生成颜色、配件、特效
 */
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
  
  // 生成颜色
  const colors: FrogColors = {
    primaryColor: pickFromArray(palette.primary, hash, 2),
    secondaryColor: pickFromArray(palette.secondary, hash, 4),
    accentColor: pickFromArray(palette.accent, hash, 6),
    cheekColor: pickFromArray(palette.cheek, hash, 8),
    eyeColor: pickFromArray(palette.eye, hash, 10),
  };
  
  // 生成配件
  const accessories: FrogAccessories = {
    hat: pickFromArray(constraints.allowedHats, hash, 12) as HatType,
    glasses: pickFromArray(constraints.allowedGlasses, hash, 14) as GlassesType,
    necklace: pickFromArray(constraints.allowedNecklaces, hash, 16) as NecklaceType,
    markings: pickFromArray(constraints.allowedMarkings, hash, 18) as MarkingsType,
  };
  
  // 生成表情
  const expressions: BaseExpression[] = ['happy', 'curious', 'sleepy', 'cool', 'shy'];
  const baseExpression = pickFromArray(expressions, hash, 20) as BaseExpression;
  
  // 生成特效
  const effects: FrogEffects = {
    sparkle: constraints.allowedEffects.includes('sparkle') && parseInt(hash.slice(22, 24), 16) % 2 === 0,
    blush: constraints.allowedEffects.includes('blush') && parseInt(hash.slice(24, 26), 16) % 2 === 0,
    glow: constraints.allowedEffects.includes('glow') && parseInt(hash.slice(26, 28), 16) % 2 === 0,
    rainbow: rarity.isHidden,
  };
  
  return {
    rarity: {
      tier: rarity.tier,
      score: rarity.score,
    },
    colors,
    accessories,
    baseExpression,
    effects,
    isHidden: rarity.isHidden,
    description: '', // Level 2 异步填充
  };
}

/**
 * B5: Sanitizer - 参数校验和降级
 */
export function sanitizeAppearanceParams(
  params: Partial<FrogAppearanceParams>,
  rarity: RarityResult
): FrogAppearanceParams {
  const constraints = ACCESSORY_CONSTRAINTS[rarity.tier];
  
  // 颜色校验 - 非法则回退到默认值
  const colors: FrogColors = {
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
    hat: constraints.allowedHats.includes(params.accessories?.hat || 'none' as HatType) 
      ? params.accessories?.hat 
      : constraints.allowedHats[0] as HatType,
    glasses: constraints.allowedGlasses.includes(params.accessories?.glasses || 'none' as GlassesType) 
      ? params.accessories?.glasses 
      : constraints.allowedGlasses[0] as GlassesType,
    necklace: constraints.allowedNecklaces.includes(params.accessories?.necklace || 'none' as NecklaceType) 
      ? params.accessories?.necklace 
      : constraints.allowedNecklaces[0] as NecklaceType,
    markings: constraints.allowedMarkings.includes(params.accessories?.markings || 'none' as MarkingsType) 
      ? params.accessories?.markings 
      : constraints.allowedMarkings[0] as MarkingsType,
  };
  
  // 特效校验
  const effects: FrogEffects = {
    sparkle: constraints.allowedEffects.includes('sparkle') && !!params.effects?.sparkle,
    blush: constraints.allowedEffects.includes('blush') && !!params.effects?.blush,
    glow: constraints.allowedEffects.includes('glow') && !!params.effects?.glow,
    rainbow: rarity.isHidden && !!params.effects?.rainbow,
  };
  
  // 表情校验
  const validExpressions: BaseExpression[] = ['happy', 'curious', 'sleepy', 'cool', 'shy'];
  const baseExpression = validExpressions.includes(params.baseExpression as BaseExpression)
    ? params.baseExpression as BaseExpression
    : 'happy';
  
  return {
    rarity: {
      tier: rarity.tier,
      score: rarity.score,
    },
    colors,
    accessories,
    baseExpression,
    effects,
    description: params.description || '',
    isHidden: rarity.isHidden,
  };
}

// ============ 安全校验 ============

/**
 * B8: 签名校验
 */
export function verifySignature(
  walletAddress: string,
  message: string,
  signature: string
): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
  } catch (error) {
    logger.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * B9: 冷却时间检查
 */
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

/**
 * 检查重新生成次数
 */
export function checkRegenerateLimit(walletAddress: string): { 
  allowed: boolean; 
  remaining: number;
  token: string;
} {
  const key = walletAddress.toLowerCase();
  const count = regenerateCountMap.get(key) || 0;
  
  if (count >= MAX_REGENERATE_COUNT) {
    return {
      allowed: false,
      remaining: 0,
      token: regenerateTokenMap.get(key) || '',
    };
  }
  
  // 生成新的 token
  const token = crypto.randomBytes(16).toString('hex');
  regenerateTokenMap.set(key, token);
  regenerateCountMap.set(key, count + 1);
  
  return {
    allowed: true,
    remaining: MAX_REGENERATE_COUNT - count - 1,
    token,
  };
}

/**
 * 重置用户的生成状态 (铸造成功后调用)
 */
export function resetGenerateState(walletAddress: string): void {
  const key = walletAddress.toLowerCase();
  cooldownMap.delete(key);
  regenerateCountMap.delete(key);
  regenerateTokenMap.delete(key);
  pendingParamsMap.delete(key);
}

// ============ OpenSea 元数据 ============

/**
 * B11: 转换为 OpenSea 元数据格式
 */
export function mapToOpenSeaMetadata(
  tokenId: number,
  params: FrogAppearanceParams,
  name: string
): OpenSeaMetadata {
  const attributes: OpenSeaAttribute[] = [
    { trait_type: 'Rarity', value: params.rarity.tier.charAt(0).toUpperCase() + params.rarity.tier.slice(1) },
    { trait_type: 'Rarity Score', value: params.rarity.score, display_type: 'number' },
    { trait_type: 'Hat', value: params.accessories.hat || 'None' },
    { trait_type: 'Glasses', value: params.accessories.glasses || 'None' },
    { trait_type: 'Necklace', value: params.accessories.necklace || 'None' },
    { trait_type: 'Markings', value: params.accessories.markings || 'None' },
    { trait_type: 'Expression', value: params.baseExpression },
    { trait_type: 'Primary Color', value: params.colors.primaryColor },
    { trait_type: 'Hidden Edition', value: params.isHidden ? 'Yes' : 'No' },
  ];
  
  // 添加特效属性
  if (params.effects.sparkle) attributes.push({ trait_type: 'Sparkle Effect', value: 'Yes' });
  if (params.effects.glow) attributes.push({ trait_type: 'Glow Effect', value: 'Yes' });
  if (params.effects.rainbow) attributes.push({ trait_type: 'Rainbow Effect', value: 'Yes' });
  
  return {
    name: `ZetaFrog #${tokenId}`,
    description: params.description || `${name} - 一只独特的 ZetaFrog NFT`,
    image: `https://api.zetafrog.xyz/frogs/${tokenId}/image.svg`,
    external_url: `https://zetafrog.xyz/frog/${tokenId}`,
    attributes,
  };
}

// ============ 主服务类 ============

class AppearanceService {
  /**
   * 生成外观参数 (混合模式)
   */
  async generateAppearance(
    walletAddress: string,
    signature?: string,
    message?: string
  ): Promise<{
    params: FrogAppearanceParams;
    regenerateRemaining: number;
    regenerateToken: string;
    cooldownUntil?: number;
    descriptionPending: boolean;
  }> {
    const key = walletAddress.toLowerCase();
    
    // 检查冷却时间
    const cooldownCheck = checkCooldown(walletAddress);
    if (!cooldownCheck.allowed) {
      throw new Error(`COOLDOWN:${cooldownCheck.cooldownUntil}`);
    }
    
    // 检查重新生成次数
    const regenerateCheck = checkRegenerateLimit(walletAddress);
    if (!regenerateCheck.allowed) {
      throw new Error('REGENERATE_LIMIT_EXCEEDED');
    }
    
    // 生成 seed
    const regenerateCount = regenerateCountMap.get(key) || 0;
    const seed = crypto.createHash('sha256')
      .update(`${walletAddress}-${regenerateCount}`)
      .digest('hex');
    
    // Level 1: 规则引擎同步生成
    const rarity = rollRarity(seed);
    const level1Params = generateLevel1(seed, rarity);
    const params = sanitizeAppearanceParams(level1Params, rarity);
    
    // 缓存参数 (用于铸造确认)
    pendingParamsMap.set(key, params);
    
    // Level 2: 异步生成描述 (不阻塞返回)
    this.generateDescriptionAsync(key, params, rarity).catch(err => {
      logger.error('Async description generation failed:', err);
    });
    
    return {
      params,
      regenerateRemaining: regenerateCheck.remaining,
      regenerateToken: regenerateCheck.token,
      descriptionPending: true,
    };
  }
  
  /**
   * Level 2: 异步生成描述
   */
  private async generateDescriptionAsync(
    key: string,
    params: FrogAppearanceParams,
    rarity: RarityResult
  ): Promise<void> {
    try {
      const prompt = this.buildDescriptionPrompt(params, rarity);
      const description = await aiService.generateChatResponse(
        '你是一个可爱的青蛙外观描述生成器。根据给定的青蛙特征，用一句话（不超过30个中文字符）描述这只青蛙的外观和个性。',
        prompt,
        { temperature: 0.8, maxTokens: 100 }
      );
      
      // 更新缓存的参数
      const cachedParams = pendingParamsMap.get(key);
      if (cachedParams) {
        cachedParams.description = description.trim();
        pendingParamsMap.set(key, cachedParams);
      }
    } catch (error) {
      logger.error('Description generation failed:', error);
      // 使用降级描述
      const cachedParams = pendingParamsMap.get(key);
      if (cachedParams) {
        cachedParams.description = this.generateFallbackDescription(params);
        pendingParamsMap.set(key, cachedParams);
      }
    }
  }
  
  /**
   * 构建描述生成 Prompt
   */
  private buildDescriptionPrompt(params: FrogAppearanceParams, rarity: RarityResult): string {
    const parts = [];
    
    // 颜色
    parts.push(`主色调: ${params.colors.primaryColor}`);
    
    // 配件
    if (params.accessories.hat !== 'none') parts.push(`戴着 ${params.accessories.hat}`);
    if (params.accessories.glasses !== 'none') parts.push(`配有 ${params.accessories.glasses} 眼镜`);
    if (params.accessories.necklace !== 'none') parts.push(`佩戴 ${params.accessories.necklace} 项链`);
    if (params.accessories.markings !== 'none') parts.push(`有 ${params.accessories.markings} 花纹`);
    
    // 表情
    parts.push(`表情: ${params.baseExpression}`);
    
    // 稀有度
    parts.push(`稀有度: ${rarity.tier}`);
    
    // 特效
    const effects = [];
    if (params.effects.sparkle) effects.push('闪亮');
    if (params.effects.glow) effects.push('发光');
    if (params.effects.rainbow) effects.push('彩虹光环');
    if (effects.length > 0) parts.push(`特效: ${effects.join('、')}`);
    
    return `请为这只青蛙生成一句简短的中文描述：\n${parts.join('\n')}`;
  }
  
  /**
   * 降级描述生成
   */
  private generateFallbackDescription(params: FrogAppearanceParams): string {
    const templates = [
      `一只${params.baseExpression === 'happy' ? '开心的' : params.baseExpression === 'cool' ? '酷酷的' : '可爱的'}小蛙`,
      `${params.accessories.hat !== 'none' ? '戴着小帽子的' : ''}萌萌蛙宝宝`,
      `${params.isHidden ? '神秘的隐藏款' : '独特的'}ZetaFrog`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }
  
  /**
   * 获取缓存的参数
   */
  getPendingParams(walletAddress: string): FrogAppearanceParams | null {
    return pendingParamsMap.get(walletAddress.toLowerCase()) || null;
  }
}

export const appearanceService = new AppearanceService();
