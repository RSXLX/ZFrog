import { HttpClient } from '../core/http';
import { unwrapEnvelope } from './envelope';

export interface TravelHistoryQuery {
  address: string;
  limit?: number;
  offset?: number;
  frogId?: string | number;
}

export interface TravelStatsQuery {
  address: string;
  frogId?: string | number;
}

export interface StartTravelPayloadV1 {
  frogId: number | string;
  travelType?: 'random' | 'specific' | 'cross_chain' | (string & {});
  targetChain?: string | number;
  targetAddress?: string;
  duration?: number;
  source?: string;
}

export interface CompleteTravelPayloadV1 {
  source?: string;
}

export interface TravelResourceClient {
  getById<T = unknown>(travelId: number | string): Promise<T>;
  getHistory<T = unknown>(query: TravelHistoryQuery): Promise<T>;
  getStats<T = unknown>(query: TravelStatsQuery): Promise<T>;
  getFrogTravels<T = unknown>(frogId: number | string): Promise<T>;
  startV1<T = unknown>(payload: StartTravelPayloadV1): Promise<T>;
  completeV1<T = unknown>(
    travelId: number | string,
    payload?: CompleteTravelPayloadV1
  ): Promise<T>;
}

export const createTravelResourceClient = (httpClient: HttpClient): TravelResourceClient => {
  return {
    async getById<T = unknown>(travelId: number | string): Promise<T> {
      const payload = await httpClient.get<unknown>(`/v1/travels/${travelId}`);
      return unwrapEnvelope<T>(payload, 'Failed to fetch travel');
    },

    async getHistory<T = unknown>(query: TravelHistoryQuery): Promise<T> {
      const payload = await httpClient.get<unknown>('/travels/history', {
        params: {
          address: query.address,
          limit: query.limit ?? 10,
          offset: query.offset ?? 0,
          ...(query.frogId ? { frogId: query.frogId } : {}),
        },
      });

      return unwrapEnvelope<T>(payload, 'Failed to fetch travel history');
    },

    async getStats<T = unknown>(query: TravelStatsQuery): Promise<T> {
      const payload = await httpClient.get<unknown>('/travels/stats', {
        params: {
          address: query.address,
          ...(query.frogId ? { frogId: query.frogId } : {}),
        },
      });
      return unwrapEnvelope<T>(payload, 'Failed to fetch travel stats');
    },

    async getFrogTravels<T = unknown>(frogId: number | string): Promise<T> {
      const payload = await httpClient.get<unknown>(`/travels/${frogId}`);
      return unwrapEnvelope<T>(payload, 'Failed to fetch frog travels');
    },

    async startV1<T = unknown>(payload: StartTravelPayloadV1): Promise<T> {
      const response = await httpClient.post<unknown>('/v1/travels', {
        body: payload,
      });
      return unwrapEnvelope<T>(response, 'Failed to start travel');
    },

    async completeV1<T = unknown>(
      travelId: number | string,
      payload?: CompleteTravelPayloadV1
    ): Promise<T> {
      const response = await httpClient.post<unknown>(`/v1/travels/${travelId}/complete`, {
        body: payload ?? {},
      });
      return unwrapEnvelope<T>(response, 'Failed to complete travel');
    },
  };
};
