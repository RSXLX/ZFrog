import { createHash, randomBytes, randomUUID } from 'crypto';
import { config } from '../../config';
import { AppError } from '../../middlewares/errorHandler';
import {
  type CreatorAssetReadModel,
  type CreatorPipelineService,
  v3CreatorPipelineService,
} from '../creator/creator-pipeline.service';

export const CREATOR_LICENSE_BINDING_STATUSES = ['BOUND', 'ANCHORED', 'FAILED'] as const;

export type CreatorLicenseBindingStatus = (typeof CREATOR_LICENSE_BINDING_STATUSES)[number];

type CreatorLicenseStorageMode = 'prisma' | 'memory';

export interface CreatorLicenseBindingReadModel {
  id: string;
  assetId: string;
  creatorAppId: string;
  checksum: string;
  ownerWallet: string;
  issuedAt: string;
  anchorDigest: string;
  status: CreatorLicenseBindingStatus;
  replayCount: number;
  lastError: string | null;
  anchoredAt: string | null;
  createdAt: string;
  updatedAt: string;
  audit: {
    createdByKeyId: string;
    createdByActor: string;
    requestId: string | null;
    lastReplayedByActor: string | null;
  };
  onchain: {
    required: boolean;
    enabled: boolean;
    anchored: boolean;
    mode: string;
    anchorId: string | null;
    chainId: number | null;
    txHash: string | null;
    blockNumber: string | null;
  };
}

export interface CreatorLicenseBindingListReadModel {
  total: number;
  items: CreatorLicenseBindingReadModel[];
}

export interface CreatorLicenseAnchorMutationResult {
  binding: CreatorLicenseBindingReadModel;
  idempotentReplay: boolean;
  replayed: boolean;
}

export interface CreateCreatorLicenseBindingCommand {
  assetId: string;
  ownerWallet: string;
  issuedAt: string;
  requestedBy: {
    appId: string;
    keyId: string;
    actor: string;
    requestId?: string | null;
  };
}

export interface ReplayCreatorLicenseBindingCommand {
  bindingId: string;
  scopeAppId?: string;
  force?: boolean;
  requestedBy: {
    actor: string;
    requestId?: string | null;
  };
}

interface CreatorLicenseBindingState {
  id: string;
  assetId: string;
  creatorAppId: string;
  checksum: string;
  ownerWallet: string;
  issuedAt: string;
  anchorDigest: string;
  status: CreatorLicenseBindingStatus;
  replayCount: number;
  lastError: string | null;
  onchainRequired: boolean;
  anchoredAt: string | null;
  createdAt: string;
  updatedAt: string;
  audit: {
    createdByKeyId: string;
    createdByActor: string;
    requestId: string | null;
    lastReplayedByActor: string | null;
  };
}

interface OnchainCreatorAssetState {
  id: string;
  bindingId: string;
  anchorId: string;
  mode: string;
  chainId: number | null;
  txHash: string | null;
  blockNumber: string | null;
  payload: Record<string, unknown> | null;
  anchoredAt: string;
  createdAt: string;
  updatedAt: string;
}

interface CreatorLicenseAnchorPrismaClient {
  creatorAssetBinding: {
    create: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any | null>;
    findMany: (args: any) => Promise<any[]>;
    count: (args: any) => Promise<number>;
    update: (args: any) => Promise<any>;
  };
  onchainCreatorAsset: {
    create: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any | null>;
    update: (args: any) => Promise<any>;
  };
  domainEvent: {
    create: (args: any) => Promise<any>;
  };
  $transaction: (args: any) => Promise<any>;
}

interface SubmitOnchainAnchorResult {
  mode: string;
  anchorId: string;
  chainId: number | null;
  txHash: string;
  blockNumber: bigint;
  payload: Record<string, unknown>;
}

const ASSET_ID_PATTERN = /^cas_[a-z0-9]+$/;
const BINDING_ID_PATTERN = /^cab_[a-z0-9]+$/;
const ONCHAIN_CREATOR_ASSET_ID_PATTERN = /^oca_[a-z0-9]+$/;
const CHECKSUM_PATTERN = /^[a-f0-9]{16,128}$/i;
const STATUS_SET = new Set<string>(CREATOR_LICENSE_BINDING_STATUSES);

const toBindingId = (): string => `cab_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
const toOnchainCreatorAssetId = (): string => `oca_${randomUUID().replace(/-/g, '').slice(0, 24)}`;

const toIsoString = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

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

const toStorageMode = (raw: string | undefined): CreatorLicenseStorageMode => {
  if (raw?.trim().toLowerCase() === 'memory') {
    return 'memory';
  }
  return 'prisma';
};

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

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'unknown error';
};

const makeIdentityKey = (input: {
  assetId: string;
  checksum: string;
  ownerWallet: string;
  issuedAt: string;
}): string => `${input.assetId}:${input.checksum}:${input.ownerWallet}:${input.issuedAt}`;

const computeAnchorDigest = (input: {
  assetId: string;
  checksum: string;
  ownerWallet: string;
  issuedAt: string;
}): string =>
  createHash('sha256')
    .update(`${input.assetId}|${input.checksum}|${input.ownerWallet}|${input.issuedAt}`)
    .digest('hex');

const computeAnchorId = (anchorDigest: string): string =>
  `0x${createHash('sha256').update(anchorDigest).digest('hex')}`;

const cloneBinding = (binding: CreatorLicenseBindingState): CreatorLicenseBindingState => ({
  ...binding,
  audit: {
    ...binding.audit,
  },
});

const cloneOnchain = (
  onchain: OnchainCreatorAssetState | null
): OnchainCreatorAssetState | null => {
  if (!onchain) {
    return null;
  }

  return {
    ...onchain,
    payload: onchain.payload ? { ...onchain.payload } : null,
  };
};

export class CreatorLicenseAnchorService {
  private prismaClient?: CreatorLicenseAnchorPrismaClient;
  private readonly creatorPipelineService: CreatorPipelineService;

  private readonly bindings = new Map<string, CreatorLicenseBindingState>();
  private readonly bindingIdsByApp = new Map<string, string[]>();
  private readonly bindingIdsByAsset = new Map<string, string[]>();
  private readonly bindingIdByIdentity = new Map<string, string>();
  private readonly onchainByBinding = new Map<string, OnchainCreatorAssetState>();

  constructor(deps?: {
    prismaClient?: CreatorLicenseAnchorPrismaClient;
    creatorPipelineService?: CreatorPipelineService;
  }) {
    this.prismaClient = deps?.prismaClient;
    this.creatorPipelineService = deps?.creatorPipelineService || v3CreatorPipelineService;
  }

  async createBinding(
    input: CreateCreatorLicenseBindingCommand
  ): Promise<CreatorLicenseAnchorMutationResult> {
    this.assertAnchorEnabled();

    const assetId = this.normalizeAssetId(input.assetId);
    const ownerWallet = this.normalizeOwnerWallet(input.ownerWallet);
    const actor = normalizeNonEmpty(input.requestedBy.actor, 'actor', 120);
    const requestId = input.requestedBy.requestId?.trim() || null;

    const asset = await this.resolveAsset({
      assetId,
      scopeAppId: input.requestedBy.appId,
    });

    const issuedAt = this.normalizeIssuedAt(input.issuedAt, asset.createdAt);
    const identityKey = makeIdentityKey({
      assetId,
      checksum: asset.checksum,
      ownerWallet,
      issuedAt,
    });

    const existing = await this.findBindingByIdentity({
      assetId,
      checksum: asset.checksum,
      ownerWallet,
      issuedAt,
      scopeAppId: input.requestedBy.appId,
    });

    if (existing) {
      return {
        binding: this.toReadModel(existing.binding, existing.onchain),
        idempotentReplay: true,
        replayed: false,
      };
    }

    const onchainRequired = this.isOnchainRequired();
    const onchainEnabled = this.isOnchainEnabled();

    if (onchainRequired && !onchainEnabled) {
      throw new AppError(
        503,
        'creator license onchain anchor is required but disabled',
        'CREATOR_LICENSE_ONCHAIN_DISABLED',
        {
          envFlag: 'V3_CREATOR_LICENSE_ONCHAIN_ENABLED',
          requiredFlag: 'V3_CREATOR_LICENSE_ONCHAIN_REQUIRED',
        }
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const binding: CreatorLicenseBindingState = {
      id: toBindingId(),
      assetId,
      creatorAppId: input.requestedBy.appId,
      checksum: asset.checksum,
      ownerWallet,
      issuedAt,
      anchorDigest: computeAnchorDigest({
        assetId,
        checksum: asset.checksum,
        ownerWallet,
        issuedAt,
      }),
      status: 'BOUND',
      replayCount: 0,
      lastError: null,
      onchainRequired,
      anchoredAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      audit: {
        createdByKeyId: normalizeNonEmpty(input.requestedBy.keyId, 'keyId', 120),
        createdByActor: actor,
        requestId,
        lastReplayedByActor: null,
      },
    };

    let onchainRecord: OnchainCreatorAssetState | null = null;
    let anchorError: string | null = null;

    if (onchainEnabled) {
      try {
        const submission = this.submitToMockChain(binding);
        onchainRecord = this.buildOnchainRecord({
          submission,
          bindingId: binding.id,
          now,
        });
        binding.status = 'ANCHORED';
        binding.anchoredAt = nowIso;
      } catch (error) {
        anchorError = toErrorMessage(error);
        binding.status = 'FAILED';
        binding.lastError = anchorError;
      }
    }

    if (this.getStorageMode() === 'memory') {
      this.storeBinding(binding, identityKey);
      if (onchainRecord) {
        this.storeOnchainRecord(onchainRecord);
      }

      if (onchainRequired && binding.status === 'FAILED') {
        throw new AppError(502, 'creator license anchor failed', 'CREATOR_LICENSE_ANCHOR_FAILED', {
          bindingId: binding.id,
          assetId: binding.assetId,
          reason: binding.lastError,
        });
      }

      return {
        binding: this.toReadModel(binding, onchainRecord),
        idempotentReplay: false,
        replayed: false,
      };
    }

    const prisma = await this.getPrismaClient();
    const persisted = await prisma.$transaction(async (tx: CreatorLicenseAnchorPrismaClient) => {
      const createdBinding = await tx.creatorAssetBinding.create({
        data: {
          id: binding.id,
          assetId: binding.assetId,
          creatorAppId: binding.creatorAppId,
          checksum: binding.checksum,
          ownerWallet: binding.ownerWallet,
          issuedAt: new Date(binding.issuedAt),
          anchorDigest: binding.anchorDigest,
          status: binding.status,
          replayCount: binding.replayCount,
          lastError: binding.lastError,
          onchainRequired: binding.onchainRequired,
          anchoredAt: binding.anchoredAt ? new Date(binding.anchoredAt) : null,
          createdByKeyId: binding.audit.createdByKeyId,
          createdByActor: binding.audit.createdByActor,
          requestId: binding.audit.requestId,
          createdAt: now,
          updatedAt: now,
        },
      });

      let persistedOnchain: any = null;
      if (onchainRecord) {
        persistedOnchain = await tx.onchainCreatorAsset.create({
          data: {
            id: onchainRecord.id,
            bindingId: onchainRecord.bindingId,
            anchorId: onchainRecord.anchorId,
            mode: onchainRecord.mode,
            chainId: onchainRecord.chainId,
            txHash: onchainRecord.txHash,
            blockNumber: BigInt(onchainRecord.blockNumber || '0'),
            payload: onchainRecord.payload,
            anchoredAt: new Date(onchainRecord.anchoredAt),
            createdAt: now,
            updatedAt: now,
          },
        });
      }

      await tx.domainEvent.create({
        data: {
          aggregateType: 'CreatorAssetBinding',
          aggregateId: binding.id,
          eventType: 'CreatorAssetBound',
          payload: {
            bindingId: binding.id,
            assetId: binding.assetId,
            creatorAppId: binding.creatorAppId,
            checksum: binding.checksum,
            ownerWallet: binding.ownerWallet,
            issuedAt: binding.issuedAt,
            status: binding.status,
          },
          requestId: binding.audit.requestId,
          source: 'api.v3.creator.license-anchor.create',
        },
      });

      if (onchainRecord) {
        await tx.domainEvent.create({
          data: {
            aggregateType: 'CreatorAssetBinding',
            aggregateId: binding.id,
            eventType: 'CreatorLicenseAnchored',
            payload: {
              bindingId: binding.id,
              assetId: binding.assetId,
              anchorId: onchainRecord.anchorId,
              txHash: onchainRecord.txHash,
              chainId: onchainRecord.chainId,
              blockNumber: onchainRecord.blockNumber,
              mode: onchainRecord.mode,
            },
            requestId: binding.audit.requestId,
            source: 'api.v3.creator.license-anchor.create',
          },
        });
      } else if (binding.status === 'FAILED') {
        await tx.domainEvent.create({
          data: {
            aggregateType: 'CreatorAssetBinding',
            aggregateId: binding.id,
            eventType: 'CreatorLicenseAnchorFailed',
            payload: {
              bindingId: binding.id,
              assetId: binding.assetId,
              reason: anchorError,
              replayCount: 0,
            },
            requestId: binding.audit.requestId,
            source: 'api.v3.creator.license-anchor.create',
          },
        });
      }

      return {
        binding: createdBinding,
        onchain: persistedOnchain,
      };
    });

    const readModel = this.toReadModel(
      this.mapBindingRecordToState(persisted.binding),
      this.mapOnchainRecordToState(persisted.onchain)
    );

    if (onchainRequired && readModel.status === 'FAILED') {
      throw new AppError(502, 'creator license anchor failed', 'CREATOR_LICENSE_ANCHOR_FAILED', {
        bindingId: readModel.id,
        assetId: readModel.assetId,
        reason: readModel.lastError,
      });
    }

    return {
      binding: readModel,
      idempotentReplay: false,
      replayed: false,
    };
  }

  async replayBinding(
    input: ReplayCreatorLicenseBindingCommand
  ): Promise<CreatorLicenseAnchorMutationResult> {
    this.assertAnchorEnabled();

    const bindingId = this.normalizeBindingId(input.bindingId);
    const actor = normalizeNonEmpty(input.requestedBy.actor, 'actor', 120);
    const requestId = input.requestedBy.requestId?.trim() || null;
    const force = Boolean(input.force);

    const existing = await this.findBindingById({
      bindingId,
      scopeAppId: input.scopeAppId,
    });

    if (!existing) {
      throw new AppError(404, 'creator license binding not found', 'NOT_FOUND', {
        bindingId,
      });
    }

    if (existing.binding.status === 'ANCHORED' && !force) {
      return {
        binding: this.toReadModel(existing.binding, existing.onchain),
        idempotentReplay: true,
        replayed: false,
      };
    }

    const onchainEnabled = this.isOnchainEnabled();
    if (!onchainEnabled) {
      if (existing.binding.onchainRequired) {
        throw new AppError(
          503,
          'creator license onchain anchor is required but disabled',
          'CREATOR_LICENSE_ONCHAIN_DISABLED',
          {
            envFlag: 'V3_CREATOR_LICENSE_ONCHAIN_ENABLED',
            bindingId,
          }
        );
      }

      return {
        binding: this.toReadModel(existing.binding, existing.onchain),
        idempotentReplay: true,
        replayed: false,
      };
    }

    const now = new Date();
    const nowIso = now.toISOString();

    const nextBinding = cloneBinding(existing.binding);
    nextBinding.replayCount += 1;
    nextBinding.audit.lastReplayedByActor = actor;
    nextBinding.updatedAt = nowIso;

    let nextOnchain = cloneOnchain(existing.onchain);
    let anchorError: string | null = null;

    try {
      const submission = this.submitToMockChain(nextBinding);
      nextOnchain = this.buildOnchainRecord({
        submission,
        bindingId: nextBinding.id,
        now,
        existingId: nextOnchain?.id || null,
      });
      nextBinding.status = 'ANCHORED';
      nextBinding.anchoredAt = nowIso;
      nextBinding.lastError = null;
    } catch (error) {
      anchorError = toErrorMessage(error);
      nextBinding.status = 'FAILED';
      nextBinding.lastError = anchorError;
    }

    if (this.getStorageMode() === 'memory') {
      this.storeBinding(nextBinding, null);
      if (nextOnchain) {
        this.storeOnchainRecord(nextOnchain);
      }

      if (nextBinding.onchainRequired && nextBinding.status === 'FAILED') {
        throw new AppError(502, 'creator license anchor replay failed', 'CREATOR_LICENSE_ANCHOR_FAILED', {
          bindingId: nextBinding.id,
          reason: nextBinding.lastError,
        });
      }

      return {
        binding: this.toReadModel(nextBinding, nextOnchain),
        idempotentReplay: false,
        replayed: true,
      };
    }

    const prisma = await this.getPrismaClient();
    const persisted = await prisma.$transaction(async (tx: CreatorLicenseAnchorPrismaClient) => {
      const updatedBinding = await tx.creatorAssetBinding.update({
        where: {
          id: nextBinding.id,
        },
        data: {
          status: nextBinding.status,
          replayCount: nextBinding.replayCount,
          lastError: nextBinding.lastError,
          anchoredAt: nextBinding.anchoredAt ? new Date(nextBinding.anchoredAt) : null,
          lastReplayedByActor: nextBinding.audit.lastReplayedByActor,
          updatedAt: now,
        },
      });

      let persistedOnchain = null;
      if (nextOnchain) {
        const existingOnchain = await tx.onchainCreatorAsset.findFirst({
          where: {
            bindingId: nextBinding.id,
          },
        });

        if (existingOnchain) {
          persistedOnchain = await tx.onchainCreatorAsset.update({
            where: {
              id: existingOnchain.id,
            },
            data: {
              anchorId: nextOnchain.anchorId,
              mode: nextOnchain.mode,
              chainId: nextOnchain.chainId,
              txHash: nextOnchain.txHash,
              blockNumber: BigInt(nextOnchain.blockNumber || '0'),
              payload: nextOnchain.payload,
              anchoredAt: new Date(nextOnchain.anchoredAt),
              updatedAt: now,
            },
          });
        } else {
          persistedOnchain = await tx.onchainCreatorAsset.create({
            data: {
              id: nextOnchain.id,
              bindingId: nextOnchain.bindingId,
              anchorId: nextOnchain.anchorId,
              mode: nextOnchain.mode,
              chainId: nextOnchain.chainId,
              txHash: nextOnchain.txHash,
              blockNumber: BigInt(nextOnchain.blockNumber || '0'),
              payload: nextOnchain.payload,
              anchoredAt: new Date(nextOnchain.anchoredAt),
              createdAt: now,
              updatedAt: now,
            },
          });
        }
      }

      await tx.domainEvent.create({
        data: {
          aggregateType: 'CreatorAssetBinding',
          aggregateId: nextBinding.id,
          eventType: 'CreatorLicenseAnchorReplayRequested',
          payload: {
            bindingId: nextBinding.id,
            replayCount: nextBinding.replayCount,
            actor,
            force,
          },
          requestId,
          source: 'api.v3.creator.license-anchor.replay',
        },
      });

      if (nextOnchain && nextBinding.status === 'ANCHORED') {
        await tx.domainEvent.create({
          data: {
            aggregateType: 'CreatorAssetBinding',
            aggregateId: nextBinding.id,
            eventType: 'CreatorLicenseAnchored',
            payload: {
              bindingId: nextBinding.id,
              assetId: nextBinding.assetId,
              anchorId: nextOnchain.anchorId,
              txHash: nextOnchain.txHash,
              chainId: nextOnchain.chainId,
              blockNumber: nextOnchain.blockNumber,
              replayCount: nextBinding.replayCount,
            },
            requestId,
            source: 'api.v3.creator.license-anchor.replay',
          },
        });
      } else if (nextBinding.status === 'FAILED') {
        await tx.domainEvent.create({
          data: {
            aggregateType: 'CreatorAssetBinding',
            aggregateId: nextBinding.id,
            eventType: 'CreatorLicenseAnchorFailed',
            payload: {
              bindingId: nextBinding.id,
              assetId: nextBinding.assetId,
              reason: anchorError,
              replayCount: nextBinding.replayCount,
            },
            requestId,
            source: 'api.v3.creator.license-anchor.replay',
          },
        });
      }

      return {
        binding: updatedBinding,
        onchain: persistedOnchain,
      };
    });

    const readModel = this.toReadModel(
      this.mapBindingRecordToState(persisted.binding),
      this.mapOnchainRecordToState(persisted.onchain)
    );

    if (readModel.onchain.required && readModel.status === 'FAILED') {
      throw new AppError(502, 'creator license anchor replay failed', 'CREATOR_LICENSE_ANCHOR_FAILED', {
        bindingId: readModel.id,
        reason: readModel.lastError,
      });
    }

    return {
      binding: readModel,
      idempotentReplay: false,
      replayed: true,
    };
  }

  async listBindingsByAsset(input: {
    scopeAppId: string;
    assetId: string;
    limit?: number;
  }): Promise<CreatorLicenseBindingListReadModel> {
    const assetId = this.normalizeAssetId(input.assetId);
    const limit = Math.max(1, Math.min(input.limit || 20, 100));

    if (this.getStorageMode() === 'memory') {
      const ids = this.bindingIdsByAsset.get(assetId) || [];
      const items = ids
        .map((id) => this.bindings.get(id))
        .filter((item): item is CreatorLicenseBindingState => Boolean(item))
        .filter((item) => item.creatorAppId === input.scopeAppId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

      return {
        total: items.length,
        items: items
          .slice(0, limit)
          .map((item) => this.toReadModel(item, this.onchainByBinding.get(item.id) || null)),
      };
    }

    const prisma = await this.getPrismaClient();
    const where = {
      creatorAppId: input.scopeAppId,
      assetId,
    };

    const [total, records] = await prisma.$transaction([
      prisma.creatorAssetBinding.count({ where }),
      prisma.creatorAssetBinding.findMany({
        where,
        include: {
          onchainAnchor: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      }),
    ]);

    return {
      total,
      items: records.map((record: any) =>
        this.toReadModel(this.mapBindingRecordToState(record), this.mapOnchainRecordToState(record.onchainAnchor))
      ),
    };
  }

  async listBindingsForAdmin(input: {
    creatorAppId?: string;
    assetId?: string;
    status?: CreatorLicenseBindingStatus;
    limit?: number;
  }): Promise<CreatorLicenseBindingListReadModel> {
    const limit = Math.max(1, Math.min(input.limit || 20, 100));

    if (this.getStorageMode() === 'memory') {
      const items = Array.from(this.bindings.values())
        .filter((item) => !input.creatorAppId || item.creatorAppId === input.creatorAppId)
        .filter((item) => !input.assetId || item.assetId === input.assetId)
        .filter((item) => !input.status || item.status === input.status)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

      return {
        total: items.length,
        items: items
          .slice(0, limit)
          .map((item) => this.toReadModel(item, this.onchainByBinding.get(item.id) || null)),
      };
    }

    const prisma = await this.getPrismaClient();
    const where = {
      ...(input.creatorAppId ? { creatorAppId: input.creatorAppId } : {}),
      ...(input.assetId ? { assetId: this.normalizeAssetId(input.assetId) } : {}),
      ...(input.status ? { status: input.status } : {}),
    };

    const [total, records] = await prisma.$transaction([
      prisma.creatorAssetBinding.count({ where }),
      prisma.creatorAssetBinding.findMany({
        where,
        include: {
          onchainAnchor: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
      }),
    ]);

    return {
      total,
      items: records.map((record: any) =>
        this.toReadModel(this.mapBindingRecordToState(record), this.mapOnchainRecordToState(record.onchainAnchor))
      ),
    };
  }

  resetForTest(): void {
    this.bindings.clear();
    this.bindingIdsByApp.clear();
    this.bindingIdsByAsset.clear();
    this.bindingIdByIdentity.clear();
    this.onchainByBinding.clear();
  }

  private getStorageMode(): CreatorLicenseStorageMode {
    return toStorageMode(process.env.V3_CREATOR_ONCHAIN_STORAGE_MODE || process.env.V3_CREATOR_STORAGE_MODE);
  }

  private async getPrismaClient(): Promise<CreatorLicenseAnchorPrismaClient> {
    if (this.prismaClient) {
      return this.prismaClient;
    }

    const dbModule = await import('../../database');
    this.prismaClient = dbModule.prisma as unknown as CreatorLicenseAnchorPrismaClient;
    return this.prismaClient;
  }

  private assertAnchorEnabled(): void {
    if (parseBoolean(process.env.V3_CREATOR_LICENSE_ANCHOR_ENABLED, true)) {
      return;
    }

    throw new AppError(503, 'creator license anchor flow is disabled', 'CREATOR_LICENSE_ANCHOR_DISABLED', {
      envFlag: 'V3_CREATOR_LICENSE_ANCHOR_ENABLED',
    });
  }

  private isOnchainEnabled(): boolean {
    return parseBoolean(process.env.V3_CREATOR_LICENSE_ONCHAIN_ENABLED, true);
  }

  private isOnchainRequired(): boolean {
    return parseBoolean(process.env.V3_CREATOR_LICENSE_ONCHAIN_REQUIRED, false);
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

  private normalizeBindingId(bindingId: string): string {
    const normalized = bindingId.trim().toLowerCase();
    if (!BINDING_ID_PATTERN.test(normalized)) {
      throw new AppError(400, 'bindingId is invalid', 'INVALID_INPUT', {
        bindingId,
      });
    }
    return normalized;
  }

  private normalizeStatus(status: string): CreatorLicenseBindingStatus {
    const normalized = status.trim().toUpperCase();
    if (!STATUS_SET.has(normalized)) {
      return 'BOUND';
    }
    return normalized as CreatorLicenseBindingStatus;
  }

  private normalizeOwnerWallet(ownerWallet: string): string {
    const normalized = normalizeNonEmpty(ownerWallet, 'ownerWallet', 120).toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
      throw new AppError(400, 'ownerWallet must be a valid EVM address', 'INVALID_INPUT', {
        ownerWallet,
      });
    }
    return normalized;
  }

  private normalizeIssuedAt(issuedAt: string, assetCreatedAt: string): string {
    const normalized = normalizeNonEmpty(issuedAt, 'issuedAt', 64);
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError(400, 'issuedAt must be a valid ISO datetime', 'INVALID_INPUT', {
        issuedAt,
      });
    }

    const maxFutureMs = parsePositiveInteger(process.env.V3_CREATOR_LICENSE_MAX_FUTURE_MS, 5 * 60_000);
    if (parsed.getTime() > Date.now() + maxFutureMs) {
      throw new AppError(400, 'issuedAt is too far in the future', 'INVALID_INPUT', {
        issuedAt,
        maxFutureMs,
      });
    }

    const assetCreatedAtMs = new Date(assetCreatedAt).getTime();
    if (!Number.isNaN(assetCreatedAtMs) && parsed.getTime() < assetCreatedAtMs - 24 * 60 * 60_000) {
      throw new AppError(400, 'issuedAt is earlier than allowed for this asset', 'INVALID_INPUT', {
        issuedAt,
        assetCreatedAt,
      });
    }

    return parsed.toISOString();
  }

  private async resolveAsset(input: {
    assetId: string;
    scopeAppId: string;
  }): Promise<CreatorAssetReadModel> {
    const asset = await this.creatorPipelineService.getAssetById({
      assetId: input.assetId,
      scopeAppId: input.scopeAppId,
    });

    if (!CHECKSUM_PATTERN.test(asset.checksum)) {
      throw new AppError(409, 'creator asset checksum is invalid', 'CREATOR_ASSET_NOT_READY', {
        assetId: asset.id,
        checksum: asset.checksum,
      });
    }

    if (asset.status !== 'READY') {
      throw new AppError(409, 'creator asset must be READY before license anchor', 'CREATOR_ASSET_NOT_READY', {
        assetId: asset.id,
        status: asset.status,
      });
    }

    return asset;
  }

  private submitToMockChain(binding: CreatorLicenseBindingState): SubmitOnchainAnchorResult {
    const forceFail = parseBoolean(process.env.V3_CREATOR_LICENSE_FORCE_FAIL, false);
    if (forceFail) {
      throw new Error('forced failure by V3_CREATOR_LICENSE_FORCE_FAIL');
    }

    const modeRaw = (process.env.V3_CREATOR_LICENSE_CHAIN_MODE || 'mock').trim().toLowerCase();
    if (modeRaw !== 'mock') {
      throw new Error(`unsupported chain mode: ${modeRaw}`);
    }

    const rawChainId = process.env.V3_CREATOR_LICENSE_CHAIN_ID;
    const chainId = rawChainId?.trim()
      ? parsePositiveInteger(rawChainId, config.CHAIN_ID)
      : Number.isInteger(config.CHAIN_ID)
        ? config.CHAIN_ID
        : null;

    const txHash = `0x${randomBytes(32).toString('hex')}`;
    const blockNumber = BigInt(Math.floor(Date.now() / 1000));
    const anchorId = computeAnchorId(binding.anchorDigest);

    return {
      mode: 'mock',
      anchorId,
      chainId,
      txHash,
      blockNumber,
      payload: {
        anchorId,
        bindingId: binding.id,
        assetId: binding.assetId,
        checksum: binding.checksum,
        ownerWallet: binding.ownerWallet,
        issuedAt: binding.issuedAt,
        digest: binding.anchorDigest,
        contractHint: 'CreatorLicenseAnchorHook.anchorLicense',
        chainMode: 'mock',
        submittedAt: new Date().toISOString(),
      },
    };
  }

  private buildOnchainRecord(input: {
    submission: SubmitOnchainAnchorResult;
    bindingId: string;
    now: Date;
    existingId?: string | null;
  }): OnchainCreatorAssetState {
    const id = input.existingId ? this.normalizeOnchainCreatorAssetId(input.existingId) : toOnchainCreatorAssetId();
    const nowIso = input.now.toISOString();

    return {
      id,
      bindingId: input.bindingId,
      anchorId: input.submission.anchorId,
      mode: input.submission.mode,
      chainId: input.submission.chainId,
      txHash: input.submission.txHash,
      blockNumber: input.submission.blockNumber.toString(),
      payload: input.submission.payload,
      anchoredAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }

  private normalizeOnchainCreatorAssetId(id: string): string {
    const normalized = id.trim().toLowerCase();
    if (!ONCHAIN_CREATOR_ASSET_ID_PATTERN.test(normalized)) {
      throw new AppError(500, 'onchain creator asset id is invalid', 'INTERNAL_ERROR', {
        id,
      });
    }
    return normalized;
  }

  private async findBindingByIdentity(input: {
    assetId: string;
    checksum: string;
    ownerWallet: string;
    issuedAt: string;
    scopeAppId: string;
  }): Promise<{ binding: CreatorLicenseBindingState; onchain: OnchainCreatorAssetState | null } | null> {
    if (this.getStorageMode() === 'memory') {
      const key = makeIdentityKey({
        assetId: input.assetId,
        checksum: input.checksum,
        ownerWallet: input.ownerWallet,
        issuedAt: input.issuedAt,
      });
      const bindingId = this.bindingIdByIdentity.get(key);
      if (!bindingId) {
        return null;
      }

      const binding = this.bindings.get(bindingId);
      if (!binding || binding.creatorAppId !== input.scopeAppId) {
        return null;
      }

      return {
        binding: cloneBinding(binding),
        onchain: cloneOnchain(this.onchainByBinding.get(binding.id) || null),
      };
    }

    const prisma = await this.getPrismaClient();
    const record = await prisma.creatorAssetBinding.findFirst({
      where: {
        assetId: input.assetId,
        creatorAppId: input.scopeAppId,
        checksum: input.checksum,
        ownerWallet: input.ownerWallet,
        issuedAt: new Date(input.issuedAt),
      },
      include: {
        onchainAnchor: true,
      },
    });

    if (!record) {
      return null;
    }

    return {
      binding: this.mapBindingRecordToState(record),
      onchain: this.mapOnchainRecordToState(record.onchainAnchor),
    };
  }

  private async findBindingById(input: {
    bindingId: string;
    scopeAppId?: string;
  }): Promise<{ binding: CreatorLicenseBindingState; onchain: OnchainCreatorAssetState | null } | null> {
    if (this.getStorageMode() === 'memory') {
      const binding = this.bindings.get(input.bindingId);
      if (!binding) {
        return null;
      }

      if (input.scopeAppId && binding.creatorAppId !== input.scopeAppId) {
        return null;
      }

      return {
        binding: cloneBinding(binding),
        onchain: cloneOnchain(this.onchainByBinding.get(binding.id) || null),
      };
    }

    const prisma = await this.getPrismaClient();
    const record = await prisma.creatorAssetBinding.findFirst({
      where: {
        id: input.bindingId,
        ...(input.scopeAppId ? { creatorAppId: input.scopeAppId } : {}),
      },
      include: {
        onchainAnchor: true,
      },
    });

    if (!record) {
      return null;
    }

    return {
      binding: this.mapBindingRecordToState(record),
      onchain: this.mapOnchainRecordToState(record.onchainAnchor),
    };
  }

  private storeBinding(binding: CreatorLicenseBindingState, identityKey: string | null): void {
    this.bindings.set(binding.id, cloneBinding(binding));

    const byApp = this.bindingIdsByApp.get(binding.creatorAppId) || [];
    if (!byApp.includes(binding.id)) {
      byApp.push(binding.id);
      this.bindingIdsByApp.set(binding.creatorAppId, byApp);
    }

    const byAsset = this.bindingIdsByAsset.get(binding.assetId) || [];
    if (!byAsset.includes(binding.id)) {
      byAsset.push(binding.id);
      this.bindingIdsByAsset.set(binding.assetId, byAsset);
    }

    const finalIdentityKey =
      identityKey ||
      makeIdentityKey({
        assetId: binding.assetId,
        checksum: binding.checksum,
        ownerWallet: binding.ownerWallet,
        issuedAt: binding.issuedAt,
      });

    this.bindingIdByIdentity.set(finalIdentityKey, binding.id);
  }

  private storeOnchainRecord(onchain: OnchainCreatorAssetState): void {
    this.onchainByBinding.set(onchain.bindingId, onchain);
  }

  private mapBindingRecordToState(record: any): CreatorLicenseBindingState {
    return {
      id: String(record.id),
      assetId: String(record.assetId),
      creatorAppId: String(record.creatorAppId),
      checksum: String(record.checksum),
      ownerWallet: String(record.ownerWallet).toLowerCase(),
      issuedAt: toIsoString(record.issuedAt),
      anchorDigest: String(record.anchorDigest),
      status: this.normalizeStatus(String(record.status)),
      replayCount: Number(record.replayCount || 0),
      lastError: record.lastError ? String(record.lastError) : null,
      onchainRequired: Boolean(record.onchainRequired),
      anchoredAt: record.anchoredAt ? toIsoString(record.anchoredAt) : null,
      createdAt: toIsoString(record.createdAt),
      updatedAt: toIsoString(record.updatedAt),
      audit: {
        createdByKeyId: String(record.createdByKeyId),
        createdByActor: String(record.createdByActor),
        requestId: record.requestId ? String(record.requestId) : null,
        lastReplayedByActor: record.lastReplayedByActor ? String(record.lastReplayedByActor) : null,
      },
    };
  }

  private mapOnchainRecordToState(record: any): OnchainCreatorAssetState | null {
    if (!record) {
      return null;
    }

    return {
      id: String(record.id),
      bindingId: String(record.bindingId),
      anchorId: String(record.anchorId),
      mode: String(record.mode || 'mock'),
      chainId: typeof record.chainId === 'number' ? record.chainId : null,
      txHash: record.txHash ? String(record.txHash) : null,
      blockNumber:
        record.blockNumber === null || record.blockNumber === undefined
          ? null
          : typeof record.blockNumber === 'bigint'
            ? record.blockNumber.toString()
            : String(record.blockNumber),
      payload: (record.payload as Record<string, unknown> | null) ?? null,
      anchoredAt: toIsoString(record.anchoredAt),
      createdAt: toIsoString(record.createdAt),
      updatedAt: toIsoString(record.updatedAt),
    };
  }

  private toReadModel(
    binding: CreatorLicenseBindingState,
    onchain: OnchainCreatorAssetState | null
  ): CreatorLicenseBindingReadModel {
    return {
      id: binding.id,
      assetId: binding.assetId,
      creatorAppId: binding.creatorAppId,
      checksum: binding.checksum,
      ownerWallet: binding.ownerWallet,
      issuedAt: binding.issuedAt,
      anchorDigest: binding.anchorDigest,
      status: binding.status,
      replayCount: binding.replayCount,
      lastError: binding.lastError,
      anchoredAt: binding.anchoredAt,
      createdAt: binding.createdAt,
      updatedAt: binding.updatedAt,
      audit: {
        createdByKeyId: binding.audit.createdByKeyId,
        createdByActor: binding.audit.createdByActor,
        requestId: binding.audit.requestId,
        lastReplayedByActor: binding.audit.lastReplayedByActor,
      },
      onchain: {
        required: binding.onchainRequired,
        enabled: this.isOnchainEnabled(),
        anchored: Boolean(onchain),
        mode: onchain?.mode || (this.isOnchainEnabled() ? 'mock' : 'disabled'),
        anchorId: onchain?.anchorId || null,
        chainId: onchain?.chainId || null,
        txHash: onchain?.txHash || null,
        blockNumber: onchain?.blockNumber || null,
      },
    };
  }
}

export const v3CreatorLicenseAnchorService = new CreatorLicenseAnchorService();

export const resetV3CreatorLicenseAnchorStoreForTest = (): void => {
  v3CreatorLicenseAnchorService.resetForTest();
};
