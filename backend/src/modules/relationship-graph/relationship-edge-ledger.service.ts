import { createHash, randomUUID } from 'crypto';
import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';

export const RELATIONSHIP_EDGE_SIGNAL_TYPES = [
  'JOURNEY',
  'RESCUE',
  'WITNESS',
  'CONTRIBUTION',
] as const;

export const RELATIONSHIP_EDGE_STRENGTHS = ['LOW', 'MEDIUM', 'HIGH'] as const;

export type RelationshipEdgeSignalType = (typeof RELATIONSHIP_EDGE_SIGNAL_TYPES)[number];
export type RelationshipEdgeStrength = (typeof RELATIONSHIP_EDGE_STRENGTHS)[number];

type RelationshipEdgeStorageMode = 'prisma' | 'memory';

type SignalCounts = {
  journey: number;
  rescue: number;
  witness: number;
  contribution: number;
};

export interface RelationshipEdgeSignalInput {
  sourceFrogId: number;
  targetFrogId: number;
  signalType: RelationshipEdgeSignalType;
  occurredAt?: Date | string;
  identityKey?: string;
  metadata?: Record<string, unknown>;
}

export interface RelationshipEdgeEventRecord {
  frogId: number;
  counterpartyFrogId: number;
  eventType: string;
  occurredAt?: Date | string;
  identityKey?: string;
  metadata?: Record<string, unknown>;
}

export interface IngestRelationshipSignalsCommand {
  signals: RelationshipEdgeSignalInput[];
  requestedBy: {
    appId: string;
    keyId: string;
    actor: string;
    requestId?: string | null;
    source?: string;
  };
}

export interface IngestRelationshipEventsCommand {
  events: RelationshipEdgeEventRecord[];
  requestedBy: {
    appId: string;
    keyId: string;
    actor: string;
    requestId?: string | null;
    source?: string;
  };
}

export interface RelationshipGraphEdgeReadModel {
  id: string;
  frogId: number;
  peerFrogId: number;
  sourceFrogId: number;
  targetFrogId: number;
  score: number;
  signalCount: number;
  strength: RelationshipEdgeStrength;
  firstOccurredAt: string;
  lastOccurredAt: string;
  signals: SignalCounts;
}

export interface RelationshipEdgeSnapshotReadModel {
  id: string;
  scopeAppId: string;
  frogId: number;
  version: number;
  computedAt: string;
  totalEdges: number;
  totalScore: number;
  strongestPeerFrogId: number | null;
  strongestScore: number | null;
  digest: string;
}

export interface RelationshipGraphNodeReadModel {
  frogId: number;
  role: 'ROOT' | 'PEER';
  rank: number;
  score: number;
  signalCount: number;
  lastOccurredAt: string | null;
}

export interface RelationshipGraphReadModel {
  frogId: number;
  scopeAppId: string;
  generatedAt: string;
  summary: {
    totalEdges: number;
    totalSignalCount: number;
    totalScore: number;
  };
  nodes: RelationshipGraphNodeReadModel[];
  edges: RelationshipGraphEdgeReadModel[];
  snapshot: RelationshipEdgeSnapshotReadModel;
}

export interface RelationshipEdgeIngestResult {
  scopeAppId: string;
  acceptedCount: number;
  deduplicatedCount: number;
  skippedCount: number;
  snapshots: RelationshipEdgeSnapshotReadModel[];
}

interface RelationshipEdgeState {
  id: string;
  scopeAppId: string;
  sourceFrogId: number;
  targetFrogId: number;
  score: number;
  signalCount: number;
  firstOccurredAt: string;
  lastOccurredAt: string;
  signals: SignalCounts;
  recentIdentityKeys: string[];
}

interface RelationshipEdgeSnapshotState extends RelationshipEdgeSnapshotReadModel {}

interface RelationshipEdgePrismaClient {
  relationshipEdge: {
    findMany: (args: any) => Promise<any[]>;
    findUnique: (args: any) => Promise<any | null>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
  relationshipEdgeSnapshot: {
    create: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any | null>;
  };
  domainEvent: {
    create: (args: any) => Promise<any>;
  };
  $transaction: (input: any) => Promise<any>;
}

const SIGNAL_TYPE_SET = new Set<string>(RELATIONSHIP_EDGE_SIGNAL_TYPES);
const SIGNAL_WEIGHTS: Record<RelationshipEdgeSignalType, number> = {
  JOURNEY: 3,
  RESCUE: 4,
  WITNESS: 2,
  CONTRIBUTION: 1,
};

const EVENT_TYPE_TO_SIGNAL: Record<string, RelationshipEdgeSignalType> = {
  JOURNEY: 'JOURNEY',
  JOURNEY_PARTY: 'JOURNEY',
  RESCUE: 'RESCUE',
  TRAVEL_RESCUE: 'RESCUE',
  WITNESS: 'WITNESS',
  WITNESS_NOTE: 'WITNESS',
  CONTRIBUTION: 'CONTRIBUTION',
  MEMORY_CONTRIBUTION: 'CONTRIBUTION',
};

const DEFAULT_GRAPH_LIMIT = 20;
const MAX_GRAPH_LIMIT = 100;
const MAX_RECENT_IDENTITY_KEYS = 200;

const parseBoolean = (raw: string | undefined, fallback: boolean): boolean => {
  if (raw === undefined) {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
};

const toStorageMode = (raw: string | undefined): RelationshipEdgeStorageMode => {
  if (raw?.trim().toLowerCase() === 'memory') {
    return 'memory';
  }
  return 'prisma';
};

const isLedgerWriteEnabled = (): boolean =>
  parseBoolean(process.env.V3_RELATIONSHIP_EDGE_LEDGER_ENABLED, true);

const isGraphQueryEnabled = (): boolean =>
  parseBoolean(process.env.V3_RELATIONSHIP_GRAPH_QUERY_ENABLED, true);

const toSignalCounts = (input?: Partial<SignalCounts>): SignalCounts => ({
  journey: input?.journey || 0,
  rescue: input?.rescue || 0,
  witness: input?.witness || 0,
  contribution: input?.contribution || 0,
});

const toEdgeId = (): string => `reg_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
const toSnapshotId = (): string => `rgs_${randomUUID().replace(/-/g, '').slice(0, 24)}`;

const normalizeScopeAppId = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new AppError(400, 'scope app id is required', 'INVALID_INPUT', {
      field: 'scopeAppId',
    });
  }
  if (normalized.length > 80) {
    throw new AppError(400, 'scope app id must be <= 80 characters', 'INVALID_INPUT', {
      field: 'scopeAppId',
      maxLength: 80,
    });
  }
  return normalized;
};

const normalizeFrogId = (value: number, field: string): number => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new AppError(400, `${field} must be a positive integer`, 'INVALID_INPUT', {
      field,
      value,
    });
  }
  return value;
};

const normalizeSignalType = (value: string): RelationshipEdgeSignalType => {
  const normalized = value.trim().toUpperCase();
  if (!SIGNAL_TYPE_SET.has(normalized)) {
    throw new AppError(400, 'signalType is invalid', 'INVALID_INPUT', {
      signalType: value,
      allowed: RELATIONSHIP_EDGE_SIGNAL_TYPES,
    });
  }
  return normalized as RelationshipEdgeSignalType;
};

const normalizeOccurredAt = (value: Date | string | undefined): Date => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new AppError(400, 'occurredAt is invalid', 'INVALID_INPUT', {
        field: 'occurredAt',
      });
    }
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError(400, 'occurredAt is invalid', 'INVALID_INPUT', {
        field: 'occurredAt',
        value,
      });
    }
    return parsed;
  }

  return new Date();
};

const clampLimit = (value: number | undefined): number => {
  if (!Number.isInteger(value) || !value || value <= 0) {
    return DEFAULT_GRAPH_LIMIT;
  }
  return Math.min(value, MAX_GRAPH_LIMIT);
};

const toIso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const toEdgeMapKey = (scopeAppId: string, sourceFrogId: number, targetFrogId: number): string =>
  `${scopeAppId}:${sourceFrogId}:${targetFrogId}`;

const sortEdgePair = (left: number, right: number): [number, number] =>
  left <= right ? [left, right] : [right, left];

const toStrength = (score: number): RelationshipEdgeStrength => {
  if (score >= 12) {
    return 'HIGH';
  }
  if (score >= 6) {
    return 'MEDIUM';
  }
  return 'LOW';
};

const buildIdentityKey = (input: {
  sourceFrogId: number;
  targetFrogId: number;
  signalType: RelationshipEdgeSignalType;
  occurredAt: Date;
  identityKey?: string;
}): string => {
  const normalizedCustom = input.identityKey?.trim().toLowerCase();
  if (normalizedCustom) {
    return normalizedCustom.slice(0, 160);
  }

  return createHash('sha256')
    .update(
      [
        input.sourceFrogId,
        input.targetFrogId,
        input.signalType,
        input.occurredAt.toISOString(),
      ].join('|')
    )
    .digest('hex')
    .slice(0, 40);
};

const appendRecentIdentityKey = (current: string[], nextKey: string): string[] => {
  const deduped = current.filter((item) => item !== nextKey);
  deduped.push(nextKey);
  if (deduped.length > MAX_RECENT_IDENTITY_KEYS) {
    return deduped.slice(deduped.length - MAX_RECENT_IDENTITY_KEYS);
  }
  return deduped;
};

const parseRecentIdentityKeys = (metadata: unknown): string[] => {
  if (
    typeof metadata === 'object' &&
    metadata !== null &&
    Array.isArray((metadata as { recentIdentityKeys?: unknown }).recentIdentityKeys)
  ) {
    return (metadata as { recentIdentityKeys: unknown[] }).recentIdentityKeys
      .map((item) => (typeof item === 'string' ? item.trim().toLowerCase() : ''))
      .filter(Boolean)
      .slice(-MAX_RECENT_IDENTITY_KEYS);
  }
  return [];
};

const mapSignalTypeFromEvent = (eventType: string): RelationshipEdgeSignalType | null => {
  const normalized = eventType.trim().toUpperCase();
  return EVENT_TYPE_TO_SIGNAL[normalized] || null;
};

export class RelationshipEdgeLedgerService {
  private readonly edges = new Map<string, RelationshipEdgeState>();
  private readonly snapshots = new Map<string, RelationshipEdgeSnapshotState[]>();
  private prismaClient?: RelationshipEdgePrismaClient;

  constructor(deps?: { prismaClient?: RelationshipEdgePrismaClient }) {
    this.prismaClient = deps?.prismaClient;
  }

  async ingestEventRecords(
    input: IngestRelationshipEventsCommand
  ): Promise<RelationshipEdgeIngestResult> {
    const mappedSignals: RelationshipEdgeSignalInput[] = [];
    let skipped = 0;

    for (const event of input.events) {
      const signalType = mapSignalTypeFromEvent(event.eventType);
      if (!signalType) {
        skipped += 1;
        continue;
      }

      mappedSignals.push({
        sourceFrogId: event.frogId,
        targetFrogId: event.counterpartyFrogId,
        signalType,
        occurredAt: event.occurredAt,
        identityKey: event.identityKey,
        ...(event.metadata ? { metadata: event.metadata } : {}),
      });
    }

    if (mappedSignals.length === 0) {
      return {
        scopeAppId: normalizeScopeAppId(input.requestedBy.appId),
        acceptedCount: 0,
        deduplicatedCount: 0,
        skippedCount: skipped,
        snapshots: [],
      };
    }

    const ingest = await this.ingestSignals({
      signals: mappedSignals,
      requestedBy: input.requestedBy,
    });

    return {
      ...ingest,
      skippedCount: ingest.skippedCount + skipped,
    };
  }

  async ingestSignals(input: IngestRelationshipSignalsCommand): Promise<RelationshipEdgeIngestResult> {
    this.assertLedgerWriteEnabled();

    const scopeAppId = normalizeScopeAppId(input.requestedBy.appId);
    const actor = input.requestedBy.actor.trim() || 'relationship-edge-ledger';
    const keyId = input.requestedBy.keyId.trim();
    const requestId = input.requestedBy.requestId?.trim() || null;
    const source = input.requestedBy.source?.trim() || 'service.relationship-edge-ledger.ingest';

    if (!Array.isArray(input.signals) || input.signals.length === 0) {
      throw new AppError(400, 'signals must be a non-empty array', 'INVALID_INPUT', {
        field: 'signals',
      });
    }

    const normalizedSignals = input.signals.map((signal) => {
      const sourceFrogId = normalizeFrogId(signal.sourceFrogId, 'sourceFrogId');
      const targetFrogId = normalizeFrogId(signal.targetFrogId, 'targetFrogId');
      if (sourceFrogId === targetFrogId) {
        throw new AppError(400, 'sourceFrogId and targetFrogId must differ', 'INVALID_INPUT', {
          sourceFrogId,
          targetFrogId,
        });
      }

      const signalType = normalizeSignalType(signal.signalType);
      const occurredAt = normalizeOccurredAt(signal.occurredAt);
      const [pairA, pairB] = sortEdgePair(sourceFrogId, targetFrogId);
      const identityKey = buildIdentityKey({
        sourceFrogId: pairA,
        targetFrogId: pairB,
        signalType,
        occurredAt,
        identityKey: signal.identityKey,
      });

      return {
        sourceFrogId: pairA,
        targetFrogId: pairB,
        signalType,
        occurredAt,
        identityKey,
        metadata: signal.metadata || null,
      };
    });

    const dedupeWithinRequest = new Set<string>();
    let acceptedCount = 0;
    let deduplicatedCount = 0;
    const touchedFrogs = new Set<number>();

    if (this.getStorageMode() === 'memory') {
      for (const signal of normalizedSignals) {
        if (dedupeWithinRequest.has(signal.identityKey)) {
          deduplicatedCount += 1;
          continue;
        }
        dedupeWithinRequest.add(signal.identityKey);

        const applied = this.applySignalInMemory(scopeAppId, signal);
        if (!applied) {
          deduplicatedCount += 1;
          continue;
        }

        acceptedCount += 1;
        touchedFrogs.add(signal.sourceFrogId);
        touchedFrogs.add(signal.targetFrogId);
      }
    } else {
      const db = await this.getPrismaClient();
      await db.$transaction(async (tx: RelationshipEdgePrismaClient) => {
        for (const signal of normalizedSignals) {
          if (dedupeWithinRequest.has(signal.identityKey)) {
            deduplicatedCount += 1;
            continue;
          }
          dedupeWithinRequest.add(signal.identityKey);

          const applied = await this.applySignalInPrisma(tx, scopeAppId, signal);
          if (!applied) {
            deduplicatedCount += 1;
            continue;
          }

          acceptedCount += 1;
          touchedFrogs.add(signal.sourceFrogId);
          touchedFrogs.add(signal.targetFrogId);

          await tx.domainEvent.create({
            data: {
              aggregateType: 'RelationshipEdge',
              aggregateId: `${scopeAppId}:${signal.sourceFrogId}:${signal.targetFrogId}`,
              eventType: 'RelationshipEdgeSignalIngested',
              payload: {
                scopeAppId,
                edge: {
                  sourceFrogId: signal.sourceFrogId,
                  targetFrogId: signal.targetFrogId,
                },
                signalType: signal.signalType,
                identityKey: signal.identityKey,
                occurredAt: signal.occurredAt.toISOString(),
                metadata: signal.metadata,
                requestedBy: {
                  appId: scopeAppId,
                  keyId,
                  actor,
                },
              },
              requestId,
              source,
            },
          });
        }
      });
    }

    const snapshots = await this.refreshSnapshots({
      scopeAppId,
      frogIds: Array.from(touchedFrogs),
      requestedBy: {
        actor,
        keyId,
        requestId,
        source,
      },
    });

    return {
      scopeAppId,
      acceptedCount,
      deduplicatedCount,
      skippedCount: 0,
      snapshots,
    };
  }

  async getGraphByFrogId(input: {
    frogId: number;
    scopeAppId: string;
    limit?: number;
  }): Promise<RelationshipGraphReadModel> {
    this.assertGraphQueryEnabled();

    const frogId = normalizeFrogId(input.frogId, 'frogId');
    const scopeAppId = normalizeScopeAppId(input.scopeAppId);
    const limit = clampLimit(input.limit);

    const edges = await this.listEdgesByFrog({
      frogId,
      scopeAppId,
      limit,
    });

    if (edges.length === 0) {
      throw new AppError(404, 'relationship graph not found', 'NOT_FOUND', {
        frogId,
        scopeAppId,
      });
    }

    const snapshot =
      (await this.getLatestSnapshot({
        frogId,
        scopeAppId,
      })) || this.buildSnapshotFromEdges({ frogId, scopeAppId, edges, persistedId: 'live' });

    const totalSignalCount = edges.reduce((sum, edge) => sum + edge.signalCount, 0);
    const totalScore = edges.reduce((sum, edge) => sum + edge.score, 0);

    const nodes: RelationshipGraphNodeReadModel[] = [
      {
        frogId,
        role: 'ROOT',
        rank: 0,
        score: totalScore,
        signalCount: totalSignalCount,
        lastOccurredAt: edges[0]?.lastOccurredAt || null,
      },
      ...edges.map((edge, index) => ({
        frogId: edge.peerFrogId,
        role: 'PEER' as const,
        rank: index + 1,
        score: edge.score,
        signalCount: edge.signalCount,
        lastOccurredAt: edge.lastOccurredAt,
      })),
    ];

    return {
      frogId,
      scopeAppId,
      generatedAt: snapshot.computedAt,
      summary: {
        totalEdges: edges.length,
        totalSignalCount,
        totalScore,
      },
      nodes,
      edges,
      snapshot,
    };
  }

  resetForTest(): void {
    this.edges.clear();
    this.snapshots.clear();
  }

  private assertLedgerWriteEnabled(): void {
    if (isLedgerWriteEnabled()) {
      return;
    }

    throw new AppError(
      503,
      'relationship edge ledger write is disabled',
      'RELATIONSHIP_EDGE_LEDGER_DISABLED'
    );
  }

  private assertGraphQueryEnabled(): void {
    if (isGraphQueryEnabled()) {
      return;
    }

    throw new AppError(
      503,
      'relationship graph query is disabled',
      'RELATIONSHIP_GRAPH_QUERY_DISABLED'
    );
  }

  private getStorageMode(): RelationshipEdgeStorageMode {
    return toStorageMode(process.env.V3_RELATIONSHIP_EDGE_STORAGE_MODE);
  }

  private async getPrismaClient(): Promise<RelationshipEdgePrismaClient> {
    if (this.prismaClient) {
      return this.prismaClient;
    }

    return prisma as unknown as RelationshipEdgePrismaClient;
  }

  private applySignalInMemory(
    scopeAppId: string,
    signal: {
      sourceFrogId: number;
      targetFrogId: number;
      signalType: RelationshipEdgeSignalType;
      occurredAt: Date;
      identityKey: string;
      metadata: Record<string, unknown> | null;
    }
  ): boolean {
    const key = toEdgeMapKey(scopeAppId, signal.sourceFrogId, signal.targetFrogId);
    const existing = this.edges.get(key);

    if (existing && existing.recentIdentityKeys.includes(signal.identityKey)) {
      return false;
    }

    const weight = SIGNAL_WEIGHTS[signal.signalType];
    const occurredAtIso = signal.occurredAt.toISOString();

    if (!existing) {
      const nextCounts = toSignalCounts();
      if (signal.signalType === 'JOURNEY') {
        nextCounts.journey += 1;
      } else if (signal.signalType === 'RESCUE') {
        nextCounts.rescue += 1;
      } else if (signal.signalType === 'WITNESS') {
        nextCounts.witness += 1;
      } else {
        nextCounts.contribution += 1;
      }

      this.edges.set(key, {
        id: toEdgeId(),
        scopeAppId,
        sourceFrogId: signal.sourceFrogId,
        targetFrogId: signal.targetFrogId,
        score: weight,
        signalCount: 1,
        firstOccurredAt: occurredAtIso,
        lastOccurredAt: occurredAtIso,
        signals: nextCounts,
        recentIdentityKeys: [signal.identityKey],
      });

      return true;
    }

    const nextCounts = toSignalCounts(existing.signals);
    if (signal.signalType === 'JOURNEY') {
      nextCounts.journey += 1;
    } else if (signal.signalType === 'RESCUE') {
      nextCounts.rescue += 1;
    } else if (signal.signalType === 'WITNESS') {
      nextCounts.witness += 1;
    } else {
      nextCounts.contribution += 1;
    }

    const firstOccurredAt =
      new Date(existing.firstOccurredAt).getTime() <= signal.occurredAt.getTime()
        ? existing.firstOccurredAt
        : occurredAtIso;
    const lastOccurredAt =
      new Date(existing.lastOccurredAt).getTime() >= signal.occurredAt.getTime()
        ? existing.lastOccurredAt
        : occurredAtIso;

    this.edges.set(key, {
      ...existing,
      score: existing.score + weight,
      signalCount: existing.signalCount + 1,
      firstOccurredAt,
      lastOccurredAt,
      signals: nextCounts,
      recentIdentityKeys: appendRecentIdentityKey(existing.recentIdentityKeys, signal.identityKey),
    });

    return true;
  }

  private async applySignalInPrisma(
    tx: RelationshipEdgePrismaClient,
    scopeAppId: string,
    signal: {
      sourceFrogId: number;
      targetFrogId: number;
      signalType: RelationshipEdgeSignalType;
      occurredAt: Date;
      identityKey: string;
      metadata: Record<string, unknown> | null;
    }
  ): Promise<boolean> {
    const existing = await tx.relationshipEdge.findUnique({
      where: {
        scopeAppId_frogId_peerFrogId: {
          scopeAppId,
          frogId: signal.sourceFrogId,
          peerFrogId: signal.targetFrogId,
        },
      },
    });

    const weight = SIGNAL_WEIGHTS[signal.signalType];

    if (!existing) {
      const counts = toSignalCounts();
      if (signal.signalType === 'JOURNEY') {
        counts.journey += 1;
      } else if (signal.signalType === 'RESCUE') {
        counts.rescue += 1;
      } else if (signal.signalType === 'WITNESS') {
        counts.witness += 1;
      } else {
        counts.contribution += 1;
      }

      await tx.relationshipEdge.create({
        data: {
          id: toEdgeId(),
          scopeAppId,
          frogId: signal.sourceFrogId,
          peerFrogId: signal.targetFrogId,
          score: weight,
          signalCount: 1,
          journeyCount: counts.journey,
          rescueCount: counts.rescue,
          witnessCount: counts.witness,
          contributionCount: counts.contribution,
          firstOccurredAt: signal.occurredAt,
          lastOccurredAt: signal.occurredAt,
          metadata: {
            recentIdentityKeys: [signal.identityKey],
            ...(signal.metadata ? { lastMetadata: signal.metadata } : {}),
          },
        },
      });

      return true;
    }

    const recentIdentityKeys = parseRecentIdentityKeys(existing.metadata);
    if (recentIdentityKeys.includes(signal.identityKey)) {
      return false;
    }

    const nextMetadata: Record<string, unknown> = {
      ...(typeof existing.metadata === 'object' && existing.metadata ? existing.metadata : {}),
      recentIdentityKeys: appendRecentIdentityKey(recentIdentityKeys, signal.identityKey),
      ...(signal.metadata ? { lastMetadata: signal.metadata } : {}),
    };

    const nextFirstOccurredAt =
      new Date(existing.firstOccurredAt).getTime() <= signal.occurredAt.getTime()
        ? existing.firstOccurredAt
        : signal.occurredAt;

    const nextLastOccurredAt =
      new Date(existing.lastOccurredAt).getTime() >= signal.occurredAt.getTime()
        ? existing.lastOccurredAt
        : signal.occurredAt;

    await tx.relationshipEdge.update({
      where: {
        id: existing.id,
      },
      data: {
        score: existing.score + weight,
        signalCount: existing.signalCount + 1,
        journeyCount: existing.journeyCount + (signal.signalType === 'JOURNEY' ? 1 : 0),
        rescueCount: existing.rescueCount + (signal.signalType === 'RESCUE' ? 1 : 0),
        witnessCount: existing.witnessCount + (signal.signalType === 'WITNESS' ? 1 : 0),
        contributionCount: existing.contributionCount + (signal.signalType === 'CONTRIBUTION' ? 1 : 0),
        firstOccurredAt: nextFirstOccurredAt,
        lastOccurredAt: nextLastOccurredAt,
        metadata: nextMetadata,
      },
    });

    return true;
  }

  private async refreshSnapshots(input: {
    scopeAppId: string;
    frogIds: number[];
    requestedBy: {
      actor: string;
      keyId: string;
      requestId: string | null;
      source: string;
    };
  }): Promise<RelationshipEdgeSnapshotReadModel[]> {
    if (input.frogIds.length === 0) {
      return [];
    }

    const uniqueFrogIds = Array.from(new Set(input.frogIds));
    const snapshots: RelationshipEdgeSnapshotReadModel[] = [];

    for (const frogId of uniqueFrogIds) {
      const edges = await this.listEdgesByFrog({
        frogId,
        scopeAppId: input.scopeAppId,
        limit: MAX_GRAPH_LIMIT,
      });

      if (edges.length === 0) {
        continue;
      }

      const snapshot = this.buildSnapshotFromEdges({
        frogId,
        scopeAppId: input.scopeAppId,
        edges,
      });

      if (this.getStorageMode() === 'memory') {
        const snapshotKey = `${input.scopeAppId}:${frogId}`;
        const current = this.snapshots.get(snapshotKey) || [];
        current.push(snapshot);
        this.snapshots.set(snapshotKey, current);
      } else {
        const db = await this.getPrismaClient();
        await db.relationshipEdgeSnapshot.create({
          data: {
            id: snapshot.id,
            scopeAppId: snapshot.scopeAppId,
            frogId: snapshot.frogId,
            version: snapshot.version,
            computedAt: snapshot.computedAt,
            totalEdges: snapshot.totalEdges,
            totalScore: snapshot.totalScore,
            strongestPeerFrogId: snapshot.strongestPeerFrogId,
            strongestScore: snapshot.strongestScore,
            digest: snapshot.digest,
            metadata: {
              edgeIds: edges.map((edge) => edge.id),
            },
          },
        });

        await db.domainEvent.create({
          data: {
            aggregateType: 'RelationshipEdgeSnapshot',
            aggregateId: snapshot.id,
            eventType: 'RelationshipEdgeSnapshotComputed',
            payload: {
              scopeAppId: snapshot.scopeAppId,
              frogId: snapshot.frogId,
              totalEdges: snapshot.totalEdges,
              totalScore: snapshot.totalScore,
              digest: snapshot.digest,
              requestedBy: {
                actor: input.requestedBy.actor,
                keyId: input.requestedBy.keyId,
              },
            },
            requestId: input.requestedBy.requestId,
            source: input.requestedBy.source,
          },
        });
      }

      snapshots.push(snapshot);
    }

    return snapshots;
  }

  private buildSnapshotFromEdges(input: {
    frogId: number;
    scopeAppId: string;
    edges: RelationshipGraphEdgeReadModel[];
    persistedId?: string;
  }): RelationshipEdgeSnapshotReadModel {
    const totalEdges = input.edges.length;
    const totalScore = input.edges.reduce((sum, edge) => sum + edge.score, 0);
    const strongest = input.edges[0] || null;
    const computedAt = new Date().toISOString();
    const digest = createHash('sha256')
      .update(
        JSON.stringify({
          scopeAppId: input.scopeAppId,
          frogId: input.frogId,
          edges: input.edges.map((edge) => ({
            id: edge.id,
            peerFrogId: edge.peerFrogId,
            score: edge.score,
            signalCount: edge.signalCount,
            lastOccurredAt: edge.lastOccurredAt,
          })),
        })
      )
      .digest('hex')
      .slice(0, 40);

    return {
      id: input.persistedId || toSnapshotId(),
      scopeAppId: input.scopeAppId,
      frogId: input.frogId,
      version: 1,
      computedAt,
      totalEdges,
      totalScore,
      strongestPeerFrogId: strongest?.peerFrogId || null,
      strongestScore: strongest?.score || null,
      digest,
    };
  }

  private async listEdgesByFrog(input: {
    frogId: number;
    scopeAppId: string;
    limit: number;
  }): Promise<RelationshipGraphEdgeReadModel[]> {
    if (this.getStorageMode() === 'memory') {
      return Array.from(this.edges.values())
        .filter(
          (edge) =>
            edge.scopeAppId === input.scopeAppId &&
            (edge.sourceFrogId === input.frogId || edge.targetFrogId === input.frogId)
        )
        .map((edge) => this.toEdgeReadModel(edge, input.frogId))
        .sort((left, right) => {
          if (right.score !== left.score) {
            return right.score - left.score;
          }
          return new Date(right.lastOccurredAt).getTime() - new Date(left.lastOccurredAt).getTime();
        })
        .slice(0, input.limit);
    }

    const db = await this.getPrismaClient();
    const rows = await db.relationshipEdge.findMany({
      where: {
        scopeAppId: input.scopeAppId,
        OR: [{ frogId: input.frogId }, { peerFrogId: input.frogId }],
      },
      orderBy: [{ score: 'desc' }, { lastOccurredAt: 'desc' }],
      take: input.limit,
    });

    return rows.map((row) => this.toEdgeReadModelFromRecord(row, input.frogId));
  }

  private async getLatestSnapshot(input: {
    frogId: number;
    scopeAppId: string;
  }): Promise<RelationshipEdgeSnapshotReadModel | null> {
    if (this.getStorageMode() === 'memory') {
      const key = `${input.scopeAppId}:${input.frogId}`;
      const snapshots = this.snapshots.get(key) || [];
      const latest = snapshots[snapshots.length - 1] || null;
      return latest ? { ...latest } : null;
    }

    const db = await this.getPrismaClient();
    const row = await db.relationshipEdgeSnapshot.findFirst({
      where: {
        scopeAppId: input.scopeAppId,
        frogId: input.frogId,
      },
      orderBy: {
        computedAt: 'desc',
      },
    });

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      scopeAppId: row.scopeAppId,
      frogId: row.frogId,
      version: row.version,
      computedAt: toIso(row.computedAt),
      totalEdges: row.totalEdges,
      totalScore: row.totalScore,
      strongestPeerFrogId: row.strongestPeerFrogId,
      strongestScore: row.strongestScore,
      digest: row.digest,
    };
  }

  private toEdgeReadModel(
    edge: RelationshipEdgeState,
    rootFrogId: number
  ): RelationshipGraphEdgeReadModel {
    const peerFrogId = edge.sourceFrogId === rootFrogId ? edge.targetFrogId : edge.sourceFrogId;

    return {
      id: edge.id,
      frogId: rootFrogId,
      peerFrogId,
      sourceFrogId: edge.sourceFrogId,
      targetFrogId: edge.targetFrogId,
      score: edge.score,
      signalCount: edge.signalCount,
      strength: toStrength(edge.score),
      firstOccurredAt: edge.firstOccurredAt,
      lastOccurredAt: edge.lastOccurredAt,
      signals: toSignalCounts(edge.signals),
    };
  }

  private toEdgeReadModelFromRecord(record: any, rootFrogId: number): RelationshipGraphEdgeReadModel {
    const sourceFrogId = Number(record.frogId);
    const targetFrogId = Number(record.peerFrogId);
    const peerFrogId = sourceFrogId === rootFrogId ? targetFrogId : sourceFrogId;

    return {
      id: String(record.id),
      frogId: rootFrogId,
      peerFrogId,
      sourceFrogId,
      targetFrogId,
      score: Number(record.score || 0),
      signalCount: Number(record.signalCount || 0),
      strength: toStrength(Number(record.score || 0)),
      firstOccurredAt: toIso(record.firstOccurredAt),
      lastOccurredAt: toIso(record.lastOccurredAt),
      signals: {
        journey: Number(record.journeyCount || 0),
        rescue: Number(record.rescueCount || 0),
        witness: Number(record.witnessCount || 0),
        contribution: Number(record.contributionCount || 0),
      },
    };
  }
}

export const v3RelationshipEdgeLedgerService = new RelationshipEdgeLedgerService();

export const resetV3RelationshipEdgeLedgerStoreForTest = (): void => {
  v3RelationshipEdgeLedgerService.resetForTest();
};
