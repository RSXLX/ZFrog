import express from 'express';
import request from 'supertest';
import travelsRoutes from '../../api/routes/v1/travels.routes';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import { travelCommandServiceV1 } from '../../modules/travel/travel.command';
import { travelQueryServiceV1 } from '../../modules/travel/travel.query';

jest.mock('../../middlewares/auth.middleware', () => ({
  authRequired: (req: any, _res: any, next: any) => {
    req.user = {
      address: '0xabc0000000000000000000000000000000000001',
      walletAddress: '0xabc0000000000000000000000000000000000001',
    };
    next();
  },
}));

jest.mock('../../modules/travel/travel.command', () => ({
  travelCommandServiceV1: {
    startTravel: jest.fn(),
    completeTravel: jest.fn(),
  },
}));

jest.mock('../../modules/travel/travel.query', () => ({
  travelQueryServiceV1: {
    getTravel: jest.fn(),
  },
}));

describe('V1 Travel Routes E2E', () => {
  const app = express();
  const mockCommand = travelCommandServiceV1 as jest.Mocked<typeof travelCommandServiceV1>;
  const mockQuery = travelQueryServiceV1 as jest.Mocked<typeof travelQueryServiceV1>;

  app.use(express.json());
  app.use('/api/v1/travels', travelsRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();

    mockCommand.startTravel.mockResolvedValue({
      travelId: 101,
      status: 'PENDING',
      currentStage: 'PREPARING',
      progress: 0,
      targetChain: 'ZETACHAIN_ATHENS',
      chainId: 7001,
      endTime: new Date(Date.now() + 3600 * 1000).toISOString(),
    });

    mockQuery.getTravel.mockResolvedValue({
      travelId: 101,
      frogId: 1,
      tokenId: 1,
      frogName: 'GuaGua',
      walletAddress: '0xabc0000000000000000000000000000000000001',
      status: 'ACTIVE',
      currentStage: 'OBSERVING',
      progress: 42,
      travelType: 'cross_chain',
      targetWallet: '0x0000000000000000000000000000000000000000',
      targetChain: 'ZETACHAIN_ATHENS',
      chainId: 7001,
      duration: 3600,
      startTime: new Date(Date.now() - 1000).toISOString(),
      endTime: new Date(Date.now() + 1000).toISOString(),
      completedAt: null,
      updatedAt: new Date().toISOString(),
      souvenirId: null,
      souvenir: null,
      journal: null,
      discoveries: [],
      statusMessages: [],
      companion: null,
      errorMessage: null,
    });

    mockCommand.completeTravel.mockResolvedValue({
      travelId: 101,
      status: 'COMPLETED',
      currentStage: 'COMPLETED',
      progress: 100,
      souvenirId: 88,
      completedAt: new Date().toISOString(),
    });
  });

  it('GET /api/v1/travels/status exposes v1 travel module status', async () => {
    const response = await request(app).get('/api/v1/travels/status');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.module).toBe('travels');
  });

  it('POST /api/v1/travels delegates travel creation to travel.command', async () => {
    const response = await request(app).post('/api/v1/travels').send({
      frogId: 1,
      travelType: 'cross_chain',
      targetChain: 7001,
      duration: 3600,
      companionFrogId: null,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      travelId: 101,
      status: 'PENDING',
      currentStage: 'PREPARING',
    });

    expect(mockCommand.startTravel).toHaveBeenCalledWith({
      frogId: 1,
      walletAddress: '0xabc0000000000000000000000000000000000001',
      travelType: 'cross_chain',
      targetChain: 7001,
      targetAddress: undefined,
      duration: 3600,
      companionFrogId: null,
      source: 'v1_travel_route',
      requestId: undefined,
    });
  });

  it('POST /api/v1/travels validates frogId', async () => {
    const response = await request(app).post('/api/v1/travels').send({
      frogId: 'abc',
      travelType: 'random',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_INPUT');
  });

  it('GET /api/v1/travels/:travelId delegates query to travel.query', async () => {
    const response = await request(app).get('/api/v1/travels/101');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ACTIVE');
    expect(mockQuery.getTravel).toHaveBeenCalledWith({
      travelId: 101,
      walletAddress: '0xabc0000000000000000000000000000000000001',
    });
  });

  it('POST /api/v1/travels/:travelId/complete delegates completion to travel.command', async () => {
    const response = await request(app)
      .post('/api/v1/travels/101/complete')
      .send({ source: 'web' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('COMPLETED');
    expect(mockCommand.completeTravel).toHaveBeenCalledWith({
      travelId: 101,
      walletAddress: '0xabc0000000000000000000000000000000000001',
      source: 'web',
      requestId: undefined,
    });
  });
});
