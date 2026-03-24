export interface ApiMeta {
  requestId?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface ApiErrorBody {
  code?: string;
  message: string;
  details?: unknown;
}

export interface ApiSuccessEnvelope<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: ApiMeta;
}

export interface ApiFailureEnvelope {
  success: false;
  error: ApiErrorBody | string;
  message?: string;
  meta?: ApiMeta;
}

export type ApiEnvelope<T = unknown> = ApiSuccessEnvelope<T> | ApiFailureEnvelope;

export type ErrorCode =
  | 'INVALID_INPUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | (string & {});

export const isApiEnvelope = (value: unknown): value is ApiEnvelope<unknown> => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return 'success' in value;
};

export const isApiFailureEnvelope = (value: unknown): value is ApiFailureEnvelope => {
  return isApiEnvelope(value) && value.success === false;
};

export const isApiSuccessEnvelope = <T = unknown>(
  value: unknown
): value is ApiSuccessEnvelope<T> => {
  return isApiEnvelope(value) && value.success === true;
};
