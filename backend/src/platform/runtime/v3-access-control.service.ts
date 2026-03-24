import {
  AuthenticatedIntegrationContext,
  IntegrationPermissionValue,
} from '../integrations/integration-registry.service';
import {
  getV3RuntimeStatusSnapshot,
  V3RuntimeModule,
  V3RuntimeModuleReason,
  V3RuntimeStatus,
} from './v3-runtime.service';

export type V3ModuleAction = 'read' | 'write';

export interface V3RuntimeModuleCapability {
  module: V3RuntimeModule;
  grantedPermissions: IntegrationPermissionValue[];
  canRead: boolean;
  canWrite: boolean;
  runtimeEnabled: boolean;
  runtimeReason: V3RuntimeModuleReason;
}

export interface V3RuntimeStatusView extends V3RuntimeStatus {
  access: {
    app: AuthenticatedIntegrationContext['app'];
    key: AuthenticatedIntegrationContext['key'];
    permissions: IntegrationPermissionValue[];
    hasRuntimeRead: boolean;
    moduleCapabilities: V3RuntimeModuleCapability[];
  };
}

type ModuleCapabilityGrant = {
  module: V3RuntimeModule;
  action: V3ModuleAction;
};

const PERMISSION_TO_MODULE_CAPABILITY: Partial<
  Record<IntegrationPermissionValue, ModuleCapabilityGrant>
> = {
  'journey.read': { module: 'journey', action: 'read' },
  'journey.write': { module: 'journey', action: 'write' },
  'council.read': { module: 'council', action: 'read' },
  'council.write': { module: 'council', action: 'write' },
  'memory.read': { module: 'memory', action: 'read' },
  'memory.write': { module: 'memory', action: 'write' },
  'creator.asset.write': { module: 'creator', action: 'write' },
  'creator.pack.write': { module: 'creator', action: 'write' },
  'partner.campaign.write': { module: 'partner', action: 'write' },
  'relationship_graph.read': { module: 'relationshipGraph', action: 'read' },
};

export const buildV3ModuleCapabilities = (
  permissions: IntegrationPermissionValue[],
  runtimeSnapshot: V3RuntimeStatus = getV3RuntimeStatusSnapshot()
): V3RuntimeModuleCapability[] => {
  const capabilitySeed = new Map<
    V3RuntimeModule,
    {
      grantedPermissions: Set<IntegrationPermissionValue>;
      canRead: boolean;
      canWrite: boolean;
    }
  >();

  for (const moduleStatus of runtimeSnapshot.modules) {
    capabilitySeed.set(moduleStatus.module, {
      grantedPermissions: new Set<IntegrationPermissionValue>(),
      canRead: false,
      canWrite: false,
    });
  }

  for (const permission of permissions) {
    const grant = PERMISSION_TO_MODULE_CAPABILITY[permission];
    if (!grant) {
      continue;
    }

    const current = capabilitySeed.get(grant.module);
    if (!current) {
      continue;
    }

    current.grantedPermissions.add(permission);
    if (grant.action === 'read') {
      current.canRead = true;
      continue;
    }

    current.canRead = true;
    current.canWrite = true;
  }

  return runtimeSnapshot.modules
    .map<V3RuntimeModuleCapability>((moduleStatus) => {
      const current = capabilitySeed.get(moduleStatus.module);
      return {
        module: moduleStatus.module,
        grantedPermissions: Array.from(current?.grantedPermissions || []).sort() as IntegrationPermissionValue[],
        canRead: current?.canRead || false,
        canWrite: current?.canWrite || false,
        runtimeEnabled: moduleStatus.effectiveEnabled,
        runtimeReason: moduleStatus.reason,
      };
    })
    .filter((item) => item.grantedPermissions.length > 0);
};

export const hasRuntimeReadPermission = (
  permissions: IntegrationPermissionValue[]
): boolean => permissions.includes('runtime.read');

export const hasV3ModuleCapability = (
  capabilities: V3RuntimeModuleCapability[],
  module: V3RuntimeModule,
  action: V3ModuleAction
): boolean => {
  const capability = capabilities.find((item) => item.module === module);
  if (!capability) {
    return false;
  }

  if (action === 'write') {
    return capability.canWrite;
  }

  return capability.canRead;
};

export const buildV3RuntimeStatusView = (
  integration: AuthenticatedIntegrationContext,
  runtimeSnapshot: V3RuntimeStatus = getV3RuntimeStatusSnapshot()
): V3RuntimeStatusView => ({
  ...runtimeSnapshot,
  access: {
    app: integration.app,
    key: integration.key,
    permissions: [...integration.permissions],
    hasRuntimeRead: hasRuntimeReadPermission(integration.permissions),
    moduleCapabilities: buildV3ModuleCapabilities(integration.permissions, runtimeSnapshot),
  },
});
