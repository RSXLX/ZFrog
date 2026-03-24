import { HttpClient } from '../core/http';
import { unwrapEnvelope } from './envelope';

export interface LifeResourceClient {
  getLife<T = unknown>(frogId: number | string): Promise<T>;
  getHibernation<T = unknown>(frogId: number | string): Promise<T>;
  getRevivalCost<T = unknown>(frogId: number | string): Promise<T>;
  feed<T = unknown>(frogId: number | string, payload: unknown): Promise<T>;
  clean<T = unknown>(frogId: number | string, payload?: unknown): Promise<T>;
  play<T = unknown>(frogId: number | string, payload?: unknown): Promise<T>;
  heal<T = unknown>(frogId: number | string, payload?: unknown): Promise<T>;
  startRest<T = unknown>(frogId: number | string, payload?: unknown): Promise<T>;
  endRest<T = unknown>(frogId: number | string, payload?: unknown): Promise<T>;
  revive<T = unknown>(frogId: number | string, payload?: unknown): Promise<T>;
  bless<T = unknown>(frogId: number | string, payload: unknown): Promise<T>;
}

export const createLifeResourceClient = (httpClient: HttpClient): LifeResourceClient => {
  return {
    async getLife<T = unknown>(frogId: number | string): Promise<T> {
      const payload = await httpClient.get<unknown>(`/v1/frogs/${frogId}/life`);
      return unwrapEnvelope<T>(payload, 'Failed to fetch life state');
    },

    async getHibernation<T = unknown>(frogId: number | string): Promise<T> {
      const payload = await httpClient.get<unknown>(`/v1/frogs/${frogId}/hibernation`);
      return unwrapEnvelope<T>(payload, 'Failed to fetch hibernation status');
    },

    async getRevivalCost<T = unknown>(frogId: number | string): Promise<T> {
      const payload = await httpClient.get<unknown>(
        `/v1/frogs/${frogId}/hibernation/revival-cost`
      );
      return unwrapEnvelope<T>(payload, 'Failed to fetch revival cost');
    },

    async feed<T = unknown>(frogId: number | string, payload: unknown): Promise<T> {
      const response = await httpClient.post<unknown>(`/v1/frogs/${frogId}/care/feed`, {
        body: payload,
      });
      return unwrapEnvelope<T>(response, 'Failed to feed frog');
    },

    async clean<T = unknown>(frogId: number | string, payload?: unknown): Promise<T> {
      const response = await httpClient.post<unknown>(`/v1/frogs/${frogId}/care/clean`, {
        body: payload ?? {},
      });
      return unwrapEnvelope<T>(response, 'Failed to clean frog');
    },

    async play<T = unknown>(frogId: number | string, payload?: unknown): Promise<T> {
      const response = await httpClient.post<unknown>(`/v1/frogs/${frogId}/care/play`, {
        body: payload ?? {},
      });
      return unwrapEnvelope<T>(response, 'Failed to play with frog');
    },

    async heal<T = unknown>(frogId: number | string, payload?: unknown): Promise<T> {
      const response = await httpClient.post<unknown>(`/v1/frogs/${frogId}/care/heal`, {
        body: payload ?? {},
      });
      return unwrapEnvelope<T>(response, 'Failed to heal frog');
    },

    async startRest<T = unknown>(frogId: number | string, payload?: unknown): Promise<T> {
      const response = await httpClient.post<unknown>(`/v1/frogs/${frogId}/care/rest/start`, {
        body: payload ?? {},
      });
      return unwrapEnvelope<T>(response, 'Failed to start rest');
    },

    async endRest<T = unknown>(frogId: number | string, payload?: unknown): Promise<T> {
      const response = await httpClient.post<unknown>(`/v1/frogs/${frogId}/care/rest/end`, {
        body: payload ?? {},
      });
      return unwrapEnvelope<T>(response, 'Failed to end rest');
    },

    async revive<T = unknown>(frogId: number | string, payload?: unknown): Promise<T> {
      const response = await httpClient.post<unknown>(`/v1/frogs/${frogId}/hibernation/revive`, {
        body: payload ?? {},
      });
      return unwrapEnvelope<T>(response, 'Failed to revive frog');
    },

    async bless<T = unknown>(frogId: number | string, payload: unknown): Promise<T> {
      const response = await httpClient.post<unknown>(`/v1/frogs/${frogId}/hibernation/bless`, {
        body: payload,
      });
      return unwrapEnvelope<T>(response, 'Failed to bless frog');
    },
  };
};
