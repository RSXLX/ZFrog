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

export const isV3DashboardAdminBetaEnabled = (): boolean => {
  const fromWindow =
    typeof window !== 'undefined'
      ? (window as unknown as { __ZFROG_ADMIN_V3_DASHBOARD_BETA__?: unknown })
          .__ZFROG_ADMIN_V3_DASHBOARD_BETA__
      : undefined;

  const parsedWindow = readBooleanFlag(fromWindow);
  if (parsedWindow !== null) {
    return parsedWindow;
  }

  return readBooleanFlag(import.meta.env.VITE_V3_DASHBOARD_BETA_ENABLED) ?? false;
};
