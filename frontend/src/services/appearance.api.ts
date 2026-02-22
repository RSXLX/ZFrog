/**
 * 个性化外观 API 服务
 */

import { api } from './api';

// ============ 类型定义 ============

export type RarityTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'hidden';

export interface FrogAccessories {
  hat?: string;
  glasses?: string;
  necklace?: string;
  markings?: string;
}

export interface FrogColors {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  cheekColor: string;
  eyeColor: string;
}

export interface FrogEffects {
  sparkle: boolean;
  blush: boolean;
  glow: boolean;
  rainbow: boolean;
}

export interface FrogAppearanceParams {
  rarity: {
    score: number;
    tier: RarityTier;
  };
  colors: FrogColors;
  accessories: FrogAccessories;
  baseExpression: 'happy' | 'curious' | 'sleepy' | 'cool' | 'shy';
  effects: FrogEffects;
  description: string;
  isHidden: boolean;
}

export interface GenerateAppearanceResponse {
  success: boolean;
  params: FrogAppearanceParams;
  regenerateRemaining: number;
  regenerateToken: string;
  isHidden: boolean;
  cooldownUntil?: number;
  descriptionPending: boolean;
}

export interface GetAppearanceResponse {
  success: boolean;
  params: FrogAppearanceParams | null;
}

export interface PendingAppearanceResponse {
  success: boolean;
  params: FrogAppearanceParams | null;
  ready: boolean;
}

// ============ API 函数 ============

/**
 * 生成外观参数
 */
export async function generateAppearance(
  walletAddress: string,
  signature?: string,
  message?: string
): Promise<GenerateAppearanceResponse> {
  const response = await api.post('/frogs/appearance/generate', {
    walletAddress,
    signature,
    message,
  });
  return response.data;
}

/**
 * 获取已保存的外观参数
 */
export async function getAppearance(tokenId: number): Promise<GetAppearanceResponse> {
  const response = await api.get(`/frogs/appearance/${tokenId}/appearance`);
  return response.data;
}

/**
 * 获取待确认的外观参数
 */
export async function getPendingAppearance(address: string): Promise<PendingAppearanceResponse> {
  const response = await api.get(`/frogs/appearance/pending/${address}`);
  return response.data;
}

/**
 * 确认外观（铸造成功后调用）
 */
export async function confirmAppearance(
  walletAddress: string,
  tokenId: number
): Promise<{ success: boolean }> {
  const response = await api.post('/frogs/appearance/confirm', {
    walletAddress,
    tokenId,
  });
  return response.data;
}

/**
 * 获取 OpenSea 元数据
 */
export async function getMetadata(tokenId: number): Promise<any> {
  const response = await api.get(`/frogs/appearance/${tokenId}/metadata`);
  return response.data;
}

// ============ 辅助函数 ============

/**
 * 获取稀有度显示文本
 */
export function getRarityDisplayText(tier: RarityTier): string {
  const map: Record<RarityTier, string> = {
    common: '普通',
    uncommon: '稀有',
    rare: '珍稀',
    epic: '史诗',
    legendary: '传说',
    hidden: '隐藏',
  };
  return map[tier] || tier;
}

/**
 * 获取稀有度对应的颜色
 */
export function getRarityColor(tier: RarityTier): string {
  const map: Record<RarityTier, string> = {
    common: '#9CA3AF',
    uncommon: '#22C55E',
    rare: '#3B82F6',
    epic: '#8B5CF6',
    legendary: '#F59E0B',
    hidden: 'linear-gradient(90deg, #FF6B6B, #4ECDC4, #45B7D1)',
  };
  return map[tier] || '#9CA3AF';
}
