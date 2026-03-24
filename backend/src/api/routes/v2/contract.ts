export const V2_SOCIAL_CONTRACT_VERSION = '2026-03-22' as const;
export const V2_SOCIAL_IMPLEMENTATION_TARGET = 'V2-W3-02' as const;
export const V2_SOCIAL_CONTRACT_STATE = 'CONTRACT_ONLY' as const;

export interface ContractOnlyPayload<TRequest = unknown> {
  contractVersion: typeof V2_SOCIAL_CONTRACT_VERSION;
  state: typeof V2_SOCIAL_CONTRACT_STATE;
  implementationTarget: typeof V2_SOCIAL_IMPLEMENTATION_TARGET;
  operation: string;
  route: string;
  request: TRequest;
  responseShape?: Record<string, string>;
}

export const buildContractOnlyPayload = <TRequest>(
  operation: string,
  route: string,
  request: TRequest,
  responseShape?: Record<string, string>
): ContractOnlyPayload<TRequest> => ({
  contractVersion: V2_SOCIAL_CONTRACT_VERSION,
  state: V2_SOCIAL_CONTRACT_STATE,
  implementationTarget: V2_SOCIAL_IMPLEMENTATION_TARGET,
  operation,
  route,
  request,
  ...(responseShape ? { responseShape } : {}),
});

export const parsePositiveInt = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

export const parseOptionalTrimmedString = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
};

export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
