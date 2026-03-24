import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { AppError } from '../../middlewares/errorHandler';

export const PARTNER_CAMPAIGN_STATUSES = ['DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED'] as const;
export const PARTNER_CALLBACK_EVENT_TYPES = ['REWARD_GRANTED', 'CAMPAIGN_STATUS_SYNC'] as const;
export const PARTNER_CALLBACK_STATUSES = ['ACCEPTED', 'REJECTED'] as const;
export const PARTNER_REWARD_STATUSES = ['GRANTED', 'REVOKED'] as const;
export const PARTNER_SIGNATURE_VERSION = 'v1-hmac-sha256' as const;

type PartnerStorageMode = 'prisma' | 'memory';

export type PartnerCampaignStatus = (typeof PARTNER_CAMPAIGN_STATUSES)[number];
export type PartnerCallbackEventType = (typeof PARTNER_CALLBACK_EVENT_TYPES)[number];
export type PartnerCallbackStatus = (typeof PARTNER_CALLBACK_STATUSES)[number];
export type PartnerRewardStatus = (typeof PARTNER_REWARD_STATUSES)[number];

export interface PartnerCampaignReadModel {
  id: string;
  partnerAppId: string;
  slug: string;
  title: string;
  description: string | null;
  status: PartnerCampaignStatus;
  callbackEndpoint: string;
  publishedAt: string | null;
  pausedAt: string | null;
  createdAt: string;
  updatedAt: string;
  audit: {
    createdByKeyId: string;
    createdByActor: string;
    requestId: string | null;
  };
  rollout: {
    rewardPolicy: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
  };
}

export interface PartnerCampaignListReadModel {
  total: number;
  items: PartnerCampaignReadModel[];
}

export interface PartnerCallbackReadModel {
  id: string;
  campaignId: string;
  partnerEventId: string;
  eventType: PartnerCallbackEventType;
  signatureVersion: typeof PARTNER_SIGNATURE_VERSION;
  verified: boolean;
  status: PartnerCallbackStatus;
  reason: string | null;
  payload: Record<string, unknown>;
  requestId: string | null;
  receivedAt: string;
  processedAt: string;
  rewardId: string | null;
}

export interface PartnerCallbackListReadModel {
  total: number;
  items: PartnerCallbackReadModel[];
}

export interface PartnerRewardReadModel {
  id: string;
  campaignId: string;
  callbackId: string;
  recipientWallet: string;
  rewardType: string;
  amount: string;
  status: PartnerRewardStatus;
  metadata: Record<string, unknown> | null;
  grantedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerRewardListReadModel {
  total: number;
  items: PartnerRewardReadModel[];
}

export interface CreatePartnerCampaignCommand {
  slug: string;
  title: string;
  description?: string;
  callbackEndpoint: string;
  callbackSecret: string;
  rewardPolicy?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  requestedBy: {
    appId: string;
    keyId: string;
    actor: string;
    requestId?: string | null;
  };
}

export interface UpdatePartnerCampaignStatusCommand {
  campaignId: string;
  scopeAppId: string;
  requestedBy: {
    actor: string;
    requestId?: string | null;
  };
}

export interface AdminRollbackPartnerCampaignCommand {
  campaignId: string;
  reason?: string;
  requestedBy: {
    actor: string;
    requestId?: string | null;
  };
}

export interface ReceivePartnerCallbackCommand {
  campaignId: string;
  partnerEventId: string;
  eventType: PartnerCallbackEventType;
  timestamp: string;
  signature: string;
  payload: Record<string, unknown>;
  reward?: {
    recipientWallet: string;
    rewardType: string;
    amount: string;
    metadata?: Record<string, unknown>;
  };
  requestId?: string | null;
}

interface PartnerCampaignState extends PartnerCampaignReadModel {
  callbackSecret: string;
  callbackSecretHash: string;
}

interface PartnerCallbackState extends Omit<PartnerCallbackReadModel, 'rewardId'> {
  rewardId: string | null;
}

interface PartnerRewardState extends PartnerRewardReadModel {}

interface PartnerCampaignPrismaClient {
  partnerCampaign: {
    create: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any | null>;
    findMany: (args: any) => Promise<any[]>;
    count: (args: any) => Promise<number>;
    update: (args: any) => Promise<any>;
  };
  partnerCallback: {
    create: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any | null>;
    findMany: (args: any) => Promise<any[]>;
    count: (args: any) => Promise<number>;
  };
  partnerReward: {
    create: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
    count: (args: any) => Promise<number>;
    findFirst: (args: any) => Promise<any | null>;
  };
  domainEvent: {
    create: (args: any) => Promise<any>;
  };
  $transaction: (args: any) => Promise<any>;
}

const CAMPAIGN_ID_PATTERN = /^pcm_[a-z0-9]+$/;
const CALLBACK_ID_PATTERN = /^pcb_[a-z0-9]+$/;
const REWARD_ID_PATTERN = /^prw_[a-z0-9]+$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const CAMPAIGN_STATUS_SET = new Set<string>(PARTNER_CAMPAIGN_STATUSES);
const CALLBACK_EVENT_SET = new Set<string>(PARTNER_CALLBACK_EVENT_TYPES);

const parseBoolean = (raw: string | undefined, fallback: boolean): boolean => {
  if (raw === undefined) {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
};

const parsePositiveInteger = (raw: string | undefined, fallback: number): number => {
  if (!raw?.trim()) {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const toIsoString = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const toCampaignId = (): string => `pcm_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
const toCallbackId = (): string => `pcb_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
const toRewardId = (): string => `prw_${randomUUID().replace(/-/g, '').slice(0, 24)}`;

const normalizeNonEmpty = (value: string, field: string, maxLength: number): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new AppError(400, `${field} is required`, 'INVALID_INPUT', { field });
  }
  if (normalized.length > maxLength) {
    throw new AppError(400, `${field} must be <= ${maxLength} characters`, 'INVALID_INPUT', {
      field,
      maxLength,
    });
  }
  return normalized;
};

const normalizeOptionalText = (value: string | undefined, field: string, maxLength: number): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new AppError(400, `${field} must be <= ${maxLength} characters`, 'INVALID_INPUT', {
      field,
      maxLength,
    });
  }

  return normalized;
};

const normalizeSlug = (value: string): string => {
  const normalized = normalizeNonEmpty(value, 'slug', 64).toLowerCase();
  if (!SLUG_PATTERN.test(normalized)) {
    throw new AppError(400, 'slug is invalid', 'INVALID_INPUT', {
      slug: value,
    });
  }
  return normalized;
};

const normalizeCampaignId = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!CAMPAIGN_ID_PATTERN.test(normalized)) {
    throw new AppError(400, 'campaignId is invalid', 'INVALID_INPUT', {
      campaignId: value,
    });
  }
  return normalized;
};

const normalizeCallbackId = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!CALLBACK_ID_PATTERN.test(normalized)) {
    throw new AppError(500, 'callbackId is invalid', 'INTERNAL_ERROR', {
      callbackId: value,
    });
  }
  return normalized;
};

const normalizeRewardId = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!REWARD_ID_PATTERN.test(normalized)) {
    throw new AppError(500, 'rewardId is invalid', 'INTERNAL_ERROR', {
      rewardId: value,
    });
  }
  return normalized;
};

const normalizeCampaignStatus = (value: string): PartnerCampaignStatus => {
  const normalized = value.trim().toUpperCase();
  if (!CAMPAIGN_STATUS_SET.has(normalized)) {
    return 'DRAFT';
  }
  return normalized as PartnerCampaignStatus;
};

const normalizeCallbackEventType = (value: string): PartnerCallbackEventType => {
  const normalized = value.trim().toUpperCase();
  if (!CALLBACK_EVENT_SET.has(normalized)) {
    throw new AppError(400, 'callback eventType is invalid', 'INVALID_INPUT', {
      eventType: value,
    });
  }
  return normalized as PartnerCallbackEventType;
};

const normalizeHttpUrl = (value: string, field: string): string => {
  const normalized = normalizeNonEmpty(value, field, 512);
  try {
    const url = new URL(normalized);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('invalid protocol');
    }
  } catch {
    throw new AppError(400, `${field} must be a valid http(s) URL`, 'INVALID_INPUT', {
      field,
    });
  }

  return normalized;
};

const normalizeJsonObject = (value: unknown, field: string): Record<string, unknown> | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError(400, `${field} must be an object`, 'INVALID_INPUT', {
      field,
    });
  }

  return value as Record<string, unknown>;
};

const toStorageMode = (raw: string | undefined): PartnerStorageMode => {
  if (raw?.trim().toLowerCase() === 'memory') {
    return 'memory';
  }
  return 'prisma';
};

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  return `{${entries
    .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
    .join(',')}}`;
};

const normalizeIncomingSignature = (signature: string): string => {
  const normalized = normalizeNonEmpty(signature, 'signature', 300).trim();
  if (normalized.includes('=')) {
    const [scheme, hash] = normalized.split('=', 2);
    if (scheme.toLowerCase() !== 'sha256') {
      throw new AppError(401, 'callback signature scheme is invalid', 'PARTNER_CALLBACK_SIGNATURE_INVALID', {
        signatureScheme: scheme,
      });
    }
    return hash.trim().toLowerCase();
  }
  return normalized.toLowerCase();
};

const hashSecret = (secret: string): string => createHash('sha256').update(secret).digest('hex');

const computeSignature = (secret: string, timestamp: string, payload: Record<string, unknown>): string => {
  const message = `${timestamp}.${stableStringify(payload)}`;
  return createHmac('sha256', secret).update(message).digest('hex');
};

const ensureTimestampSkewAllowed = (timestamp: string, maxSkewSeconds: number): void => {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed)) {
    throw new AppError(401, 'callback timestamp is invalid', 'PARTNER_CALLBACK_SIGNATURE_INVALID', {
      timestamp,
    });
  }

  const timestampMs = parsed > 10_000_000_000 ? parsed : parsed * 1000;
  const skewMs = Math.abs(Date.now() - timestampMs);
  if (skewMs > maxSkewSeconds * 1000) {
    throw new AppError(401, 'callback timestamp exceeded allowed skew', 'PARTNER_CALLBACK_SIGNATURE_EXPIRED', {
      maxSkewSeconds,
      skewMs,
    });
  }
};

const safeEqualHex = (left: string, right: string): boolean => {
  try {
    const leftBuffer = Buffer.from(left, 'hex');
    const rightBuffer = Buffer.from(right, 'hex');
    if (leftBuffer.length === 0 || rightBuffer.length === 0 || leftBuffer.length !== rightBuffer.length) {
      return false;
    }
    return timingSafeEqual(leftBuffer, rightBuffer);
  } catch {
    return false;
  }
};

const cloneCampaign = (item: PartnerCampaignState): PartnerCampaignReadModel => ({
  id: item.id,
  partnerAppId: item.partnerAppId,
  slug: item.slug,
  title: item.title,
  description: item.description,
  status: item.status,
  callbackEndpoint: item.callbackEndpoint,
  publishedAt: item.publishedAt,
  pausedAt: item.pausedAt,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  audit: {
    ...item.audit,
  },
  rollout: {
    rewardPolicy: item.rollout.rewardPolicy ? { ...item.rollout.rewardPolicy } : null,
    metadata: item.rollout.metadata ? { ...item.rollout.metadata } : null,
  },
});

const cloneCallback = (item: PartnerCallbackState): PartnerCallbackReadModel => ({
  ...item,
  payload: {
    ...item.payload,
  },
  rewardId: item.rewardId,
});

const cloneReward = (item: PartnerRewardState): PartnerRewardReadModel => ({
  ...item,
  metadata: item.metadata ? { ...item.metadata } : null,
});

export class PartnerCampaignService {
  private prismaClient?: PartnerCampaignPrismaClient;

  private readonly campaigns = new Map<string, PartnerCampaignState>();
  private readonly campaignIdsByApp = new Map<string, string[]>();
  private readonly callbacks = new Map<string, PartnerCallbackState>();
  private readonly callbackIdsByCampaign = new Map<string, string[]>();
  private readonly callbackIdByPartnerEvent = new Map<string, string>();
  private readonly rewards = new Map<string, PartnerRewardState>();
  private readonly rewardIdsByCampaign = new Map<string, string[]>();

  constructor(deps?: { prismaClient?: PartnerCampaignPrismaClient }) {
    this.prismaClient = deps?.prismaClient;
  }

  async createCampaign(input: CreatePartnerCampaignCommand): Promise<PartnerCampaignReadModel> {
    this.assertCampaignRuntimeEnabled();
    this.assertAppAllowed(input.requestedBy.appId);

    const slug = normalizeSlug(input.slug);
    const title = normalizeNonEmpty(input.title, 'title', 120);
    const description = normalizeOptionalText(input.description, 'description', 500);
    const callbackEndpoint = normalizeHttpUrl(input.callbackEndpoint, 'callbackEndpoint');
    const callbackSecret = normalizeNonEmpty(input.callbackSecret, 'callbackSecret', 256);
    const rewardPolicy = normalizeJsonObject(input.rewardPolicy, 'rewardPolicy');
    const metadata = normalizeJsonObject(input.metadata, 'metadata');

    const now = new Date();
    const nowIso = now.toISOString();

    const campaign: PartnerCampaignState = {
      id: toCampaignId(),
      partnerAppId: input.requestedBy.appId,
      slug,
      title,
      description,
      status: 'DRAFT',
      callbackEndpoint,
      callbackSecret,
      callbackSecretHash: hashSecret(callbackSecret),
      publishedAt: null,
      pausedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      audit: {
        createdByKeyId: input.requestedBy.keyId,
        createdByActor: input.requestedBy.actor,
        requestId: input.requestedBy.requestId?.trim() || null,
      },
      rollout: {
        rewardPolicy,
        metadata,
      },
    };

    if (this.getStorageMode() === 'memory') {
      this.ensureMemoryCampaignSlugUnique(campaign.partnerAppId, campaign.slug);
      this.storeCampaign(campaign);
      return cloneCampaign(campaign);
    }

    const prisma = await this.getPrismaClient();
    const created = await prisma.$transaction(async (tx: PartnerCampaignPrismaClient) => {
      const exists = await tx.partnerCampaign.findFirst({
        where: {
          partnerAppId: campaign.partnerAppId,
          slug: campaign.slug,
        },
      });

      if (exists) {
        throw new AppError(409, 'partner campaign slug already exists', 'PARTNER_CAMPAIGN_SLUG_EXISTS', {
          slug: campaign.slug,
          appId: campaign.partnerAppId,
        });
      }

      const next = await tx.partnerCampaign.create({
        data: {
          id: campaign.id,
          partnerAppId: campaign.partnerAppId,
          slug: campaign.slug,
          title: campaign.title,
          description: campaign.description,
          status: campaign.status,
          callbackEndpoint: campaign.callbackEndpoint,
          callbackSecret: campaign.callbackSecret,
          callbackSecretHash: campaign.callbackSecretHash,
          rewardPolicy: campaign.rollout.rewardPolicy,
          metadata: campaign.rollout.metadata,
          createdByKeyId: campaign.audit.createdByKeyId,
          createdByActor: campaign.audit.createdByActor,
          requestId: campaign.audit.requestId,
          createdAt: now,
          updatedAt: now,
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'PartnerCampaign',
          aggregateId: campaign.id,
          eventType: 'PartnerCampaignDrafted',
          payload: {
            campaignId: campaign.id,
            partnerAppId: campaign.partnerAppId,
            slug: campaign.slug,
            status: campaign.status,
            callbackEndpoint: campaign.callbackEndpoint,
            callbackSecretHash: campaign.callbackSecretHash,
            rewardPolicy: campaign.rollout.rewardPolicy,
            metadata: campaign.rollout.metadata,
            audit: campaign.audit,
          },
          requestId: campaign.audit.requestId,
          source: 'api.v3.partners.campaigns.create',
        },
      });

      return next;
    });

    return this.mapCampaignRecordToReadModel(created);
  }

  async listCampaigns(input: {
    scopeAppId: string;
    status?: PartnerCampaignStatus;
    limit?: number;
  }): Promise<PartnerCampaignListReadModel> {
    const limit = Math.max(1, Math.min(input.limit || 20, 100));

    if (this.getStorageMode() === 'memory') {
      const ids = this.campaignIdsByApp.get(input.scopeAppId) || [];
      const items = ids
        .map((id) => this.campaigns.get(id))
        .filter((item): item is PartnerCampaignState => Boolean(item))
        .filter((item) => !input.status || item.status === input.status)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

      return {
        total: items.length,
        items: items.slice(0, limit).map(cloneCampaign),
      };
    }

    const prisma = await this.getPrismaClient();
    const where = {
      partnerAppId: input.scopeAppId,
      ...(input.status ? { status: input.status } : {}),
    };

    const [total, rows] = await prisma.$transaction([
      prisma.partnerCampaign.count({ where }),
      prisma.partnerCampaign.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      }),
    ]);

    return {
      total,
      items: rows.map((row: any) => this.mapCampaignRecordToReadModel(row)),
    };
  }

  async getCampaignById(input: {
    campaignId: string;
    scopeAppId: string;
  }): Promise<PartnerCampaignReadModel> {
    const campaignId = normalizeCampaignId(input.campaignId);

    if (this.getStorageMode() === 'memory') {
      const existing = this.campaigns.get(campaignId);
      if (!existing || existing.partnerAppId !== input.scopeAppId) {
        throw new AppError(404, 'partner campaign not found', 'NOT_FOUND', {
          campaignId,
        });
      }
      return cloneCampaign(existing);
    }

    const prisma = await this.getPrismaClient();
    const row = await prisma.partnerCampaign.findFirst({
      where: {
        id: campaignId,
        partnerAppId: input.scopeAppId,
      },
    });

    if (!row) {
      throw new AppError(404, 'partner campaign not found', 'NOT_FOUND', {
        campaignId,
      });
    }

    return this.mapCampaignRecordToReadModel(row);
  }

  async getCampaignByIdForAdmin(input: {
    campaignId: string;
  }): Promise<PartnerCampaignReadModel> {
    const campaignId = normalizeCampaignId(input.campaignId);

    if (this.getStorageMode() === 'memory') {
      const existing = this.campaigns.get(campaignId);
      if (!existing) {
        throw new AppError(404, 'partner campaign not found', 'NOT_FOUND', {
          campaignId,
        });
      }
      return cloneCampaign(existing);
    }

    const prisma = await this.getPrismaClient();
    const row = await prisma.partnerCampaign.findFirst({
      where: {
        id: campaignId,
      },
    });

    if (!row) {
      throw new AppError(404, 'partner campaign not found', 'NOT_FOUND', {
        campaignId,
      });
    }

    return this.mapCampaignRecordToReadModel(row);
  }

  async listCampaignsForAdmin(input: {
    status?: PartnerCampaignStatus;
    partnerAppId?: string;
    limit?: number;
  }): Promise<PartnerCampaignListReadModel> {
    const limit = Math.max(1, Math.min(input.limit || 20, 100));

    if (this.getStorageMode() === 'memory') {
      const items = Array.from(this.campaigns.values())
        .filter((item) => !input.partnerAppId || item.partnerAppId === input.partnerAppId)
        .filter((item) => !input.status || item.status === input.status)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

      return {
        total: items.length,
        items: items.slice(0, limit).map(cloneCampaign),
      };
    }

    const prisma = await this.getPrismaClient();
    const where = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.partnerAppId ? { partnerAppId: input.partnerAppId } : {}),
    };

    const [total, rows] = await prisma.$transaction([
      prisma.partnerCampaign.count({ where }),
      prisma.partnerCampaign.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      }),
    ]);

    return {
      total,
      items: rows.map((row: any) => this.mapCampaignRecordToReadModel(row)),
    };
  }

  async publishCampaign(input: UpdatePartnerCampaignStatusCommand): Promise<PartnerCampaignReadModel> {
    this.assertCampaignRuntimeEnabled();
    this.assertCampaignPublishEnabled();
    return this.transitionCampaignStatus({
      campaignId: input.campaignId,
      scopeAppId: input.scopeAppId,
      expectedStatus: 'DRAFT',
      nextStatus: 'PUBLISHED',
      source: 'api.v3.partners.campaigns.publish',
      eventType: 'PartnerCampaignPublished',
      actor: input.requestedBy.actor,
      requestId: input.requestedBy.requestId?.trim() || null,
      pauseAt: false,
      publishAt: true,
    });
  }

  async pauseCampaign(input: UpdatePartnerCampaignStatusCommand): Promise<PartnerCampaignReadModel> {
    this.assertCampaignRuntimeEnabled();
    this.assertCampaignPauseEnabled();
    return this.transitionCampaignStatus({
      campaignId: input.campaignId,
      scopeAppId: input.scopeAppId,
      expectedStatus: 'PUBLISHED',
      nextStatus: 'PAUSED',
      source: 'api.v3.partners.campaigns.pause',
      eventType: 'PartnerCampaignPaused',
      actor: input.requestedBy.actor,
      requestId: input.requestedBy.requestId?.trim() || null,
      pauseAt: true,
      publishAt: false,
    });
  }

  async resumeCampaign(input: UpdatePartnerCampaignStatusCommand): Promise<PartnerCampaignReadModel> {
    this.assertCampaignRuntimeEnabled();
    this.assertCampaignResumeEnabled();
    return this.transitionCampaignStatus({
      campaignId: input.campaignId,
      scopeAppId: input.scopeAppId,
      expectedStatus: 'PAUSED',
      nextStatus: 'PUBLISHED',
      source: 'api.v3.partners.campaigns.resume',
      eventType: 'PartnerCampaignResumed',
      actor: input.requestedBy.actor,
      requestId: input.requestedBy.requestId?.trim() || null,
      pauseAt: false,
      publishAt: true,
    });
  }

  async adminRollbackCampaign(input: AdminRollbackPartnerCampaignCommand): Promise<PartnerCampaignReadModel> {
    this.assertCampaignPauseEnabled();

    const campaignId = normalizeCampaignId(input.campaignId);
    const reason = normalizeOptionalText(input.reason, 'reason', 240);
    const actor = normalizeNonEmpty(input.requestedBy.actor, 'actor', 120);
    const requestId = input.requestedBy.requestId?.trim() || null;

    if (this.getStorageMode() === 'memory') {
      const existing = this.campaigns.get(campaignId);
      if (!existing) {
        throw new AppError(404, 'partner campaign not found', 'NOT_FOUND', {
          campaignId,
        });
      }

      if (existing.status !== 'PUBLISHED') {
        throw new AppError(409, 'only published campaign can be rolled back', 'PARTNER_CAMPAIGN_STATUS_CONFLICT', {
          campaignId,
          status: existing.status,
          expectedStatus: 'PUBLISHED',
        });
      }

      const nowIso = new Date().toISOString();
      const next: PartnerCampaignState = {
        ...existing,
        status: 'PAUSED',
        pausedAt: nowIso,
        updatedAt: nowIso,
      };
      this.storeCampaign(next);
      return cloneCampaign(next);
    }

    const prisma = await this.getPrismaClient();
    const row = await prisma.partnerCampaign.findFirst({
      where: {
        id: campaignId,
      },
    });

    if (!row) {
      throw new AppError(404, 'partner campaign not found', 'NOT_FOUND', {
        campaignId,
      });
    }

    const currentStatus = normalizeCampaignStatus(String(row.status));
    if (currentStatus !== 'PUBLISHED') {
      throw new AppError(409, 'only published campaign can be rolled back', 'PARTNER_CAMPAIGN_STATUS_CONFLICT', {
        campaignId,
        status: currentStatus,
        expectedStatus: 'PUBLISHED',
      });
    }

    const updatedAt = new Date();
    const next = await prisma.$transaction(async (tx: PartnerCampaignPrismaClient) => {
      const updated = await tx.partnerCampaign.update({
        where: {
          id: campaignId,
        },
        data: {
          status: 'PAUSED',
          pausedAt: updatedAt,
          updatedAt,
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'PartnerCampaign',
          aggregateId: campaignId,
          eventType: 'PartnerCampaignRolledBack',
          payload: {
            campaignId,
            partnerAppId: String(row.partnerAppId),
            previousStatus: currentStatus,
            status: 'PAUSED',
            reason,
            actor,
          },
          requestId,
          source: 'api.admin.v3.partners.campaigns.rollback',
        },
      });

      return updated;
    });

    return this.mapCampaignRecordToReadModel(next);
  }

  async receiveCallback(input: ReceivePartnerCallbackCommand): Promise<{
    callback: PartnerCallbackReadModel;
    reward: PartnerRewardReadModel | null;
  }> {
    this.assertCallbackEnabled();

    const campaignId = normalizeCampaignId(input.campaignId);
    const partnerEventId = normalizeNonEmpty(input.partnerEventId, 'partnerEventId', 120);
    const eventType = normalizeCallbackEventType(input.eventType);
    const timestamp = normalizeNonEmpty(input.timestamp, 'timestamp', 64);
    const signature = normalizeIncomingSignature(input.signature);
    const payload = normalizeJsonObject(input.payload, 'payload') || {};
    const requestId = input.requestId?.trim() || null;

    ensureTimestampSkewAllowed(timestamp, this.getMaxCallbackSkewSeconds());

    if (this.getStorageMode() === 'memory') {
      const campaign = this.campaigns.get(campaignId);
      if (!campaign) {
        throw new AppError(404, 'partner campaign not found', 'NOT_FOUND', {
          campaignId,
        });
      }

      if (campaign.status !== 'PUBLISHED') {
        throw new AppError(409, 'partner campaign is not active', 'PARTNER_CAMPAIGN_NOT_ACTIVE', {
          campaignId,
          status: campaign.status,
          expectedStatus: 'PUBLISHED',
        });
      }

      const replayKey = `${campaignId}:${partnerEventId}`;
      if (this.callbackIdByPartnerEvent.has(replayKey)) {
        throw new AppError(409, 'partner callback replay detected', 'PARTNER_CALLBACK_REPLAYED', {
          campaignId,
          partnerEventId,
        });
      }

      const expected = computeSignature(campaign.callbackSecret, timestamp, payload);
      const isVerified = safeEqualHex(signature, expected);

      const callbackId = toCallbackId();
      const nowIso = new Date().toISOString();
      const callback: PartnerCallbackState = {
        id: callbackId,
        campaignId,
        partnerEventId,
        eventType,
        signatureVersion: PARTNER_SIGNATURE_VERSION,
        verified: isVerified,
        status: isVerified ? 'ACCEPTED' : 'REJECTED',
        reason: isVerified ? null : 'INVALID_SIGNATURE',
        payload,
        requestId,
        receivedAt: nowIso,
        processedAt: nowIso,
        rewardId: null,
      };

      if (!isVerified) {
        this.storeCallback(callback);
        throw new AppError(401, 'partner callback signature invalid', 'PARTNER_CALLBACK_SIGNATURE_INVALID', {
          campaignId,
          partnerEventId,
        });
      }

      let reward: PartnerRewardState | null = null;
      if (eventType === 'REWARD_GRANTED' && input.reward) {
        this.assertRewardRecordEnabled();
        reward = this.buildMemoryRewardFromCallback(campaignId, callback.id, input.reward);
        callback.rewardId = reward.id;
        this.storeReward(reward);
      }

      this.storeCallback(callback);
      return {
        callback: cloneCallback(callback),
        reward: reward ? cloneReward(reward) : null,
      };
    }

    const prisma = await this.getPrismaClient();
    const campaign = await prisma.partnerCampaign.findFirst({
      where: {
        id: campaignId,
      },
    });

    if (!campaign) {
      throw new AppError(404, 'partner campaign not found', 'NOT_FOUND', {
        campaignId,
      });
    }

    const campaignStatus = normalizeCampaignStatus(String(campaign.status));
    if (campaignStatus !== 'PUBLISHED') {
      throw new AppError(409, 'partner campaign is not active', 'PARTNER_CAMPAIGN_NOT_ACTIVE', {
        campaignId,
        status: campaignStatus,
        expectedStatus: 'PUBLISHED',
      });
    }

    const existing = await prisma.partnerCallback.findFirst({
      where: {
        campaignId,
        partnerEventId,
      },
    });

    if (existing) {
      throw new AppError(409, 'partner callback replay detected', 'PARTNER_CALLBACK_REPLAYED', {
        campaignId,
        partnerEventId,
      });
    }

    const expected = computeSignature(String(campaign.callbackSecret), timestamp, payload);
    const isVerified = safeEqualHex(signature, expected);
    const callbackId = toCallbackId();
    const processedAt = new Date();

    const result = await prisma.$transaction(async (tx: PartnerCampaignPrismaClient) => {
      const createdCallback = await tx.partnerCallback.create({
        data: {
          id: callbackId,
          campaignId,
          partnerEventId,
          eventType,
          signatureVersion: PARTNER_SIGNATURE_VERSION,
          signature,
          verified: isVerified,
          status: isVerified ? 'ACCEPTED' : 'REJECTED',
          reason: isVerified ? null : 'INVALID_SIGNATURE',
          payload,
          requestId,
          receivedAt: processedAt,
          processedAt,
          createdAt: processedAt,
          updatedAt: processedAt,
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'PartnerCallback',
          aggregateId: callbackId,
          eventType: isVerified ? 'PartnerCallbackAccepted' : 'PartnerCallbackRejected',
          payload: {
            campaignId,
            callbackId,
            partnerEventId,
            eventType,
            signatureVersion: PARTNER_SIGNATURE_VERSION,
            verified: isVerified,
            reason: isVerified ? null : 'INVALID_SIGNATURE',
          },
          requestId,
          source: 'api.v3.partners.campaigns.callbacks',
        },
      });

      let createdReward: any | null = null;
      if (isVerified && eventType === 'REWARD_GRANTED' && input.reward) {
        this.assertRewardRecordEnabled();

        const recipientWallet = normalizeNonEmpty(input.reward.recipientWallet, 'reward.recipientWallet', 120)
          .trim()
          .toLowerCase();
        const rewardType = normalizeNonEmpty(input.reward.rewardType, 'reward.rewardType', 40)
          .trim()
          .toUpperCase();
        const amount = normalizeNonEmpty(input.reward.amount, 'reward.amount', 64);
        const rewardMetadata = normalizeJsonObject(input.reward.metadata, 'reward.metadata');
        const rewardId = toRewardId();

        createdReward = await tx.partnerReward.create({
          data: {
            id: rewardId,
            campaignId,
            callbackId,
            recipientWallet,
            rewardType,
            amount,
            status: 'GRANTED',
            metadata: rewardMetadata,
            grantedAt: processedAt,
            createdAt: processedAt,
            updatedAt: processedAt,
          },
        });

        await tx.domainEvent.create({
          data: {
            aggregateType: 'PartnerReward',
            aggregateId: rewardId,
            eventType: 'PartnerRewardGranted',
            payload: {
              campaignId,
              callbackId,
              rewardId,
              recipientWallet,
              rewardType,
              amount,
            },
            requestId,
            source: 'api.v3.partners.campaigns.callbacks',
          },
        });
      }

      return {
        callback: createdCallback,
        reward: createdReward,
      };
    });

    if (!isVerified) {
      throw new AppError(401, 'partner callback signature invalid', 'PARTNER_CALLBACK_SIGNATURE_INVALID', {
        campaignId,
        partnerEventId,
      });
    }

    return {
      callback: this.mapCallbackRecordToReadModel(result.callback),
      reward: result.reward ? this.mapRewardRecordToReadModel(result.reward) : null,
    };
  }

  async listCallbacksForAdmin(input: {
    campaignId: string;
    limit?: number;
  }): Promise<PartnerCallbackListReadModel> {
    const campaignId = normalizeCampaignId(input.campaignId);
    const limit = Math.max(1, Math.min(input.limit || 20, 100));

    if (this.getStorageMode() === 'memory') {
      const ids = this.callbackIdsByCampaign.get(campaignId) || [];
      const items = ids
        .map((id) => this.callbacks.get(id))
        .filter((item): item is PartnerCallbackState => Boolean(item))
        .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt));

      return {
        total: items.length,
        items: items.slice(0, limit).map(cloneCallback),
      };
    }

    const prisma = await this.getPrismaClient();
    const where = { campaignId };

    const [total, rows] = await prisma.$transaction([
      prisma.partnerCallback.count({ where }),
      prisma.partnerCallback.findMany({
        where,
        orderBy: {
          receivedAt: 'desc',
        },
        take: limit,
        include: {
          reward: true,
        },
      }),
    ]);

    return {
      total,
      items: rows.map((row: any) => this.mapCallbackRecordToReadModel(row)),
    };
  }

  async listRewardsForAdmin(input: {
    campaignId: string;
    limit?: number;
  }): Promise<PartnerRewardListReadModel> {
    const campaignId = normalizeCampaignId(input.campaignId);
    const limit = Math.max(1, Math.min(input.limit || 20, 100));

    if (this.getStorageMode() === 'memory') {
      const ids = this.rewardIdsByCampaign.get(campaignId) || [];
      const items = ids
        .map((id) => this.rewards.get(id))
        .filter((item): item is PartnerRewardState => Boolean(item))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

      return {
        total: items.length,
        items: items.slice(0, limit).map(cloneReward),
      };
    }

    const prisma = await this.getPrismaClient();
    const where = { campaignId };

    const [total, rows] = await prisma.$transaction([
      prisma.partnerReward.count({ where }),
      prisma.partnerReward.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      }),
    ]);

    return {
      total,
      items: rows.map((row: any) => this.mapRewardRecordToReadModel(row)),
    };
  }

  resetForTest(): void {
    this.campaigns.clear();
    this.campaignIdsByApp.clear();
    this.callbacks.clear();
    this.callbackIdsByCampaign.clear();
    this.callbackIdByPartnerEvent.clear();
    this.rewards.clear();
    this.rewardIdsByCampaign.clear();
  }

  private async transitionCampaignStatus(input: {
    campaignId: string;
    scopeAppId: string;
    expectedStatus: PartnerCampaignStatus;
    nextStatus: PartnerCampaignStatus;
    source: string;
    eventType: string;
    actor: string;
    requestId: string | null;
    pauseAt: boolean;
    publishAt: boolean;
  }): Promise<PartnerCampaignReadModel> {
    const campaignId = normalizeCampaignId(input.campaignId);
    const actor = normalizeNonEmpty(input.actor, 'actor', 120);

    if (this.getStorageMode() === 'memory') {
      const existing = this.campaigns.get(campaignId);
      if (!existing || existing.partnerAppId !== input.scopeAppId) {
        throw new AppError(404, 'partner campaign not found', 'NOT_FOUND', {
          campaignId,
        });
      }

      if (existing.status !== input.expectedStatus) {
        throw new AppError(409, 'partner campaign state transition is invalid', 'PARTNER_CAMPAIGN_STATUS_CONFLICT', {
          campaignId,
          status: existing.status,
          expectedStatus: input.expectedStatus,
          nextStatus: input.nextStatus,
        });
      }

      const nowIso = new Date().toISOString();
      const next: PartnerCampaignState = {
        ...existing,
        status: input.nextStatus,
        publishedAt: input.publishAt ? nowIso : existing.publishedAt,
        pausedAt: input.pauseAt ? nowIso : null,
        updatedAt: nowIso,
      };

      this.storeCampaign(next);
      return cloneCampaign(next);
    }

    const prisma = await this.getPrismaClient();
    const row = await prisma.partnerCampaign.findFirst({
      where: {
        id: campaignId,
        partnerAppId: input.scopeAppId,
      },
    });

    if (!row) {
      throw new AppError(404, 'partner campaign not found', 'NOT_FOUND', {
        campaignId,
      });
    }

    const currentStatus = normalizeCampaignStatus(String(row.status));
    if (currentStatus !== input.expectedStatus) {
      throw new AppError(409, 'partner campaign state transition is invalid', 'PARTNER_CAMPAIGN_STATUS_CONFLICT', {
        campaignId,
        status: currentStatus,
        expectedStatus: input.expectedStatus,
        nextStatus: input.nextStatus,
      });
    }

    const updatedAt = new Date();
    const next = await prisma.$transaction(async (tx: PartnerCampaignPrismaClient) => {
      const updated = await tx.partnerCampaign.update({
        where: {
          id: campaignId,
        },
        data: {
          status: input.nextStatus,
          publishedAt: input.publishAt ? updatedAt : row.publishedAt,
          pausedAt: input.pauseAt ? updatedAt : null,
          updatedAt,
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'PartnerCampaign',
          aggregateId: campaignId,
          eventType: input.eventType,
          payload: {
            campaignId,
            partnerAppId: input.scopeAppId,
            previousStatus: currentStatus,
            status: input.nextStatus,
            actor,
          },
          requestId: input.requestId,
          source: input.source,
        },
      });

      return updated;
    });

    return this.mapCampaignRecordToReadModel(next);
  }

  private buildMemoryRewardFromCallback(
    campaignId: string,
    callbackId: string,
    reward: ReceivePartnerCallbackCommand['reward']
  ): PartnerRewardState {
    if (!reward) {
      throw new AppError(400, 'reward payload is required', 'INVALID_INPUT');
    }

    const recipientWallet = normalizeNonEmpty(reward.recipientWallet, 'reward.recipientWallet', 120)
      .trim()
      .toLowerCase();
    const rewardType = normalizeNonEmpty(reward.rewardType, 'reward.rewardType', 40)
      .trim()
      .toUpperCase();
    const amount = normalizeNonEmpty(reward.amount, 'reward.amount', 64);
    const metadata = normalizeJsonObject(reward.metadata, 'reward.metadata');

    const nowIso = new Date().toISOString();
    return {
      id: toRewardId(),
      campaignId,
      callbackId,
      recipientWallet,
      rewardType,
      amount,
      status: 'GRANTED',
      metadata,
      grantedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }

  private ensureMemoryCampaignSlugUnique(appId: string, slug: string): void {
    const ids = this.campaignIdsByApp.get(appId) || [];
    for (const campaignId of ids) {
      const item = this.campaigns.get(campaignId);
      if (item && item.slug === slug) {
        throw new AppError(409, 'partner campaign slug already exists', 'PARTNER_CAMPAIGN_SLUG_EXISTS', {
          slug,
          appId,
        });
      }
    }
  }

  private storeCampaign(item: PartnerCampaignState): void {
    this.campaigns.set(item.id, item);
    const ids = this.campaignIdsByApp.get(item.partnerAppId) || [];
    if (!ids.includes(item.id)) {
      ids.push(item.id);
      this.campaignIdsByApp.set(item.partnerAppId, ids);
    }
  }

  private storeCallback(item: PartnerCallbackState): void {
    this.callbacks.set(item.id, item);

    const ids = this.callbackIdsByCampaign.get(item.campaignId) || [];
    if (!ids.includes(item.id)) {
      ids.push(item.id);
      this.callbackIdsByCampaign.set(item.campaignId, ids);
    }

    this.callbackIdByPartnerEvent.set(`${item.campaignId}:${item.partnerEventId}`, item.id);
  }

  private storeReward(item: PartnerRewardState): void {
    this.rewards.set(item.id, item);
    const ids = this.rewardIdsByCampaign.get(item.campaignId) || [];
    if (!ids.includes(item.id)) {
      ids.push(item.id);
      this.rewardIdsByCampaign.set(item.campaignId, ids);
    }
  }

  private getStorageMode(): PartnerStorageMode {
    return toStorageMode(process.env.V3_PARTNER_STORAGE_MODE);
  }

  private getMaxCallbackSkewSeconds(): number {
    return parsePositiveInteger(process.env.V3_PARTNER_CALLBACK_MAX_SKEW_SECONDS, 300);
  }

  private async getPrismaClient(): Promise<PartnerCampaignPrismaClient> {
    if (this.prismaClient) {
      return this.prismaClient;
    }

    const dbModule = await import('../../database');
    this.prismaClient = dbModule.prisma as unknown as PartnerCampaignPrismaClient;
    return this.prismaClient;
  }

  private assertCampaignRuntimeEnabled(): void {
    if (parseBoolean(process.env.V3_PARTNER_CAMPAIGN_RUNTIME_ENABLED, true)) {
      return;
    }

    throw new AppError(503, 'partner campaign runtime is disabled', 'PARTNER_CAMPAIGN_RUNTIME_DISABLED', {
      envFlag: 'V3_PARTNER_CAMPAIGN_RUNTIME_ENABLED',
    });
  }

  private assertCampaignPublishEnabled(): void {
    if (parseBoolean(process.env.V3_PARTNER_CAMPAIGN_PUBLISH_ENABLED, true)) {
      return;
    }

    throw new AppError(503, 'partner campaign publish is disabled', 'PARTNER_CAMPAIGN_PUBLISH_DISABLED', {
      envFlag: 'V3_PARTNER_CAMPAIGN_PUBLISH_ENABLED',
    });
  }

  private assertCampaignPauseEnabled(): void {
    if (parseBoolean(process.env.V3_PARTNER_CAMPAIGN_PAUSE_ENABLED, true)) {
      return;
    }

    throw new AppError(503, 'partner campaign pause is disabled', 'PARTNER_CAMPAIGN_PAUSE_DISABLED', {
      envFlag: 'V3_PARTNER_CAMPAIGN_PAUSE_ENABLED',
    });
  }

  private assertCampaignResumeEnabled(): void {
    if (parseBoolean(process.env.V3_PARTNER_CAMPAIGN_RESUME_ENABLED, true)) {
      return;
    }

    throw new AppError(503, 'partner campaign resume is disabled', 'PARTNER_CAMPAIGN_RESUME_DISABLED', {
      envFlag: 'V3_PARTNER_CAMPAIGN_RESUME_ENABLED',
    });
  }

  private assertCallbackEnabled(): void {
    if (parseBoolean(process.env.V3_PARTNER_CALLBACKS_ENABLED, true)) {
      return;
    }

    throw new AppError(503, 'partner callbacks are disabled', 'PARTNER_CALLBACKS_DISABLED', {
      envFlag: 'V3_PARTNER_CALLBACKS_ENABLED',
    });
  }

  private assertRewardRecordEnabled(): void {
    if (parseBoolean(process.env.V3_PARTNER_REWARD_RECORD_ENABLED, true)) {
      return;
    }

    throw new AppError(503, 'partner reward recording is disabled', 'PARTNER_REWARD_RECORD_DISABLED', {
      envFlag: 'V3_PARTNER_REWARD_RECORD_ENABLED',
    });
  }

  private assertAppAllowed(appId: string): void {
    const raw = process.env.V3_PARTNER_ALLOWED_APPS;
    if (!raw?.trim()) {
      return;
    }

    const allowed = new Set(
      raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    );

    if (allowed.has(appId)) {
      return;
    }

    throw new AppError(403, 'partner app is not allowed to write', 'PARTNER_APP_NOT_ALLOWED', {
      appId,
      envFlag: 'V3_PARTNER_ALLOWED_APPS',
    });
  }

  private mapCampaignRecordToReadModel(record: any): PartnerCampaignReadModel {
    return {
      id: normalizeCampaignId(String(record.id)),
      partnerAppId: String(record.partnerAppId),
      slug: String(record.slug),
      title: String(record.title),
      description: record.description ? String(record.description) : null,
      status: normalizeCampaignStatus(String(record.status)),
      callbackEndpoint: String(record.callbackEndpoint),
      publishedAt: record.publishedAt ? toIsoString(record.publishedAt) : null,
      pausedAt: record.pausedAt ? toIsoString(record.pausedAt) : null,
      createdAt: toIsoString(record.createdAt),
      updatedAt: toIsoString(record.updatedAt),
      audit: {
        createdByKeyId: String(record.createdByKeyId),
        createdByActor: String(record.createdByActor),
        requestId: record.requestId ? String(record.requestId) : null,
      },
      rollout: {
        rewardPolicy: normalizeJsonObject(record.rewardPolicy, 'rewardPolicy'),
        metadata: normalizeJsonObject(record.metadata, 'metadata'),
      },
    };
  }

  private mapCallbackRecordToReadModel(record: any): PartnerCallbackReadModel {
    const rewardId = record.reward?.id || record.rewardId || null;

    return {
      id: normalizeCallbackId(String(record.id)),
      campaignId: normalizeCampaignId(String(record.campaignId)),
      partnerEventId: String(record.partnerEventId),
      eventType: normalizeCallbackEventType(String(record.eventType)),
      signatureVersion: PARTNER_SIGNATURE_VERSION,
      verified: Boolean(record.verified),
      status: String(record.status) === 'REJECTED' ? 'REJECTED' : 'ACCEPTED',
      reason: record.reason ? String(record.reason) : null,
      payload: normalizeJsonObject(record.payload, 'payload') || {},
      requestId: record.requestId ? String(record.requestId) : null,
      receivedAt: toIsoString(record.receivedAt),
      processedAt: toIsoString(record.processedAt || record.receivedAt),
      rewardId: rewardId ? normalizeRewardId(String(rewardId)) : null,
    };
  }

  private mapRewardRecordToReadModel(record: any): PartnerRewardReadModel {
    return {
      id: normalizeRewardId(String(record.id)),
      campaignId: normalizeCampaignId(String(record.campaignId)),
      callbackId: normalizeCallbackId(String(record.callbackId)),
      recipientWallet: String(record.recipientWallet).toLowerCase(),
      rewardType: String(record.rewardType).toUpperCase(),
      amount: String(record.amount),
      status: String(record.status) === 'REVOKED' ? 'REVOKED' : 'GRANTED',
      metadata: normalizeJsonObject(record.metadata, 'metadata'),
      grantedAt: toIsoString(record.grantedAt || record.createdAt),
      createdAt: toIsoString(record.createdAt),
      updatedAt: toIsoString(record.updatedAt),
    };
  }
}

export const v3PartnerCampaignService = new PartnerCampaignService();

export const resetV3PartnerCampaignStoreForTest = (): void => {
  v3PartnerCampaignService.resetForTest();
};
