import { HttpClient } from '../core/http';
import { unwrapEnvelope } from './envelope';

export interface JourneyResourceClient {
  createJourney<T = unknown>(payload: unknown): Promise<T>;
  getById<T = unknown>(journeyId: string): Promise<T>;
  getViewer<T = unknown>(journeyId: string): Promise<T>;
  getWorldGraph<T = unknown>(journeyId: string): Promise<T>;
  listIncidents<T = unknown>(journeyId: string): Promise<T>;
  triggerIncident<T = unknown>(
    journeyId: string,
    payload?: {
      stepId?: string;
      template?: 'METEOR_RESCUE_NIGHT';
      contextNote?: string;
    }
  ): Promise<T>;
  respondIncident<T = unknown>(
    incidentId: string,
    payload: {
      decision: 'DEPLOY_RESCUE' | 'HOLD_FORMATION' | 'ABORT_MISSION';
      note?: string;
    }
  ): Promise<T>;
  settleStep<T = unknown>(
    journeyId: string,
    stepId: string,
    payload: {
      result: 'COMPLETED' | 'FAILED' | 'SKIPPED';
      reason?: string;
    }
  ): Promise<T>;
  advanceStep<T = unknown>(
    journeyId: string,
    stepId: string,
    payload?: {
      reason?: string;
    }
  ): Promise<T>;
}

export const createJourneyResourceClient = (httpClient: HttpClient): JourneyResourceClient => {
  return {
    async createJourney<T = unknown>(payload: unknown): Promise<T> {
      const response = await httpClient.post<unknown>('/v3/journeys', {
        body: payload,
      });
      return unwrapEnvelope<T>(response, 'Failed to create journey');
    },

    async getById<T = unknown>(journeyId: string): Promise<T> {
      const payload = await httpClient.get<unknown>(`/v3/journeys/${encodeURIComponent(journeyId)}`);
      return unwrapEnvelope<T>(payload, 'Failed to fetch journey');
    },

    async getViewer<T = unknown>(journeyId: string): Promise<T> {
      const payload = await httpClient.get<unknown>(
        `/v3/journeys/${encodeURIComponent(journeyId)}/viewer`
      );
      return unwrapEnvelope<T>(payload, 'Failed to fetch journey viewer');
    },

    async getWorldGraph<T = unknown>(journeyId: string): Promise<T> {
      const payload = await httpClient.get<unknown>(
        `/v3/journeys/${encodeURIComponent(journeyId)}/world`
      );
      return unwrapEnvelope<T>(payload, 'Failed to fetch journey world graph');
    },

    async listIncidents<T = unknown>(journeyId: string): Promise<T> {
      const payload = await httpClient.get<unknown>(
        `/v3/journeys/${encodeURIComponent(journeyId)}/incidents`
      );
      return unwrapEnvelope<T>(payload, 'Failed to fetch journey incidents');
    },

    async triggerIncident<T = unknown>(
      journeyId: string,
      payload?: {
        stepId?: string;
        template?: 'METEOR_RESCUE_NIGHT';
        contextNote?: string;
      }
    ): Promise<T> {
      const response = await httpClient.post<unknown>(
        `/v3/journeys/${encodeURIComponent(journeyId)}/incidents/trigger`,
        {
          ...(payload ? { body: payload } : {}),
        }
      );
      return unwrapEnvelope<T>(response, 'Failed to trigger journey incident');
    },

    async respondIncident<T = unknown>(
      incidentId: string,
      payload: {
        decision: 'DEPLOY_RESCUE' | 'HOLD_FORMATION' | 'ABORT_MISSION';
        note?: string;
      }
    ): Promise<T> {
      const response = await httpClient.post<unknown>(
        `/v3/world-events/${encodeURIComponent(incidentId)}/respond`,
        {
          body: {
            decision: payload.decision,
            ...(payload.note ? { note: payload.note } : {}),
          },
        }
      );
      return unwrapEnvelope<T>(response, 'Failed to respond to journey incident');
    },

    async settleStep<T = unknown>(
      journeyId: string,
      stepId: string,
      payload: {
        result: 'COMPLETED' | 'FAILED' | 'SKIPPED';
        reason?: string;
      }
    ): Promise<T> {
      const response = await httpClient.post<unknown>(
        `/v3/journeys/${encodeURIComponent(journeyId)}/steps/${encodeURIComponent(stepId)}/settle`,
        {
          body: {
            result: payload.result,
            ...(payload.reason ? { reason: payload.reason } : {}),
          },
        }
      );
      return unwrapEnvelope<T>(response, 'Failed to settle journey step');
    },

    async advanceStep<T = unknown>(
      journeyId: string,
      stepId: string,
      payload?: {
        reason?: string;
      }
    ): Promise<T> {
      const response = await httpClient.post<unknown>(
        `/v3/journeys/${encodeURIComponent(journeyId)}/steps/${encodeURIComponent(stepId)}/advance`,
        {
          ...(payload ? { body: payload } : {}),
        }
      );
      return unwrapEnvelope<T>(response, 'Failed to advance journey step');
    },
  };
};
