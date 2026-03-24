import {
  createHttpClient,
  createMemoryPalacesResourceClient,
} from '../../../../packages/client-sdk/src';
import type {
  V3MemoryPalaceAddCollaboratorPayload,
  V3MemoryPalaceAddContributionPayload,
  V3MemoryPalaceTemplateListReadModel,
  V3MemoryPalaceCreateWorldPayload,
  V3MemoryPalaceWorldReadModel,
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

class MemoryWorldFeatureApi {
  private buildResourceClient(integrationApiKey?: string) {
    const apiKey = integrationApiKey?.trim();
    if (!apiKey) {
      throw new Error('V3 integration api key is required');
    }

    return createMemoryPalacesResourceClient(
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

  async createWorld(
    payload: V3MemoryPalaceCreateWorldPayload,
    integrationApiKey?: string
  ): Promise<V3MemoryPalaceWorldReadModel> {
    return this.buildResourceClient(integrationApiKey).createWorld<V3MemoryPalaceWorldReadModel>(
      payload
    );
  }

  async getWorldById(
    worldId: string,
    integrationApiKey?: string
  ): Promise<V3MemoryPalaceWorldReadModel> {
    return this.buildResourceClient(integrationApiKey).getWorldById<V3MemoryPalaceWorldReadModel>(
      worldId
    );
  }

  async addCollaborator(
    worldId: string,
    payload: V3MemoryPalaceAddCollaboratorPayload,
    integrationApiKey?: string
  ): Promise<V3MemoryPalaceWorldReadModel> {
    return this.buildResourceClient(integrationApiKey).addCollaborator<V3MemoryPalaceWorldReadModel>(
      worldId,
      payload
    );
  }

  async addContribution(
    worldId: string,
    payload: V3MemoryPalaceAddContributionPayload,
    integrationApiKey?: string
  ): Promise<V3MemoryPalaceWorldReadModel> {
    return this.buildResourceClient(integrationApiKey).addContribution<V3MemoryPalaceWorldReadModel>(
      worldId,
      payload
    );
  }

  async listTemplates(integrationApiKey?: string): Promise<V3MemoryPalaceTemplateListReadModel> {
    return this.buildResourceClient(integrationApiKey).listTemplates<V3MemoryPalaceTemplateListReadModel>();
  }
}

export const memoryWorldFeatureApi = new MemoryWorldFeatureApi();
