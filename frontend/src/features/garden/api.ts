import { apiClient } from '../../lib/api/client';

interface Envelope<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface GridPlacedItemInput {
  userDecorationId: string;
  gridX: number;
  gridY: number;
  scale?: number;
  rotation?: number;
  zIndex?: number;
}

interface GardenLayoutSaveOptions {
  createSnapshot?: boolean;
  sessionId?: string;
  validateGrid?: boolean;
}

class GardenFeatureApi {
  async getGarden(frogTokenId: number | string): Promise<any | null> {
    const response = await apiClient.get<Envelope<any>>(`/garden/${frogTokenId}`);
    if (!response?.success) return null;
    return response.data || null;
  }

  async interact(frogTokenId: number | string, payload: Record<string, unknown>): Promise<boolean> {
    const response = await apiClient.post<Envelope<any>>(`/garden/${frogTokenId}/interact`, payload);
    return Boolean(response?.success);
  }

  async visit(frogTokenId: number | string, guestFrogId: number | string): Promise<Envelope<any>> {
    return apiClient.post<Envelope<any>>(`/garden/${frogTokenId}/visit`, { guestFrogId });
  }

  async leave(frogTokenId: number | string, guestFrogId: number | string): Promise<boolean> {
    const response = await apiClient.post<Envelope<any>>(`/garden/${frogTokenId}/leave`, {
      guestFrogId,
    });
    return Boolean(response?.success);
  }

  async getLayout(frogId: number | string, sceneType: string): Promise<any | null> {
    const response = await apiClient.get<Envelope<any>>(`/homestead/${frogId}/layout/${sceneType}`);
    if (!response?.success) return null;
    return response.data || null;
  }

  async saveLayoutV2(
    frogId: number | string,
    sceneType: string,
    items: GridPlacedItemInput[],
    options: GardenLayoutSaveOptions = {}
  ): Promise<boolean> {
    const response = await apiClient.post<Envelope<any>>(`/homestead/${frogId}/layout/${sceneType}`, {
      items,
      createSnapshot: options.createSnapshot ?? true,
      sessionId: options.sessionId,
      validateGrid: options.validateGrid ?? true,
    });
    return Boolean(response?.success);
  }

  async acquireEditLock(
    frogId: number | string,
    sceneType: string,
    sessionId: string,
    ttlMs?: number
  ): Promise<{ locked: boolean; expiresAt: string } | null> {
    const response = await apiClient.post<Envelope<{ locked: boolean; expiresAt: string }>>(
      `/homestead/${frogId}/layout/${sceneType}/lock`,
      { sessionId, ...(ttlMs ? { ttlMs } : {}) }
    );
    if (!response?.success) return null;
    return response.data || null;
  }

  async releaseEditLock(
    frogId: number | string,
    sceneType: string,
    sessionId: string
  ): Promise<boolean> {
    const response = await apiClient.post<Envelope<any>>(
      `/homestead/${frogId}/layout/${sceneType}/lock/release`,
      { sessionId }
    );
    return Boolean(response?.success);
  }

  async getComfort(frogId: number | string, sceneType = 'yard'): Promise<any | null> {
    const response = await apiClient.get<Envelope<any>>(`/homestead/${frogId}/comfort`, {
      params: { sceneType },
    });
    if (!response?.success) return null;
    return response.data || null;
  }

  async getUnplacedDecorations(frogId: number | string, sceneType: string): Promise<any[]> {
    const response = await apiClient.get<Envelope<any[]>>(
      `/homestead/${frogId}/decorations/unplaced/${sceneType}`
    );
    if (!response?.success || !Array.isArray(response.data)) return [];
    return response.data;
  }

  async getMessages(frogId: number | string): Promise<any[]> {
    const response = await apiClient.get<Envelope<any[]>>(`/homestead/${frogId}/messages`);
    if (!response?.success || !Array.isArray(response.data)) return [];
    return response.data;
  }

  async postMessage(
    frogId: number | string,
    payload: Record<string, unknown>
  ): Promise<Envelope<any>> {
    return apiClient.post<Envelope<any>>(`/homestead/${frogId}/messages`, payload);
  }

  async likeMessage(frogId: number | string, messageId: number | string): Promise<boolean> {
    const response = await apiClient.post<Envelope<any>>(
      `/homestead/${frogId}/messages/${messageId}/like`
    );
    return Boolean(response?.success);
  }

  async getGifts(frogId: number | string, params?: Record<string, unknown>): Promise<any> {
    const response = await apiClient.get<Envelope<any>>(`/homestead/${frogId}/gifts`, {
      params,
    });
    if (!response?.success) return { gifts: [], total: 0 };
    return response.data || { gifts: [], total: 0 };
  }

  async openGift(frogId: number | string, giftId: string | number): Promise<any | null> {
    const response = await apiClient.post<Envelope<any>>(`/homestead/${frogId}/gifts/${giftId}/open`);
    if (!response?.success) return null;
    return response.data || null;
  }

  async getPhotos(frogId: number | string, params?: Record<string, unknown>): Promise<any> {
    const response = await apiClient.get<Envelope<any>>(`/homestead/${frogId}/photos`, {
      params,
    });
    if (!response?.success) return { photos: [] };
    return response.data || { photos: [] };
  }

  async likePhoto(frogId: number | string, photoId: string | number): Promise<boolean> {
    const response = await apiClient.post<Envelope<any>>(`/homestead/${frogId}/photos/${photoId}/like`);
    return Boolean(response?.success);
  }

  async mintPhoto(
    frogId: number | string,
    photoId: string | number,
    payload: { nftContract: string; nftTokenId: string; mintTxHash: string }
  ): Promise<Envelope<any>> {
    return apiClient.post<Envelope<any>>(`/homestead/${frogId}/photos/${photoId}/mint`, payload);
  }

  async getEarnedAchievements(frogId: number | string): Promise<any> {
    const response = await apiClient.get<Envelope<any>>(`/homestead/${frogId}/achievements`);
    if (!response?.success) return { earned: [], progress: { total: 0, earned: 0, percentage: 0 } };
    return response.data || { earned: [], progress: { total: 0, earned: 0, percentage: 0 } };
  }

  async getAchievementCatalog(): Promise<any[]> {
    const response = await apiClient.get<Envelope<any[]>>('/homestead/achievements');
    if (!response?.success || !Array.isArray(response.data)) return [];
    return response.data;
  }

  async mintAchievementSbt(
    frogId: number | string,
    achievementId: string | number,
    payload: { sbtTokenId: string; sbtTxHash: string }
  ): Promise<Envelope<any>> {
    return apiClient.post<Envelope<any>>(
      `/homestead/${frogId}/achievements/${achievementId}/mint-sbt`,
      payload
    );
  }
}

export const gardenFeatureApi = new GardenFeatureApi();
