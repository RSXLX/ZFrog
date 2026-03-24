import { relationshipMemoryQueryService } from '../../modules/soul/relationship-memory.query';
import { prisma } from '../../database';

jest.mock('../../database', () => ({
  prisma: {
    frog: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    soulProfile: {
      findUnique: jest.fn(),
    },
    relationshipEvent: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    relationshipAttestation: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
  },
}));

describe('RelationshipMemoryQueryService Integration', () => {
  const mockPrisma = prisma as unknown as {
    frog: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    soulProfile: {
      findUnique: jest.Mock;
    };
    relationshipEvent: {
      count: jest.Mock;
      findMany: jest.Mock;
    };
    relationshipAttestation: {
      count: jest.Mock;
      findMany: jest.Mock;
      groupBy: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma.frog.findUnique.mockResolvedValue({
      id: 7,
      tokenId: 1007,
      name: 'MemoryFrog',
      ownerAddress: '0xabc0000000000000000000000000000000000007',
    });

    mockPrisma.soulProfile.findUnique.mockResolvedValue({
      personality: 'warm',
      imprintText: 'likes friends',
      bondedAt: new Date('2026-03-23T00:00:00.000Z'),
      temperament: { tone: 'warm' },
    });

    mockPrisma.relationshipEvent.count.mockResolvedValue(3);
    mockPrisma.relationshipEvent.findMany.mockResolvedValue([
      {
        id: 1n,
        frogId: 7,
        actorFrogId: 7,
        counterpartyFrogId: 9,
        eventType: 'Blessed',
        payload: { source: 'test' },
        occurredAt: new Date('2026-03-23T10:00:00.000Z'),
      },
    ]);

    mockPrisma.relationshipAttestation.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    mockPrisma.relationshipAttestation.findMany.mockResolvedValue([
      {
        id: 'att_1',
        subjectFrogId: 7,
        objectFrogId: 9,
        attestationType: 'blessing',
        status: 'CONFIRMED',
        source: 'v2-social',
        evidence: { score: 1 },
        createdAt: new Date('2026-03-23T11:00:00.000Z'),
        onchainMilestones: [
          {
            id: 12n,
            txHash: '0xaaa',
            chainId: 7001,
            blockNumber: 321n,
            createdAt: new Date('2026-03-23T11:30:00.000Z'),
          },
        ],
      },
    ]);

    mockPrisma.relationshipAttestation.groupBy.mockResolvedValue([
      {
        attestationType: 'blessing',
        status: 'CONFIRMED',
        _count: { _all: 1 },
      },
      {
        attestationType: 'blessing',
        status: 'QUEUED',
        _count: { _all: 1 },
      },
    ]);

    mockPrisma.frog.findMany.mockResolvedValue([
      {
        id: 9,
        tokenId: 1009,
        name: 'PeerFrog',
      },
    ]);
  });

  it('builds aggregated relationship memory read model', async () => {
    const result = await relationshipMemoryQueryService.getByFrogId({
      frogId: 7,
      timelineLimit: 20,
    });

    expect(result.frog).toMatchObject({
      id: 7,
      tokenId: 1007,
      name: 'MemoryFrog',
    });
    expect(result.summary).toMatchObject({
      relationshipEventCount: 3,
      attestationCount: 2,
      confirmedAttestationCount: 1,
      queuedAttestationCount: 1,
      failedAttestationCount: 0,
      relatedFrogCount: 1,
    });
    expect(result.attestationTypeStats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          attestationType: 'blessing',
          total: 2,
          confirmed: 1,
          queued: 1,
          failed: 0,
        }),
      ])
    );
    expect(result.recentTimeline.length).toBeGreaterThanOrEqual(2);
    expect(result.recentTimeline[0].kind).toBe('ATTESTATION');
    expect(result.relatedFrogs).toEqual([
      {
        id: 9,
        tokenId: 1009,
        name: 'PeerFrog',
      },
    ]);
  });
});
