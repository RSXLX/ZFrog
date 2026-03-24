import { apiClient } from '../../lib/api/client';
import { buildSessionAuthHeaders } from '../../lib/auth/session';
import { createHealthResourceClient, createHttpClient } from '../../../../packages/client-sdk/src';

interface Envelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class SystemFeatureApi {
  private readonly healthClient = createHealthResourceClient(
    createHttpClient({
      baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
      getAuthHeaders: () => buildSessionAuthHeaders(),
      retries: 0,
    })
  );

  async getPrice(symbol: string): Promise<any | null> {
    const response = await apiClient.get<Envelope<any>>(`/price/${symbol}`);
    if (!response?.success) return null;
    return response.data || null;
  }

  async checkHealth(endpoints: string[]): Promise<boolean> {
    await this.healthClient.checkEndpoints(endpoints);
    return true;
  }
}

export const systemFeatureApi = new SystemFeatureApi();
