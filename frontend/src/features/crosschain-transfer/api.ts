import { apiClient } from '../../lib/api/client';

interface Envelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class CrossChainTransferFeatureApi {
  async getHistory(frogId: number | string): Promise<any> {
    const response = await apiClient.get<Envelope<any>>(`/crosschain-transfer/${frogId}/history`);
    if (!response?.success) return { transfers: [] };
    return response.data || { transfers: [] };
  }

  async getFriends(frogId: number | string): Promise<any[]> {
    const response = await apiClient.get<Envelope<any[]>>(`/crosschain-transfer/${frogId}/friends`);
    if (!response?.success || !Array.isArray(response.data)) return [];
    return response.data;
  }

  async getStats(frogId: number | string): Promise<any> {
    const response = await apiClient.get<Envelope<any>>(`/crosschain-transfer/${frogId}/stats`);
    if (!response?.success) return { sentCount: 0, receivedCount: 0, totalVolume: '0' };
    return response.data || { sentCount: 0, receivedCount: 0, totalVolume: '0' };
  }

  async create(payload: Record<string, unknown>): Promise<any | null> {
    const response = await apiClient.post<Envelope<any>>('/crosschain-transfer/create', payload);
    if (!response?.success) return null;
    return response.data || null;
  }

  async confirm(payload: Record<string, unknown>): Promise<boolean> {
    const response = await apiClient.post<Envelope<any>>('/crosschain-transfer/confirm', payload);
    return Boolean(response?.success);
  }

  async getSupportedChains(): Promise<any[]> {
    const response = await apiClient.get<Envelope<any[]>>('/cross-chain/supported-chains');
    if (!response?.success || !Array.isArray(response.data)) return [];
    return response.data;
  }

  async canStartTravel(
    tokenId: number | string,
    targetChainId: number | string
  ): Promise<{ canStart: boolean; reason?: string }> {
    const response = await apiClient.get<Envelope<{ canStart: boolean; reason?: string }>>(
      `/cross-chain/can-travel/${tokenId}`,
      { params: { targetChainId } }
    );

    if (!response?.success || !response.data) {
      return { canStart: false, reason: response?.error || response?.message };
    }

    return response.data;
  }

  async createTravel(payload: {
    frogId: number;
    tokenId: number;
    targetChainId: number;
    duration: number;
    ownerAddress: string;
  }): Promise<{ travelId: number }> {
    const response = await apiClient.post<Envelope<{ travelId: number }>>('/cross-chain/travel', payload);
    if (!response?.success || !response.data) {
      throw new Error(response?.error || response?.message || 'Failed to create cross-chain travel');
    }
    return response.data;
  }

  async notifyTravelStarted(
    travelId: number | string,
    messageId: string,
    txHash: string
  ): Promise<boolean> {
    const response = await apiClient.post<Envelope<any>>(`/cross-chain/travel/${travelId}/started`, {
      messageId,
      txHash,
    });
    return Boolean(response?.success);
  }

  async getTravelStatus(tokenId: number | string): Promise<any> {
    const response = await apiClient.get<Envelope<any>>(`/cross-chain/travel/${tokenId}/status`);
    if (!response?.success) {
      return { onChain: null, database: null };
    }
    return response.data || { onChain: null, database: null };
  }

  async syncState(tokenId: number | string): Promise<boolean> {
    const response = await apiClient.post<Envelope<any>>(`/cross-chain/sync/${tokenId}`);
    return Boolean(response?.success);
  }
}

export const crossChainTransferFeatureApi = new CrossChainTransferFeatureApi();
