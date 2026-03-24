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
export type IntegrationPermission = (typeof INTEGRATION_PERMISSION_VALUES)[number];

export interface IntegrationRegistryCatalog {
  appTypes: IntegrationAppType[];
  appStatuses: IntegrationAppStatus[];
  keyStatuses: IntegrationKeyStatus[];
  permissions: IntegrationPermission[];
}

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
  permissions: IntegrationPermission[];
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  keys: IntegrationKeyReadModel[];
}

export interface RegisterIntegrationAppPayload {
  slug: string;
  name: string;
  appType: IntegrationAppType;
  permissions: IntegrationPermission[];
  metadata?: Record<string, unknown> | null;
}

export interface IssueIntegrationKeyPayload {
  label?: string | null;
  expiresAt?: string | null;
}

export interface IssueIntegrationKeyResult {
  app: IntegrationAppReadModel;
  key: IntegrationKeyReadModel;
  secret: string;
}
