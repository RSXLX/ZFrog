import { HttpClient } from '../core/http';
import { unwrapEnvelope } from './envelope';

export interface RelationshipGraphResourceClient {
  getFrogGraph<T = unknown>(
    frogId: number | string,
    options?: {
      limit?: number;
    }
  ): Promise<T>;
}

export const createRelationshipGraphResourceClient = (
  httpClient: HttpClient
): RelationshipGraphResourceClient => {
  return {
    async getFrogGraph<T = unknown>(
      frogId: number | string,
      options?: {
        limit?: number;
      }
    ): Promise<T> {
      const normalizedFrogId = String(frogId).trim();
      const query = new URLSearchParams();

      if (
        typeof options?.limit === 'number' &&
        Number.isInteger(options.limit) &&
        options.limit > 0
      ) {
        query.set('limit', String(options.limit));
      }

      const queryString = query.toString();
      const response = await httpClient.get<unknown>(
        `/v3/relationship-graph/frogs/${encodeURIComponent(normalizedFrogId)}${
          queryString ? `?${queryString}` : ''
        }`
      );

      return unwrapEnvelope<T>(response, 'Failed to fetch relationship graph by frog id');
    },
  };
};
