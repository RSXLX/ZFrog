import { z } from 'zod';
import {
  integrationAppStatusSchema,
  integrationAppTypeSchema,
  integrationKeyStatusSchema,
  integrationPermissionSchema,
} from './integration.schema';
import { V3_RUNTIME_MODULES } from '../types/runtime';

export const v3RuntimeModuleSchema = z.enum(V3_RUNTIME_MODULES);

export const v3RuntimeModuleStatusSchema = z.object({
  module: v3RuntimeModuleSchema,
  envEnabled: z.boolean(),
  overrideEnabled: z.boolean(),
  effectiveEnabled: z.boolean(),
  reason: z.enum([
    'enabled',
    'runtime_disabled',
    'kill_switch_active',
    'module_env_disabled',
    'module_override_disabled',
  ]),
});

export const v3RuntimeKillSwitchOverrideSchema = z.object({
  active: z.boolean(),
  updatedAt: z.string().datetime().nullable(),
  updatedBy: z.string().nullable(),
  reason: z.string().nullable(),
});

export const v3RuntimeStatusSchema = z.object({
  enabled: z.boolean(),
  effectiveEnabled: z.boolean(),
  killSwitchActive: z.boolean(),
  env: z.object({
    enabled: z.boolean(),
    killSwitchActive: z.boolean(),
  }),
  override: v3RuntimeKillSwitchOverrideSchema,
  modules: z.array(v3RuntimeModuleStatusSchema),
  moduleOverrides: z.array(
    z.object({
      module: v3RuntimeModuleSchema,
      enabled: z.boolean(),
      updatedAt: z.string().datetime().nullable(),
      updatedBy: z.string().nullable(),
      reason: z.string().nullable(),
    })
  ),
});

export const v3RuntimeViewerAppSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  appType: integrationAppTypeSchema,
  status: integrationAppStatusSchema,
});

export const v3RuntimeViewerKeySchema = z.object({
  id: z.string().min(1),
  keyPrefix: z.string().min(1),
  label: z.string().nullable(),
  status: integrationKeyStatusSchema,
  issuedBy: z.string().nullable(),
  issuedAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
  lastUsedAt: z.string().datetime().nullable(),
});

export const v3RuntimeModuleCapabilitySchema = z.object({
  module: v3RuntimeModuleSchema,
  grantedPermissions: z.array(integrationPermissionSchema),
  canRead: z.boolean(),
  canWrite: z.boolean(),
  runtimeEnabled: z.boolean(),
  runtimeReason: z.enum([
    'enabled',
    'runtime_disabled',
    'kill_switch_active',
    'module_env_disabled',
    'module_override_disabled',
  ]),
});

export const v3RuntimeAccessSchema = z.object({
  app: v3RuntimeViewerAppSchema,
  key: v3RuntimeViewerKeySchema,
  permissions: z.array(integrationPermissionSchema),
  hasRuntimeRead: z.boolean(),
  moduleCapabilities: z.array(v3RuntimeModuleCapabilitySchema),
});

export const v3RuntimeStatusViewSchema = v3RuntimeStatusSchema.extend({
  access: v3RuntimeAccessSchema,
});

export const v3RuntimeKillSwitchInputSchema = z.object({
  active: z.boolean(),
  reason: z.string().trim().max(200).nullable().optional(),
});
