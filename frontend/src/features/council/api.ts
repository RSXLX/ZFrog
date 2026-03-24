import {
  createCouncilResourceClient,
  createHttpClient,
  type CouncilSuggestionListQuery,
} from '../../../../packages/client-sdk/src';
import type {
  V3CouncilCreateSuggestionPayload,
  V3CouncilRespondSuggestionPayload,
  V3CouncilSuggestionListReadModel,
  V3CouncilSuggestionReadModel,
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

class CouncilFeatureApi {
  private buildResourceClient(integrationApiKey?: string) {
    const apiKey = integrationApiKey?.trim();
    if (!apiKey) {
      throw new Error('V3 integration api key is required');
    }

    return createCouncilResourceClient(
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

  async createSuggestion(
    payload: V3CouncilCreateSuggestionPayload,
    integrationApiKey?: string
  ): Promise<V3CouncilSuggestionReadModel> {
    return this.buildResourceClient(integrationApiKey).createSuggestion<V3CouncilSuggestionReadModel>(
      payload
    );
  }

  async listSuggestions(
    query: CouncilSuggestionListQuery | undefined,
    integrationApiKey?: string
  ): Promise<V3CouncilSuggestionListReadModel> {
    return this.buildResourceClient(integrationApiKey).listSuggestions<V3CouncilSuggestionListReadModel>(
      query
    );
  }

  async getSuggestionById(
    suggestionId: string,
    integrationApiKey?: string
  ): Promise<V3CouncilSuggestionReadModel> {
    return this.buildResourceClient(integrationApiKey).getSuggestionById<V3CouncilSuggestionReadModel>(
      suggestionId
    );
  }

  async respondSuggestion(
    suggestionId: string,
    payload: V3CouncilRespondSuggestionPayload,
    integrationApiKey?: string
  ): Promise<V3CouncilSuggestionReadModel> {
    return this.buildResourceClient(integrationApiKey).respondSuggestion<V3CouncilSuggestionReadModel>(
      suggestionId,
      payload
    );
  }
}

export const councilFeatureApi = new CouncilFeatureApi();
