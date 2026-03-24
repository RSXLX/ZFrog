import { frogWalletAssetEventService } from '../../modules/web3/wallet-asset-event.service';
import { prisma } from '../../database';

jest.mock('../../database', () => ({
  prisma: {
    domainEvent: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('FrogWalletAssetEventService Integration', () => {
  const mockPrisma = prisma as unknown as {
    domainEvent: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };

  const walletSample = {
    frogId: 1,
    tokenId: 1001,
    frogName: 'WalletFrog',
    ownerAddress: '0xabc0000000000000000000000000000000000001',
    tbaAddress: '0x1111111111111111111111111111111111111111',
    tbaSource: 'deterministic_fallback' as const,
    chainId: 7001,
    assets: {
      souvenirs: [{ id: 11 }],
      badges: [{ id: 'badge-1' }],
      decorations: [{ id: 'decor-1' }],
    },
    milestones: {
      total: 2,
      latestAt: '2026-03-23T10:00:00.000Z',
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.domainEvent.create.mockResolvedValue({ id: 99n });
  });

  it('emits FrogWalletAssetChanged when no previous fingerprint exists', async () => {
    mockPrisma.domainEvent.findFirst.mockResolvedValue(null);

    const result = await frogWalletAssetEventService.observeWalletAssets(walletSample, {
      requestId: 'req_1',
      source: 'test.wallet',
    });

    expect(result.emitted).toBe(true);
    expect(result.eventId).toBe('99');
    expect(result.assetHash).not.toBe('');

    expect(mockPrisma.domainEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        aggregateType: 'Wallet',
        aggregateId: '1',
        eventType: 'FrogWalletAssetChanged',
        requestId: 'req_1',
        source: 'test.wallet',
      }),
    }));
  });

  it('skips event emission when fingerprint is unchanged', async () => {
    const first = await frogWalletAssetEventService.observeWalletAssets(walletSample, {
      source: 'test.wallet',
    });

    mockPrisma.domainEvent.findFirst.mockResolvedValue({
      id: 88n,
      payload: {
        assetHash: first.assetHash,
      },
    });
    mockPrisma.domainEvent.create.mockClear();

    const second = await frogWalletAssetEventService.observeWalletAssets(walletSample, {
      source: 'test.wallet',
    });

    expect(second.emitted).toBe(false);
    expect(second.eventId).toBeNull();
    expect(mockPrisma.domainEvent.create).not.toHaveBeenCalled();
  });
});
