import { Prisma } from '@prisma/client';
import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { normalizeWalletAddress } from '../identity/nonce.service';

export interface GetRelationshipMemoryInput {
  frogId: number;
  timelineLimit?: number;
  walletAddress?: string;
}

export interface RelationshipMemoryTimelineItem {
  id: string;
  kind: 'RELATIONSHIP_EVENT' | 'ATTESTATION';
  eventType: string;
  status?: string;
  counterpartyFrogId: number | null;
  occurredAt: string;
  payload: unknown;
}

export interface RelationshipMemoryReadModel {
  frog: {
    id: number;
    tokenId: number;
    name: string;
    ownerAddress: string;
  };
  soulProfile: {
    personality: string | null;
    imprintText: string | null;
    bondedAt: string | null;
    temperament: unknown;
  } | null;
  summary: {
    relationshipEventCount: number;
    attestationCount: number;
    confirmedAttestationCount: number;
    queuedAttestationCount: number;
    failedAttestationCount: number;
    relatedFrogCount: number;
  };
  attestationTypeStats: Array<{
    attestationType: string;
    total: number;
    confirmed: number;
    queued: number;
    failed: number;
  }>;
  relatedFrogs: Array<{
    id: number;
    tokenId: number;
    name: string;
  }>;
  recentTimeline: RelationshipMemoryTimelineItem[];
  generatedAt: string;
}

const sanitizeFrogId = (frogId: number): number => {
  if (!Number.isInteger(frogId) || frogId <= 0) {
    throw new AppError(400, 'frogId must be a positive integer', 'INVALID_INPUT');
  }
  return frogId;
};

const sanitizeTimelineLimit = (limit?: number): number => {
  if (limit === undefined || limit === null) {
    return 20;
  }
  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    throw new AppError(400, 'timelineLimit must be a positive integer <= 100', 'INVALID_INPUT');
  }
  return limit;
};

const assertFrogOwnerReadable = (ownerAddress: string, walletAddress?: string): void => {
  if (!walletAddress) {
    return;
  }

  const normalizedWallet = normalizeWalletAddress(walletAddress);
  if (ownerAddress.toLowerCase() !== normalizedWallet) {
    throw new AppError(
      403,
      'walletAddress cannot access this frog relationship memory',
      'FORBIDDEN'
    );
  }
};

const deriveCounterpartyFromEvent = (
  frogId: number,
  row: { frogId: number; actorFrogId: number | null; counterpartyFrogId: number | null }
): number | null => {
  if (row.counterpartyFrogId && row.counterpartyFrogId !== frogId) {
    return row.counterpartyFrogId;
  }
  if (row.actorFrogId && row.actorFrogId !== frogId) {
    return row.actorFrogId;
  }
  if (row.frogId !== frogId) {
    return row.frogId;
  }
  return null;
};

const deriveCounterpartyFromAttestation = (
  frogId: number,
  row: { subjectFrogId: number; objectFrogId: number }
): number | null => {
  if (row.subjectFrogId === frogId && row.objectFrogId !== frogId) {
    return row.objectFrogId;
  }
  if (row.objectFrogId === frogId && row.subjectFrogId !== frogId) {
    return row.subjectFrogId;
  }
  return null;
};

export class RelationshipMemoryQueryService {
  async getByFrogId(input: GetRelationshipMemoryInput): Promise<RelationshipMemoryReadModel> {
    const frogId = sanitizeFrogId(input.frogId);
    const timelineLimit = sanitizeTimelineLimit(input.timelineLimit);

    const eventWhere: Prisma.RelationshipEventWhereInput = {
      OR: [{ frogId }, { actorFrogId: frogId }, { counterpartyFrogId: frogId }],
    };
    const attestationWhere: Prisma.RelationshipAttestationWhereInput = {
      OR: [{ subjectFrogId: frogId }, { objectFrogId: frogId }],
    };

    const [
      frog,
      soulProfile,
      relationshipEventCount,
      recentEvents,
      attestationCount,
      confirmedAttestationCount,
      queuedAttestationCount,
      failedAttestationCount,
      recentAttestations,
      groupedAttestations,
    ] = await Promise.all([
      prisma.frog.findUnique({
        where: { id: frogId },
        select: {
          id: true,
          tokenId: true,
          name: true,
          ownerAddress: true,
        },
      }),
      prisma.soulProfile.findUnique({
        where: { frogId },
        select: {
          personality: true,
          imprintText: true,
          bondedAt: true,
          temperament: true,
        },
      }),
      prisma.relationshipEvent.count({
        where: eventWhere,
      }),
      prisma.relationshipEvent.findMany({
        where: eventWhere,
        orderBy: { occurredAt: 'desc' },
        take: timelineLimit,
        select: {
          id: true,
          frogId: true,
          actorFrogId: true,
          counterpartyFrogId: true,
          eventType: true,
          payload: true,
          occurredAt: true,
        },
      }),
      prisma.relationshipAttestation.count({
        where: attestationWhere,
      }),
      prisma.relationshipAttestation.count({
        where: {
          ...attestationWhere,
          status: 'CONFIRMED',
        },
      }),
      prisma.relationshipAttestation.count({
        where: {
          ...attestationWhere,
          status: 'QUEUED',
        },
      }),
      prisma.relationshipAttestation.count({
        where: {
          ...attestationWhere,
          status: 'FAILED',
        },
      }),
      prisma.relationshipAttestation.findMany({
        where: attestationWhere,
        orderBy: { createdAt: 'desc' },
        take: timelineLimit,
        include: {
          onchainMilestones: {
            where: {
              milestoneType: 'RELATIONSHIP_ATTESTED',
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              txHash: true,
              chainId: true,
              blockNumber: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.relationshipAttestation.groupBy({
        by: ['attestationType', 'status'],
        where: attestationWhere,
        _count: { _all: true },
      }),
    ]);

    if (!frog) {
      throw new AppError(404, 'Frog not found', 'NOT_FOUND');
    }
    assertFrogOwnerReadable(frog.ownerAddress, input.walletAddress);

    const relatedFrogIds = new Set<number>();

    for (const event of recentEvents) {
      const counterpartyFrogId = deriveCounterpartyFromEvent(frogId, event);
      if (counterpartyFrogId && counterpartyFrogId !== frogId) {
        relatedFrogIds.add(counterpartyFrogId);
      }
    }

    for (const attestation of recentAttestations) {
      const counterpartyFrogId = deriveCounterpartyFromAttestation(frogId, attestation);
      if (counterpartyFrogId && counterpartyFrogId !== frogId) {
        relatedFrogIds.add(counterpartyFrogId);
      }
    }

    const relatedFrogs = relatedFrogIds.size
      ? await prisma.frog.findMany({
          where: {
            id: {
              in: Array.from(relatedFrogIds),
            },
          },
          select: {
            id: true,
            tokenId: true,
            name: true,
          },
        })
      : [];

    const attestationTypeStatsMap = new Map<
      string,
      {
        total: number;
        confirmed: number;
        queued: number;
        failed: number;
      }
    >();

    for (const item of groupedAttestations) {
      const previous = attestationTypeStatsMap.get(item.attestationType) || {
        total: 0,
        confirmed: 0,
        queued: 0,
        failed: 0,
      };

      previous.total += item._count._all;
      if (item.status === 'CONFIRMED') {
        previous.confirmed += item._count._all;
      } else if (item.status === 'QUEUED') {
        previous.queued += item._count._all;
      } else if (item.status === 'FAILED') {
        previous.failed += item._count._all;
      }
      attestationTypeStatsMap.set(item.attestationType, previous);
    }

    const attestationTypeStats = Array.from(attestationTypeStatsMap.entries())
      .map(([attestationType, stats]) => ({
        attestationType,
        ...stats,
      }))
      .sort((a, b) => b.total - a.total);

    const timeline: Array<RelationshipMemoryTimelineItem & { sortTs: number }> = [
      ...recentEvents.map((event) => ({
        id: event.id.toString(),
        kind: 'RELATIONSHIP_EVENT' as const,
        eventType: event.eventType,
        counterpartyFrogId: deriveCounterpartyFromEvent(frogId, event),
        occurredAt: event.occurredAt.toISOString(),
        payload: event.payload,
        sortTs: event.occurredAt.getTime(),
      })),
      ...recentAttestations.map((attestation) => ({
        id: attestation.id,
        kind: 'ATTESTATION' as const,
        eventType: attestation.attestationType,
        status: attestation.status,
        counterpartyFrogId: deriveCounterpartyFromAttestation(frogId, attestation),
        occurredAt: attestation.createdAt.toISOString(),
        payload: {
          source: attestation.source,
          evidence: attestation.evidence,
          onchainTrace: attestation.onchainMilestones[0]
            ? {
                milestoneId: attestation.onchainMilestones[0].id.toString(),
                txHash: attestation.onchainMilestones[0].txHash,
                chainId: attestation.onchainMilestones[0].chainId,
                blockNumber: attestation.onchainMilestones[0].blockNumber?.toString() || null,
                recordedAt: attestation.onchainMilestones[0].createdAt.toISOString(),
              }
            : null,
        },
        sortTs: attestation.createdAt.getTime(),
      })),
    ]
      .sort((a, b) => b.sortTs - a.sortTs)
      .slice(0, timelineLimit);

    return {
      frog: {
        id: frog.id,
        tokenId: frog.tokenId,
        name: frog.name,
        ownerAddress: frog.ownerAddress.toLowerCase(),
      },
      soulProfile: soulProfile
        ? {
            personality: soulProfile.personality,
            imprintText: soulProfile.imprintText,
            bondedAt: soulProfile.bondedAt?.toISOString() || null,
            temperament: soulProfile.temperament,
          }
        : null,
      summary: {
        relationshipEventCount,
        attestationCount,
        confirmedAttestationCount,
        queuedAttestationCount,
        failedAttestationCount,
        relatedFrogCount: relatedFrogs.length,
      },
      attestationTypeStats,
      relatedFrogs: relatedFrogs.sort((a, b) => a.tokenId - b.tokenId),
      recentTimeline: timeline.map(({ sortTs: _sortTs, ...item }) => item),
      generatedAt: new Date().toISOString(),
    };
  }
}

export const relationshipMemoryQueryService = new RelationshipMemoryQueryService();
