import { Request } from 'express';
import { AppError } from '../../middlewares/errorHandler';

export const V3_RUNTIME_MODULES = [
  'journey',
  'council',
  'memory',
  'creator',
  'partner',
  'relationshipGraph',
] as const;

export type V3RuntimeModule = (typeof V3_RUNTIME_MODULES)[number];

export type V3RuntimeModuleReason =
  | 'enabled'
  | 'runtime_disabled'
  | 'kill_switch_active'
  | 'module_env_disabled'
  | 'module_override_disabled';

export interface V3RuntimeModuleStatus {
  module: V3RuntimeModule;
  envEnabled: boolean;
  overrideEnabled: boolean;
  effectiveEnabled: boolean;
  reason: V3RuntimeModuleReason;
}

export interface V3RuntimeModuleOverride {
  module: V3RuntimeModule;
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  reason: string | null;
}

export interface V3RuntimeStatus {
  enabled: boolean;
  effectiveEnabled: boolean;
  killSwitchActive: boolean;
  env: {
    enabled: boolean;
    killSwitchActive: boolean;
  };
  override: {
    active: boolean;
    updatedAt: string | null;
    updatedBy: string | null;
    reason: string | null;
  };
  modules: V3RuntimeModuleStatus[];
  moduleOverrides: V3RuntimeModuleOverride[];
}

interface KillSwitchOverrideState {
  active: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  reason: string | null;
}

interface ModuleOverrideState {
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  reason: string | null;
}

const DEFAULT_RUNTIME_ENABLED = false;
const DEFAULT_KILL_SWITCH_ACTIVE = false;

const MODULE_ENV_VAR_MAP: Record<V3RuntimeModule, string> = {
  journey: 'V3_RUNTIME_JOURNEY_ENABLED',
  council: 'V3_RUNTIME_COUNCIL_ENABLED',
  memory: 'V3_RUNTIME_MEMORY_ENABLED',
  creator: 'V3_RUNTIME_CREATOR_ENABLED',
  partner: 'V3_RUNTIME_PARTNER_ENABLED',
  relationshipGraph: 'V3_RUNTIME_RELATIONSHIP_GRAPH_ENABLED',
};

let killSwitchOverrideState: KillSwitchOverrideState = {
  active: false,
  updatedAt: null,
  updatedBy: null,
  reason: null,
};

const createDefaultModuleOverrideState = (): Record<V3RuntimeModule, ModuleOverrideState> => ({
  journey: {
    enabled: true,
    updatedAt: null,
    updatedBy: null,
    reason: null,
  },
  council: {
    enabled: true,
    updatedAt: null,
    updatedBy: null,
    reason: null,
  },
  memory: {
    enabled: true,
    updatedAt: null,
    updatedBy: null,
    reason: null,
  },
  creator: {
    enabled: true,
    updatedAt: null,
    updatedBy: null,
    reason: null,
  },
  partner: {
    enabled: true,
    updatedAt: null,
    updatedBy: null,
    reason: null,
  },
  relationshipGraph: {
    enabled: true,
    updatedAt: null,
    updatedBy: null,
    reason: null,
  },
});

let moduleOverrideState: Record<V3RuntimeModule, ModuleOverrideState> =
  createDefaultModuleOverrideState();

const parseBoolean = (raw: string | undefined, fallback: boolean): boolean => {
  if (raw === undefined) {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
};

const readBaseRuntimeEnabled = (): boolean =>
  parseBoolean(process.env.V3_RUNTIME_ENABLED, DEFAULT_RUNTIME_ENABLED);

const readEnvKillSwitchActive = (): boolean =>
  parseBoolean(process.env.V3_RUNTIME_KILL_SWITCH, DEFAULT_KILL_SWITCH_ACTIVE);

const readModuleEnvEnabled = (module: V3RuntimeModule): boolean =>
  parseBoolean(process.env[MODULE_ENV_VAR_MAP[module]], true);

export const getV3RuntimeActor = (req: Request): string | null =>
  req.user?.walletAddress?.toLowerCase() ||
  req.user?.address?.toLowerCase() ||
  (typeof req.headers['x-admin-address'] === 'string'
    ? req.headers['x-admin-address'].toLowerCase()
    : null);

export const getV3RuntimeStatusSnapshot = (): V3RuntimeStatus => {
  const envEnabled = readBaseRuntimeEnabled();
  const envKillSwitchActive = readEnvKillSwitchActive();
  const killSwitchActive = envKillSwitchActive || killSwitchOverrideState.active;
  const effectiveEnabled = envEnabled && !killSwitchActive;
  const moduleOverrides = V3_RUNTIME_MODULES.map<V3RuntimeModuleOverride>((module) => ({
    module,
    enabled: moduleOverrideState[module].enabled,
    updatedAt: moduleOverrideState[module].updatedAt,
    updatedBy: moduleOverrideState[module].updatedBy,
    reason: moduleOverrideState[module].reason,
  }));

  const modules = V3_RUNTIME_MODULES.map<V3RuntimeModuleStatus>((module) => {
    const envModuleEnabled = readModuleEnvEnabled(module);
    const moduleOverrideEnabled = moduleOverrideState[module].enabled;

    if (!envEnabled) {
      return {
        module,
        envEnabled: envModuleEnabled,
        overrideEnabled: moduleOverrideEnabled,
        effectiveEnabled: false,
        reason: 'runtime_disabled',
      };
    }

    if (killSwitchActive) {
      return {
        module,
        envEnabled: envModuleEnabled,
        overrideEnabled: moduleOverrideEnabled,
        effectiveEnabled: false,
        reason: 'kill_switch_active',
      };
    }

    if (!envModuleEnabled) {
      return {
        module,
        envEnabled: false,
        overrideEnabled: moduleOverrideEnabled,
        effectiveEnabled: false,
        reason: 'module_env_disabled',
      };
    }

    if (!moduleOverrideEnabled) {
      return {
        module,
        envEnabled: true,
        overrideEnabled: false,
        effectiveEnabled: false,
        reason: 'module_override_disabled',
      };
    }

    return {
      module,
      envEnabled: true,
      overrideEnabled: true,
      effectiveEnabled: true,
      reason: 'enabled',
    };
  });

  return {
    enabled: envEnabled,
    effectiveEnabled,
    killSwitchActive,
    env: {
      enabled: envEnabled,
      killSwitchActive: envKillSwitchActive,
    },
    override: {
      ...killSwitchOverrideState,
    },
    modules,
    moduleOverrides,
  };
};

export const setV3KillSwitchOverride = (input: {
  active: boolean;
  updatedBy?: string | null;
  reason?: string | null;
}): V3RuntimeStatus => {
  killSwitchOverrideState = {
    active: input.active,
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy?.trim().toLowerCase() || null,
    reason: input.reason?.trim() || null,
  };

  return getV3RuntimeStatusSnapshot();
};

export const setV3ModuleOverride = (input: {
  module: V3RuntimeModule;
  enabled: boolean;
  updatedBy?: string | null;
  reason?: string | null;
}): V3RuntimeStatus => {
  moduleOverrideState = {
    ...moduleOverrideState,
    [input.module]: {
      enabled: input.enabled,
      updatedAt: new Date().toISOString(),
      updatedBy: input.updatedBy?.trim().toLowerCase() || null,
      reason: input.reason?.trim() || null,
    },
  };

  return getV3RuntimeStatusSnapshot();
};

export const resetV3RuntimeStateForTest = (): void => {
  killSwitchOverrideState = {
    active: false,
    updatedAt: null,
    updatedBy: null,
    reason: null,
  };
  moduleOverrideState = createDefaultModuleOverrideState();
};

export const assertV3RuntimeEnabled = (module?: V3RuntimeModule): void => {
  const snapshot = getV3RuntimeStatusSnapshot();

  if (!snapshot.effectiveEnabled) {
    throw new AppError(503, 'V3 runtime is disabled', 'V3_RUNTIME_DISABLED', {
      killSwitchActive: snapshot.killSwitchActive,
      runtimeEnabled: snapshot.enabled,
      module: module || null,
    });
  }

  if (!module) {
    return;
  }

  const moduleStatus = snapshot.modules.find((item) => item.module === module);
  if (!moduleStatus?.effectiveEnabled) {
    throw new AppError(503, `V3 module ${module} is disabled`, 'V3_MODULE_DISABLED', {
      module,
      reason: moduleStatus?.reason || 'module_override_disabled',
    });
  }
};
