import { AppError } from '../../middlewares/errorHandler';
import { RelationshipEdgeReplayService } from '../../modules/relationship-graph/relationship-edge-replay.service';

describe('RelationshipEdgeReplayService (integration)', () => {
  const originalReplayGate = process.env.V3_RELATIONSHIP_EDGE_REPLAY_ENABLED;

  afterEach(() => {
    process.env.V3_RELATIONSHIP_EDGE_REPLAY_ENABLED = originalReplayGate;
  });

  it('maps production domain events into JOURNEY/RESCUE/WITNESS/CONTRIBUTION signals with stable replay identity keys', async () => {
    process.env.V3_RELATIONSHIP_EDGE_REPLAY_ENABLED = 'true';

    const findMany = jest.fn().mockResolvedValue([
      {
        id: 101n,
        eventType: 'TravelStarted',
        occurredAt: new Date('2026-03-24T03:00:00.000Z'),
        frogId: 11,
        payload: {
          companionFrogId: 22,
        },
      },
      {
        id: 102n,
        eventType: 'RescueCompleted',
        occurredAt: new Date('2026-03-24T03:10:00.000Z'),
        frogId: 22,
        payload: {
          rescuerFrogId: 11,
        },
      },
      {
        id: 103n,
        eventType: 'RelationshipAttested',
        occurredAt: new Date('2026-03-24T03:20:00.000Z'),
        frogId: 11,
        payload: {
          subjectFrogId: 11,
          objectFrogId: 33,
        },
      },
      {
        id: 104n,
        eventType: 'RelationshipMilestoneRecorded',
        occurredAt: new Date('2026-03-24T03:25:00.000Z'),
        frogId: 22,
        payload: {
          relationshipEventType: 'BLESSING',
          actorFrogId: 11,
          counterpartyFrogId: 22,
        },
      },
      {
        id: 105n,
        eventType: 'MemoryPalaceContributionAdded',
        occurredAt: new Date('2026-03-24T03:30:00.000Z'),
        payload: {
          worldId: 'mpw_abc',
        },
      },
    ]);

    const ingestSignals = jest.fn().mockResolvedValue({
      scopeAppId: 'int_relationship_graph',
      acceptedCount: 4,
      deduplicatedCount: 0,
      skippedCount: 0,
      snapshots: [],
    });

    const service = new RelationshipEdgeReplayService({
      prismaClient: {
        domainEvent: {
          findMany,
        },
      },
      ledgerClient: {
        ingestSignals,
      },
    });

    const result = await service.replayFromDomainEvents({
      scopeAppId: 'int_relationship_graph',
      keyId: 'ikey_replay',
      actor: 'system:replay',
      sinceEventId: 100n,
      limit: 20,
      source: 'test.replay',
    });

    expect(findMany).toHaveBeenCalledWith({
      where: {
        eventType: {
          in: [
            'TravelStarted',
            'RescueCompleted',
            'RelationshipAttested',
            'RelationshipMilestoneRecorded',
            'MemoryPalaceContributionAdded',
            'MemoryPalaceVisitLogged',
          ],
        },
        id: {
          gt: 100n,
        },
      },
      orderBy: {
        id: 'asc',
      },
      take: 20,
    });

    expect(ingestSignals).toHaveBeenCalledTimes(1);
    expect(ingestSignals).toHaveBeenCalledWith({
      signals: [
        expect.objectContaining({
          sourceFrogId: 11,
          targetFrogId: 22,
          signalType: 'JOURNEY',
          identityKey: 'domain-event:101',
        }),
        expect.objectContaining({
          sourceFrogId: 11,
          targetFrogId: 22,
          signalType: 'RESCUE',
          identityKey: 'domain-event:102',
        }),
        expect.objectContaining({
          sourceFrogId: 11,
          targetFrogId: 33,
          signalType: 'WITNESS',
          identityKey: 'domain-event:103',
        }),
        expect.objectContaining({
          sourceFrogId: 11,
          targetFrogId: 22,
          signalType: 'CONTRIBUTION',
          identityKey: 'domain-event:104',
        }),
      ],
      requestedBy: {
        appId: 'int_relationship_graph',
        keyId: 'ikey_replay',
        actor: 'system:replay',
        requestId: null,
        source: 'test.replay',
      },
    });

    expect(result).toMatchObject({
      scopeAppId: 'int_relationship_graph',
      dryRun: false,
      scannedCount: 5,
      mappedCount: 4,
      skippedCount: 1,
      acceptedCount: 4,
      deduplicatedCount: 0,
      startCursor: '100',
      nextCursor: '105',
    });
    expect(result.skippedByReason).toMatchObject({
      memory_contribution_pair_missing: 1,
    });
  });

  it('supports dry-run without ingesting signals and still returns replay cursor', async () => {
    process.env.V3_RELATIONSHIP_EDGE_REPLAY_ENABLED = 'true';

    const ingestSignals = jest.fn();
    const service = new RelationshipEdgeReplayService({
      prismaClient: {
        domainEvent: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 220n,
              eventType: 'RelationshipAttested',
              occurredAt: new Date('2026-03-24T04:00:00.000Z'),
              payload: {
                subjectFrogId: 51,
                objectFrogId: 52,
              },
            },
          ]),
        },
      },
      ledgerClient: {
        ingestSignals,
      },
    });

    const result = await service.replayFromDomainEvents({
      scopeAppId: 'int_relationship_graph',
      keyId: 'ikey_replay',
      actor: 'system:replay',
      dryRun: true,
    });

    expect(ingestSignals).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      dryRun: true,
      scannedCount: 1,
      mappedCount: 1,
      acceptedCount: 1,
      deduplicatedCount: 0,
      nextCursor: '220',
    });
  });

  it('fails closed when replay gate is disabled', async () => {
    process.env.V3_RELATIONSHIP_EDGE_REPLAY_ENABLED = 'false';

    const service = new RelationshipEdgeReplayService({
      prismaClient: {
        domainEvent: {
          findMany: jest.fn(),
        },
      },
      ledgerClient: {
        ingestSignals: jest.fn(),
      },
    });

    await expect(
      service.replayFromDomainEvents({
        scopeAppId: 'int_relationship_graph',
        keyId: 'ikey_replay',
        actor: 'system:replay',
      })
    ).rejects.toBeInstanceOf(AppError);

    await expect(
      service.replayFromDomainEvents({
        scopeAppId: 'int_relationship_graph',
        keyId: 'ikey_replay',
        actor: 'system:replay',
      })
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'RELATIONSHIP_EDGE_REPLAY_DISABLED',
    });
  });
});
