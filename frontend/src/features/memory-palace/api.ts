import { apiClient } from '../../lib/api/client';
import type { MemoryPalaceLite } from '../../lib/api/contracts';
import { ApiClientError } from '../../lib/api/errors';

class MemoryPalaceApi {
  async getByFrogId(frogId: number): Promise<MemoryPalaceLite | null> {
    try {
      return await apiClient.getData<MemoryPalaceLite>(`/v1/memory-palaces/${frogId}`);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }
}

export const memoryPalaceApi = new MemoryPalaceApi();
export type { MemoryPalaceLite };
