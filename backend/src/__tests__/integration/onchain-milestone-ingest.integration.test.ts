import { eventListener } from '../../workers/eventListener';
import { prisma } from '../../database';
import { onchainMilestoneService } from '../../modules/web3/onchain-milestone.service';

jest.mock('../../database', () => ({
  prisma: {
    frog: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    travel: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    souvenir: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    crossChainMessage: {
      upsert: jest.fn(),
    },
    onchainMilestone: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('../../modules/web3/onchain-milestone.service', () => ({
  onchainMilestoneService: {
    record: jest.fn(),
  },
}));

describe('Onchain Milestone Ingest Integration', () => {
  const listener = eventListener as any;
  const mockPrisma = prisma as unknown as {
    frog: {
      findUnique: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
    travel: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    souvenir: {
      findFirst: jest.Mock;
      upsert: jest.Mock;
    };
    onchainMilestone: {
      findFirst: jest.Mock;
    };
  };
  const mockMilestoneService = onchainMilestoneService as jest.Mocked<typeof onchainMilestoneService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.onchainMilestone.findFirst.mockResolvedValue(null);
    mockMilestoneService.record.mockResolvedValue({ id: '1' } as any);
  });

  it('records milestone rows from listener events with tx metadata', async () => {
    await listener.recordOnchainMilestoneForEvent({
      frogId: 7,
      travelId: 12,
      milestoneType: 'TRAVEL_STARTED',
      log: {
        transactionHash: '0xabc123',
        blockNumber: 123n,
      },
      payload: {
        tokenId: 1,
      },
    });

    expect(mockPrisma.onchainMilestone.findFirst).toHaveBeenCalledWith({
      where: {
        frogId: 7,
        milestoneType: 'TRAVEL_STARTED',
        txHash: '0xabc123',
      },
    });

    expect(mockMilestoneService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        frogId: 7,
        travelId: 12,
        milestoneType: 'TRAVEL_STARTED',
        txHash: '0xabc123',
        blockNumber: 123n,
      }),
      expect.objectContaining({
        source: 'event-listener',
      })
    );
  });

  it('skips duplicated ingestion when same txHash milestone already exists', async () => {
    mockPrisma.onchainMilestone.findFirst.mockResolvedValueOnce({ id: 9n });

    await listener.recordOnchainMilestoneForEvent({
      frogId: 7,
      milestoneType: 'TRAVEL_STARTED',
      log: {
        transactionHash: '0xdup',
      },
    });

    expect(mockMilestoneService.record).not.toHaveBeenCalled();
  });

  it('delegates TravelStarted handler to milestone ingest with resolved travelId', async () => {
    mockPrisma.frog.findUnique.mockResolvedValue({
      id: 7,
      tokenId: 1,
      status: 'Idle',
    });
    mockPrisma.travel.findFirst.mockResolvedValue(null);
    mockPrisma.frog.update.mockResolvedValue({ id: 7 });
    mockPrisma.travel.create.mockResolvedValue({
      id: 22,
      targetWallet: '0x0000000000000000000000000000000000000001',
      startTime: new Date('2026-03-21T00:00:00.000Z'),
      endTime: new Date('2026-03-21T01:00:00.000Z'),
      chainId: 7001,
    });

    await listener.handleTravelStarted({
      args: {
        tokenId: 1n,
        targetWallet: '0x0000000000000000000000000000000000000001',
        targetChainId: 7001n,
        startTime: 1710000000n,
        endTime: 1710003600n,
        isRandom: false,
      },
      transactionHash: '0xtravel1',
      blockNumber: 456n,
    });

    expect(mockMilestoneService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        frogId: 7,
        travelId: 22,
        milestoneType: 'TRAVEL_STARTED',
        txHash: '0xtravel1',
      }),
      expect.objectContaining({
        source: 'event-listener',
      })
    );
  });

  it('ingests EggClaimed from chain events', async () => {
    mockPrisma.frog.findUnique.mockResolvedValue({
      id: 8,
      tokenId: 2,
    });

    await listener.handleEggClaimed({
      args: {
        owner: '0x0000000000000000000000000000000000000002',
        tokenId: 2n,
        timestamp: 1710001000n,
      },
      transactionHash: '0xegg1',
      blockNumber: 777n,
    });

    expect(mockMilestoneService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        frogId: 8,
        milestoneType: 'EGG_CLAIMED',
        txHash: '0xegg1',
      }),
      expect.objectContaining({
        source: 'event-listener',
      })
    );
  });
});
