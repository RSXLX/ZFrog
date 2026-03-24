import { z } from 'zod';
import {
  INTEGRATION_APP_STATUSES,
  INTEGRATION_APP_TYPES,
  INTEGRATION_KEY_STATUSES,
  INTEGRATION_PERMISSION_VALUES,
} from '../types/integration';

export const integrationAppTypeSchema = z.enum(INTEGRATION_APP_TYPES);
export const integrationAppStatusSchema = z.enum(INTEGRATION_APP_STATUSES);
export const integrationKeyStatusSchema = z.enum(INTEGRATION_KEY_STATUSES);
export const integrationPermissionSchema = z.enum(INTEGRATION_PERMISSION_VALUES);

export const integrationRegistryCatalogSchema = z.object({
  appTypes: z.array(integrationAppTypeSchema),
  appStatuses: z.array(integrationAppStatusSchema),
  keyStatuses: z.array(integrationKeyStatusSchema),
  permissions: z.array(integrationPermissionSchema),
});

export const integrationKeyReadModelSchema = z.object({
  id: z.string().min(1),
  keyPrefix: z.string().min(1),
  label: z.string().nullable(),
  status: integrationKeyStatusSchema,
  issuedBy: z.string().nullable(),
  issuedAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
  lastUsedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const integrationAppReadModelSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  appType: integrationAppTypeSchema,
  status: integrationAppStatusSchema,
  permissions: z.array(integrationPermissionSchema),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  keys: z.array(integrationKeyReadModelSchema),
});

export const registerIntegrationAppPayloadSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  appType: integrationAppTypeSchema,
  permissions: z.array(integrationPermissionSchema).min(1),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const issueIntegrationKeyPayloadSchema = z.object({
  label: z.string().trim().max(80).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const issueIntegrationKeyResultSchema = z.object({
  app: integrationAppReadModelSchema,
  key: integrationKeyReadModelSchema,
  secret: z.string().min(1),
});
