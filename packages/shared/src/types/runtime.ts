import type {
  IntegrationAppStatus,
  IntegrationAppType,
  IntegrationKeyStatus,
  IntegrationPermission,
} from './integration';

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

export interface V3RuntimeKillSwitchOverride {
  active: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
  reason: string | null;
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
  override: V3RuntimeKillSwitchOverride;
  modules: V3RuntimeModuleStatus[];
  moduleOverrides: V3RuntimeModuleOverride[];
}

export interface V3RuntimeViewerApp {
  id: string;
  slug: string;
  name: string;
  appType: IntegrationAppType;
  status: IntegrationAppStatus;
}

export interface V3RuntimeViewerKey {
  id: string;
  keyPrefix: string;
  label: string | null;
  status: IntegrationKeyStatus;
  issuedBy: string | null;
  issuedAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
}

export interface V3RuntimeModuleCapability {
  module: V3RuntimeModule;
  grantedPermissions: IntegrationPermission[];
  canRead: boolean;
  canWrite: boolean;
  runtimeEnabled: boolean;
  runtimeReason: V3RuntimeModuleReason;
}

export interface V3RuntimeAccess {
  app: V3RuntimeViewerApp;
  key: V3RuntimeViewerKey;
  permissions: IntegrationPermission[];
  hasRuntimeRead: boolean;
  moduleCapabilities: V3RuntimeModuleCapability[];
}

export interface V3RuntimeStatusView extends V3RuntimeStatus {
  access: V3RuntimeAccess;
}

export interface V3RuntimeKillSwitchInput {
  active: boolean;
  reason?: string | null;
}
