import { AppError } from '../../middlewares/errorHandler';

export const COUNCIL_POLICY_RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type CouncilPolicyRiskLevel = (typeof COUNCIL_POLICY_RISK_LEVELS)[number];

export type CouncilRiskPolicyReason =
  | 'enabled'
  | 'policy_env_disabled'
  | 'policy_override_disabled';

export interface CouncilRiskPolicyLevelStatus {
  riskLevel: CouncilPolicyRiskLevel;
  envEnabled: boolean;
  overrideEnabled: boolean;
  effectiveEnabled: boolean;
  reason: CouncilRiskPolicyReason;
}

export interface CouncilRiskPolicyOverride {
  riskLevel: CouncilPolicyRiskLevel;
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  reason: string | null;
}

export interface CouncilRiskPolicySnapshot {
  levels: CouncilRiskPolicyLevelStatus[];
  overrides: CouncilRiskPolicyOverride[];
}

interface CouncilRiskPolicyOverrideState {
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  reason: string | null;
}

const POLICY_ENV_VAR_MAP: Record<CouncilPolicyRiskLevel, string> = {
  LOW: 'V3_COUNCIL_ALLOW_LOW_RISK',
  MEDIUM: 'V3_COUNCIL_ALLOW_MEDIUM_RISK',
  HIGH: 'V3_COUNCIL_ALLOW_HIGH_RISK',
};

const parseBoolean = (raw: string | undefined, fallback: boolean): boolean => {
  if (raw === undefined) {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
};

const createDefaultOverrideState = (): Record<CouncilPolicyRiskLevel, CouncilRiskPolicyOverrideState> => ({
  LOW: {
    enabled: true,
    updatedAt: null,
    updatedBy: null,
    reason: null,
  },
  MEDIUM: {
    enabled: true,
    updatedAt: null,
    updatedBy: null,
    reason: null,
  },
  HIGH: {
    enabled: true,
    updatedAt: null,
    updatedBy: null,
    reason: null,
  },
});

let riskLevelOverrideState = createDefaultOverrideState();

const readRiskEnvEnabled = (riskLevel: CouncilPolicyRiskLevel): boolean =>
  parseBoolean(process.env[POLICY_ENV_VAR_MAP[riskLevel]], true);

export const getCouncilRiskPolicySnapshot = (): CouncilRiskPolicySnapshot => {
  const overrides = COUNCIL_POLICY_RISK_LEVELS.map<CouncilRiskPolicyOverride>((riskLevel) => ({
    riskLevel,
    enabled: riskLevelOverrideState[riskLevel].enabled,
    updatedAt: riskLevelOverrideState[riskLevel].updatedAt,
    updatedBy: riskLevelOverrideState[riskLevel].updatedBy,
    reason: riskLevelOverrideState[riskLevel].reason,
  }));

  const levels = COUNCIL_POLICY_RISK_LEVELS.map<CouncilRiskPolicyLevelStatus>((riskLevel) => {
    const envEnabled = readRiskEnvEnabled(riskLevel);
    const overrideEnabled = riskLevelOverrideState[riskLevel].enabled;

    if (!envEnabled) {
      return {
        riskLevel,
        envEnabled: false,
        overrideEnabled,
        effectiveEnabled: false,
        reason: 'policy_env_disabled',
      };
    }

    if (!overrideEnabled) {
      return {
        riskLevel,
        envEnabled: true,
        overrideEnabled: false,
        effectiveEnabled: false,
        reason: 'policy_override_disabled',
      };
    }

    return {
      riskLevel,
      envEnabled: true,
      overrideEnabled: true,
      effectiveEnabled: true,
      reason: 'enabled',
    };
  });

  return {
    levels,
    overrides,
  };
};

export const setCouncilRiskLevelOverride = (input: {
  riskLevel: CouncilPolicyRiskLevel;
  enabled: boolean;
  updatedBy?: string | null;
  reason?: string | null;
}): CouncilRiskPolicySnapshot => {
  riskLevelOverrideState = {
    ...riskLevelOverrideState,
    [input.riskLevel]: {
      enabled: input.enabled,
      updatedAt: new Date().toISOString(),
      updatedBy: input.updatedBy?.trim().toLowerCase() || null,
      reason: input.reason?.trim() || null,
    },
  };

  return getCouncilRiskPolicySnapshot();
};

export const assertCouncilRiskLevelEnabled = (riskLevel: CouncilPolicyRiskLevel): void => {
  const snapshot = getCouncilRiskPolicySnapshot();
  const levelStatus = snapshot.levels.find((item) => item.riskLevel === riskLevel);

  if (levelStatus?.effectiveEnabled) {
    return;
  }

  throw new AppError(
    503,
    `council suggestions for risk level ${riskLevel} are disabled`,
    'COUNCIL_RISK_LEVEL_DISABLED',
    {
      riskLevel,
      reason: levelStatus?.reason || 'policy_override_disabled',
      envFlag: POLICY_ENV_VAR_MAP[riskLevel],
    }
  );
};

export const resetCouncilRiskPolicyForTest = (): void => {
  riskLevelOverrideState = createDefaultOverrideState();
};

export const isCouncilPolicyRiskLevel = (value: string): value is CouncilPolicyRiskLevel => {
  return COUNCIL_POLICY_RISK_LEVELS.includes(value as CouncilPolicyRiskLevel);
};
