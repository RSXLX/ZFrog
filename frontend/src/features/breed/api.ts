import { apiClient } from '../../lib/api/client';

interface Envelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class BreedFeatureApi {
  async check(payload: { frogId1?: number; frogId2?: number }): Promise<any | null> {
    const response = await apiClient.post<Envelope<any>>('/breed/check', payload);
    if (!response?.success) return null;
    return response.data || null;
  }

  async getRequests(frogId: number | string): Promise<any[]> {
    const response = await apiClient.get<Envelope<any[]>>(`/breed/requests/${frogId}`);
    if (!response?.success || !Array.isArray(response.data)) return [];
    return response.data;
  }

  async request(payload: { requesterId?: number; partnerId: number }): Promise<boolean> {
    const response = await apiClient.post<Envelope<any>>('/breed/request', payload);
    return Boolean(response?.success);
  }

  async accept(requestId: number | string): Promise<boolean> {
    const response = await apiClient.put<Envelope<any>>(`/breed/${requestId}/accept`);
    return Boolean(response?.success);
  }

  async reject(requestId: number | string): Promise<boolean> {
    const response = await apiClient.put<Envelope<any>>(`/breed/${requestId}/reject`);
    return Boolean(response?.success);
  }
}

export const breedFeatureApi = new BreedFeatureApi();
