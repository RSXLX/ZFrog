import { HttpClient } from '../core/http';
import { unwrapEnvelope } from './envelope';

export interface CouncilSuggestionListQuery {
  status?: 'OPEN' | 'ACCEPTED' | 'REJECTED' | 'DEFERRED';
  limit?: number;
}

export interface CouncilBriefQuery {
  channel?: 'desktop' | 'mobile_lite';
}

export interface CouncilBriefPreferencesPayload {
  enabled?: boolean;
  throttleMs?: number;
  channels?: {
    desktop?: boolean;
    mobileLite?: boolean;
  };
}

export interface CouncilResourceClient {
  createSuggestion<T = unknown>(payload: unknown): Promise<T>;
  listSuggestions<T = unknown>(query?: CouncilSuggestionListQuery): Promise<T>;
  getSuggestionById<T = unknown>(suggestionId: string): Promise<T>;
  respondSuggestion<T = unknown>(
    suggestionId: string,
    payload: {
      decision: 'ACCEPT' | 'REJECT' | 'DEFER';
      note?: string;
    }
  ): Promise<T>;
  getBrief<T = unknown>(query?: CouncilBriefQuery): Promise<T>;
  getBriefPreferences<T = unknown>(): Promise<T>;
  updateBriefPreferences<T = unknown>(payload: CouncilBriefPreferencesPayload): Promise<T>;
}

export const createCouncilResourceClient = (httpClient: HttpClient): CouncilResourceClient => {
  return {
    async createSuggestion<T = unknown>(payload: unknown): Promise<T> {
      const response = await httpClient.post<unknown>('/v3/council/suggestions', {
        body: payload,
      });
      return unwrapEnvelope<T>(response, 'Failed to create council suggestion');
    },

    async listSuggestions<T = unknown>(query?: CouncilSuggestionListQuery): Promise<T> {
      const response = await httpClient.get<unknown>('/v3/council/suggestions', {
        params: {
          ...(query?.status ? { status: query.status } : {}),
          ...(typeof query?.limit === 'number' ? { limit: query.limit } : {}),
        },
      });
      return unwrapEnvelope<T>(response, 'Failed to list council suggestions');
    },

    async getSuggestionById<T = unknown>(suggestionId: string): Promise<T> {
      const response = await httpClient.get<unknown>(
        `/v3/council/suggestions/${encodeURIComponent(suggestionId)}`
      );
      return unwrapEnvelope<T>(response, 'Failed to fetch council suggestion');
    },

    async respondSuggestion<T = unknown>(
      suggestionId: string,
      payload: {
        decision: 'ACCEPT' | 'REJECT' | 'DEFER';
        note?: string;
      }
    ): Promise<T> {
      const response = await httpClient.post<unknown>(
        `/v3/council/suggestions/${encodeURIComponent(suggestionId)}/respond`,
        {
          body: {
            decision: payload.decision,
            ...(payload.note ? { note: payload.note } : {}),
          },
        }
      );
      return unwrapEnvelope<T>(response, 'Failed to respond to council suggestion');
    },

    async getBrief<T = unknown>(query?: CouncilBriefQuery): Promise<T> {
      const response = await httpClient.get<unknown>('/v3/council/brief', {
        params: {
          ...(query?.channel ? { channel: query.channel } : {}),
        },
      });
      return unwrapEnvelope<T>(response, 'Failed to fetch council brief');
    },

    async getBriefPreferences<T = unknown>(): Promise<T> {
      const response = await httpClient.get<unknown>('/v3/council/brief/preferences');
      return unwrapEnvelope<T>(response, 'Failed to fetch council brief preferences');
    },

    async updateBriefPreferences<T = unknown>(payload: CouncilBriefPreferencesPayload): Promise<T> {
      const response = await httpClient.post<unknown>('/v3/council/brief/preferences', {
        body: payload,
      });
      return unwrapEnvelope<T>(response, 'Failed to update council brief preferences');
    },
  };
};
