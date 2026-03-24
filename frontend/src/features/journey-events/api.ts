import {
  createHttpClient,
  createJourneyResourceClient,
} from '../../../../packages/client-sdk/src';
import type {
  V3JourneyIncidentListReadModel,
  V3JourneyIncidentRespondPayload,
  V3JourneyIncidentRespondResult,
  V3JourneyIncidentTriggerPayload,
  V3JourneyIncidentTriggerResult,
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

class JourneyEventsFeatureApi {
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

  async listIncidents(
    journeyId: string,
    integrationApiKey?: string
  ): Promise<V3JourneyIncidentListReadModel> {
    return this.buildResourceClient(integrationApiKey).listIncidents<V3JourneyIncidentListReadModel>(
      journeyId
    );
  }

  async triggerIncident(
    journeyId: string,
    payload: V3JourneyIncidentTriggerPayload | undefined,
    integrationApiKey?: string
  ): Promise<V3JourneyIncidentTriggerResult> {
    return this.buildResourceClient(integrationApiKey).triggerIncident<V3JourneyIncidentTriggerResult>(
      journeyId,
      payload
    );
  }

  async respondIncident(
    incidentId: string,
    payload: V3JourneyIncidentRespondPayload,
    integrationApiKey?: string
  ): Promise<V3JourneyIncidentRespondResult> {
    return this.buildResourceClient(integrationApiKey).respondIncident<V3JourneyIncidentRespondResult>(
      incidentId,
      payload
    );
  }
}

export const journeyEventsFeatureApi = new JourneyEventsFeatureApi();
