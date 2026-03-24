import { apiClient } from '../../lib/api/client';

interface Envelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

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

class AppearanceFeatureApi {
  async generateAppearance(
    walletAddress: string,
    signature?: string,
    message?: string
  ): Promise<GenerateAppearanceResponse> {
    const response = await apiClient.post<Envelope<GenerateAppearanceResponse>>(
      '/frogs/appearance/generate',
      { walletAddress, signature, message }
    );
    return response.data as GenerateAppearanceResponse;
  }

  async getAppearance(tokenId: number): Promise<GetAppearanceResponse> {
    const response = await apiClient.get<Envelope<GetAppearanceResponse>>(
      `/frogs/appearance/${tokenId}/appearance`
    );
    return response.data as GetAppearanceResponse;
  }

  async getPendingAppearance(address: string): Promise<PendingAppearanceResponse> {
    const response = await apiClient.get<Envelope<PendingAppearanceResponse>>(
      `/frogs/appearance/pending/${address}`
    );
    return response.data as PendingAppearanceResponse;
  }

  async confirmAppearance(walletAddress: string, tokenId: number): Promise<{ success: boolean }> {
    const response = await apiClient.post<Envelope<{ success: boolean }>>('/frogs/appearance/confirm', {
      walletAddress,
      tokenId,
    });
    return response.data as { success: boolean };
  }

  async getMetadata(tokenId: number): Promise<any> {
    const response = await apiClient.get<Envelope<any>>(`/frogs/appearance/${tokenId}/metadata`);
    return response.data;
  }
}

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

export const appearanceFeatureApi = new AppearanceFeatureApi();
