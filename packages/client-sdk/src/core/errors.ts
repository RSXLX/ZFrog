export interface ClientSdkErrorOptions {
  status?: number;
  code?: string;
  details?: unknown;
  requestId?: string;
  endpoint?: string;
  cause?: unknown;
}

export class ClientSdkError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly details?: unknown;
  readonly requestId?: string;
  readonly endpoint?: string;

  constructor(message: string, options?: ClientSdkErrorOptions) {
    super(message);
    this.name = 'ClientSdkError';
    this.status = options?.status;
    this.code = options?.code;
    this.details = options?.details;
    this.requestId = options?.requestId;
    this.endpoint = options?.endpoint;

    if (options?.cause !== undefined && 'cause' in Error.prototype) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export const toClientSdkError = (error: unknown, endpoint?: string): ClientSdkError => {
  if (error instanceof ClientSdkError) {
    return error;
  }

  if (error instanceof Error) {
    return new ClientSdkError(error.message, {
      endpoint,
      cause: error,
    });
  }

  return new ClientSdkError('Unexpected SDK error', {
    endpoint,
    details: error,
  });
};
