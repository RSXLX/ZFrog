import express from 'express';
import request from 'supertest';
import frogsRoutes from '../../api/routes/v1/frogs.routes';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import { frogWalletQueryService } from '../../modules/web3/frog-wallet.query';

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

describe('V1 Frog Wallet Routes E2E', () => {
  const app = express();
  const mockWalletQuery = frogWalletQueryService as jest.Mocked<typeof frogWalletQueryService>;

  app.use(express.json());
  app.use('/api/v1/frogs', frogsRoutes);
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
    });

    mockWalletQuery.getMilestonesByFrogId.mockResolvedValue([
      {
        id: '1',
        frogId: 1,
        travelId: null,
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

  it('GET /api/v1/frogs/:frogId/wallet delegates to frog-wallet.query', async () => {
    const response = await request(app).get('/api/v1/frogs/1/wallet');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.tbaAddress).toBe('0x1111111111111111111111111111111111111111');
    expect(mockWalletQuery.getWalletByFrogId).toHaveBeenCalledWith(
      1,
      '0xabc0000000000000000000000000000000000001'
    );
  });

  it('GET /api/v1/frogs/:frogId/milestones delegates to frog-wallet.query with limit', async () => {
    const response = await request(app).get('/api/v1/frogs/1/milestones').query({ limit: '20' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(mockWalletQuery.getMilestonesByFrogId).toHaveBeenCalledWith(
      1,
      '0xabc0000000000000000000000000000000000001',
      20
    );
  });

  it('GET /api/v1/frogs/:frogId/milestones validates limit range', async () => {
    const response = await request(app).get('/api/v1/frogs/1/milestones').query({ limit: '999' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_INPUT');
    expect(mockWalletQuery.getMilestonesByFrogId).not.toHaveBeenCalled();
  });
});
