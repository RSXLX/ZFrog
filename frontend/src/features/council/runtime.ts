const truthyValues = new Set(['1', 'true', 'yes', 'on']);

const readBooleanFlag = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    return truthyValues.has(normalized);
  }

  return null;
};

const readStringValue = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const isCouncilBetaEnabled = (): boolean => {
  const fromWindow =
    typeof window !== 'undefined'
      ? (window as unknown as { __ZFROG_V3_COUNCIL_BETA__?: unknown }).__ZFROG_V3_COUNCIL_BETA__
      : undefined;
  const parsedWindow = readBooleanFlag(fromWindow);
  if (parsedWindow !== null) {
    return parsedWindow;
  }

  const parsedImportMeta = readBooleanFlag(import.meta.env.VITE_V3_COUNCIL_BETA_ENABLED);
  if (parsedImportMeta !== null) {
    return parsedImportMeta;
  }

  const fromProcess =
    typeof process !== 'undefined' && process.env
      ? process.env.VITE_V3_COUNCIL_BETA_ENABLED
      : undefined;
  return readBooleanFlag(fromProcess) ?? false;
};

export const getCouncilIntegrationApiKeySeed = (): string | null => {
  const fromWindow =
    typeof window !== 'undefined'
      ? (window as unknown as { __ZFROG_V3_INTEGRATION_API_KEY__?: unknown })
          .__ZFROG_V3_INTEGRATION_API_KEY__
      : undefined;
  const parsedWindow = readStringValue(fromWindow);
  if (parsedWindow) {
    return parsedWindow;
  }

  const parsedImportMeta = readStringValue(
    import.meta.env.VITE_V3_COUNCIL_INTEGRATION_API_KEY || import.meta.env.VITE_V3_INTEGRATION_API_KEY
  );
  if (parsedImportMeta) {
    return parsedImportMeta;
  }

  const fromProcess =
    typeof process !== 'undefined' && process.env
      ? process.env.VITE_V3_COUNCIL_INTEGRATION_API_KEY || process.env.VITE_V3_INTEGRATION_API_KEY
      : undefined;
  return readStringValue(fromProcess);
};
