import type { ApiEnvelope, ApiError, ApiFailureEnvelope } from './contracts';

export class ApiClientError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(
    message: string,
    options?: {
      status?: number;
      code?: string;
      details?: unknown;
      requestId?: string;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = options?.status;
    this.code = options?.code;
    this.details = options?.details;
    this.requestId = options?.requestId;
    if (options?.cause !== undefined) {
      (this as any).cause = options.cause;
    }
  }
}

const normalizeErrorBody = (error: ApiError | string | undefined): ApiError => {
  if (typeof error === 'string') {
    return { message: error };
  }
  return error || { message: 'Request failed' };
};

export const unwrapApiEnvelope = <T>(
  payload: ApiEnvelope<T> | T,
  fallbackMessage = 'Request failed'
): T => {
  if (payload && typeof payload === 'object' && 'success' in (payload as any)) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.success) {
      return envelope.data;
    }

    const normalizedError = normalizeErrorBody((envelope as ApiFailureEnvelope).error);
    throw new ApiClientError(normalizedError.message || fallbackMessage, {
      code: normalizedError.code,
      details: normalizedError.details,
      requestId: (envelope as ApiFailureEnvelope).meta?.requestId as string | undefined,
    });
  }

  return payload as T;
};

export const toApiClientError = (
  error: unknown,
  fallbackMessage = 'Request failed'
): ApiClientError => {
  if (error instanceof ApiClientError) {
    return error;
  }

  const rawError = error as any;
  const status = rawError?.response?.status ?? rawError?.status;
  const responseData = rawError?.response?.data ?? rawError?.data;

  let message: string | undefined;
  let code: string | undefined;
  let details: unknown;
  let requestId: string | undefined;

  if (responseData && typeof responseData === 'object') {
    if ('success' in responseData && responseData.success === false) {
      const normalizedError = normalizeErrorBody(responseData.error);
      message = normalizedError.message;
      code = normalizedError.code;
      details = normalizedError.details;
      requestId = responseData?.meta?.requestId;
    } else if (typeof responseData.message === 'string') {
      message = responseData.message;
    } else if (responseData.error) {
      const normalizedError = normalizeErrorBody(responseData.error);
      message = normalizedError.message;
      code = normalizedError.code;
      details = normalizedError.details;
    }
  }

  if (!message && typeof rawError?.message === 'string') {
    message = rawError.message;
  }

  return new ApiClientError(message || fallbackMessage, {
    status,
    code,
    details,
    requestId,
    cause: error,
  });
};
