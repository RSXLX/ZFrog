import { createHash, randomUUID } from 'crypto';
import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import {
  type RelationshipEdgeAnchorAdapterResult,
  type RelationshipEdgeOnchainAdapter,
  relationshipEdgeOnchainAdapter,
} from './relationship-edge-anchor.adapter';

export const RELATIONSHIP_EDGE_ANCHOR_STATUSES = ['PENDING', 'ANCHORED', 'FAILED'] as const;

export type RelationshipEdgeAnchorStatus = (typeof RELATIONSHIP_EDGE_ANCHOR_STATUSES)[number];

type RelationshipEdgeAnchorStorageMode = 'prisma' | 'memory';

interface RelationshipEdgeRecord {
  id: string;
  scopeAppId: string;
  frogId: number;
  peerFrogId: number;
  score: number;
  signalCount: number;
  journeyCount: number;
  rescueCount: number;
  witnessCount: number;
  contributionCount: number;
  firstOccurredAt: Date | string;
  lastOccurredAt: Date | string;
}

interface RelationshipEdgeAnchorState {
  id: string;
  scopeAppId: string;
  edgeId: string;
  frogId: number;
  peerFrogId: number;
  anchorDigest: string;
  status: RelationshipEdgeAnchorStatus;
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
  edgeSnapshot: {
    score: number;
    signalCount: number;
    journeyCount: number;
    rescueCount: number;
    witnessCount: number;
    contributionCount: number;
    firstOccurredAt: string;
    lastOccurredAt: string;
  };
}

interface OnchainRelationshipEdgeAnchorState {
  id: string;
  anchorRecordId: string;
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

export interface RelationshipEdgeAnchorReadModel {
  id: string;
  scopeAppId: string;
  edgeId: string;
  frogId: number;
  peerFrogId: number;
  anchorDigest: string;
  status: RelationshipEdgeAnchorStatus;
  replayCount: number;
  lastError: string | null;
  anchoredAt: string | null;
  createdAt: string;
  updatedAt: string;
  edge: {
    score: number;
    signalCount: number;
    journeyCount: number;
    rescueCount: number;
    witnessCount: number;
    contributionCount: number;
    firstOccurredAt: string;
    lastOccurredAt: string;
  };
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

export interface RelationshipEdgeAnchorMutationResult {
  anchor: RelationshipEdgeAnchorReadModel;
  idempotentReplay: boolean;
  replayed: boolean;
}

export interface AnchorRelationshipEdgeCommand {
  scopeAppId: string;
  edgeId: string;
  requestedBy: {
    appId?: string;
    keyId: string;
    actor: string;
    requestId?: string | null;
  };
}

export interface ReplayRelationshipEdgeAnchorCommand {
  anchorId: string;
  scopeAppId?: string;
  force?: boolean;
  requestedBy: {
    actor: string;
    requestId?: string | null;
  };
}

export interface AnchorTopRelationshipEdgesCommand {
  scopeAppId: string;
  limit?: number;
  dryRun?: boolean;
  requestedBy: {
    appId?: string;
    keyId: string;
    actor: string;
    requestId?: string | null;
  };
}

export interface AnchorTopRelationshipEdgesResult {
  scopeAppId: string;
  dryRun: boolean;
  scannedCount: number;
  eligibleCount: number;
  createdCount: number;
  idempotentCount: number;
  anchoredCount: number;
  failedCount: number;
  failedAnchorIds: string[];
}

interface RelationshipEdgeAnchorPrismaClient {
  relationshipEdge: {
    findFirst: (args: any) => Promise<any | null>;
    findMany: (args: any) => Promise<any[]>;
  };
  relationshipEdgeAnchor: {
    create: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any | null>;
    findMany: (args: any) => Promise<any[]>;
    update: (args: any) => Promise<any>;
  };
  onchainRelationshipEdgeAnchor: {
    create: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any | null>;
    update: (args: any) => Promise<any>;
  };
  domainEvent: {
    create: (args: any) => Promise<any>;
  };
  $transaction: (fn: any) => Promise<any>;
}

interface RelationshipEdgeLookupClient {
  findFirst: (args: any) => Promise<RelationshipEdgeRecord | null>;
  findMany: (args: any) => Promise<RelationshipEdgeRecord[]>;
}

const STATUS_SET = new Set<string>(RELATIONSHIP_EDGE_ANCHOR_STATUSES);
const DEFAULT_ANCHOR_LIMIT = 50;
const MAX_ANCHOR_LIMIT = 200;

const toAnchorRecordId = (): string => `rea_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
const toOnchainAnchorId = (): string => `orea_${randomUUID().replace(/-/g, '').slice(0, 24)}`;

const toIso = (value: Date | string): string =>
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

const toStorageMode = (raw: string | undefined): RelationshipEdgeAnchorStorageMode => {
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

const normalizeScopeAppId = (value: string): string => normalizeNonEmpty(value, 'scopeAppId', 80);

const normalizeEdgeId = (value: string): string => {
  const normalized = normalizeNonEmpty(value, 'edgeId', 120);
  if (!/^[a-zA-Z0-9_:-]+$/.test(normalized)) {
    throw new AppError(400, 'edgeId is invalid', 'INVALID_INPUT', {
      edgeId: value,
    });
  }

  return normalized;
};

const normalizeAnchorId = (value: string): string => {
  const normalized = normalizeNonEmpty(value, 'anchorId', 120);
  if (!/^[a-zA-Z0-9_:-]+$/.test(normalized)) {
    throw new AppError(400, 'anchorId is invalid', 'INVALID_INPUT', {
      anchorId: value,
    });
  }

  return normalized;
};

const clampLimit = (input?: number): number => {
  if (!Number.isInteger(input) || !input || input <= 0) {
    return DEFAULT_ANCHOR_LIMIT;
  }

  return Math.min(input, MAX_ANCHOR_LIMIT);
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'unknown error';
};

const computeAnchorDigest = (edge: {
  scopeAppId: string;
  id: string;
  frogId: number;
  peerFrogId: number;
  score: number;
  signalCount: number;
  journeyCount: number;
  rescueCount: number;
  witnessCount: number;
  contributionCount: number;
  firstOccurredAt: string;
  lastOccurredAt: string;
}): string =>
  createHash('sha256')
    .update(
      [
        edge.scopeAppId,
        edge.id,
        edge.frogId,
        edge.peerFrogId,
        edge.score,
        edge.signalCount,
        edge.journeyCount,
        edge.rescueCount,
        edge.witnessCount,
        edge.contributionCount,
        edge.firstOccurredAt,
        edge.lastOccurredAt,
      ].join('|')
    )
    .digest('hex');

const toIdentityKey = (input: { scopeAppId: string; edgeId: string; anchorDigest: string }): string =>
  `${input.scopeAppId}:${input.edgeId}:${input.anchorDigest}`;

const cloneAnchor = (anchor: RelationshipEdgeAnchorState): RelationshipEdgeAnchorState => ({
  ...anchor,
  audit: {
    ...anchor.audit,
  },
  edgeSnapshot: {
    ...anchor.edgeSnapshot,
  },
});

const cloneOnchain = (
  onchain: OnchainRelationshipEdgeAnchorState | null
): OnchainRelationshipEdgeAnchorState | null => {
  if (!onchain) {
    return null;
  }

  return {
    ...onchain,
    payload: onchain.payload ? { ...onchain.payload } : null,
  };
};

export class RelationshipEdgeAnchorService {
  private prismaClient?: RelationshipEdgeAnchorPrismaClient;
  private edgeLookupClient?: RelationshipEdgeLookupClient;
  private onchainAdapter: RelationshipEdgeOnchainAdapter;

  private readonly anchors = new Map<string, RelationshipEdgeAnchorState>();
  private readonly onchainAnchors = new Map<string, OnchainRelationshipEdgeAnchorState>();
  private readonly anchorIdByIdentity = new Map<string, string>();
  private readonly seededEdges = new Map<string, RelationshipEdgeRecord>();

  constructor(deps?: {
    prismaClient?: RelationshipEdgeAnchorPrismaClient;
    edgeLookupClient?: RelationshipEdgeLookupClient;
    onchainAdapter?: RelationshipEdgeOnchainAdapter;
  }) {
    this.prismaClient = deps?.prismaClient;
    this.edgeLookupClient = deps?.edgeLookupClient;
    this.onchainAdapter = deps?.onchainAdapter || relationshipEdgeOnchainAdapter;
  }

  async createAnchorForEdge(
    input: AnchorRelationshipEdgeCommand
  ): Promise<RelationshipEdgeAnchorMutationResult> {
    this.assertAnchorEnabled();

    const scopeAppId = normalizeScopeAppId(input.scopeAppId);
    const edgeId = normalizeEdgeId(input.edgeId);
    const actor = normalizeNonEmpty(input.requestedBy.actor, 'actor', 120);
    const keyId = normalizeNonEmpty(input.requestedBy.keyId, 'keyId', 120);
    const requestId = input.requestedBy.requestId?.trim() || null;

    if (input.requestedBy.appId && input.requestedBy.appId !== scopeAppId) {
      throw new AppError(403, 'scope app mismatch', 'RELATIONSHIP_EDGE_SCOPE_MISMATCH', {
        scopeAppId,
        appId: input.requestedBy.appId,
      });
    }

    const edge = await this.findEdgeById({
      scopeAppId,
      edgeId,
    });

    if (!edge) {
      throw new AppError(404, 'relationship edge not found', 'NOT_FOUND', {
        scopeAppId,
        edgeId,
      });
    }

    const minScore = this.getMinimumAnchorScore();
    if (edge.score < minScore) {
      throw new AppError(
        409,
        `relationship edge score must be >= ${minScore} to anchor`,
        'RELATIONSHIP_EDGE_NOT_ANCHORABLE',
        {
          edgeId,
          score: edge.score,
          minScore,
        }
      );
    }

    const edgeSnapshot = {
      score: edge.score,
      signalCount: edge.signalCount,
      journeyCount: edge.journeyCount,
      rescueCount: edge.rescueCount,
      witnessCount: edge.witnessCount,
      contributionCount: edge.contributionCount,
      firstOccurredAt: toIso(edge.firstOccurredAt),
      lastOccurredAt: toIso(edge.lastOccurredAt),
    };

    const anchorDigest = computeAnchorDigest({
      scopeAppId,
      id: edge.id,
      frogId: edge.frogId,
      peerFrogId: edge.peerFrogId,
      ...edgeSnapshot,
    });

    const identityKey = toIdentityKey({
      scopeAppId,
      edgeId,
      anchorDigest,
    });

    const existing = await this.findAnchorByIdentity({
      scopeAppId,
      edgeId,
      anchorDigest,
      identityKey,
    });

    if (existing) {
      return {
        anchor: this.toReadModel(existing.anchor, existing.onchain),
        idempotentReplay: true,
        replayed: false,
      };
    }

    const onchainRequired = this.isOnchainRequired();
    const onchainEnabled = this.isOnchainEnabled();
    if (onchainRequired && !onchainEnabled) {
      throw new AppError(
        503,
        'relationship edge onchain anchor is required but disabled',
        'RELATIONSHIP_EDGE_ONCHAIN_DISABLED',
        {
          envFlag: 'V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED',
          requiredFlag: 'V3_RELATIONSHIP_EDGE_ONCHAIN_REQUIRED',
        }
      );
    }

    const now = new Date();
    const nowIso = now.toISOString();

    const anchor: RelationshipEdgeAnchorState = {
      id: toAnchorRecordId(),
      scopeAppId,
      edgeId,
      frogId: edge.frogId,
      peerFrogId: edge.peerFrogId,
      anchorDigest,
      status: 'PENDING',
      replayCount: 0,
      lastError: null,
      onchainRequired,
      anchoredAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      audit: {
        createdByKeyId: keyId,
        createdByActor: actor,
        requestId,
        lastReplayedByActor: null,
      },
      edgeSnapshot,
    };

    let onchainRecord: OnchainRelationshipEdgeAnchorState | null = null;
    let anchorError: string | null = null;

    if (onchainEnabled) {
      try {
        const submission = await this.onchainAdapter.submitAnchor({
          scopeAppId: anchor.scopeAppId,
          edgeId: anchor.edgeId,
          anchorDigest: anchor.anchorDigest,
          frogId: anchor.frogId,
          peerFrogId: anchor.peerFrogId,
          score: anchor.edgeSnapshot.score,
          signalCount: anchor.edgeSnapshot.signalCount,
          replayCount: anchor.replayCount,
        });

        onchainRecord = this.buildOnchainState({
          anchorRecordId: anchor.id,
          submission,
          now,
        });
        anchor.status = 'ANCHORED';
        anchor.anchoredAt = nowIso;
      } catch (error) {
        anchor.status = 'FAILED';
        anchorError = toErrorMessage(error);
        anchor.lastError = anchorError;
      }
    }

    if (this.getStorageMode() === 'memory') {
      this.storeAnchor(anchor, identityKey);
      if (onchainRecord) {
        this.storeOnchain(onchainRecord);
      }

      if (anchor.onchainRequired && anchor.status !== 'ANCHORED') {
        throw new AppError(502, 'relationship edge anchor failed', 'RELATIONSHIP_EDGE_ANCHOR_FAILED', {
          anchorId: anchor.id,
          edgeId: anchor.edgeId,
          reason: anchor.lastError,
        });
      }

      return {
        anchor: this.toReadModel(anchor, onchainRecord),
        idempotentReplay: false,
        replayed: false,
      };
    }

    const db = await this.getPrismaClient();
    const persisted = await db.$transaction(async (tx: RelationshipEdgeAnchorPrismaClient) => {
      const createdAnchor = await tx.relationshipEdgeAnchor.create({
        data: {
          id: anchor.id,
          scopeAppId: anchor.scopeAppId,
          edgeId: anchor.edgeId,
          frogId: anchor.frogId,
          peerFrogId: anchor.peerFrogId,
          anchorDigest: anchor.anchorDigest,
          status: anchor.status,
          replayCount: anchor.replayCount,
          lastError: anchor.lastError,
          onchainRequired: anchor.onchainRequired,
          anchoredAt: anchor.anchoredAt ? new Date(anchor.anchoredAt) : null,
          createdByKeyId: anchor.audit.createdByKeyId,
          createdByActor: anchor.audit.createdByActor,
          lastReplayedByActor: anchor.audit.lastReplayedByActor,
          requestId: anchor.audit.requestId,
          edgeSnapshot: anchor.edgeSnapshot,
          createdAt: now,
          updatedAt: now,
        },
      });

      let persistedOnchain = null;
      if (onchainRecord) {
        persistedOnchain = await tx.onchainRelationshipEdgeAnchor.create({
          data: {
            id: onchainRecord.id,
            anchorRecordId: onchainRecord.anchorRecordId,
            anchorId: onchainRecord.anchorId,
            mode: onchainRecord.mode,
            chainId: onchainRecord.chainId,
            txHash: onchainRecord.txHash,
            blockNumber: onchainRecord.blockNumber ? BigInt(onchainRecord.blockNumber) : null,
            payload: onchainRecord.payload,
            anchoredAt: new Date(onchainRecord.anchoredAt),
            createdAt: now,
            updatedAt: now,
          },
        });
      }

      await tx.domainEvent.create({
        data: {
          aggregateType: 'RelationshipEdgeAnchor',
          aggregateId: anchor.id,
          eventType: 'RelationshipEdgeAnchorRequested',
          payload: {
            anchorId: anchor.id,
            scopeAppId,
            edgeId,
            status: anchor.status,
            anchorDigest: anchor.anchorDigest,
            edge: {
              frogId: anchor.frogId,
              peerFrogId: anchor.peerFrogId,
              score: anchor.edgeSnapshot.score,
              signalCount: anchor.edgeSnapshot.signalCount,
            },
          },
          requestId,
          source: 'service.relationship-edge-anchor.create',
        },
      });

      if (anchor.status === 'ANCHORED' && onchainRecord) {
        await tx.domainEvent.create({
          data: {
            aggregateType: 'RelationshipEdgeAnchor',
            aggregateId: anchor.id,
            eventType: 'RelationshipEdgeAnchored',
            payload: {
              anchorId: anchor.id,
              scopeAppId,
              edgeId,
              onchain: {
                mode: onchainRecord.mode,
                anchorId: onchainRecord.anchorId,
                chainId: onchainRecord.chainId,
                txHash: onchainRecord.txHash,
                blockNumber: onchainRecord.blockNumber,
              },
              replayCount: anchor.replayCount,
            },
            requestId,
            source: 'service.relationship-edge-anchor.create',
          },
        });
      } else if (anchor.status === 'FAILED') {
        await tx.domainEvent.create({
          data: {
            aggregateType: 'RelationshipEdgeAnchor',
            aggregateId: anchor.id,
            eventType: 'RelationshipEdgeAnchorFailed',
            payload: {
              anchorId: anchor.id,
              scopeAppId,
              edgeId,
              reason: anchorError,
              replayCount: anchor.replayCount,
            },
            requestId,
            source: 'service.relationship-edge-anchor.create',
          },
        });
      }

      return {
        anchor: createdAnchor,
        onchain: persistedOnchain,
      };
    });

    const readModel = this.toReadModel(
      this.mapAnchorRecordToState(persisted.anchor),
      this.mapOnchainRecordToState(persisted.onchain)
    );

    if (readModel.onchain.required && readModel.status !== 'ANCHORED') {
      throw new AppError(502, 'relationship edge anchor failed', 'RELATIONSHIP_EDGE_ANCHOR_FAILED', {
        anchorId: readModel.id,
        edgeId: readModel.edgeId,
        reason: readModel.lastError,
      });
    }

    return {
      anchor: readModel,
      idempotentReplay: false,
      replayed: false,
    };
  }

  async replayAnchor(
    input: ReplayRelationshipEdgeAnchorCommand
  ): Promise<RelationshipEdgeAnchorMutationResult> {
    this.assertAnchorEnabled();

    const anchorId = normalizeAnchorId(input.anchorId);
    const actor = normalizeNonEmpty(input.requestedBy.actor, 'actor', 120);
    const requestId = input.requestedBy.requestId?.trim() || null;
    const force = Boolean(input.force);

    const existing = await this.findAnchorById({
      anchorId,
      scopeAppId: input.scopeAppId,
    });

    if (!existing) {
      throw new AppError(404, 'relationship edge anchor not found', 'NOT_FOUND', {
        anchorId,
      });
    }

    if (existing.anchor.status === 'ANCHORED' && !force) {
      return {
        anchor: this.toReadModel(existing.anchor, existing.onchain),
        idempotentReplay: true,
        replayed: false,
      };
    }

    const onchainEnabled = this.isOnchainEnabled();
    if (!onchainEnabled) {
      if (existing.anchor.onchainRequired) {
        throw new AppError(
          503,
          'relationship edge onchain anchor is required but disabled',
          'RELATIONSHIP_EDGE_ONCHAIN_DISABLED',
          {
            envFlag: 'V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED',
            anchorId,
          }
        );
      }

      return {
        anchor: this.toReadModel(existing.anchor, existing.onchain),
        idempotentReplay: true,
        replayed: false,
      };
    }

    const now = new Date();
    const nowIso = now.toISOString();

    const nextAnchor = cloneAnchor(existing.anchor);
    nextAnchor.replayCount += 1;
    nextAnchor.audit.lastReplayedByActor = actor;
    nextAnchor.updatedAt = nowIso;

    let nextOnchain = cloneOnchain(existing.onchain);
    let anchorError: string | null = null;

    try {
      const submission = await this.onchainAdapter.submitAnchor({
        scopeAppId: nextAnchor.scopeAppId,
        edgeId: nextAnchor.edgeId,
        anchorDigest: nextAnchor.anchorDigest,
        frogId: nextAnchor.frogId,
        peerFrogId: nextAnchor.peerFrogId,
        score: nextAnchor.edgeSnapshot.score,
        signalCount: nextAnchor.edgeSnapshot.signalCount,
        replayCount: nextAnchor.replayCount,
      });

      nextOnchain = this.buildOnchainState({
        anchorRecordId: nextAnchor.id,
        submission,
        now,
        existingId: nextOnchain?.id || null,
      });

      nextAnchor.status = 'ANCHORED';
      nextAnchor.anchoredAt = nowIso;
      nextAnchor.lastError = null;
    } catch (error) {
      anchorError = toErrorMessage(error);
      nextAnchor.status = 'FAILED';
      nextAnchor.lastError = anchorError;
    }

    if (this.getStorageMode() === 'memory') {
      this.storeAnchor(nextAnchor, null);
      if (nextOnchain) {
        this.storeOnchain(nextOnchain);
      }

      if (nextAnchor.onchainRequired && nextAnchor.status !== 'ANCHORED') {
        throw new AppError(
          502,
          'relationship edge anchor replay failed',
          'RELATIONSHIP_EDGE_ANCHOR_FAILED',
          {
            anchorId: nextAnchor.id,
            reason: nextAnchor.lastError,
          }
        );
      }

      return {
        anchor: this.toReadModel(nextAnchor, nextOnchain),
        idempotentReplay: false,
        replayed: true,
      };
    }

    const db = await this.getPrismaClient();
    const persisted = await db.$transaction(async (tx: RelationshipEdgeAnchorPrismaClient) => {
      const updatedAnchor = await tx.relationshipEdgeAnchor.update({
        where: {
          id: nextAnchor.id,
        },
        data: {
          status: nextAnchor.status,
          replayCount: nextAnchor.replayCount,
          lastError: nextAnchor.lastError,
          anchoredAt: nextAnchor.anchoredAt ? new Date(nextAnchor.anchoredAt) : null,
          lastReplayedByActor: nextAnchor.audit.lastReplayedByActor,
          updatedAt: now,
        },
      });

      let persistedOnchain = null;
      if (nextOnchain) {
        const currentOnchain = await tx.onchainRelationshipEdgeAnchor.findFirst({
          where: {
            anchorRecordId: nextAnchor.id,
          },
        });

        if (currentOnchain) {
          persistedOnchain = await tx.onchainRelationshipEdgeAnchor.update({
            where: {
              id: currentOnchain.id,
            },
            data: {
              anchorId: nextOnchain.anchorId,
              mode: nextOnchain.mode,
              chainId: nextOnchain.chainId,
              txHash: nextOnchain.txHash,
              blockNumber: nextOnchain.blockNumber ? BigInt(nextOnchain.blockNumber) : null,
              payload: nextOnchain.payload,
              anchoredAt: new Date(nextOnchain.anchoredAt),
              updatedAt: now,
            },
          });
        } else {
          persistedOnchain = await tx.onchainRelationshipEdgeAnchor.create({
            data: {
              id: nextOnchain.id,
              anchorRecordId: nextOnchain.anchorRecordId,
              anchorId: nextOnchain.anchorId,
              mode: nextOnchain.mode,
              chainId: nextOnchain.chainId,
              txHash: nextOnchain.txHash,
              blockNumber: nextOnchain.blockNumber ? BigInt(nextOnchain.blockNumber) : null,
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
          aggregateType: 'RelationshipEdgeAnchor',
          aggregateId: nextAnchor.id,
          eventType: 'RelationshipEdgeAnchorReplayRequested',
          payload: {
            anchorId: nextAnchor.id,
            replayCount: nextAnchor.replayCount,
            force,
            actor,
          },
          requestId,
          source: 'service.relationship-edge-anchor.replay',
        },
      });

      if (nextAnchor.status === 'ANCHORED' && nextOnchain) {
        await tx.domainEvent.create({
          data: {
            aggregateType: 'RelationshipEdgeAnchor',
            aggregateId: nextAnchor.id,
            eventType: 'RelationshipEdgeAnchored',
            payload: {
              anchorId: nextAnchor.id,
              scopeAppId: nextAnchor.scopeAppId,
              edgeId: nextAnchor.edgeId,
              replayCount: nextAnchor.replayCount,
              onchain: {
                mode: nextOnchain.mode,
                anchorId: nextOnchain.anchorId,
                chainId: nextOnchain.chainId,
                txHash: nextOnchain.txHash,
                blockNumber: nextOnchain.blockNumber,
              },
            },
            requestId,
            source: 'service.relationship-edge-anchor.replay',
          },
        });
      } else if (nextAnchor.status === 'FAILED') {
        await tx.domainEvent.create({
          data: {
            aggregateType: 'RelationshipEdgeAnchor',
            aggregateId: nextAnchor.id,
            eventType: 'RelationshipEdgeAnchorFailed',
            payload: {
              anchorId: nextAnchor.id,
              scopeAppId: nextAnchor.scopeAppId,
              edgeId: nextAnchor.edgeId,
              reason: anchorError,
              replayCount: nextAnchor.replayCount,
            },
            requestId,
            source: 'service.relationship-edge-anchor.replay',
          },
        });
      }

      return {
        anchor: updatedAnchor,
        onchain: persistedOnchain,
      };
    });

    const readModel = this.toReadModel(
      this.mapAnchorRecordToState(persisted.anchor),
      this.mapOnchainRecordToState(persisted.onchain)
    );

    if (readModel.onchain.required && readModel.status !== 'ANCHORED') {
      throw new AppError(
        502,
        'relationship edge anchor replay failed',
        'RELATIONSHIP_EDGE_ANCHOR_FAILED',
        {
          anchorId: readModel.id,
          reason: readModel.lastError,
        }
      );
    }

    return {
      anchor: readModel,
      idempotentReplay: false,
      replayed: true,
    };
  }

  async anchorTopEdges(input: AnchorTopRelationshipEdgesCommand): Promise<AnchorTopRelationshipEdgesResult> {
    this.assertAnchorEnabled();

    const scopeAppId = normalizeScopeAppId(input.scopeAppId);
    const actor = normalizeNonEmpty(input.requestedBy.actor, 'actor', 120);
    const keyId = normalizeNonEmpty(input.requestedBy.keyId, 'keyId', 120);
    const requestId = input.requestedBy.requestId?.trim() || null;
    const dryRun = Boolean(input.dryRun);
    const limit = clampLimit(input.limit);

    const minScore = this.getMinimumAnchorScore();
    const candidates = await this.listEdgeCandidates({
      scopeAppId,
      limit,
      minScore,
    });

    const result: AnchorTopRelationshipEdgesResult = {
      scopeAppId,
      dryRun,
      scannedCount: candidates.length,
      eligibleCount: candidates.length,
      createdCount: 0,
      idempotentCount: 0,
      anchoredCount: 0,
      failedCount: 0,
      failedAnchorIds: [],
    };

    if (dryRun) {
      return result;
    }

    for (const edge of candidates) {
      try {
        const anchored = await this.createAnchorForEdge({
          scopeAppId,
          edgeId: String(edge.id),
          requestedBy: {
            appId: input.requestedBy.appId,
            keyId,
            actor,
            requestId,
          },
        });

        if (anchored.idempotentReplay) {
          result.idempotentCount += 1;
          continue;
        }

        result.createdCount += 1;
        if (anchored.anchor.status === 'ANCHORED') {
          result.anchoredCount += 1;
        } else if (anchored.anchor.status === 'FAILED') {
          result.failedCount += 1;
          result.failedAnchorIds.push(anchored.anchor.id);
        }
      } catch (error) {
        if (error instanceof AppError && error.code === 'RELATIONSHIP_EDGE_NOT_ANCHORABLE') {
          continue;
        }

        if (error instanceof AppError && error.code === 'RELATIONSHIP_EDGE_ANCHOR_FAILED') {
          result.failedCount += 1;
          const details = error.details as { anchorId?: unknown } | undefined;
          if (typeof details?.anchorId === 'string') {
            result.failedAnchorIds.push(details.anchorId);
          }
          continue;
        }

        throw error;
      }
    }

    return result;
  }

  async listReplayCandidates(input: {
    scopeAppId: string;
    statuses?: RelationshipEdgeAnchorStatus[];
    limit?: number;
  }): Promise<RelationshipEdgeAnchorReadModel[]> {
    const scopeAppId = normalizeScopeAppId(input.scopeAppId);
    const limit = clampLimit(input.limit);
    const statuses = input.statuses && input.statuses.length > 0 ? input.statuses : ['FAILED', 'PENDING'];

    for (const status of statuses) {
      if (!STATUS_SET.has(status)) {
        throw new AppError(400, 'status is invalid', 'INVALID_INPUT', {
          status,
          allowed: RELATIONSHIP_EDGE_ANCHOR_STATUSES,
        });
      }
    }

    if (this.getStorageMode() === 'memory') {
      return Array.from(this.anchors.values())
        .filter((anchor) => anchor.scopeAppId === scopeAppId && statuses.includes(anchor.status))
        .sort(
          (left, right) =>
            new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime()
        )
        .slice(0, limit)
        .map((anchor) => this.toReadModel(anchor, this.onchainAnchors.get(anchor.id) || null));
    }

    const db = await this.getPrismaClient();
    const rows = await db.relationshipEdgeAnchor.findMany({
      where: {
        scopeAppId,
        status: {
          in: statuses,
        },
      },
      include: {
        onchainAnchor: true,
      },
      orderBy: {
        updatedAt: 'asc',
      },
      take: limit,
    });

    return rows.map((row) =>
      this.toReadModel(this.mapAnchorRecordToState(row), this.mapOnchainRecordToState(row.onchainAnchor))
    );
  }

  async listLatestAnchorsByEdgeIds(input: {
    scopeAppId: string;
    edgeIds: string[];
  }): Promise<Map<string, RelationshipEdgeAnchorReadModel>> {
    const scopeAppId = normalizeScopeAppId(input.scopeAppId);
    const normalizedEdgeIds = Array.from(
      new Set((input.edgeIds || []).map((edgeId) => normalizeEdgeId(String(edgeId))))
    );

    if (normalizedEdgeIds.length === 0) {
      return new Map();
    }

    if (this.getStorageMode() === 'memory') {
      const edgeSet = new Set(normalizedEdgeIds);
      const latestByEdge = new Map<string, RelationshipEdgeAnchorState>();

      for (const anchor of this.anchors.values()) {
        if (anchor.scopeAppId !== scopeAppId || !edgeSet.has(anchor.edgeId)) {
          continue;
        }

        const previous = latestByEdge.get(anchor.edgeId);
        if (!previous) {
          latestByEdge.set(anchor.edgeId, anchor);
          continue;
        }

        if (new Date(anchor.updatedAt).getTime() > new Date(previous.updatedAt).getTime()) {
          latestByEdge.set(anchor.edgeId, anchor);
        }
      }

      const readModels = new Map<string, RelationshipEdgeAnchorReadModel>();
      for (const [edgeId, anchor] of latestByEdge.entries()) {
        readModels.set(
          edgeId,
          this.toReadModel(anchor, this.onchainAnchors.get(anchor.id) || null)
        );
      }

      return readModels;
    }

    const db = await this.getPrismaClient();
    const rows = await db.relationshipEdgeAnchor.findMany({
      where: {
        scopeAppId,
        edgeId: {
          in: normalizedEdgeIds,
        },
      },
      include: {
        onchainAnchor: true,
      },
      orderBy: [
        {
          edgeId: 'asc',
        },
        {
          updatedAt: 'desc',
        },
      ],
    });

    const readModels = new Map<string, RelationshipEdgeAnchorReadModel>();
    for (const row of rows) {
      const edgeId = String(row.edgeId);
      if (readModels.has(edgeId)) {
        continue;
      }

      readModels.set(
        edgeId,
        this.toReadModel(this.mapAnchorRecordToState(row), this.mapOnchainRecordToState(row.onchainAnchor))
      );
    }

    return readModels;
  }

  resetForTest(): void {
    this.anchors.clear();
    this.onchainAnchors.clear();
    this.anchorIdByIdentity.clear();
    this.seededEdges.clear();
  }

  seedEdgeForTest(edge: RelationshipEdgeRecord): void {
    this.seededEdges.set(`${edge.scopeAppId}:${edge.id}`, edge);
  }

  private assertAnchorEnabled(): void {
    if (parseBoolean(process.env.V3_RELATIONSHIP_EDGE_ANCHOR_ENABLED, true)) {
      return;
    }

    throw new AppError(
      503,
      'relationship edge anchor flow is disabled',
      'RELATIONSHIP_EDGE_ANCHOR_DISABLED',
      {
        envFlag: 'V3_RELATIONSHIP_EDGE_ANCHOR_ENABLED',
      }
    );
  }

  private isOnchainEnabled(): boolean {
    return parseBoolean(process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_ENABLED, true);
  }

  private isOnchainRequired(): boolean {
    return parseBoolean(process.env.V3_RELATIONSHIP_EDGE_ONCHAIN_REQUIRED, false);
  }

  private getMinimumAnchorScore(): number {
    return parsePositiveInteger(process.env.V3_RELATIONSHIP_EDGE_ANCHOR_MIN_SCORE, 6);
  }

  private getStorageMode(): RelationshipEdgeAnchorStorageMode {
    return toStorageMode(process.env.V3_RELATIONSHIP_EDGE_ANCHOR_STORAGE_MODE);
  }

  private async getPrismaClient(): Promise<RelationshipEdgeAnchorPrismaClient> {
    if (this.prismaClient) {
      return this.prismaClient;
    }

    return prisma as unknown as RelationshipEdgeAnchorPrismaClient;
  }

  private async listEdgeCandidates(input: {
    scopeAppId: string;
    minScore: number;
    limit: number;
  }): Promise<RelationshipEdgeRecord[]> {
    if (this.getStorageMode() === 'memory') {
      return Array.from(this.seededEdges.values())
        .filter((edge) => edge.scopeAppId === input.scopeAppId && Number(edge.score) >= input.minScore)
        .sort((left, right) => {
          if (right.score !== left.score) {
            return right.score - left.score;
          }

          return new Date(right.lastOccurredAt).getTime() - new Date(left.lastOccurredAt).getTime();
        })
        .slice(0, input.limit);
    }

    if (this.edgeLookupClient) {
      const rows = await this.edgeLookupClient.findMany({
        where: {
          scopeAppId: input.scopeAppId,
          score: {
            gte: input.minScore,
          },
        },
        orderBy: [{ score: 'desc' }, { lastOccurredAt: 'desc' }],
        take: input.limit,
      });

      return rows.map((row) => this.mapEdgeRecord(row));
    }

    const db = await this.getPrismaClient();
    const rows = await db.relationshipEdge.findMany({
      where: {
        scopeAppId: input.scopeAppId,
        score: {
          gte: input.minScore,
        },
      },
      orderBy: [{ score: 'desc' }, { lastOccurredAt: 'desc' }],
      take: input.limit,
    });

    return rows.map((row) => this.mapEdgeRecord(row));
  }

  private async findEdgeById(input: {
    scopeAppId: string;
    edgeId: string;
  }): Promise<RelationshipEdgeRecord | null> {
    if (this.getStorageMode() === 'memory') {
      return this.seededEdges.get(`${input.scopeAppId}:${input.edgeId}`) || null;
    }

    if (this.edgeLookupClient) {
      const row = await this.edgeLookupClient.findFirst({
        where: {
          id: input.edgeId,
          scopeAppId: input.scopeAppId,
        },
      });

      return row ? this.mapEdgeRecord(row) : null;
    }

    const db = await this.getPrismaClient();
    const row = await db.relationshipEdge.findFirst({
      where: {
        id: input.edgeId,
        scopeAppId: input.scopeAppId,
      },
    });

    return row ? this.mapEdgeRecord(row) : null;
  }

  private async findAnchorByIdentity(input: {
    scopeAppId: string;
    edgeId: string;
    anchorDigest: string;
    identityKey: string;
  }): Promise<{
    anchor: RelationshipEdgeAnchorState;
    onchain: OnchainRelationshipEdgeAnchorState | null;
  } | null> {
    if (this.getStorageMode() === 'memory') {
      const anchorId = this.anchorIdByIdentity.get(input.identityKey);
      if (!anchorId) {
        return null;
      }
      const anchor = this.anchors.get(anchorId);
      if (!anchor) {
        return null;
      }

      return {
        anchor: cloneAnchor(anchor),
        onchain: cloneOnchain(this.onchainAnchors.get(anchor.id) || null),
      };
    }

    const db = await this.getPrismaClient();
    const row = await db.relationshipEdgeAnchor.findFirst({
      where: {
        scopeAppId: input.scopeAppId,
        edgeId: input.edgeId,
        anchorDigest: input.anchorDigest,
      },
      include: {
        onchainAnchor: true,
      },
    });

    if (!row) {
      return null;
    }

    return {
      anchor: this.mapAnchorRecordToState(row),
      onchain: this.mapOnchainRecordToState(row.onchainAnchor),
    };
  }

  private async findAnchorById(input: {
    anchorId: string;
    scopeAppId?: string;
  }): Promise<{
    anchor: RelationshipEdgeAnchorState;
    onchain: OnchainRelationshipEdgeAnchorState | null;
  } | null> {
    const scopeAppId = input.scopeAppId ? normalizeScopeAppId(input.scopeAppId) : null;

    if (this.getStorageMode() === 'memory') {
      const anchor = this.anchors.get(input.anchorId);
      if (!anchor) {
        return null;
      }
      if (scopeAppId && anchor.scopeAppId !== scopeAppId) {
        return null;
      }

      return {
        anchor: cloneAnchor(anchor),
        onchain: cloneOnchain(this.onchainAnchors.get(anchor.id) || null),
      };
    }

    const db = await this.getPrismaClient();
    const row = await db.relationshipEdgeAnchor.findFirst({
      where: {
        id: input.anchorId,
        ...(scopeAppId ? { scopeAppId } : {}),
      },
      include: {
        onchainAnchor: true,
      },
    });

    if (!row) {
      return null;
    }

    return {
      anchor: this.mapAnchorRecordToState(row),
      onchain: this.mapOnchainRecordToState(row.onchainAnchor),
    };
  }

  private buildOnchainState(input: {
    anchorRecordId: string;
    submission: RelationshipEdgeAnchorAdapterResult;
    now: Date;
    existingId?: string | null;
  }): OnchainRelationshipEdgeAnchorState {
    const nowIso = input.now.toISOString();

    return {
      id: input.existingId || toOnchainAnchorId(),
      anchorRecordId: input.anchorRecordId,
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

  private storeAnchor(anchor: RelationshipEdgeAnchorState, identityKey: string | null): void {
    this.anchors.set(anchor.id, cloneAnchor(anchor));
    if (identityKey) {
      this.anchorIdByIdentity.set(identityKey, anchor.id);
    }
  }

  private storeOnchain(onchain: OnchainRelationshipEdgeAnchorState): void {
    this.onchainAnchors.set(onchain.anchorRecordId, cloneOnchain(onchain)!);
  }

  private mapEdgeRecord(record: any): RelationshipEdgeRecord {
    return {
      id: String(record.id),
      scopeAppId: String(record.scopeAppId),
      frogId: Number(record.frogId),
      peerFrogId: Number(record.peerFrogId),
      score: Number(record.score || 0),
      signalCount: Number(record.signalCount || 0),
      journeyCount: Number(record.journeyCount || 0),
      rescueCount: Number(record.rescueCount || 0),
      witnessCount: Number(record.witnessCount || 0),
      contributionCount: Number(record.contributionCount || 0),
      firstOccurredAt: toIso(record.firstOccurredAt),
      lastOccurredAt: toIso(record.lastOccurredAt),
    };
  }

  private mapAnchorRecordToState(record: any): RelationshipEdgeAnchorState {
    return {
      id: String(record.id),
      scopeAppId: String(record.scopeAppId),
      edgeId: String(record.edgeId),
      frogId: Number(record.frogId),
      peerFrogId: Number(record.peerFrogId),
      anchorDigest: String(record.anchorDigest),
      status: this.normalizeStatus(record.status),
      replayCount: Number(record.replayCount || 0),
      lastError: record.lastError ? String(record.lastError) : null,
      onchainRequired: Boolean(record.onchainRequired),
      anchoredAt: record.anchoredAt ? toIso(record.anchoredAt) : null,
      createdAt: toIso(record.createdAt),
      updatedAt: toIso(record.updatedAt),
      audit: {
        createdByKeyId: String(record.createdByKeyId),
        createdByActor: String(record.createdByActor),
        requestId: record.requestId ? String(record.requestId) : null,
        lastReplayedByActor: record.lastReplayedByActor ? String(record.lastReplayedByActor) : null,
      },
      edgeSnapshot: {
        score: Number(record.edgeSnapshot?.score || 0),
        signalCount: Number(record.edgeSnapshot?.signalCount || 0),
        journeyCount: Number(record.edgeSnapshot?.journeyCount || 0),
        rescueCount: Number(record.edgeSnapshot?.rescueCount || 0),
        witnessCount: Number(record.edgeSnapshot?.witnessCount || 0),
        contributionCount: Number(record.edgeSnapshot?.contributionCount || 0),
        firstOccurredAt: toIso(
          record.edgeSnapshot?.firstOccurredAt || record.anchoredAt || record.createdAt
        ),
        lastOccurredAt: toIso(
          record.edgeSnapshot?.lastOccurredAt || record.anchoredAt || record.createdAt
        ),
      },
    };
  }

  private mapOnchainRecordToState(record: any): OnchainRelationshipEdgeAnchorState | null {
    if (!record) {
      return null;
    }

    return {
      id: String(record.id),
      anchorRecordId: String(record.anchorRecordId),
      anchorId: String(record.anchorId),
      mode: String(record.mode || 'mock'),
      chainId: typeof record.chainId === 'number' ? Number(record.chainId) : null,
      txHash: record.txHash ? String(record.txHash) : null,
      blockNumber: record.blockNumber ? String(record.blockNumber) : null,
      payload:
        typeof record.payload === 'object' && record.payload !== null
          ? (record.payload as Record<string, unknown>)
          : null,
      anchoredAt: toIso(record.anchoredAt),
      createdAt: toIso(record.createdAt),
      updatedAt: toIso(record.updatedAt),
    };
  }

  private normalizeStatus(status: unknown): RelationshipEdgeAnchorStatus {
    const normalized = String(status || '').trim().toUpperCase();
    if (!STATUS_SET.has(normalized)) {
      throw new AppError(500, 'relationship edge anchor status is invalid', 'INTERNAL_ERROR', {
        status,
      });
    }

    return normalized as RelationshipEdgeAnchorStatus;
  }

  private toReadModel(
    anchor: RelationshipEdgeAnchorState,
    onchain: OnchainRelationshipEdgeAnchorState | null
  ): RelationshipEdgeAnchorReadModel {
    return {
      id: anchor.id,
      scopeAppId: anchor.scopeAppId,
      edgeId: anchor.edgeId,
      frogId: anchor.frogId,
      peerFrogId: anchor.peerFrogId,
      anchorDigest: anchor.anchorDigest,
      status: anchor.status,
      replayCount: anchor.replayCount,
      lastError: anchor.lastError,
      anchoredAt: anchor.anchoredAt,
      createdAt: anchor.createdAt,
      updatedAt: anchor.updatedAt,
      edge: {
        score: anchor.edgeSnapshot.score,
        signalCount: anchor.edgeSnapshot.signalCount,
        journeyCount: anchor.edgeSnapshot.journeyCount,
        rescueCount: anchor.edgeSnapshot.rescueCount,
        witnessCount: anchor.edgeSnapshot.witnessCount,
        contributionCount: anchor.edgeSnapshot.contributionCount,
        firstOccurredAt: anchor.edgeSnapshot.firstOccurredAt,
        lastOccurredAt: anchor.edgeSnapshot.lastOccurredAt,
      },
      audit: {
        createdByKeyId: anchor.audit.createdByKeyId,
        createdByActor: anchor.audit.createdByActor,
        requestId: anchor.audit.requestId,
        lastReplayedByActor: anchor.audit.lastReplayedByActor,
      },
      onchain: {
        required: anchor.onchainRequired,
        enabled: this.isOnchainEnabled(),
        anchored: anchor.status === 'ANCHORED' && Boolean(onchain),
        mode: onchain?.mode || (this.isOnchainEnabled() ? 'mock' : 'disabled'),
        anchorId: onchain?.anchorId || null,
        chainId: onchain?.chainId || null,
        txHash: onchain?.txHash || null,
        blockNumber: onchain?.blockNumber || null,
      },
    };
  }
}

export const relationshipEdgeAnchorService = new RelationshipEdgeAnchorService();

export const resetV3RelationshipEdgeAnchorStoreForTest = (): void => {
  relationshipEdgeAnchorService.resetForTest();
};
