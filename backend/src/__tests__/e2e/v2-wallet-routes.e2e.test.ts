import express from 'express';
import request from 'supertest';
import v2Routes from '../../api/routes/v2';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import { frogWalletQueryService } from '../../modules/web3/frog-wallet.query';
import { frogWalletAssetEventService } from '../../modules/web3/wallet-asset-event.service';

jest.mock('../../middlewares/auth.middleware', () => ({
  authRequired: (req: any, _res: any, next: any) => {
    req.user = {
      address: '0xabc0000000000000000000000000000000000001',
      walletAddress: '0xabc0000000000000000000000000000000000001',
    };
    next();
  },
}));

jest.mock('../../modules/web3/frog-wallet.query', () => ({
  frogWalletQueryService: {
    getWalletByFrogId: jest.fn(),
    getMilestonesByFrogId: jest.fn(),
  },
}));

jest.mock('../../modules/web3/wallet-asset-event.service', () => ({
  frogWalletAssetEventService: {
    observeWalletAssets: jest.fn(),
  },
}));

describe('V2 Wallet Routes E2E', () => {
  const app = express();
  const mockWalletQuery = frogWalletQueryService as jest.Mocked<typeof frogWalletQueryService>;
  const mockWalletAssetEvent = frogWalletAssetEventService as jest.Mocked<typeof frogWalletAssetEventService>;

  app.use(express.json());
  app.use('/api/v2', v2Routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();

    mockWalletQuery.getWalletByFrogId.mockResolvedValue({
      frogId: 1,
      tokenId: 1,
      frogName: 'GuaGua',
      ownerAddress: '0xabc0000000000000000000000000000000000001',
      tbaAddress: '0x1111111111111111111111111111111111111111',
      tbaSource: 'deterministic_fallback',
      chainId: 7001,
      assets: {
        souvenirs: [],
        badges: [],
        decorations: [],
      },
      milestones: {
        total: 2,
        latestAt: new Date().toISOString(),
      },
    } as any);

    mockWalletAssetEvent.observeWalletAssets.mockResolvedValue({
      emitted: true,
      eventId: '99',
      assetHash: 'hash_1',
      assetCounts: {
        souvenirs: 0,
        badges: 0,
        decorations: 0,
      },
    });

    mockWalletQuery.getMilestonesByFrogId.mockResolvedValue([
      {
        id: '1',
        frogId: 1,
        travelId: null,
        attestationId: null,
        type: 'hatched',
        milestoneType: 'HATCHED',
        chainId: 7001,
        txHash: '0xaaa',
        blockNumber: '123',
        payload: { source: 'web' },
        createdAt: new Date().toISOString(),
      },
    ] as any);
  });

  it('GET /api/v2/frogs/:frogId/wallet returns wallet payload with asset sync info', async () => {
    const response = await request(app).get('/api/v2/frogs/1/wallet');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.tbaAddress).toBe('0x1111111111111111111111111111111111111111');
    expect(response.body.data.assetSync).toMatchObject({
      emitted: true,
      eventId: '99',
      assetHash: 'hash_1',
    });
    expect(mockWalletQuery.getWalletByFrogId).toHaveBeenCalledWith(
      1,
      '0xabc0000000000000000000000000000000000001'
    );
    expect(mockWalletAssetEvent.observeWalletAssets).toHaveBeenCalled();
  });

  it('GET /api/v2/frogs/:frogId/wallet/milestones validates limit range', async () => {
    const response = await request(app).get('/api/v2/frogs/1/wallet/milestones').query({ limit: '999' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_INPUT');
    expect(mockWalletQuery.getMilestonesByFrogId).not.toHaveBeenCalled();
  });

  it('GET /api/v2/frogs/:frogId/wallet/milestones delegates to wallet query', async () => {
    const response = await request(app).get('/api/v2/frogs/1/wallet/milestones').query({ limit: '20' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(mockWalletQuery.getMilestonesByFrogId).toHaveBeenCalledWith(
      1,
      '0xabc0000000000000000000000000000000000001',
      20
    );
  });
});
