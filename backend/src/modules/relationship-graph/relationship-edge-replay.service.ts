import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import {
  type RelationshipEdgeSignalInput,
  type RelationshipEdgeSignalType,
  v3RelationshipEdgeLedgerService,
} from './relationship-edge-ledger.service';

const DEFAULT_REPLAY_LIMIT = 200;
const MAX_REPLAY_LIMIT = 1000;

const SUPPORTED_REPLAY_EVENT_TYPES = [
  'TravelStarted',
  'RescueCompleted',
  'RelationshipAttested',
  'RelationshipMilestoneRecorded',
  'MemoryPalaceContributionAdded',
  'MemoryPalaceVisitLogged',
] as const;

type SupportedReplayEventType = (typeof SUPPORTED_REPLAY_EVENT_TYPES)[number];

interface DomainEventRecord {
  id: bigint | number | string;
  eventType: string;
  occurredAt: Date | string;
  frogId?: number | null;
  payload: unknown;
}

interface RelationshipEdgeReplayPrismaClient {
  domainEvent: {
    findMany: (args: any) => Promise<DomainEventRecord[]>;
  };
}

interface RelationshipEdgeReplayLedgerClient {
  ingestSignals: (input: {
    signals: RelationshipEdgeSignalInput[];
    requestedBy: {
      appId: string;
      keyId: string;
      actor: string;
      requestId?: string | null;
      source?: string;
    };
  }) => Promise<{
    scopeAppId: string;
    acceptedCount: number;
    deduplicatedCount: number;
    skippedCount: number;
    snapshots: unknown[];
  }>;
}

export interface ReplayRelationshipEdgeSignalsCommand {
  scopeAppId: string;
  keyId: string;
  actor: string;
  requestId?: string | null;
  source?: string;
  sinceEventId?: bigint | number | string;
  limit?: number;
  dryRun?: boolean;
}

export interface ReplayRelationshipEdgeSignalsResult {
  scopeAppId: string;
  dryRun: boolean;
  scannedCount: number;
  mappedCount: number;
  skippedCount: number;
  acceptedCount: number;
  deduplicatedCount: number;
  startCursor: string | null;
  nextCursor: string | null;
  skippedByReason: Record<string, number>;
}

const parseBoolean = (raw: string | undefined, fallback: boolean): boolean => {
  if (raw === undefined) {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
};

const isReplayEnabled = (): boolean =>
  parseBoolean(process.env.V3_RELATIONSHIP_EDGE_REPLAY_ENABLED, true);

const normalizeNonEmptyString = (value: string, field: string, maxLength = 120): string => {
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

const normalizeLimit = (value: number | undefined): number => {
  if (!Number.isInteger(value) || !value || value <= 0) {
    return DEFAULT_REPLAY_LIMIT;
  }
  return Math.min(value, MAX_REPLAY_LIMIT);
};

const parseEventId = (value: unknown): bigint | null => {
  if (typeof value === 'bigint') {
    return value >= 0n ? value : null;
  }
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0) {
      return null;
    }
    return BigInt(value);
  }
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!/^[0-9]+$/.test(normalized)) {
      return null;
    }
    return BigInt(normalized);
  }
  return null;
};

const parsePositiveInt = (value: unknown): number | null => {
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value <= 0) {
      return null;
    }
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!/^[0-9]+$/.test(normalized)) {
      return null;
    }
    const parsed = Number(normalized);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }
  return null;
};

const parseOccurredAt = (value: Date | string): Date => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
};

const parsePayloadRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const pickSignalTypeFromRelationshipMilestone = (
  payload: Record<string, unknown>
): RelationshipEdgeSignalType | null => {
  const raw = typeof payload.relationshipEventType === 'string' ? payload.relationshipEventType : '';
  const normalized = raw.trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  if (normalized === 'RESCUE') {
    return 'RESCUE';
  }
  if (normalized === 'ATTESTATIONSUBMITTED') {
    return 'WITNESS';
  }
  if (normalized === 'BLESSING') {
    return 'CONTRIBUTION';
  }
  return null;
};

const incrementCounter = (target: Record<string, number>, key: string): void => {
  target[key] = (target[key] || 0) + 1;
};

export class RelationshipEdgeReplayService {
  private prismaClient?: RelationshipEdgeReplayPrismaClient;
  private ledgerClient: RelationshipEdgeReplayLedgerClient;

  constructor(deps?: {
    prismaClient?: RelationshipEdgeReplayPrismaClient;
    ledgerClient?: RelationshipEdgeReplayLedgerClient;
  }) {
    this.prismaClient = deps?.prismaClient;
    this.ledgerClient = deps?.ledgerClient || v3RelationshipEdgeLedgerService;
  }

  async replayFromDomainEvents(
    input: ReplayRelationshipEdgeSignalsCommand
  ): Promise<ReplayRelationshipEdgeSignalsResult> {
    this.assertReplayEnabled();

    const scopeAppId = normalizeNonEmptyString(input.scopeAppId, 'scopeAppId', 80);
    const keyId = normalizeNonEmptyString(input.keyId, 'keyId', 80);
    const actor = normalizeNonEmptyString(input.actor, 'actor', 120);
    const source =
      input.source?.trim() || 'service.relationship-edge-replay.replay-from-domain-events';
    const requestId = input.requestId?.trim() || null;
    const limit = normalizeLimit(input.limit);
    const dryRun = Boolean(input.dryRun);
    const startCursorBigInt = parseEventId(input.sinceEventId);

    if (input.sinceEventId !== undefined && startCursorBigInt === null) {
      throw new AppError(400, 'sinceEventId is invalid', 'INVALID_INPUT', {
        sinceEventId: input.sinceEventId,
      });
    }

    const db = await this.getPrismaClient();
    const events = await db.domainEvent.findMany({
      where: {
        eventType: {
          in: [...SUPPORTED_REPLAY_EVENT_TYPES],
        },
        ...(startCursorBigInt !== null ? { id: { gt: startCursorBigInt } } : {}),
      },
      orderBy: {
        id: 'asc',
      },
      take: limit,
    });

    const skippedByReason: Record<string, number> = {};
    const mappedSignals: RelationshipEdgeSignalInput[] = [];

    for (const event of events) {
      const mapped = this.mapDomainEventToSignal(event);
      if (!mapped.signal) {
        incrementCounter(skippedByReason, mapped.reason);
        continue;
      }
      mappedSignals.push(mapped.signal);
    }

    const scannedCount = events.length;
    const mappedCount = mappedSignals.length;
    const skippedCount = scannedCount - mappedCount;

    let acceptedCount = mappedCount;
    let deduplicatedCount = 0;

    if (!dryRun && mappedSignals.length > 0) {
      const ingestResult = await this.ledgerClient.ingestSignals({
        signals: mappedSignals,
        requestedBy: {
          appId: scopeAppId,
          keyId,
          actor,
          requestId,
          source,
        },
      });
      acceptedCount = ingestResult.acceptedCount;
      deduplicatedCount = ingestResult.deduplicatedCount;
    }

    const lastEventId = events.length > 0 ? parseEventId(events[events.length - 1].id) : null;

    return {
      scopeAppId,
      dryRun,
      scannedCount,
      mappedCount,
      skippedCount,
      acceptedCount,
      deduplicatedCount,
      startCursor: startCursorBigInt === null ? null : startCursorBigInt.toString(),
      nextCursor: lastEventId === null ? null : lastEventId.toString(),
      skippedByReason,
    };
  }

  private assertReplayEnabled(): void {
    if (isReplayEnabled()) {
      return;
    }
    throw new AppError(
      503,
      'relationship edge replay is disabled',
      'RELATIONSHIP_EDGE_REPLAY_DISABLED'
    );
  }

  private async getPrismaClient(): Promise<RelationshipEdgeReplayPrismaClient> {
    if (this.prismaClient) {
      return this.prismaClient;
    }
    return prisma as unknown as RelationshipEdgeReplayPrismaClient;
  }

  private mapDomainEventToSignal(event: DomainEventRecord): {
    signal: RelationshipEdgeSignalInput | null;
    reason: string;
  } {
    const eventId = parseEventId(event.id);
    if (eventId === null) {
      return {
        signal: null,
        reason: 'invalid_event_id',
      };
    }

    const identityKey = `domain-event:${eventId.toString()}`;
    const occurredAt = parseOccurredAt(event.occurredAt);
    const payload = parsePayloadRecord(event.payload);

    if (event.eventType === 'TravelStarted') {
      const leaderFrogId = parsePositiveInt(event.frogId);
      const companionFrogId = parsePositiveInt(payload?.companionFrogId);
      if (!leaderFrogId || !companionFrogId || leaderFrogId === companionFrogId) {
        return {
          signal: null,
          reason: 'journey_pair_missing',
        };
      }
      return {
        signal: {
          sourceFrogId: leaderFrogId,
          targetFrogId: companionFrogId,
          signalType: 'JOURNEY',
          occurredAt,
          identityKey,
          metadata: {
            replay: {
              eventId: eventId.toString(),
              eventType: event.eventType,
              source: 'domain_events',
            },
          },
        },
        reason: '',
      };
    }

    if (event.eventType === 'RescueCompleted') {
      const rescuedFrogId = parsePositiveInt(event.frogId);
      const rescuerFrogId = parsePositiveInt(payload?.rescuerFrogId);
      if (!rescuedFrogId || !rescuerFrogId || rescuedFrogId === rescuerFrogId) {
        return {
          signal: null,
          reason: 'rescue_pair_missing',
        };
      }
      return {
        signal: {
          sourceFrogId: rescuerFrogId,
          targetFrogId: rescuedFrogId,
          signalType: 'RESCUE',
          occurredAt,
          identityKey,
          metadata: {
            replay: {
              eventId: eventId.toString(),
              eventType: event.eventType,
              source: 'domain_events',
            },
          },
        },
        reason: '',
      };
    }

    if (event.eventType === 'RelationshipAttested') {
      const subjectFrogId = parsePositiveInt(payload?.subjectFrogId);
      const objectFrogId = parsePositiveInt(payload?.objectFrogId);
      if (!subjectFrogId || !objectFrogId || subjectFrogId === objectFrogId) {
        return {
          signal: null,
          reason: 'witness_pair_missing',
        };
      }
      return {
        signal: {
          sourceFrogId: subjectFrogId,
          targetFrogId: objectFrogId,
          signalType: 'WITNESS',
          occurredAt,
          identityKey,
          metadata: {
            replay: {
              eventId: eventId.toString(),
              eventType: event.eventType,
              source: 'domain_events',
            },
          },
        },
        reason: '',
      };
    }

    if (event.eventType === 'RelationshipMilestoneRecorded' && payload) {
      const signalType = pickSignalTypeFromRelationshipMilestone(payload);
      if (!signalType) {
        return {
          signal: null,
          reason: 'relationship_event_type_unsupported',
        };
      }

      const actorFrogId = parsePositiveInt(payload.actorFrogId);
      const counterpartyFrogId = parsePositiveInt(payload.counterpartyFrogId);
      if (!actorFrogId || !counterpartyFrogId || actorFrogId === counterpartyFrogId) {
        return {
          signal: null,
          reason: 'relationship_pair_missing',
        };
      }

      return {
        signal: {
          sourceFrogId: actorFrogId,
          targetFrogId: counterpartyFrogId,
          signalType,
          occurredAt,
          identityKey,
          metadata: {
            replay: {
              eventId: eventId.toString(),
              eventType: event.eventType,
              relationshipEventType:
                typeof payload.relationshipEventType === 'string'
                  ? payload.relationshipEventType
                  : null,
              source: 'domain_events',
            },
          },
        },
        reason: '',
      };
    }

    if (event.eventType === 'MemoryPalaceContributionAdded') {
      const contributorFrogId = parsePositiveInt(payload?.contributorFrogId ?? payload?.sourceFrogId);
      const ownerFrogId = parsePositiveInt(payload?.worldOwnerFrogId ?? payload?.targetFrogId);
      if (!contributorFrogId || !ownerFrogId || contributorFrogId === ownerFrogId) {
        return {
          signal: null,
          reason: 'memory_contribution_pair_missing',
        };
      }
      return {
        signal: {
          sourceFrogId: contributorFrogId,
          targetFrogId: ownerFrogId,
          signalType: 'CONTRIBUTION',
          occurredAt,
          identityKey,
          metadata: {
            replay: {
              eventId: eventId.toString(),
              eventType: event.eventType,
              source: 'domain_events',
            },
          },
        },
        reason: '',
      };
    }

    if (event.eventType === 'MemoryPalaceVisitLogged') {
      const visitorFrogId = parsePositiveInt(payload?.visitorFrogId);
      const hostFrogId = parsePositiveInt(payload?.hostFrogId);
      if (!visitorFrogId || !hostFrogId || visitorFrogId === hostFrogId) {
        return {
          signal: null,
          reason: 'memory_visit_pair_missing',
        };
      }
      return {
        signal: {
          sourceFrogId: visitorFrogId,
          targetFrogId: hostFrogId,
          signalType: 'WITNESS',
          occurredAt,
          identityKey,
          metadata: {
            replay: {
              eventId: eventId.toString(),
              eventType: event.eventType,
              source: 'domain_events',
            },
          },
        },
        reason: '',
      };
    }

    return {
      signal: null,
      reason: 'event_type_unsupported',
    };
  }
}

export const relationshipEdgeReplayService = new RelationshipEdgeReplayService();
