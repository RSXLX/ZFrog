import { ClientSdkError } from '../core/errors';
import { HttpClient } from '../core/http';

const isFailureEnvelope = (payload: unknown): boolean => {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      'success' in payload &&
      (payload as { success?: unknown }).success === false
  );
};

export interface HealthResourceClient {
  checkEndpoint(endpoint: string): Promise<void>;
  checkEndpoints(endpoints: string[]): Promise<void>;
}

export const createHealthResourceClient = (httpClient: HttpClient): HealthResourceClient => {
  return {
    async checkEndpoint(endpoint: string): Promise<void> {
      const payload = await httpClient.get<unknown>(endpoint);

      if (isFailureEnvelope(payload)) {
        const message = (payload as Record<string, any>)?.error?.message || 'Health check failed';
        throw new ClientSdkError(message, {
          endpoint,
          details: payload,
        });
      }
    },

    async checkEndpoints(endpoints: string[]): Promise<void> {
      await Promise.all(endpoints.map((endpoint) => this.checkEndpoint(endpoint)));
    },
  };
};
