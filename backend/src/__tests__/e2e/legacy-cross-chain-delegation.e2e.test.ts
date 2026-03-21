import express from 'express';
import request from 'supertest';
import crossChainRoutes from '../../api/routes/cross-chain.routes';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import { travelCommandServiceV1 } from '../../modules/travel/travel.command';
import { travelQueryServiceV1 } from '../../modules/travel/travel.query';

jest.mock('../../modules/travel/travel.command', () => ({
  travelCommandServiceV1: {
    startLegacyCrossChainTravel: jest.fn(),
    markCrossChainStarted: jest.fn(),
    markCrossChainArrived: jest.fn(),
    markCrossChainCompleted: jest.fn(),
    syncCrossChainState: jest.fn(),
  },
}));

jest.mock('../../modules/travel/travel.query', () => ({
  travelQueryServiceV1: {
    getSupportedCrossChains: jest.fn(),
    canStartCrossChainTravel: jest.fn(),
    getCrossChainStatus: jest.fn(),
    getCrossChainVisitingStatus: jest.fn(),
    getActiveCrossChainTravels: jest.fn(),
    getCrossChainDiscoveries: jest.fn(),
  },
}));

describe('Legacy Cross-Chain Route Delegation E2E', () => {
  const app = express();
  const mockCommand = travelCommandServiceV1 as jest.Mocked<typeof travelCommandServiceV1>;
  const mockQuery = travelQueryServiceV1 as jest.Mocked<typeof travelQueryServiceV1>;

  app.use(express.json());
  app.use('/api/v1/cross-chain', crossChainRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();

    mockQuery.getSupportedCrossChains.mockReturnValue([
      {
        chainId: 97,
        name: 'BSC',
        chainType: 'BSC_TESTNET',
      },
    ] as any);

    mockQuery.canStartCrossChainTravel.mockResolvedValue({
      canStart: true,
    } as any);

    mockCommand.startLegacyCrossChainTravel.mockResolvedValue({
      travelId: 101,
      status: 'PENDING',
      currentStage: 'PREPARING',
      progress: 0,
      targetChain: 'BSC_TESTNET',
      chainId: 97,
      endTime: new Date(Date.now() + 3600 * 1000).toISOString(),
    });

    mockQuery.getCrossChainStatus.mockResolvedValue({
      onChain: { status: 'CROSSING_OUT' },
      database: {
        id: 101,
        status: 'Active',
        crossChainStatus: 'CROSSING_OUT',
        progress: 20,
        targetChain: 'BSC_TESTNET',
      },
    } as any);

    mockQuery.getCrossChainVisitingStatus.mockResolvedValue({ isVisiting: true } as any);
    mockQuery.getActiveCrossChainTravels.mockResolvedValue([
      {
        id: 101,
        frogTokenId: 1,
        frogName: 'GuaGua',
        targetChain: 'BSC_TESTNET',
        crossChainStatus: 'CROSSING_OUT',
        progress: 20,
        startTime: new Date(),
        endTime: new Date(),
      },
    ] as any);

    mockQuery.getCrossChainDiscoveries.mockResolvedValue({
      discoveries: [],
      onChainStats: {
        exploredBlock: null,
        gasUsed: null,
        targetChain: 'BSC_TESTNET',
        exploredAddress: '0x0000000000000000000000000000000000000000',
      },
      summary: {
        total: 0,
        byType: {},
        byRarity: {},
      },
    });

    mockCommand.markCrossChainStarted.mockResolvedValue(undefined as any);
    mockCommand.markCrossChainArrived.mockResolvedValue(undefined as any);
    mockCommand.markCrossChainCompleted.mockResolvedValue(undefined as any);
    mockCommand.syncCrossChainState.mockResolvedValue(undefined as any);
  });

  it('GET /supported-chains delegates to travel.query', async () => {
    const response = await request(app).get('/api/v1/cross-chain/supported-chains');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockQuery.getSupportedCrossChains).toHaveBeenCalled();
  });

  it('POST /travel delegates creation to travel.command', async () => {
    const response = await request(app).post('/api/v1/cross-chain/travel').send({
      frogId: 1,
      tokenId: 1,
      targetChainId: 97,
      duration: 3600,
      ownerAddress: '0xabc0000000000000000000000000000000000001',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockQuery.canStartCrossChainTravel).not.toHaveBeenCalled();
    expect(mockCommand.startLegacyCrossChainTravel).toHaveBeenCalledWith(
      expect.objectContaining({
        frogId: 1,
        tokenId: 1,
        targetChainId: 97,
      })
    );
  });

  it('started/arrived/completed/sync endpoints delegate to travel.command', async () => {
    const started = await request(app)
      .post('/api/v1/cross-chain/travel/101/started')
      .send({ messageId: 'msg-1', txHash: '0xaaa' });

    const arrived = await request(app)
      .post('/api/v1/cross-chain/travel/1/arrived')
      .send({ messageId: 'msg-1' });

    const completed = await request(app)
      .post('/api/v1/cross-chain/travel/1/completed')
      .send({ returnMessageId: 'msg-2', xpEarned: 42, txHash: '0xbbb' });

    const sync = await request(app).post('/api/v1/cross-chain/sync/1').send({});

    expect(started.status).toBe(200);
    expect(arrived.status).toBe(200);
    expect(completed.status).toBe(200);
    expect(sync.status).toBe(200);

    expect(mockCommand.markCrossChainStarted).toHaveBeenCalledWith({
      travelId: 101,
      messageId: 'msg-1',
      txHash: '0xaaa',
    });
    expect(mockCommand.markCrossChainArrived).toHaveBeenCalledWith(
      expect.objectContaining({ tokenId: 1, messageId: 'msg-1' })
    );
    expect(mockCommand.markCrossChainCompleted).toHaveBeenCalledWith({
      tokenId: 1,
      returnMessageId: 'msg-2',
      xpEarned: 42,
      txHash: '0xbbb',
    });
    expect(mockCommand.syncCrossChainState).toHaveBeenCalledWith(1);
  });

  it('status/visiting/active/discoveries endpoints delegate to travel.query', async () => {
    const status = await request(app).get('/api/v1/cross-chain/travel/1/status');
    const visiting = await request(app).get('/api/v1/cross-chain/travel/1/visiting').query({ targetChainId: 97 });
    const active = await request(app).get('/api/v1/cross-chain/active');
    const discoveries = await request(app).get('/api/v1/cross-chain/travel/101/discoveries');

    expect(status.status).toBe(200);
    expect(visiting.status).toBe(200);
    expect(active.status).toBe(200);
    expect(discoveries.status).toBe(200);

    expect(mockQuery.getCrossChainStatus).toHaveBeenCalledWith(1);
    expect(mockQuery.getCrossChainVisitingStatus).toHaveBeenCalledWith(1, 97);
    expect(mockQuery.getActiveCrossChainTravels).toHaveBeenCalled();
    expect(mockQuery.getCrossChainDiscoveries).toHaveBeenCalledWith(101);
  });
});
