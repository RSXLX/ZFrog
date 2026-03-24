import { ClientSdkError, toClientSdkError } from './errors';
import { emptySessionHeaders, HeaderMap, mergeHeaders, SessionHeaderResolver } from './session';
import { withRetry } from './retry';

export interface DeprecationMetadata {
  endpoint: string;
  deprecation?: string;
  sunset?: string;
  link?: string;
}

export interface HttpClientConfig {
  baseUrl: string;
  apiPrefix?: string;
  timeoutMs?: number;
  retries?: number;
  defaultHeaders?: HeaderMap;
  getAuthHeaders?: SessionHeaderResolver;
  fetchImpl?: typeof fetch;
  onDeprecation?: (metadata: DeprecationMetadata) => void;
}

export interface HttpRequestOptions {
  params?: Record<string, unknown>;
  headers?: HeaderMap;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
}

export interface HttpClient {
  request<T>(method: string, endpoint: string, options?: HttpRequestOptions): Promise<T>;
  get<T>(endpoint: string, options?: HttpRequestOptions): Promise<T>;
  post<T>(endpoint: string, options?: HttpRequestOptions): Promise<T>;
  put<T>(endpoint: string, options?: HttpRequestOptions): Promise<T>;
  delete<T>(endpoint: string, options?: HttpRequestOptions): Promise<T>;
}

const normalizeBaseUrl = (baseUrl: string): string => {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

const createRequestId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const withApiPrefix = (endpoint: string, apiPrefix: string): string => {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  if (endpoint.startsWith('/api')) {
    return endpoint;
  }

  if (endpoint.startsWith('/')) {
    return `${apiPrefix}${endpoint}`;
  }

  return `${apiPrefix}/${endpoint}`;
};

const buildQueryString = (params?: Record<string, unknown>): string => {
  if (!params || Object.keys(params).length === 0) {
    return '';
  }

  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }
    query.append(key, String(value));
  }

  const serialized = query.toString();
  return serialized.length > 0 ? `?${serialized}` : '';
};

const resolveUrl = (baseUrl: string, endpoint: string, params?: Record<string, unknown>): string => {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return `${endpoint}${buildQueryString(params)}`;
  }

  return `${normalizeBaseUrl(baseUrl)}${endpoint}${buildQueryString(params)}`;
};

const tryParseJson = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return response.text();
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
};

const normalizeRequestBody = (body: unknown): BodyInit | undefined => {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (body instanceof FormData) {
    return body;
  }

  if (typeof body === 'string') {
    return body;
  }

  return JSON.stringify(body);
};

export const createHttpClient = (config: HttpClientConfig): HttpClient => {
  const apiPrefix = config.apiPrefix ?? '/api';
  const timeoutMs = config.timeoutMs ?? 10000;
  const retries = config.retries ?? 1;
  const defaultHeaders = config.defaultHeaders ?? {};
  const fetchImpl = config.fetchImpl ?? fetch;
  const getAuthHeaders = config.getAuthHeaders ?? emptySessionHeaders;

  const request = async <T>(
    method: string,
    endpoint: string,
    options?: HttpRequestOptions
  ): Promise<T> => {
    const normalizedEndpoint = withApiPrefix(endpoint, apiPrefix);

    return withRetry(
      async () => {
        const authHeaders = await getAuthHeaders();
        const requestId = createRequestId();
        const correlationId = createRequestId();

        const mergedHeaders = mergeHeaders(defaultHeaders, authHeaders, options?.headers);
        mergedHeaders['x-request-id'] = mergedHeaders['x-request-id'] ?? requestId;
        mergedHeaders['x-correlation-id'] =
          mergedHeaders['x-correlation-id'] ?? correlationId;

        const body = normalizeRequestBody(options?.body);

        if (body && !(body instanceof FormData) && !mergedHeaders['Content-Type']) {
          mergedHeaders['Content-Type'] = 'application/json';
        }

        const controller = new AbortController();
        const timeoutHandle = setTimeout(() => controller.abort(), options?.timeoutMs ?? timeoutMs);

        try {
          const response = await fetchImpl(
            resolveUrl(config.baseUrl, normalizedEndpoint, options?.params),
            {
              method,
              headers: mergedHeaders,
              body,
              signal: options?.signal ?? controller.signal,
            }
          );

          const deprecation = response.headers.get('deprecation') ?? undefined;
          const sunset = response.headers.get('sunset') ?? undefined;
          const link = response.headers.get('link') ?? undefined;

          if (deprecation || sunset || link) {
            config.onDeprecation?.({
              endpoint: normalizedEndpoint,
              deprecation,
              sunset,
              link,
            });
          }

          const payload = await tryParseJson(response);

          if (!response.ok) {
            const envelopeError =
              payload &&
              typeof payload === 'object' &&
              'error' in payload &&
              typeof (payload as Record<string, unknown>).error === 'object'
                ? (payload as Record<string, any>).error
                : undefined;

            throw new ClientSdkError(
              envelopeError?.message || `Request failed (${response.status})`,
              {
                endpoint: normalizedEndpoint,
                status: response.status,
                code: envelopeError?.code,
                requestId:
                  (payload as Record<string, any>)?.meta?.requestId ||
                  response.headers.get('x-request-id') ||
                  undefined,
                details: payload,
              }
            );
          }

          return payload as T;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            throw new ClientSdkError('Request timeout', {
              endpoint: normalizedEndpoint,
              code: 'REQUEST_TIMEOUT',
              details: {
                timeoutMs: options?.timeoutMs ?? timeoutMs,
              },
            });
          }

          throw toClientSdkError(error, normalizedEndpoint);
        } finally {
          clearTimeout(timeoutHandle);
        }
      },
      {
        retries: options?.retries ?? retries,
      }
    );
  };

  return {
    request,
    get: <T>(endpoint: string, options?: HttpRequestOptions) =>
      request<T>('GET', endpoint, options),
    post: <T>(endpoint: string, options?: HttpRequestOptions) =>
      request<T>('POST', endpoint, options),
    put: <T>(endpoint: string, options?: HttpRequestOptions) =>
      request<T>('PUT', endpoint, options),
    delete: <T>(endpoint: string, options?: HttpRequestOptions) =>
      request<T>('DELETE', endpoint, options),
  };
};
