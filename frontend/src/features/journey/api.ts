import {
  createHttpClient,
  createJourneyResourceClient,
} from '../../../../packages/client-sdk/src';
import type {
  V3JourneyAdvanceStepPayload,
  V3JourneyCreatePayload,
  V3JourneyReadModel,
  V3JourneySettleStepPayload,
  V3JourneyViewerReadModel,
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

class JourneyFeatureApi {
  private buildResourceClient(integrationApiKey?: string) {
    const apiKey = integrationApiKey?.trim();
    if (!apiKey) {
      throw new Error('V3 integration api key is required');
    }

    return createJourneyResourceClient(
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

  async createJourney(
    payload: V3JourneyCreatePayload,
    integrationApiKey?: string
  ): Promise<V3JourneyReadModel> {
    return this.buildResourceClient(integrationApiKey).createJourney<V3JourneyReadModel>(payload);
  }

  async getById(journeyId: string, integrationApiKey?: string): Promise<V3JourneyReadModel> {
    return this.buildResourceClient(integrationApiKey).getById<V3JourneyReadModel>(journeyId);
  }

  async getViewer(
    journeyId: string,
    integrationApiKey?: string
  ): Promise<V3JourneyViewerReadModel> {
    return this.buildResourceClient(integrationApiKey).getViewer<V3JourneyViewerReadModel>(journeyId);
  }

  async settleStep(
    journeyId: string,
    stepId: string,
    payload: V3JourneySettleStepPayload,
    integrationApiKey?: string
  ): Promise<V3JourneyReadModel> {
    return this.buildResourceClient(integrationApiKey).settleStep<V3JourneyReadModel>(
      journeyId,
      stepId,
      payload
    );
  }

  async advanceStep(
    journeyId: string,
    stepId: string,
    payload: V3JourneyAdvanceStepPayload | undefined,
    integrationApiKey?: string
  ): Promise<V3JourneyReadModel> {
    return this.buildResourceClient(integrationApiKey).advanceStep<V3JourneyReadModel>(
      journeyId,
      stepId,
      payload
    );
  }
}

export const journeyFeatureApi = new JourneyFeatureApi();
