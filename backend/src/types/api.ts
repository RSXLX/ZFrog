export interface ApiMeta {
  requestId: string;
  timestamp: string;
  [key: string]: unknown;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
  meta: ApiMeta;
}

export type ApiEnvelope<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
