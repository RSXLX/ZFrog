import { apiClient } from '../../lib/api/client';

interface Envelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class RewardFeatureApi {
  async getBadges(frogId?: number, ownerAddress?: string): Promise<any[]> {
    if (frogId) {
      const response = await apiClient.get<Envelope<any[]>>(`/badges/${frogId}`);
      if (!response?.success || !Array.isArray(response.data)) return [];
      return response.data;
    }

    if (ownerAddress) {
      const response = await apiClient.get<Envelope<any[]>>(
        `/badges?ownerAddress=${ownerAddress.toLowerCase()}`
      );
      if (!response?.success || !Array.isArray(response.data)) return [];
      return response.data;
    }

    return [];
  }

  async getPendingRewards(ownerAddress: string): Promise<any[]> {
    const response = await apiClient.get<Envelope<any[]>>(
      `/badges/rewards?ownerAddress=${ownerAddress}`
    );
    if (!response?.success || !Array.isArray(response.data)) return [];
    return response.data;
  }

  async claimAllRewards(ownerAddress: string): Promise<{ successCount: number; txHashes: string[] }> {
    const response = await apiClient.post<Envelope<{ successCount: number; txHashes: string[] }>>(
      '/badges/rewards/claim-all',
      { ownerAddress }
    );
    if (!response?.success || !response.data) {
      throw new Error(response?.error || response?.message || 'Failed to claim rewards');
    }
    return response.data;
  }

  async getSouvenirs(frogId?: number, ownerAddress?: string): Promise<any[]> {
    if (frogId) {
      const response = await apiClient.get<Envelope<any[]>>(`/souvenirs/${frogId}`);
      if (!response?.success || !Array.isArray(response.data)) return [];
      return response.data;
    }

    if (ownerAddress) {
      const response = await apiClient.get<Envelope<any[]>>(
        `/souvenirs?ownerAddress=${ownerAddress.toLowerCase()}`
      );
      if (!response?.success || !Array.isArray(response.data)) return [];
      return response.data;
    }

    return [];
  }

  async getSouvenirImageStatus(souvenirId: string | number): Promise<any> {
    return apiClient.get<any>(`/nft-image/status/${souvenirId}`);
  }

  async getTravelBadges(frogId: number | string): Promise<any[]> {
    const response = await apiClient.get<Envelope<any[]>>(`/badges/frog/${frogId}/travel`);
    if (!response?.success || !Array.isArray(response.data)) return [];
    return response.data;
  }

  async getTravelBadgeStats(frogId: number | string): Promise<any | null> {
    const response = await apiClient.get<Envelope<any>>(`/badges/frog/${frogId}/stats`);
    if (!response?.success) return null;
    return response.data || null;
  }

  async getTasks(ownerAddress: string): Promise<{ daily: any[]; weekly: any[] }> {
    const response = await apiClient.get<Envelope<{ daily?: any[]; weekly?: any[] }>>(
      `/tasks/${ownerAddress}`
    );
    if (!response?.success || !response.data) {
      return { daily: [], weekly: [] };
    }
    return {
      daily: response.data.daily || [],
      weekly: response.data.weekly || [],
    };
  }

  async claimTask(ownerAddress: string, taskId: string): Promise<boolean> {
    const response = await apiClient.post<Envelope<any>>(`/tasks/${ownerAddress}/claim`, { taskId });
    return Boolean(response?.success);
  }

  async getShopItems(ownerAddress: string, category?: string): Promise<any> {
    const response = await apiClient.get<Envelope<any>>('/shop/items', {
      params: {
        ownerAddress,
        ...(category ? { category } : {}),
      },
    });
    if (!response?.success) {
      return { items: [], categories: [] };
    }
    return response.data || { items: [], categories: [] };
  }

  async purchaseShopItem(ownerAddress: string, itemId: number): Promise<Envelope<any>> {
    return apiClient.post<Envelope<any>>('/shop/purchase', { ownerAddress, itemId });
  }
}

export const rewardFeatureApi = new RewardFeatureApi();
