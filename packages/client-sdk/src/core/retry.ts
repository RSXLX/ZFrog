import { ClientSdkError } from './errors';

export interface RetryContext {
  attempt: number;
  maxAttempts: number;
  error: unknown;
}

export interface RetryPolicy {
  retries: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (context: RetryContext) => boolean;
}

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const defaultShouldRetry = ({ error }: RetryContext): boolean => {
  if (error instanceof ClientSdkError && error.status !== undefined) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }
  return true;
};

const computeDelayMs = (attempt: number, baseDelayMs: number, maxDelayMs: number): number => {
  const value = baseDelayMs * 2 ** (attempt - 1);
  return Math.min(value, maxDelayMs);
};

export const withRetry = async <T>(
  executor: (attempt: number) => Promise<T>,
  policy: RetryPolicy
): Promise<T> => {
  const maxAttempts = policy.retries + 1;
  const baseDelayMs = policy.baseDelayMs ?? 150;
  const maxDelayMs = policy.maxDelayMs ?? 1500;
  const shouldRetry = policy.shouldRetry ?? defaultShouldRetry;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await executor(attempt);
    } catch (error) {
      lastError = error;

      if (attempt >= maxAttempts) {
        break;
      }

      const retryAllowed = shouldRetry({
        attempt,
        maxAttempts,
        error,
      });

      if (!retryAllowed) {
        break;
      }

      await sleep(computeDelayMs(attempt, baseDelayMs, maxDelayMs));
    }
  }

  throw lastError;
};
