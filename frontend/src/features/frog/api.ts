import { apiClient } from '../../lib/api/client';
import { ApiClientError } from '../../lib/api/errors';
import type { Frog } from '../../types';

interface Envelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class FrogFeatureApi {
  async getMyFrog(address: string): Promise<Frog | null> {
    try {
      const response = await apiClient.get<Envelope<Frog>>(`/frogs/my/${address.toLowerCase()}`);
      if (!response?.success) return null;
      return response.data || null;
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getFrogDetail(tokenId: number | string, viewerAddress?: string): Promise<Frog | null> {
    try {
      const endpoint = viewerAddress
        ? `/frogs/${tokenId}?viewerAddress=${viewerAddress.toLowerCase()}`
        : `/frogs/${tokenId}`;
      const response = await apiClient.get<Envelope<Frog>>(endpoint);
      if (!response?.success) return null;
      return response.data || null;
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async syncFrog(tokenId: number | string): Promise<boolean> {
    const response = await apiClient.post<Envelope>('/frogs/sync', { tokenId: Number(tokenId) });
    return Boolean(response?.success);
  }

  async getRuntimeState(tokenId: number | string): Promise<any | null> {
    const response = await apiClient.get<Envelope<any>>(`/frogs/${tokenId}`);
    if (!response?.success) return null;
    return response.data || null;
  }

  async search(query: string, limit = 10): Promise<Frog[]> {
    const response = await apiClient.get<Envelope<Frog[]>>('/frogs/search', {
      params: { query, limit },
    });
    if (!response?.success || !Array.isArray(response.data)) return [];
    return response.data;
  }

  async getWorldOnline(limit = 20, offset = 0): Promise<Frog[]> {
    const response = await apiClient.get<Envelope<Frog[]>>('/frogs/world-online', {
      params: { limit, offset },
    });
    if (!response?.success || !Array.isArray(response.data)) return [];
    return response.data;
  }

  async interact(
    tokenId: number | string,
    payload: {
      interactionType?: string;
      ownerAddress?: string;
      [key: string]: unknown;
    }
  ): Promise<Envelope<any>> {
    return apiClient.post<Envelope<any>>(`/frogs/${tokenId}/interact`, payload);
  }
}

export const frogFeatureApi = new FrogFeatureApi();
