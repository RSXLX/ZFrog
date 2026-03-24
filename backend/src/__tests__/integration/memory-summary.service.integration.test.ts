import { memorySummaryService } from '../../modules/soul/memory-summary.service';
import { prisma } from '../../database';
import { relationshipMemoryQueryService } from '../../modules/soul/relationship-memory.query';

jest.mock('../../database', () => ({
  prisma: {
    memorySummary: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    domainEvent: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../../modules/soul/relationship-memory.query', () => ({
  relationshipMemoryQueryService: {
    getByFrogId: jest.fn(),
  },
}));

describe('MemorySummaryService Integration', () => {
  const mockPrisma = prisma as unknown as {
    memorySummary: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    domainEvent: {
      create: jest.Mock;
    };
  };
  const mockRelationshipMemory = relationshipMemoryQueryService as jest.Mocked<typeof relationshipMemoryQueryService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRelationshipMemory.getByFrogId.mockResolvedValue({
      frog: {
        id: 7,
        tokenId: 1007,
        name: 'MemoryFrog',
        ownerAddress: '0xabc0000000000000000000000000000000000007',
      },
      soulProfile: null,
      summary: {
        relationshipEventCount: 4,
        attestationCount: 3,
        confirmedAttestationCount: 2,
        queuedAttestationCount: 1,
        failedAttestationCount: 0,
        relatedFrogCount: 2,
      },
      attestationTypeStats: [
        { attestationType: 'blessing', total: 2, confirmed: 2, queued: 0, failed: 0 },
        { attestationType: 'bond', total: 1, confirmed: 0, queued: 1, failed: 0 },
      ],
      relatedFrogs: [
        { id: 9, tokenId: 1009, name: 'PeerA' },
        { id: 10, tokenId: 1010, name: 'PeerB' },
      ],
      recentTimeline: [],
      generatedAt: '2026-03-23T00:00:00.000Z',
    } as any);

    mockPrisma.memorySummary.upsert.mockResolvedValue({
      id: 21,
      frogId: 7,
      summaryType: 'RELATIONSHIP_V1',
      summaryText: 'summary text',
      generatedAt: new Date('2026-03-23T12:00:00.000Z'),
      updatedAt: new Date('2026-03-23T12:00:00.000Z'),
    });

    mockPrisma.domainEvent.create.mockResolvedValue({});
  });

  it('creates memory summary snapshot for frog', async () => {
    mockPrisma.memorySummary.findUnique.mockResolvedValue(null);

    const result = await memorySummaryService.rebuildForFrog({
      frogId: 7,
      source: 'test.memory-summary',
      requestId: 'req_1',
    });

    expect(result).toMatchObject({
      id: 21,
      frogId: 7,
      summaryType: 'RELATIONSHIP_V1',
    });

    expect(mockPrisma.memorySummary.upsert).toHaveBeenCalled();
    expect(mockPrisma.domainEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        aggregateType: 'MemorySummary',
        eventType: 'MemorySummaryCreated',
        requestId: 'req_1',
      }),
    }));
  });

  it('marks domain event as updated when summary already exists', async () => {
    mockPrisma.memorySummary.findUnique.mockResolvedValue({ id: 21 });

    await memorySummaryService.rebuildForFrog({
      frogId: 7,
      source: 'test.memory-summary',
    });

    expect(mockPrisma.domainEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventType: 'MemorySummaryUpdated',
      }),
    }));
  });
});
