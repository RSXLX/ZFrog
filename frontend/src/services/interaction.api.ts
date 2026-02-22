/**
 * 青蛙喂食/互动 API 服务
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// 食物配置 (与后端保持一致)
export interface FoodConfig {
  name: string;
  energy: number;
  happiness: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export const FOOD_CONFIG: Record<string, FoodConfig> = {
  fly: { name: '苍蝇', energy: 10, happiness: 5, rarity: 'common' },
  worm: { name: '虫子', energy: 15, happiness: 8, rarity: 'common' },
  cricket: { name: '蟋蟀', energy: 25, happiness: 15, rarity: 'uncommon' },
  butterfly: { name: '蝴蝶', energy: 20, happiness: 20, rarity: 'uncommon' },
  dragonfly: { name: '蜻蜓', energy: 35, happiness: 25, rarity: 'rare' },
  golden_fly: { name: '金苍蝇', energy: 50, happiness: 40, rarity: 'legendary' },
};

export interface FrogStatus {
  tokenId: number;
  name: string;
  hunger: number;
  happiness: number;
  lastFedAt: string | null;
  lastInteractedAt: string | null;
}

export interface FoodInventory {
  [foodType: string]: number;
}

export interface FeedResult {
  hunger: number;
  happiness: number;
  lastFedAt: string;
  foodUsed: {
    type: string;
    name: string;
    energyGiven: number;
    happinessGiven: number;
  };
}

export interface InteractResult {
  happiness: number;
  lastInteractedAt: string;
  interactionType: string;
  happinessGiven: number;
}

class InteractionApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}/api/frogs${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    const json = await response.json();
    return json.data;
  }

  /**
   * 获取青蛙状态 (饥饿值/快乐值)
   */
  async getStatus(tokenId: number): Promise<FrogStatus> {
    return this.request(`/${tokenId}/status`);
  }

  /**
   * 喂食青蛙
   */
  async feed(tokenId: number, foodType: string, ownerAddress: string): Promise<FeedResult> {
    return this.request(`/${tokenId}/feed`, {
      method: 'POST',
      body: JSON.stringify({ foodType, ownerAddress }),
    });
  }

  /**
   * 与青蛙互动 (抚摸/玩耍)
   */
  async interact(
    tokenId: number,
    interactionType: 'pet' | 'play' | 'talk',
    ownerAddress: string
  ): Promise<InteractResult> {
    return this.request(`/${tokenId}/interact`, {
      method: 'POST',
      body: JSON.stringify({ interactionType, ownerAddress }),
    });
  }

  /**
   * 获取食物库存
   */
  async getInventory(tokenId: number): Promise<{ tokenId: number; inventory: FoodInventory; foodTypes: typeof FOOD_CONFIG }> {
    return this.request(`/${tokenId}/inventory`);
  }

  /**
   * 添加食物到库存 (通常由后端内部调用)
   */
  async addToInventory(
    tokenId: number,
    foodType: string,
    quantity: number,
    source = 'manual'
  ): Promise<{ foodType: string; newQuantity: number; added: number; source: string }> {
    return this.request(`/${tokenId}/inventory`, {
      method: 'POST',
      body: JSON.stringify({ foodType, quantity, source }),
    });
  }

  /**
   * 批量添加食物到库存
   */
  async batchAddToInventory(
    tokenId: number,
    foods: Array<{ foodType: string; quantity: number }>,
    source = 'travel_reward'
  ): Promise<{ added: Array<{ foodType: string; quantity: number }>; newInventory: Array<{ foodType: string; quantity: number }> }> {
    return this.request(`/${tokenId}/inventory/batch`, {
      method: 'POST',
      body: JSON.stringify({ foods, source }),
    });
  }
}

export const interactionApi = new InteractionApiService();
