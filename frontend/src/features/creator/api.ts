import {
  createCreatorResourceClient,
  createHttpClient,
  type CreatorListPacksQuery,
} from '../../../../packages/client-sdk/src';
import type {
  V3CreatorAssetListReadModel,
  V3CreatorAssetReadModel,
  V3CreatorCreateAssetPayload,
  V3CreatorCreatePackPayload,
  V3CreatorPackListReadModel,
  V3CreatorPackReadModel,
} from '../../../../packages/shared/src';
import { buildSessionAuthHeaders } from '../../lib/auth/session';

const resolveApiBaseUrl = (): string => {
  const fromWindow =
    typeof window !== 'undefined'
      ? (window as unknown as { __ZFROG_API_URL__?: unknown }).__ZFROG_API_URL__
      : null;
  if (typeof fromWindow === 'string' && fromWindow.trim()) {
    return fromWindow.trim();
  }

  const fromProcess =
    typeof process !== 'undefined' && process.env
      ? process.env.VITE_API_URL
      : undefined;
  if (typeof fromProcess === 'string' && fromProcess.trim()) {
    return fromProcess.trim();
  }

  return 'http://localhost:3001';
};

class CreatorFeatureApi {
  private buildResourceClient(integrationApiKey?: string) {
    const apiKey = integrationApiKey?.trim();
    if (!apiKey) {
      throw new Error('V3 integration api key is required');
    }

    return createCreatorResourceClient(
      createHttpClient({
        baseUrl: resolveApiBaseUrl(),
        getAuthHeaders: () => ({
          ...buildSessionAuthHeaders(),
          'x-api-key': apiKey,
        }),
        retries: 0,
      })
    );
  }

  async createAsset(
    payload: V3CreatorCreateAssetPayload,
    integrationApiKey?: string
  ): Promise<V3CreatorAssetReadModel> {
    return this.buildResourceClient(integrationApiKey).createAsset<V3CreatorAssetReadModel>(payload);
  }

  async listAssets(
    query: {
      limit?: number;
    } | undefined,
    integrationApiKey?: string
  ): Promise<V3CreatorAssetListReadModel> {
    return this.buildResourceClient(integrationApiKey).listAssets<V3CreatorAssetListReadModel>(query);
  }

  async createPackDraft(
    payload: V3CreatorCreatePackPayload,
    integrationApiKey?: string
  ): Promise<V3CreatorPackReadModel> {
    return this.buildResourceClient(integrationApiKey).createPackDraft<V3CreatorPackReadModel>(payload);
  }

  async listPacks(
    query: CreatorListPacksQuery | undefined,
    integrationApiKey?: string
  ): Promise<V3CreatorPackListReadModel> {
    return this.buildResourceClient(integrationApiKey).listPacks<V3CreatorPackListReadModel>(query);
  }

  async getPackById(packId: string, integrationApiKey?: string): Promise<V3CreatorPackReadModel> {
    return this.buildResourceClient(integrationApiKey).getPackById<V3CreatorPackReadModel>(packId);
  }
}

export const creatorFeatureApi = new CreatorFeatureApi();
