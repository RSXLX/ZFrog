import { createHttpClient, createRelationshipGraphResourceClient } from '../../../../packages/client-sdk/src';
import type { V3RelationshipGraphReadModel } from '../../../../packages/shared/src';
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

class RelationshipGraphFeatureApi {
  private buildResourceClient(integrationApiKey?: string) {
    const apiKey = integrationApiKey?.trim();
    if (!apiKey) {
      throw new Error('V3 integration api key is required');
    }

    return createRelationshipGraphResourceClient(
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

  async getFrogGraph(
    frogId: number | string,
    options: {
      limit?: number;
    } | undefined,
    integrationApiKey?: string
  ): Promise<V3RelationshipGraphReadModel> {
    return this.buildResourceClient(integrationApiKey).getFrogGraph<V3RelationshipGraphReadModel>(
      frogId,
      options
    );
  }
}

export const relationshipGraphFeatureApi = new RelationshipGraphFeatureApi();
