import { ClientSdkError } from '../core/errors';

interface EnvelopeErrorLike {
  message?: string;
  code?: string;
  details?: unknown;
}

interface EnvelopeLike<T = unknown> {
  success: boolean;
  data?: T;
  error?: EnvelopeErrorLike | string;
  message?: string;
  meta?: {
    requestId?: string;
    [key: string]: unknown;
  };
}

const isEnvelopeLike = <T = unknown>(value: unknown): value is EnvelopeLike<T> => {
  return Boolean(value && typeof value === 'object' && 'success' in value);
};

const normalizeEnvelopeError = (
  error: EnvelopeErrorLike | string | undefined,
  fallbackMessage: string
): EnvelopeErrorLike => {
  if (typeof error === 'string') {
    return { message: error };
  }

  if (error && typeof error === 'object') {
    return error;
  }

  return { message: fallbackMessage };
};

export const unwrapEnvelope = <T>(
  payload: unknown,
  fallbackMessage = 'Request failed'
): T => {
  if (!isEnvelopeLike<T>(payload)) {
    return payload as T;
  }

  if (payload.success) {
    return payload.data as T;
  }

  const normalizedError = normalizeEnvelopeError(payload.error, fallbackMessage);
  throw new ClientSdkError(
    normalizedError.message || payload.message || fallbackMessage,
    {
      code: normalizedError.code,
      details: normalizedError.details,
      requestId: payload.meta?.requestId,
    }
  );
};
