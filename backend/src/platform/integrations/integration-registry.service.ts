import { createHash, randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { V3IntegrationErrorCodes } from '../../types/api';

export const INTEGRATION_APP_TYPES = ['INTERNAL', 'CREATOR', 'PARTNER', 'PLUGIN'] as const;
export const INTEGRATION_APP_STATUSES = ['ACTIVE', 'DISABLED'] as const;
export const INTEGRATION_KEY_STATUSES = ['ACTIVE', 'REVOKED', 'EXPIRED'] as const;
export const INTEGRATION_PERMISSION_VALUES = [
  'runtime.read',
  'journey.read',
  'journey.write',
  'council.read',
  'council.write',
  'memory.read',
  'memory.write',
  'creator.asset.write',
  'creator.pack.write',
  'partner.campaign.write',
  'relationship_graph.read',
] as const;

export type IntegrationAppType = (typeof INTEGRATION_APP_TYPES)[number];
export type IntegrationAppStatus = (typeof INTEGRATION_APP_STATUSES)[number];
export type IntegrationKeyStatus = (typeof INTEGRATION_KEY_STATUSES)[number];
export type IntegrationPermissionValue = (typeof INTEGRATION_PERMISSION_VALUES)[number];

export interface IntegrationKeyReadModel {
  id: string;
  keyPrefix: string;
  label: string | null;
  status: IntegrationKeyStatus;
  issuedBy: string | null;
  issuedAt: string;
  revokedAt: string | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationAppReadModel {
  id: string;
  slug: string;
  name: string;
  appType: IntegrationAppType;
  status: IntegrationAppStatus;
  permissions: IntegrationPermissionValue[];
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  keys: IntegrationKeyReadModel[];
}

export interface IntegrationRegistryCatalog {
  appTypes: IntegrationAppType[];
  appStatuses: IntegrationAppStatus[];
  keyStatuses: IntegrationKeyStatus[];
  permissions: IntegrationPermissionValue[];
}

export interface RegisterIntegrationAppInput {
  slug: string;
  name: string;
  appType: string;
  permissions: unknown;
  metadata?: unknown;
  requestId?: string;
  source?: string;
}

export interface IssueIntegrationKeyInput {
  appId: string;
  label?: string | null;
  expiresAt?: string | null;
  issuedBy?: string | null;
  requestId?: string;
  source?: string;
}

export interface RevokeIntegrationKeyInput {
  appId: string;
  keyId: string;
  revokedBy?: string | null;
  requestId?: string;
  source?: string;
}

export interface IssueIntegrationKeyResult {
  app: IntegrationAppReadModel;
  key: IntegrationKeyReadModel;
  secret: string;
}

export interface AuthenticatedIntegrationApp {
  id: string;
  slug: string;
  name: string;
  appType: IntegrationAppType;
  status: IntegrationAppStatus;
}

export interface AuthenticatedIntegrationKey {
  id: string;
  keyPrefix: string;
  label: string | null;
  status: IntegrationKeyStatus;
  issuedBy: string | null;
  issuedAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
}

export interface AuthenticatedIntegrationContext {
  app: AuthenticatedIntegrationApp;
  key: AuthenticatedIntegrationKey;
  permissions: IntegrationPermissionValue[];
}

type Tx = Prisma.TransactionClient;

type IntegrationAppWithRelations = Prisma.IntegrationAppGetPayload<{
  include: {
    permissions: true;
    keys: {
      orderBy: {
        issuedAt: 'desc';
      };
    };
  };
}>;

type IntegrationKeyWithAppPermissions = Prisma.IntegrationKeyGetPayload<{
  include: {
    app: {
      include: {
        permissions: true;
      };
    };
  };
}>;

const INTEGRATION_PERMISSION_SET = new Set<string>(INTEGRATION_PERMISSION_VALUES);
const INTEGRATION_APP_TYPE_SET = new Set<string>(INTEGRATION_APP_TYPES);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const sanitizeSlug = (value: unknown): string => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!normalized) {
    throw new AppError(
      400,
      'slug is required',
      V3IntegrationErrorCodes.INTEGRATION_INVALID_INPUT
    );
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw new AppError(
      400,
      'slug must contain only lowercase letters, numbers, and hyphens',
      V3IntegrationErrorCodes.INTEGRATION_INVALID_INPUT
    );
  }
  if (normalized.length > 64) {
    throw new AppError(
      400,
      'slug must be <= 64 characters',
      V3IntegrationErrorCodes.INTEGRATION_INVALID_INPUT
    );
  }
  return normalized;
};

const sanitizeName = (value: unknown): string => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    throw new AppError(
      400,
      'name is required',
      V3IntegrationErrorCodes.INTEGRATION_INVALID_INPUT
    );
  }
  if (normalized.length > 80) {
    throw new AppError(
      400,
      'name must be <= 80 characters',
      V3IntegrationErrorCodes.INTEGRATION_INVALID_INPUT
    );
  }
  return normalized;
};

const sanitizeAppType = (value: unknown): IntegrationAppType => {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  if (!INTEGRATION_APP_TYPE_SET.has(normalized)) {
    throw new AppError(
      400,
      `appType must be one of ${INTEGRATION_APP_TYPES.join(', ')}`,
      V3IntegrationErrorCodes.INTEGRATION_INVALID_INPUT
    );
  }
  return normalized as IntegrationAppType;
};

const sanitizePermissions = (value: unknown): IntegrationPermissionValue[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AppError(
      400,
      'permissions must be a non-empty array',
      V3IntegrationErrorCodes.INTEGRATION_INVALID_INPUT
    );
  }

  const normalized = Array.from(
    new Set(
      value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
    )
  );

  if (normalized.length === 0) {
    throw new AppError(
      400,
      'permissions must be a non-empty array',
      V3IntegrationErrorCodes.INTEGRATION_INVALID_INPUT
    );
  }

  const invalid = normalized.filter((permission) => !INTEGRATION_PERMISSION_SET.has(permission));
  if (invalid.length > 0) {
    throw new AppError(
      400,
      `unsupported permissions: ${invalid.join(', ')}`,
      V3IntegrationErrorCodes.INTEGRATION_PERMISSION_INVALID
    );
  }

  return normalized.sort() as IntegrationPermissionValue[];
};

const sanitizeMetadata = (value: unknown): Record<string, unknown> | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (!isPlainObject(value)) {
    throw new AppError(
      400,
      'metadata must be an object',
      V3IntegrationErrorCodes.INTEGRATION_INVALID_INPUT
    );
  }
  return value;
};

const sanitizeOptionalLabel = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }
  if (normalized.length > 80) {
    throw new AppError(
      400,
      'label must be <= 80 characters',
      V3IntegrationErrorCodes.INTEGRATION_INVALID_INPUT
    );
  }
  return normalized;
};

const sanitizeOptionalExpiry = (value: unknown): Date | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(
      400,
      'expiresAt must be an ISO datetime string',
      V3IntegrationErrorCodes.INTEGRATION_INVALID_INPUT
    );
  }
  if (parsed.getTime() <= Date.now()) {
    throw new AppError(
      400,
      'expiresAt must be in the future',
      V3IntegrationErrorCodes.INTEGRATION_INVALID_INPUT
    );
  }
  return parsed;
};

const buildKeyMaterial = (): { keyPrefix: string; secret: string; secretHash: string } => {
  const prefixSeed = randomBytes(6).toString('hex');
  const body = randomBytes(24).toString('hex');
  const keyPrefix = `zfi_${prefixSeed}`;
  const secret = `${keyPrefix}.${body}`;
  const secretHash = createHash('sha256').update(secret).digest('hex');
  return { keyPrefix, secret, secretHash };
};

const toIntegrationKeyReadModel = (key: IntegrationAppWithRelations['keys'][number]): IntegrationKeyReadModel => ({
  id: key.id,
  keyPrefix: key.keyPrefix,
  label: key.label,
  status: key.status as IntegrationKeyStatus,
  issuedBy: key.issuedBy,
  issuedAt: key.issuedAt.toISOString(),
  revokedAt: key.revokedAt?.toISOString() || null,
  expiresAt: key.expiresAt?.toISOString() || null,
  lastUsedAt: key.lastUsedAt?.toISOString() || null,
  createdAt: key.createdAt.toISOString(),
  updatedAt: key.updatedAt.toISOString(),
});

const toIntegrationAppReadModel = (app: IntegrationAppWithRelations): IntegrationAppReadModel => ({
  id: app.id,
  slug: app.slug,
  name: app.name,
  appType: app.appType as IntegrationAppType,
  status: app.status as IntegrationAppStatus,
  permissions: app.permissions
    .map((permission) => permission.permission)
    .sort() as IntegrationPermissionValue[],
  metadata: isPlainObject(app.metadata) ? app.metadata : null,
  createdAt: app.createdAt.toISOString(),
  updatedAt: app.updatedAt.toISOString(),
  keys: app.keys.map(toIntegrationKeyReadModel),
});

const toAuthenticatedIntegrationContext = (
  record: IntegrationKeyWithAppPermissions
): AuthenticatedIntegrationContext => ({
  app: {
    id: record.app.id,
    slug: record.app.slug,
    name: record.app.name,
    appType: record.app.appType as IntegrationAppType,
    status: record.app.status as IntegrationAppStatus,
  },
  key: {
    id: record.id,
    keyPrefix: record.keyPrefix,
    label: record.label,
    status: record.status as IntegrationKeyStatus,
    issuedBy: record.issuedBy,
    issuedAt: record.issuedAt.toISOString(),
    expiresAt: record.expiresAt?.toISOString() || null,
    lastUsedAt: record.lastUsedAt?.toISOString() || null,
  },
  permissions: record.app.permissions
    .map((permission) => permission.permission)
    .sort() as IntegrationPermissionValue[],
});

const getAppOrThrow = async (tx: Tx, appId: string): Promise<IntegrationAppWithRelations> => {
  const app = await tx.integrationApp.findUnique({
    where: { id: appId },
    include: {
      permissions: true,
      keys: {
        orderBy: { issuedAt: 'desc' },
      },
    },
  });

  if (!app) {
    throw new AppError(
      404,
      'integration app not found',
      V3IntegrationErrorCodes.INTEGRATION_NOT_FOUND
    );
  }

  return app;
};

export class IntegrationRegistryService {
  getCatalog(): IntegrationRegistryCatalog {
    return {
      appTypes: [...INTEGRATION_APP_TYPES],
      appStatuses: [...INTEGRATION_APP_STATUSES],
      keyStatuses: [...INTEGRATION_KEY_STATUSES],
      permissions: [...INTEGRATION_PERMISSION_VALUES],
    };
  }

  async listApps(): Promise<IntegrationAppReadModel[]> {
    const apps = await prisma.integrationApp.findMany({
      include: {
        permissions: true,
        keys: {
          orderBy: { issuedAt: 'desc' },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return apps.map(toIntegrationAppReadModel);
  }

  async getAppById(appId: string): Promise<IntegrationAppReadModel> {
    const app = await getAppOrThrow(prisma, appId);
    return toIntegrationAppReadModel(app);
  }

  async registerApp(input: RegisterIntegrationAppInput): Promise<IntegrationAppReadModel> {
    const slug = sanitizeSlug(input.slug);
    const name = sanitizeName(input.name);
    const appType = sanitizeAppType(input.appType);
    const permissions = sanitizePermissions(input.permissions);
    const metadata = sanitizeMetadata(input.metadata);

    return prisma.$transaction(async (tx) => {
      const existing = await tx.integrationApp.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (existing) {
        throw new AppError(
          409,
          'integration slug already exists',
          V3IntegrationErrorCodes.INTEGRATION_SLUG_CONFLICT
        );
      }

      const app = await tx.integrationApp.create({
        data: {
          slug,
          name,
          appType,
          metadata: metadata === null ? undefined : (metadata as Prisma.InputJsonValue),
          permissions: {
            create: permissions.map((permission) => ({ permission })),
          },
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'IntegrationApp',
          aggregateId: app.id,
          eventType: 'IntegrationAppRegistered',
          payload: {
            appId: app.id,
            slug,
            name,
            appType,
            permissions,
          },
          requestId: input.requestId,
          source: input.source || 'v3.integration.registry',
        },
      });

      const refreshedApp = await getAppOrThrow(tx, app.id);
      return toIntegrationAppReadModel(refreshedApp);
    });
  }

  async issueKey(input: IssueIntegrationKeyInput): Promise<IssueIntegrationKeyResult> {
    const label = sanitizeOptionalLabel(input.label);
    const expiresAt = sanitizeOptionalExpiry(input.expiresAt);

    return prisma.$transaction(async (tx) => {
      const app = await getAppOrThrow(tx, input.appId);

      if (app.status !== 'ACTIVE') {
        throw new AppError(
          409,
          'integration app is not active',
          V3IntegrationErrorCodes.INTEGRATION_APP_DISABLED
        );
      }

      const { keyPrefix, secret, secretHash } = buildKeyMaterial();

      const createdKey = await tx.integrationKey.create({
        data: {
          appId: app.id,
          label,
          keyPrefix,
          secretHash,
          status: 'ACTIVE',
          issuedBy: input.issuedBy?.trim().toLowerCase() || null,
          expiresAt,
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'IntegrationApp',
          aggregateId: app.id,
          eventType: 'IntegrationKeyIssued',
          payload: {
            appId: app.id,
            keyId: createdKey.id,
            keyPrefix,
            label,
            expiresAt: expiresAt?.toISOString() || null,
          },
          requestId: input.requestId,
          source: input.source || 'v3.integration.registry',
        },
      });

      const refreshedApp = await getAppOrThrow(tx, app.id);

      return {
        app: toIntegrationAppReadModel(refreshedApp),
        key: toIntegrationKeyReadModel(createdKey as IntegrationAppWithRelations['keys'][number]),
        secret,
      };
    });
  }

  async revokeKey(input: RevokeIntegrationKeyInput): Promise<IntegrationKeyReadModel> {
    return prisma.$transaction(async (tx) => {
      const app = await getAppOrThrow(tx, input.appId);
      const key = app.keys.find((item) => item.id === input.keyId);

      if (!key) {
        throw new AppError(
          404,
          'integration key not found',
          V3IntegrationErrorCodes.INTEGRATION_KEY_NOT_FOUND
        );
      }

      if (key.status === 'REVOKED') {
        throw new AppError(
          409,
          'integration key already revoked',
          V3IntegrationErrorCodes.INTEGRATION_KEY_ALREADY_REVOKED
        );
      }

      const updatedKey = await tx.integrationKey.update({
        where: { id: key.id },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'IntegrationApp',
          aggregateId: app.id,
          eventType: 'IntegrationKeyRevoked',
          payload: {
            appId: app.id,
            keyId: updatedKey.id,
            keyPrefix: updatedKey.keyPrefix,
            revokedBy: input.revokedBy?.trim().toLowerCase() || null,
          },
          requestId: input.requestId,
          source: input.source || 'v3.integration.registry',
        },
      });

      return toIntegrationKeyReadModel(updatedKey as IntegrationAppWithRelations['keys'][number]);
    });
  }

  async authenticateKey(secret: string): Promise<AuthenticatedIntegrationContext> {
    const normalizedSecret = secret.trim();
    if (!normalizedSecret) {
      throw new AppError(
        401,
        'integration api key is required',
        V3IntegrationErrorCodes.INTEGRATION_API_KEY_REQUIRED
      );
    }

    const secretHash = createHash('sha256').update(normalizedSecret).digest('hex');

    return prisma.$transaction(async (tx) => {
      const record = await tx.integrationKey.findFirst({
        where: { secretHash },
        include: {
          app: {
            include: {
              permissions: true,
            },
          },
        },
      });

      if (!record) {
        throw new AppError(
          401,
          'invalid integration api key',
          V3IntegrationErrorCodes.INTEGRATION_API_KEY_INVALID
        );
      }

      const now = new Date();

      if (record.expiresAt && record.expiresAt.getTime() <= now.getTime()) {
        const expiredRecord =
          record.status === 'EXPIRED'
            ? record
            : await tx.integrationKey.update({
                where: { id: record.id },
                data: {
                  status: 'EXPIRED',
                },
                include: {
                  app: {
                    include: {
                      permissions: true,
                    },
                  },
                },
              });

        throw new AppError(
          401,
          'integration api key has expired',
          V3IntegrationErrorCodes.INTEGRATION_KEY_EXPIRED,
          {
            appId: expiredRecord.appId,
            keyId: expiredRecord.id,
            expiresAt: expiredRecord.expiresAt?.toISOString() || null,
          }
        );
      }

      if (record.status === 'REVOKED') {
        throw new AppError(
          401,
          'integration api key has been revoked',
          V3IntegrationErrorCodes.INTEGRATION_KEY_REVOKED,
          {
            appId: record.appId,
            keyId: record.id,
            revokedAt: record.revokedAt?.toISOString() || null,
          }
        );
      }

      if (record.status !== 'ACTIVE') {
        throw new AppError(
          401,
          'invalid integration api key',
          V3IntegrationErrorCodes.INTEGRATION_API_KEY_INVALID,
          {
            appId: record.appId,
            keyId: record.id,
            status: record.status,
          }
        );
      }

      if (record.app.status !== 'ACTIVE') {
        throw new AppError(
          403,
          'integration app is not active',
          V3IntegrationErrorCodes.INTEGRATION_APP_DISABLED,
          {
            appId: record.app.id,
            appStatus: record.app.status,
          }
        );
      }

      const touchedRecord = await tx.integrationKey.update({
        where: { id: record.id },
        data: {
          lastUsedAt: now,
        },
        include: {
          app: {
            include: {
              permissions: true,
            },
          },
        },
      });

      return toAuthenticatedIntegrationContext(touchedRecord);
    });
  }
}

export const integrationRegistryService = new IntegrationRegistryService();
