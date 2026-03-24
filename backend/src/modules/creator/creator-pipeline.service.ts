import { randomUUID } from 'crypto';
import { AppError } from '../../middlewares/errorHandler';

export const CREATOR_ASSET_TYPES = ['IMAGE', 'AUDIO', 'MODEL', 'TEXTURE', 'SCRIPT'] as const;
export const CREATOR_ASSET_STATUSES = ['READY', 'REJECTED'] as const;
export const CREATOR_PACK_STATUSES = ['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED'] as const;
export const CREATOR_PACK_PREVIEW_STATES = ['READY', 'NEEDS_REVIEW'] as const;
export const CREATOR_PACK_REVIEW_DECISIONS = ['APPROVE', 'REJECT'] as const;

export type CreatorAssetType = (typeof CREATOR_ASSET_TYPES)[number];
export type CreatorAssetStatus = (typeof CREATOR_ASSET_STATUSES)[number];
export type CreatorPackStatus = (typeof CREATOR_PACK_STATUSES)[number];
export type CreatorPackPreviewState = (typeof CREATOR_PACK_PREVIEW_STATES)[number];
export type CreatorPackReviewDecision = (typeof CREATOR_PACK_REVIEW_DECISIONS)[number];

type CreatorStorageMode = 'prisma' | 'memory';

export interface CreatorAssetReadModel {
  id: string;
  creatorAppId: string;
  type: CreatorAssetType;
  mimeType: string;
  sourceUrl: string;
  checksum: string;
  bytes: number;
  status: CreatorAssetStatus;
  metadata: Record<string, unknown> | null;
  preview: {
    validatorVersion: string;
    acceptedMimeTypes: string[];
    maxBytes: number;
    checksumAlgorithm: 'sha256';
  };
  createdAt: string;
  updatedAt: string;
  audit: {
    createdByKeyId: string;
    createdByActor: string;
    requestId: string | null;
  };
}

export interface CreatorAssetListReadModel {
  total: number;
  items: CreatorAssetReadModel[];
}

export interface CreatorPackReadModel {
  id: string;
  creatorAppId: string;
  slug: string;
  title: string;
  summary: string | null;
  status: CreatorPackStatus;
  previewState: CreatorPackPreviewState;
  assetIds: string[];
  assetCount: number;
  createdAt: string;
  updatedAt: string;
  audit: {
    createdByKeyId: string;
    createdByActor: string;
    requestId: string | null;
  };
}

export interface CreatorPackListReadModel {
  total: number;
  items: CreatorPackReadModel[];
}

export interface CreatorPackPreviewReadModel {
  pack: CreatorPackReadModel;
  render: {
    mode: 'SAFE';
    ready: boolean;
    warnings: string[];
    snapshot: {
      visualAssetCount: number;
      scriptAssetCount: number;
      totalBytes: number;
      mimeTypes: string[];
      previewImageUrl: string | null;
    };
  };
  assets: Array<{
    id: string;
    type: CreatorAssetType;
    mimeType: string;
    bytes: number;
    status: CreatorAssetStatus;
    sourceUrl: string;
  }>;
  generatedAt: string;
}

export interface CreateCreatorAssetCommand {
  type: CreatorAssetType;
  mimeType: string;
  sourceUrl: string;
  checksum: string;
  bytes: number;
  metadata?: Record<string, unknown>;
  requestedBy: {
    appId: string;
    keyId: string;
    actor: string;
    requestId?: string | null;
  };
}

export interface CreateCreatorPackDraftCommand {
  slug: string;
  title: string;
  summary?: string;
  assetIds: string[];
  requestedBy: {
    appId: string;
    keyId: string;
    actor: string;
    requestId?: string | null;
  };
}

export interface SubmitCreatorPackForReviewCommand {
  packId: string;
  scopeAppId: string;
  note?: string;
  requestedBy: {
    appId: string;
    actor: string;
    requestId?: string | null;
  };
}

export interface AdminReviewCreatorPackCommand {
  packId: string;
  decision: CreatorPackReviewDecision;
  note?: string;
  requestedBy: {
    actor: string;
    requestId?: string | null;
  };
}

export interface AdminRollbackCreatorPackCommand {
  packId: string;
  reason?: string;
  requestedBy: {
    actor: string;
    requestId?: string | null;
  };
}

interface CreatorAssetState extends CreatorAssetReadModel {}
interface CreatorPackState extends CreatorPackReadModel {}

interface CreatorPipelinePrismaClient {
  creatorProfile: {
    upsert: (args: any) => Promise<any>;
  };
  creatorAsset: {
    create: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any | null>;
    findMany: (args: any) => Promise<any[]>;
    count: (args: any) => Promise<number>;
  };
  creatorPack: {
    create: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any | null>;
    update: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
    count: (args: any) => Promise<number>;
  };
  creatorPackAsset: {
    createMany: (args: any) => Promise<any>;
  };
  domainEvent: {
    create: (args: any) => Promise<any>;
  };
  $transaction: (args: any) => Promise<any>;
}

const ASSET_ID_PATTERN = /^cas_[a-z0-9]+$/;
const PACK_ID_PATTERN = /^cpk_[a-z0-9]+$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CHECKSUM_PATTERN = /^[a-f0-9]{16,128}$/i;
const PACK_STATUS_SET = new Set<string>(CREATOR_PACK_STATUSES);
const PACK_REVIEW_DECISION_SET = new Set<string>(CREATOR_PACK_REVIEW_DECISIONS);

const ASSET_TYPE_SET = new Set<string>(CREATOR_ASSET_TYPES);
const ASSET_STATUS_SET = new Set<string>(CREATOR_ASSET_STATUSES);

const ALLOWED_MIME_TYPES_BY_ASSET_TYPE: Record<CreatorAssetType, readonly string[]> = {
  IMAGE: ['image/png', 'image/jpeg', 'image/webp'],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  MODEL: ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream'],
  TEXTURE: ['image/png', 'image/jpeg', 'image/webp'],
  SCRIPT: ['application/json'],
};

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

const toAssetId = (): string => `cas_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
const toPackId = (): string => `cpk_${randomUUID().replace(/-/g, '').slice(0, 24)}`;

const normalizeNonEmpty = (value: string, field: string, maxLength: number): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new AppError(400, `${field} is required`, 'INVALID_INPUT', {
      field,
    });
  }
  if (normalized.length > maxLength) {
    throw new AppError(400, `${field} must be <= ${maxLength} characters`, 'INVALID_INPUT', {
      field,
      maxLength,
    });
  }
  return normalized;
};

const toIsoString = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const toStorageMode = (raw: string | undefined): CreatorStorageMode => {
  if (raw?.trim().toLowerCase() === 'memory') {
    return 'memory';
  }
  return 'prisma';
};

const cloneAsset = (asset: CreatorAssetState): CreatorAssetReadModel => ({
  ...asset,
  metadata: asset.metadata ? { ...asset.metadata } : null,
  preview: {
    ...asset.preview,
    acceptedMimeTypes: [...asset.preview.acceptedMimeTypes],
  },
  audit: {
    ...asset.audit,
  },
});

const clonePack = (pack: CreatorPackState): CreatorPackReadModel => ({
  ...pack,
  assetIds: [...pack.assetIds],
  audit: {
    ...pack.audit,
  },
});

export class CreatorPipelineService {
  private prismaClient?: CreatorPipelinePrismaClient;

  private readonly assets = new Map<string, CreatorAssetState>();
  private readonly assetIdsByApp = new Map<string, string[]>();
  private readonly packs = new Map<string, CreatorPackState>();
  private readonly packIdsByApp = new Map<string, string[]>();

  constructor(deps?: { prismaClient?: CreatorPipelinePrismaClient }) {
    this.prismaClient = deps?.prismaClient;
  }

  async createAsset(input: CreateCreatorAssetCommand): Promise<CreatorAssetReadModel> {
    this.assertAssetPipelineEnabled();
    this.assertAppAllowed(input.requestedBy.appId);

    const assetType = this.normalizeAssetType(input.type);
    const mimeType = normalizeNonEmpty(input.mimeType, 'mimeType', 120).toLowerCase();
    const sourceUrl = this.normalizeSourceUrl(input.sourceUrl);
    const checksum = this.normalizeChecksum(input.checksum);
    const bytes = this.normalizeAssetBytes(input.bytes, assetType);
    const metadata = this.normalizeMetadata(input.metadata);

    const acceptedMimeTypes = ALLOWED_MIME_TYPES_BY_ASSET_TYPE[assetType];
    if (!acceptedMimeTypes.includes(mimeType)) {
      throw new AppError(400, 'asset mimeType is not allowed for type', 'CREATOR_ASSET_PREVIEW_INVALID', {
        type: assetType,
        mimeType,
        acceptedMimeTypes,
      });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const asset: CreatorAssetState = {
      id: toAssetId(),
      creatorAppId: input.requestedBy.appId,
      type: assetType,
      mimeType,
      sourceUrl,
      checksum,
      bytes,
      status: 'READY',
      metadata,
      preview: {
        validatorVersion: 'v3-creator-preview-v1',
        acceptedMimeTypes: [...acceptedMimeTypes],
        maxBytes: this.getMaxAssetBytes(assetType),
        checksumAlgorithm: 'sha256',
      },
      createdAt: nowIso,
      updatedAt: nowIso,
      audit: {
        createdByKeyId: input.requestedBy.keyId,
        createdByActor: input.requestedBy.actor,
        requestId: input.requestedBy.requestId?.trim() || null,
      },
    };

    if (this.getStorageMode() === 'memory') {
      this.storeAsset(asset);
      return cloneAsset(asset);
    }

    const prisma = await this.getPrismaClient();
    await prisma.$transaction(async (tx: CreatorPipelinePrismaClient) => {
      await tx.creatorProfile.upsert({
        where: {
          appId: asset.creatorAppId,
        },
        create: {
          appId: asset.creatorAppId,
          status: 'ACTIVE',
        },
        update: {
          status: 'ACTIVE',
        },
      });

      await tx.creatorAsset.create({
        data: {
          id: asset.id,
          creatorAppId: asset.creatorAppId,
          createdByKeyId: asset.audit.createdByKeyId,
          createdByActor: asset.audit.createdByActor,
          requestId: asset.audit.requestId,
          assetType: asset.type,
          mimeType: asset.mimeType,
          sourceUrl: asset.sourceUrl,
          checksum: asset.checksum,
          bytes: asset.bytes,
          status: asset.status,
          preview: asset.preview,
          metadata: asset.metadata,
          createdAt: now,
          updatedAt: now,
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'CreatorAsset',
          aggregateId: asset.id,
          eventType: 'CreatorAssetUploaded',
          payload: {
            assetId: asset.id,
            creatorAppId: asset.creatorAppId,
            type: asset.type,
            mimeType: asset.mimeType,
            sourceUrl: asset.sourceUrl,
            checksum: asset.checksum,
            bytes: asset.bytes,
            status: asset.status,
            preview: asset.preview,
            audit: asset.audit,
          },
          requestId: asset.audit.requestId,
          source: 'api.v3.creator.assets.create',
        },
      });
    });

    return cloneAsset(asset);
  }

  async listAssets(input: {
    scopeAppId: string;
    limit?: number;
  }): Promise<CreatorAssetListReadModel> {
    const limit = Math.max(1, Math.min(input.limit || 20, 100));

    if (this.getStorageMode() === 'memory') {
      const ids = this.assetIdsByApp.get(input.scopeAppId) || [];
      const items = ids
        .map((id) => this.assets.get(id))
        .filter((item): item is CreatorAssetState => Boolean(item))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

      return {
        total: items.length,
        items: items.slice(0, limit).map(cloneAsset),
      };
    }

    const prisma = await this.getPrismaClient();
    const where = {
      creatorAppId: input.scopeAppId,
    };
    const [total, records] = await prisma.$transaction([
      prisma.creatorAsset.count({ where }),
      prisma.creatorAsset.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      }),
    ]);

    return {
      total,
      items: records.map((record: any) => this.mapAssetRecordToReadModel(record)),
    };
  }

  async getAssetById(input: {
    assetId: string;
    scopeAppId?: string;
  }): Promise<CreatorAssetReadModel> {
    const assetId = this.normalizeAssetId(input.assetId);

    if (this.getStorageMode() === 'memory') {
      const asset = this.assets.get(assetId);
      if (!asset) {
        throw new AppError(404, 'creator asset not found', 'NOT_FOUND', {
          assetId,
        });
      }
      if (input.scopeAppId && asset.creatorAppId !== input.scopeAppId) {
        throw new AppError(404, 'creator asset not found', 'NOT_FOUND', {
          assetId,
        });
      }
      return cloneAsset(asset);
    }

    const prisma = await this.getPrismaClient();
    const record = await prisma.creatorAsset.findFirst({
      where: {
        id: assetId,
        ...(input.scopeAppId ? { creatorAppId: input.scopeAppId } : {}),
      },
    });

    if (!record) {
      throw new AppError(404, 'creator asset not found', 'NOT_FOUND', {
        assetId,
      });
    }

    return this.mapAssetRecordToReadModel(record);
  }

  async createPackDraft(input: CreateCreatorPackDraftCommand): Promise<CreatorPackReadModel> {
    this.assertPackDraftEnabled();
    this.assertAppAllowed(input.requestedBy.appId);

    const slug = this.normalizeSlug(input.slug);
    const title = normalizeNonEmpty(input.title, 'title', 120);
    const summary = input.summary?.trim() || null;
    if (summary && summary.length > 500) {
      throw new AppError(400, 'summary must be <= 500 characters', 'INVALID_INPUT', {
        field: 'summary',
      });
    }

    const assetIds = this.normalizeAssetIds(input.assetIds);
    const assets = await this.resolveAssetsForPack({
      scopeAppId: input.requestedBy.appId,
      assetIds,
    });

    if (!assets.some((item) => ['IMAGE', 'TEXTURE', 'MODEL'].includes(item.type))) {
      throw new AppError(
        400,
        'pack preview requires at least one visual asset (IMAGE/TEXTURE/MODEL)',
        'CREATOR_PACK_PREVIEW_INVALID',
        {
          assetIds,
        }
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const pack: CreatorPackState = {
      id: toPackId(),
      creatorAppId: input.requestedBy.appId,
      slug,
      title,
      summary,
      status: 'DRAFT',
      previewState: 'READY',
      assetIds,
      assetCount: assetIds.length,
      createdAt: nowIso,
      updatedAt: nowIso,
      audit: {
        createdByKeyId: input.requestedBy.keyId,
        createdByActor: input.requestedBy.actor,
        requestId: input.requestedBy.requestId?.trim() || null,
      },
    };

    if (this.getStorageMode() === 'memory') {
      this.storePack(pack);
      return clonePack(pack);
    }

    const prisma = await this.getPrismaClient();
    await prisma.$transaction(async (tx: CreatorPipelinePrismaClient) => {
      await tx.creatorProfile.upsert({
        where: {
          appId: pack.creatorAppId,
        },
        create: {
          appId: pack.creatorAppId,
          status: 'ACTIVE',
        },
        update: {
          status: 'ACTIVE',
        },
      });

      await tx.creatorPack.create({
        data: {
          id: pack.id,
          creatorAppId: pack.creatorAppId,
          slug: pack.slug,
          title: pack.title,
          summary: pack.summary,
          status: pack.status,
          previewState: pack.previewState,
          createdByKeyId: pack.audit.createdByKeyId,
          createdByActor: pack.audit.createdByActor,
          requestId: pack.audit.requestId,
          createdAt: now,
          updatedAt: now,
        },
      });

      await tx.creatorPackAsset.createMany({
        data: pack.assetIds.map((assetId, index) => ({
          packId: pack.id,
          assetId,
          sortOrder: index,
        })),
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'CreatorPack',
          aggregateId: pack.id,
          eventType: 'CreatorPackDrafted',
          payload: {
            packId: pack.id,
            creatorAppId: pack.creatorAppId,
            slug: pack.slug,
            title: pack.title,
            summary: pack.summary,
            status: pack.status,
            previewState: pack.previewState,
            assetIds: pack.assetIds,
            assetCount: pack.assetCount,
            audit: pack.audit,
          },
          requestId: pack.audit.requestId,
          source: 'api.v3.creator.packs.create',
        },
      });
    });

    return clonePack(pack);
  }

  async getPackById(input: {
    packId: string;
    scopeAppId: string;
  }): Promise<CreatorPackReadModel> {
    const packId = this.normalizePackId(input.packId);

    if (this.getStorageMode() === 'memory') {
      const pack = this.packs.get(packId);
      if (!pack || pack.creatorAppId !== input.scopeAppId) {
        throw new AppError(404, 'creator pack not found', 'NOT_FOUND', {
          packId,
        });
      }
      return clonePack(pack);
    }

    const prisma = await this.getPrismaClient();
    const record = await prisma.creatorPack.findFirst({
      where: {
        id: packId,
        creatorAppId: input.scopeAppId,
      },
      include: {
        assets: {
          orderBy: {
            sortOrder: 'asc',
          },
          include: {
            asset: true,
          },
        },
      },
    });

    if (!record) {
      throw new AppError(404, 'creator pack not found', 'NOT_FOUND', {
        packId,
      });
    }

    return this.mapPackRecordToReadModel(record);
  }

  async listPacks(input: {
    scopeAppId: string;
    status?: CreatorPackStatus;
    limit?: number;
  }): Promise<CreatorPackListReadModel> {
    const limit = Math.max(1, Math.min(input.limit || 20, 100));

    if (this.getStorageMode() === 'memory') {
      const ids = this.packIdsByApp.get(input.scopeAppId) || [];
      const items = ids
        .map((id) => this.packs.get(id))
        .filter((item): item is CreatorPackState => Boolean(item))
        .filter((item) => !input.status || item.status === input.status)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

      return {
        total: items.length,
        items: items.slice(0, limit).map(clonePack),
      };
    }

    const prisma = await this.getPrismaClient();
    const where = {
      creatorAppId: input.scopeAppId,
      ...(input.status ? { status: input.status } : {}),
    };

    const [total, records] = await prisma.$transaction([
      prisma.creatorPack.count({ where }),
      prisma.creatorPack.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        include: {
          assets: {
            orderBy: {
              sortOrder: 'asc',
            },
            include: {
              asset: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      items: records.map((record: any) => this.mapPackRecordToReadModel(record)),
    };
  }

  async submitPackForReview(input: SubmitCreatorPackForReviewCommand): Promise<CreatorPackReadModel> {
    this.assertPackReviewEnabled();
    const packId = this.normalizePackId(input.packId);
    const note = this.normalizeOptionalText(input.note, 'note', 280);
    const actor = normalizeNonEmpty(input.requestedBy.actor, 'actor', 120);
    const requestId = input.requestedBy.requestId?.trim() || null;

    if (this.getStorageMode() === 'memory') {
      const existing = this.packs.get(packId);
      if (!existing || existing.creatorAppId !== input.scopeAppId) {
        throw new AppError(404, 'creator pack not found', 'NOT_FOUND', {
          packId,
        });
      }

      if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
        throw new AppError(
          409,
          'creator pack can only be submitted from DRAFT or REJECTED',
          'CREATOR_PACK_STATUS_CONFLICT',
          {
            packId,
            status: existing.status,
            expectedStatuses: ['DRAFT', 'REJECTED'],
          }
        );
      }

      const nextState: CreatorPackState = {
        ...existing,
        status: 'IN_REVIEW',
        updatedAt: new Date().toISOString(),
      };
      this.storePack(nextState);
      return clonePack(nextState);
    }

    const prisma = await this.getPrismaClient();
    const record = await prisma.creatorPack.findFirst({
      where: {
        id: packId,
        creatorAppId: input.scopeAppId,
      },
      include: {
        assets: {
          orderBy: {
            sortOrder: 'asc',
          },
          include: {
            asset: true,
          },
        },
      },
    });

    if (!record) {
      throw new AppError(404, 'creator pack not found', 'NOT_FOUND', {
        packId,
      });
    }

    const currentStatus = this.normalizePackStatus(String(record.status));
    if (currentStatus !== 'DRAFT' && currentStatus !== 'REJECTED') {
      throw new AppError(
        409,
        'creator pack can only be submitted from DRAFT or REJECTED',
        'CREATOR_PACK_STATUS_CONFLICT',
        {
          packId,
          status: currentStatus,
          expectedStatuses: ['DRAFT', 'REJECTED'],
        }
      );
    }

    const updatedAt = new Date();
    const updatedRecord = await prisma.$transaction(async (tx: CreatorPipelinePrismaClient) => {
      const nextRecord = await tx.creatorPack.update({
        where: {
          id: packId,
        },
        data: {
          status: 'IN_REVIEW',
          updatedAt,
        },
        include: {
          assets: {
            orderBy: {
              sortOrder: 'asc',
            },
            include: {
              asset: true,
            },
          },
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'CreatorPack',
          aggregateId: packId,
          eventType: 'CreatorPackSubmittedForReview',
          payload: {
            packId,
            creatorAppId: input.scopeAppId,
            status: 'IN_REVIEW',
            previousStatus: currentStatus,
            note,
            actor,
          },
          requestId,
          source: 'api.v3.creator.packs.submit',
        },
      });

      return nextRecord;
    });

    return this.mapPackRecordToReadModel(updatedRecord);
  }

  async listPacksForAdmin(input: {
    status?: CreatorPackStatus;
    creatorAppId?: string;
    limit?: number;
  }): Promise<CreatorPackListReadModel> {
    const limit = Math.max(1, Math.min(input.limit || 20, 100));

    if (this.getStorageMode() === 'memory') {
      const items = Array.from(this.packs.values())
        .filter((item) => !input.creatorAppId || item.creatorAppId === input.creatorAppId)
        .filter((item) => !input.status || item.status === input.status)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

      return {
        total: items.length,
        items: items.slice(0, limit).map(clonePack),
      };
    }

    const prisma = await this.getPrismaClient();
    const where = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.creatorAppId ? { creatorAppId: input.creatorAppId } : {}),
    };

    const [total, records] = await prisma.$transaction([
      prisma.creatorPack.count({ where }),
      prisma.creatorPack.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        include: {
          assets: {
            orderBy: {
              sortOrder: 'asc',
            },
            include: {
              asset: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      items: records.map((record: any) => this.mapPackRecordToReadModel(record)),
    };
  }

  async adminReviewPack(input: AdminReviewCreatorPackCommand): Promise<CreatorPackReadModel> {
    this.assertPackReviewEnabled();
    const packId = this.normalizePackId(input.packId);
    const decision = this.normalizeReviewDecision(input.decision);
    const note = this.normalizeOptionalText(input.note, 'note', 280);
    const actor = normalizeNonEmpty(input.requestedBy.actor, 'actor', 120);
    const requestId = input.requestedBy.requestId?.trim() || null;
    const nextStatus: CreatorPackStatus = decision === 'APPROVE' ? 'PUBLISHED' : 'REJECTED';

    if (decision === 'APPROVE') {
      this.assertPackPublishEnabled();
    }

    if (this.getStorageMode() === 'memory') {
      const existing = this.packs.get(packId);
      if (!existing) {
        throw new AppError(404, 'creator pack not found', 'NOT_FOUND', {
          packId,
        });
      }

      if (existing.status !== 'IN_REVIEW') {
        throw new AppError(409, 'creator pack is not in review queue', 'CREATOR_PACK_STATUS_CONFLICT', {
          packId,
          status: existing.status,
          expectedStatus: 'IN_REVIEW',
        });
      }

      const nextState: CreatorPackState = {
        ...existing,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      };
      this.storePack(nextState);
      return clonePack(nextState);
    }

    const prisma = await this.getPrismaClient();
    const record = await prisma.creatorPack.findFirst({
      where: {
        id: packId,
      },
      include: {
        assets: {
          orderBy: {
            sortOrder: 'asc',
          },
          include: {
            asset: true,
          },
        },
      },
    });

    if (!record) {
      throw new AppError(404, 'creator pack not found', 'NOT_FOUND', {
        packId,
      });
    }

    const currentStatus = this.normalizePackStatus(String(record.status));
    if (currentStatus !== 'IN_REVIEW') {
      throw new AppError(409, 'creator pack is not in review queue', 'CREATOR_PACK_STATUS_CONFLICT', {
        packId,
        status: currentStatus,
        expectedStatus: 'IN_REVIEW',
      });
    }

    const updatedAt = new Date();
    const updatedRecord = await prisma.$transaction(async (tx: CreatorPipelinePrismaClient) => {
      const nextRecord = await tx.creatorPack.update({
        where: {
          id: packId,
        },
        data: {
          status: nextStatus,
          updatedAt,
        },
        include: {
          assets: {
            orderBy: {
              sortOrder: 'asc',
            },
            include: {
              asset: true,
            },
          },
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'CreatorPack',
          aggregateId: packId,
          eventType: decision === 'APPROVE' ? 'CreatorPackReviewApproved' : 'CreatorPackReviewRejected',
          payload: {
            packId,
            creatorAppId: String(record.creatorAppId),
            status: nextStatus,
            previousStatus: currentStatus,
            note,
            actor,
          },
          requestId,
          source: 'api.admin.v3.creators.review',
        },
      });

      return nextRecord;
    });

    return this.mapPackRecordToReadModel(updatedRecord);
  }

  async adminRollbackPack(input: AdminRollbackCreatorPackCommand): Promise<CreatorPackReadModel> {
    const packId = this.normalizePackId(input.packId);
    const reason = this.normalizeOptionalText(input.reason, 'reason', 240);
    const actor = normalizeNonEmpty(input.requestedBy.actor, 'actor', 120);
    const requestId = input.requestedBy.requestId?.trim() || null;

    if (this.getStorageMode() === 'memory') {
      const existing = this.packs.get(packId);
      if (!existing) {
        throw new AppError(404, 'creator pack not found', 'NOT_FOUND', {
          packId,
        });
      }

      if (existing.status !== 'PUBLISHED') {
        throw new AppError(409, 'only published creator pack can be rolled back', 'CREATOR_PACK_STATUS_CONFLICT', {
          packId,
          status: existing.status,
          expectedStatus: 'PUBLISHED',
        });
      }

      const nextState: CreatorPackState = {
        ...existing,
        status: 'DRAFT',
        updatedAt: new Date().toISOString(),
      };
      this.storePack(nextState);
      return clonePack(nextState);
    }

    const prisma = await this.getPrismaClient();
    const record = await prisma.creatorPack.findFirst({
      where: {
        id: packId,
      },
      include: {
        assets: {
          orderBy: {
            sortOrder: 'asc',
          },
          include: {
            asset: true,
          },
        },
      },
    });

    if (!record) {
      throw new AppError(404, 'creator pack not found', 'NOT_FOUND', {
        packId,
      });
    }

    const currentStatus = this.normalizePackStatus(String(record.status));
    if (currentStatus !== 'PUBLISHED') {
      throw new AppError(409, 'only published creator pack can be rolled back', 'CREATOR_PACK_STATUS_CONFLICT', {
        packId,
        status: currentStatus,
        expectedStatus: 'PUBLISHED',
      });
    }

    const updatedAt = new Date();
    const updatedRecord = await prisma.$transaction(async (tx: CreatorPipelinePrismaClient) => {
      const nextRecord = await tx.creatorPack.update({
        where: {
          id: packId,
        },
        data: {
          status: 'DRAFT',
          updatedAt,
        },
        include: {
          assets: {
            orderBy: {
              sortOrder: 'asc',
            },
            include: {
              asset: true,
            },
          },
        },
      });

      await tx.domainEvent.create({
        data: {
          aggregateType: 'CreatorPack',
          aggregateId: packId,
          eventType: 'CreatorPackRolledBack',
          payload: {
            packId,
            creatorAppId: String(record.creatorAppId),
            status: 'DRAFT',
            previousStatus: currentStatus,
            reason,
            actor,
          },
          requestId,
          source: 'api.admin.v3.creators.rollback',
        },
      });

      return nextRecord;
    });

    return this.mapPackRecordToReadModel(updatedRecord);
  }

  async buildPackPreview(input: {
    packId: string;
    scopeAppId?: string;
  }): Promise<CreatorPackPreviewReadModel> {
    this.assertPreviewRenderEnabled();
    const packId = this.normalizePackId(input.packId);

    const assetsForPreview: CreatorAssetReadModel[] = [];
    let pack: CreatorPackReadModel | null = null;

    if (this.getStorageMode() === 'memory') {
      const existing = this.packs.get(packId);
      if (!existing) {
        throw new AppError(404, 'creator pack not found', 'NOT_FOUND', {
          packId,
        });
      }
      if (input.scopeAppId && existing.creatorAppId !== input.scopeAppId) {
        throw new AppError(404, 'creator pack not found', 'NOT_FOUND', {
          packId,
        });
      }
      pack = clonePack(existing);
      for (const assetId of pack.assetIds) {
        const asset = this.assets.get(assetId);
        if (asset) {
          assetsForPreview.push(cloneAsset(asset));
        }
      }
    } else {
      const prisma = await this.getPrismaClient();
      const record = await prisma.creatorPack.findFirst({
        where: {
          id: packId,
          ...(input.scopeAppId ? { creatorAppId: input.scopeAppId } : {}),
        },
        include: {
          assets: {
            orderBy: {
              sortOrder: 'asc',
            },
            include: {
              asset: true,
            },
          },
        },
      });
      if (!record) {
        throw new AppError(404, 'creator pack not found', 'NOT_FOUND', {
          packId,
        });
      }
      pack = this.mapPackRecordToReadModel(record);
      for (const assetRef of record.assets || []) {
        if (assetRef?.asset) {
          assetsForPreview.push(this.mapAssetRecordToReadModel(assetRef.asset));
        }
      }
    }

    const visualAssetCount = assetsForPreview.filter((item) =>
      item.type === 'IMAGE' || item.type === 'TEXTURE' || item.type === 'MODEL'
    ).length;
    const scriptAssetCount = assetsForPreview.filter((item) => item.type === 'SCRIPT').length;
    const totalBytes = assetsForPreview.reduce((sum, item) => sum + item.bytes, 0);
    const mimeTypes = Array.from(new Set(assetsForPreview.map((item) => item.mimeType))).sort();
    const previewImageUrl =
      assetsForPreview.find((item) => item.type === 'IMAGE' || item.type === 'TEXTURE')?.sourceUrl || null;

    const warnings: string[] = [];
    if (visualAssetCount === 0) {
      warnings.push('preview requires at least one visual asset');
    }
    if (pack.status === 'REJECTED') {
      warnings.push('pack is currently rejected and requires resubmission');
    }
    if (pack.status === 'ARCHIVED') {
      warnings.push('pack is archived and cannot be rendered');
    }

    return {
      pack,
      render: {
        mode: 'SAFE',
        ready: warnings.length === 0,
        warnings,
        snapshot: {
          visualAssetCount,
          scriptAssetCount,
          totalBytes,
          mimeTypes,
          previewImageUrl,
        },
      },
      assets: assetsForPreview.map((item) => ({
        id: item.id,
        type: item.type,
        mimeType: item.mimeType,
        bytes: item.bytes,
        status: item.status,
        sourceUrl: item.sourceUrl,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  resetForTest(): void {
    this.assets.clear();
    this.assetIdsByApp.clear();
    this.packs.clear();
    this.packIdsByApp.clear();
  }

  private getStorageMode(): CreatorStorageMode {
    return toStorageMode(process.env.V3_CREATOR_STORAGE_MODE);
  }

  private async getPrismaClient(): Promise<CreatorPipelinePrismaClient> {
    if (this.prismaClient) {
      return this.prismaClient;
    }

    const dbModule = await import('../../database');
    this.prismaClient = dbModule.prisma as unknown as CreatorPipelinePrismaClient;
    return this.prismaClient;
  }

  private assertAssetPipelineEnabled(): void {
    if (parseBoolean(process.env.V3_CREATOR_ASSET_PIPELINE_ENABLED, true)) {
      return;
    }

    throw new AppError(503, 'creator asset pipeline is disabled', 'CREATOR_ASSET_PIPELINE_DISABLED', {
      envFlag: 'V3_CREATOR_ASSET_PIPELINE_ENABLED',
    });
  }

  private assertPackDraftEnabled(): void {
    if (parseBoolean(process.env.V3_CREATOR_PACK_DRAFT_ENABLED, true)) {
      return;
    }

    throw new AppError(503, 'creator pack draft flow is disabled', 'CREATOR_PACK_DRAFT_DISABLED', {
      envFlag: 'V3_CREATOR_PACK_DRAFT_ENABLED',
    });
  }

  private assertPackReviewEnabled(): void {
    if (parseBoolean(process.env.V3_CREATOR_PACK_REVIEW_ENABLED, true)) {
      return;
    }

    throw new AppError(503, 'creator pack review queue is disabled', 'CREATOR_PACK_REVIEW_DISABLED', {
      envFlag: 'V3_CREATOR_PACK_REVIEW_ENABLED',
    });
  }

  private assertPackPublishEnabled(): void {
    if (parseBoolean(process.env.V3_CREATOR_PACK_PUBLISH_ENABLED, true)) {
      return;
    }

    throw new AppError(503, 'creator pack publish is disabled', 'CREATOR_PACK_PUBLISH_DISABLED', {
      envFlag: 'V3_CREATOR_PACK_PUBLISH_ENABLED',
    });
  }

  private assertPreviewRenderEnabled(): void {
    if (parseBoolean(process.env.V3_CREATOR_PREVIEW_RENDER_ENABLED, true)) {
      return;
    }

    throw new AppError(503, 'creator preview renderer is disabled', 'CREATOR_PREVIEW_RENDER_DISABLED', {
      envFlag: 'V3_CREATOR_PREVIEW_RENDER_ENABLED',
    });
  }

  private assertAppAllowed(appId: string): void {
    const raw = process.env.V3_CREATOR_ALLOWED_APPS;
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

    throw new AppError(403, 'creator app is not allowed to write', 'CREATOR_APP_NOT_ALLOWED', {
      appId,
      envFlag: 'V3_CREATOR_ALLOWED_APPS',
    });
  }

  private normalizeAssetType(type: string): CreatorAssetType {
    const normalized = type.trim().toUpperCase();
    if (!ASSET_TYPE_SET.has(normalized)) {
      throw new AppError(400, 'asset type is invalid', 'INVALID_INPUT', {
        type,
      });
    }

    return normalized as CreatorAssetType;
  }

  private normalizeSourceUrl(sourceUrl: string): string {
    const normalized = normalizeNonEmpty(sourceUrl, 'sourceUrl', 512);
    try {
      const url = new URL(normalized);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error('unsupported protocol');
      }
    } catch {
      throw new AppError(400, 'sourceUrl must be a valid http(s) URL', 'INVALID_INPUT', {
        sourceUrl,
      });
    }
    return normalized;
  }

  private normalizeChecksum(checksum: string): string {
    const normalized = normalizeNonEmpty(checksum, 'checksum', 128).toLowerCase();
    if (!CHECKSUM_PATTERN.test(normalized)) {
      throw new AppError(400, 'checksum must be a hex string', 'INVALID_INPUT', {
        checksum,
      });
    }
    return normalized;
  }

  private normalizeAssetBytes(bytes: number, type: CreatorAssetType): number {
    if (!Number.isInteger(bytes) || bytes <= 0) {
      throw new AppError(400, 'bytes must be a positive integer', 'INVALID_INPUT', {
        bytes,
      });
    }

    const maxBytes = this.getMaxAssetBytes(type);
    if (bytes > maxBytes) {
      throw new AppError(400, 'asset bytes exceed max allowed size', 'CREATOR_ASSET_TOO_LARGE', {
        bytes,
        maxBytes,
        type,
      });
    }

    return bytes;
  }

  private getMaxAssetBytes(type: CreatorAssetType): number {
    const defaultByType: Record<CreatorAssetType, number> = {
      IMAGE: 8 * 1024 * 1024,
      AUDIO: 20 * 1024 * 1024,
      MODEL: 40 * 1024 * 1024,
      TEXTURE: 12 * 1024 * 1024,
      SCRIPT: 512 * 1024,
    };

    return parsePositiveInteger(process.env.V3_CREATOR_MAX_ASSET_BYTES, defaultByType[type]);
  }

  private normalizeMetadata(metadata: unknown): Record<string, unknown> | null {
    if (metadata === undefined || metadata === null) {
      return null;
    }

    if (typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new AppError(400, 'metadata must be an object', 'INVALID_INPUT', {
        metadata,
      });
    }

    return metadata as Record<string, unknown>;
  }

  private normalizeSlug(slug: string): string {
    const normalized = normalizeNonEmpty(slug, 'slug', 64).toLowerCase();
    if (!SLUG_PATTERN.test(normalized)) {
      throw new AppError(400, 'slug is invalid', 'INVALID_INPUT', {
        slug,
      });
    }
    return normalized;
  }

  private normalizeOptionalText(value: string | undefined, field: string, maxLength: number): string | null {
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
  }

  private normalizePackStatus(value: string): CreatorPackStatus {
    const normalized = value.trim().toUpperCase();
    if (!PACK_STATUS_SET.has(normalized)) {
      return 'DRAFT';
    }
    return normalized as CreatorPackStatus;
  }

  private normalizeReviewDecision(value: string): CreatorPackReviewDecision {
    const normalized = value.trim().toUpperCase();
    if (!PACK_REVIEW_DECISION_SET.has(normalized)) {
      throw new AppError(400, 'review decision is invalid', 'INVALID_INPUT', {
        decision: value,
      });
    }
    return normalized as CreatorPackReviewDecision;
  }

  private normalizePackId(packId: string): string {
    const normalized = packId.trim().toLowerCase();
    if (!PACK_ID_PATTERN.test(normalized)) {
      throw new AppError(400, 'packId is invalid', 'INVALID_INPUT', {
        packId,
      });
    }
    return normalized;
  }

  private normalizeAssetId(assetId: string): string {
    const normalized = assetId.trim().toLowerCase();
    if (!ASSET_ID_PATTERN.test(normalized)) {
      throw new AppError(400, 'assetId is invalid', 'INVALID_INPUT', {
        assetId,
      });
    }
    return normalized;
  }

  private normalizeAssetIds(assetIds: string[]): string[] {
    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      throw new AppError(400, 'assetIds must be a non-empty array', 'INVALID_INPUT', {
        assetIds,
      });
    }

    const normalized = Array.from(
      new Set(assetIds.map((assetId) => this.normalizeAssetId(assetId)))
    );

    if (normalized.length > 24) {
      throw new AppError(400, 'assetIds length must be <= 24', 'INVALID_INPUT', {
        max: 24,
      });
    }

    return normalized;
  }

  private async resolveAssetsForPack(input: {
    scopeAppId: string;
    assetIds: string[];
  }): Promise<CreatorAssetReadModel[]> {
    if (this.getStorageMode() === 'memory') {
      const items = input.assetIds
        .map((assetId) => this.assets.get(assetId))
        .filter((item): item is CreatorAssetState => Boolean(item));

      if (items.length !== input.assetIds.length) {
        throw new AppError(403, 'creator pack references assets outside scope', 'CREATOR_PERMISSION_DENIED', {
          scopeAppId: input.scopeAppId,
        });
      }

      for (const asset of items) {
        if (asset.creatorAppId !== input.scopeAppId) {
          throw new AppError(403, 'creator pack references assets outside scope', 'CREATOR_PERMISSION_DENIED', {
            scopeAppId: input.scopeAppId,
          });
        }
        if (asset.status !== 'READY') {
          throw new AppError(409, 'creator pack requires READY assets', 'CREATOR_ASSET_NOT_READY', {
            assetId: asset.id,
            status: asset.status,
          });
        }
      }

      return items.map(cloneAsset);
    }

    const prisma = await this.getPrismaClient();
    const records = await prisma.creatorAsset.findMany({
      where: {
        id: {
          in: input.assetIds,
        },
        creatorAppId: input.scopeAppId,
      },
    });

    if (records.length !== input.assetIds.length) {
      throw new AppError(403, 'creator pack references assets outside scope', 'CREATOR_PERMISSION_DENIED', {
        scopeAppId: input.scopeAppId,
      });
    }

    for (const record of records) {
      if (!ASSET_STATUS_SET.has(String(record.status))) {
        throw new AppError(409, 'creator asset status is invalid', 'CREATOR_ASSET_NOT_READY', {
          assetId: record.id,
          status: record.status,
        });
      }

      if (String(record.status) !== 'READY') {
        throw new AppError(409, 'creator pack requires READY assets', 'CREATOR_ASSET_NOT_READY', {
          assetId: record.id,
          status: record.status,
        });
      }
    }

    return records.map((record: any) => this.mapAssetRecordToReadModel(record));
  }

  private storeAsset(asset: CreatorAssetState): void {
    this.assets.set(asset.id, asset);
    const ids = this.assetIdsByApp.get(asset.creatorAppId) || [];
    if (!ids.includes(asset.id)) {
      ids.push(asset.id);
      this.assetIdsByApp.set(asset.creatorAppId, ids);
    }
  }

  private storePack(pack: CreatorPackState): void {
    this.packs.set(pack.id, pack);
    const ids = this.packIdsByApp.get(pack.creatorAppId) || [];
    if (!ids.includes(pack.id)) {
      ids.push(pack.id);
      this.packIdsByApp.set(pack.creatorAppId, ids);
    }
  }

  private mapAssetRecordToReadModel(record: any): CreatorAssetReadModel {
    const rawType = String(record.assetType) as CreatorAssetType;
    const fallbackType: CreatorAssetType = ASSET_TYPE_SET.has(rawType) ? rawType : 'IMAGE';
    const rawAccepted = record.preview?.acceptedMimeTypes;
    const acceptedMimeTypes = Array.isArray(rawAccepted)
      ? rawAccepted.map((item: unknown) => String(item))
      : [...ALLOWED_MIME_TYPES_BY_ASSET_TYPE[fallbackType]];
    const maxBytes =
      typeof record.preview?.maxBytes === 'number'
        ? Number(record.preview.maxBytes)
        : this.getMaxAssetBytes(fallbackType);

    return {
      id: String(record.id),
      creatorAppId: String(record.creatorAppId),
      type: fallbackType,
      mimeType: String(record.mimeType),
      sourceUrl: String(record.sourceUrl),
      checksum: String(record.checksum),
      bytes: Number(record.bytes),
      status: String(record.status) as CreatorAssetStatus,
      metadata: (record.metadata as Record<string, unknown> | null) ?? null,
      preview: {
        validatorVersion:
          typeof record.preview?.validatorVersion === 'string'
            ? record.preview.validatorVersion
            : 'v3-creator-preview-v1',
        acceptedMimeTypes,
        maxBytes,
        checksumAlgorithm: 'sha256',
      },
      createdAt: toIsoString(record.createdAt),
      updatedAt: toIsoString(record.updatedAt),
      audit: {
        createdByKeyId: String(record.createdByKeyId),
        createdByActor: String(record.createdByActor),
        requestId: record.requestId ? String(record.requestId) : null,
      },
    };
  }

  private mapPackRecordToReadModel(record: any): CreatorPackReadModel {
    const status = this.normalizePackStatus(String(record.status));
    const previewState =
      String(record.previewState) === 'NEEDS_REVIEW'
        ? 'NEEDS_REVIEW'
        : 'READY';
    const assetIds = Array.isArray(record.assets)
      ? record.assets
          .map((item: any) => String(item.assetId || item.asset?.id || ''))
          .filter(Boolean)
      : [];

    return {
      id: String(record.id),
      creatorAppId: String(record.creatorAppId),
      slug: String(record.slug),
      title: String(record.title),
      summary: record.summary ? String(record.summary) : null,
      status,
      previewState,
      assetIds,
      assetCount: assetIds.length,
      createdAt: toIsoString(record.createdAt),
      updatedAt: toIsoString(record.updatedAt),
      audit: {
        createdByKeyId: String(record.createdByKeyId),
        createdByActor: String(record.createdByActor),
        requestId: record.requestId ? String(record.requestId) : null,
      },
    };
  }
}

export const v3CreatorPipelineService = new CreatorPipelineService();

export const resetV3CreatorPipelineStoreForTest = (): void => {
  v3CreatorPipelineService.resetForTest();
};
