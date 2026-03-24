import express from 'express';
import request from 'supertest';
import lifeRoutes from '../../api/routes/v1/life.routes';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import { lifeQueryService } from '../../modules/life/life.query';
import { lifeCommandService } from '../../modules/life/life.command';
import { dormancyService } from '../../modules/life/dormancy.service';

jest.mock('../../middlewares/auth.middleware', () => ({
  authRequired: (req: any, _res: any, next: any) => {
    req.user = {
      address: '0xabc0000000000000000000000000000000000001',
      walletAddress: '0xabc0000000000000000000000000000000000001',
    };
    next();
  },
}));

jest.mock('../../modules/life/life.query', () => ({
  lifeQueryService: {
    getLifeByFrogId: jest.fn(),
    getLifeByTokenId: jest.fn(),
  },
}));

jest.mock('../../modules/life/life.command', () => ({
  lifeCommandService: {
    feed: jest.fn(),
    clean: jest.fn(),
    play: jest.fn(),
    heal: jest.fn(),
    startRest: jest.fn(),
    endRest: jest.fn(),
    syncDormancyStatus: jest.fn(),
  },
}));

jest.mock('../../modules/life/dormancy.service', () => ({
  dormancyService: {
    getRevivalCostWithDiscount: jest.fn(),
    reviveDormant: jest.fn(),
    blessDormant: jest.fn(),
  },
}));

jest.mock('../../modules/life/egg.query', () => ({
  eggQueryService: {
    getEggLifecycle: jest.fn(),
  },
}));

describe('V1 Life Routes E2E', () => {
  const app = express();
  const mockLifeQuery = lifeQueryService as jest.Mocked<typeof lifeQueryService>;
  const mockLifeCommand = lifeCommandService as jest.Mocked<typeof lifeCommandService>;
  const mockDormancy = dormancyService as jest.Mocked<typeof dormancyService>;

  const baseLife = {
    frogId: 1,
    tokenId: 1,
    name: 'GuaGua',
    walletAddress: '0xabc0000000000000000000000000000000000001',
    hunger: 80,
    happiness: 70,
    cleanliness: 90,
    health: 95,
    energy: 88,
    mood: 'happy',
    isSick: false,
    needsClean: false,
    isDormant: false,
    hibernationStatus: 'ACTIVE' as const,
    lifeStage: 'ACTIVE',
    lastCareAt: null,
    lastFedAt: null,
    lastInteractedAt: null,
    lastStateSyncAt: new Date().toISOString(),
  };

  app.use(express.json());
  app.use('/api/v1/frogs', lifeRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();

    mockLifeQuery.getLifeByFrogId.mockResolvedValue(baseLife);

    mockLifeCommand.feed.mockResolvedValue({
      hunger: 90,
      happiness: 75,
      cleanliness: 90,
      health: 95,
      energy: 92,
      mood: 'happy',
      isSick: false,
      needsClean: false,
      isDormant: false,
      hibernationStatus: 'ACTIVE',
      foodType: 'BUG_BENTO',
      quantity: 1,
      foodEffects: { hunger: 25, energy: 5, happiness: 0 },
    });
    mockLifeCommand.clean.mockResolvedValue({
      hunger: 80,
      happiness: 70,
      cleanliness: 100,
      health: 95,
      energy: 88,
      mood: 'calm',
      isSick: false,
      needsClean: false,
      isDormant: false,
      hibernationStatus: 'ACTIVE',
    });
    mockLifeCommand.play.mockResolvedValue({
      hunger: 80,
      happiness: 85,
      cleanliness: 90,
      health: 95,
      energy: 84,
      mood: 'happy',
      isSick: false,
      needsClean: false,
      isDormant: false,
      hibernationStatus: 'ACTIVE',
      gameType: 'guess',
      happinessGain: 10,
    });
    mockLifeCommand.heal.mockResolvedValue({
      hunger: 80,
      happiness: 70,
      cleanliness: 90,
      health: 100,
      energy: 88,
      mood: 'calm',
      isSick: false,
      needsClean: false,
      isDormant: false,
      hibernationStatus: 'ACTIVE',
    });
    mockLifeCommand.startRest.mockResolvedValue({
      started: true,
      message: 'Frog started resting',
    });
    mockLifeCommand.endRest.mockResolvedValue({
      ended: true,
      energyGain: 30,
      message: 'Frog restored +30 energy',
      state: {
        hunger: 80,
        happiness: 70,
        cleanliness: 90,
        health: 95,
        energy: 100,
        mood: 'calm',
        isSick: false,
        needsClean: false,
        isDormant: false,
        hibernationStatus: 'ACTIVE',
      },
    });
    mockLifeCommand.syncDormancyStatus.mockResolvedValue({
      hibernationStatus: 'ACTIVE',
      changed: false,
    });
    mockDormancy.getRevivalCostWithDiscount.mockResolvedValue({
      baseCost: 100,
      discount: 15,
      finalCost: 85,
      blessings: 1,
    });
    mockDormancy.reviveDormant.mockResolvedValue({
      success: true,
      message: '青蛙已成功唤醒',
      cost: 85,
    });
    mockDormancy.blessDormant.mockResolvedValue({
      success: true,
      message: '成功祈福',
      blessingsReceived: 2,
      blesserEnergy: 70,
    });
  });

  it('GET /api/v1/frogs/:frogId/life returns unified life read model', async () => {
    const response = await request(app).get('/api/v1/frogs/1/life');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      hunger: 80,
      happiness: 70,
      cleanliness: 90,
      health: 95,
      energy: 88,
      hibernationStatus: 'ACTIVE',
    });
    expect(mockLifeQuery.getLifeByFrogId).toHaveBeenCalledWith(1, '0xabc0000000000000000000000000000000000001');
  });

  it('POST /api/v1/frogs/:frogId/care/feed delegates to life.command.feed', async () => {
    const response = await request(app)
      .post('/api/v1/frogs/1/care/feed')
      .send({ foodType: 'bug_bento', quantity: 1, source: 'web' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.foodType).toBe('BUG_BENTO');
    expect(mockLifeCommand.feed).toHaveBeenCalled();
  });

  it('POST /api/v1/frogs/:frogId/care/clean delegates to life.command.clean', async () => {
    const response = await request(app)
      .post('/api/v1/frogs/1/care/clean')
      .send({ source: 'web' });

    expect(response.status).toBe(200);
    expect(response.body.data.cleanliness).toBe(100);
    expect(mockLifeCommand.clean).toHaveBeenCalled();
  });

  it('POST /api/v1/frogs/:frogId/care/play delegates to life.command.play', async () => {
    const response = await request(app)
      .post('/api/v1/frogs/1/care/play')
      .send({ gameType: 'guess', score: 120 });

    expect(response.status).toBe(200);
    expect(response.body.data.happinessGain).toBe(10);
    expect(mockLifeCommand.play).toHaveBeenCalled();
  });

  it('POST /api/v1/frogs/:frogId/care/heal delegates to life.command.heal', async () => {
    const response = await request(app)
      .post('/api/v1/frogs/1/care/heal')
      .send({ source: 'web' });

    expect(response.status).toBe(200);
    expect(response.body.data.health).toBe(100);
    expect(mockLifeCommand.heal).toHaveBeenCalled();
  });

  it('POST /api/v1/frogs/:frogId/care/rest/start and end delegate to rest commands', async () => {
    const startResp = await request(app).post('/api/v1/frogs/1/care/rest/start').send({ source: 'web' });
    const endResp = await request(app).post('/api/v1/frogs/1/care/rest/end').send({ source: 'web' });

    expect(startResp.status).toBe(200);
    expect(endResp.status).toBe(200);
    expect(mockLifeCommand.startRest).toHaveBeenCalled();
    expect(mockLifeCommand.endRest).toHaveBeenCalled();
  });

  it('GET /api/v1/frogs/:frogId/hibernation and revival-cost use dormancy lifecycle', async () => {
    mockLifeQuery.getLifeByFrogId.mockResolvedValue({
      ...baseLife,
      hibernationStatus: 'SLEEPING',
      isDormant: true,
      mood: 'dormant',
    });

    const statusResp = await request(app).get('/api/v1/frogs/1/hibernation');
    const costResp = await request(app).get('/api/v1/frogs/1/hibernation/revival-cost');

    expect(statusResp.status).toBe(200);
    expect(statusResp.body.data.hibernationStatus).toBeDefined();
    expect(costResp.status).toBe(200);
    expect(costResp.body.data.finalCost).toBe(85);
    expect(mockLifeCommand.syncDormancyStatus).toHaveBeenCalled();
    expect(mockDormancy.getRevivalCostWithDiscount).toHaveBeenCalled();
  });

  it('POST /api/v1/frogs/:frogId/hibernation/revive delegates to dormancyService', async () => {
    const response = await request(app).post('/api/v1/frogs/1/hibernation/revive').send({});

    expect(response.status).toBe(200);
    expect(response.body.data.success).toBe(true);
    expect(mockDormancy.reviveDormant).toHaveBeenCalledWith(1, '0xabc0000000000000000000000000000000000001', undefined);
  });

  it('POST /api/v1/frogs/:frogId/hibernation/bless validates verificationId and delegates', async () => {
    const badResp = await request(app)
      .post('/api/v1/frogs/1/hibernation/bless')
      .send({ blesserFrogId: 9 });
    expect(badResp.status).toBe(400);

    const okResp = await request(app)
      .post('/api/v1/frogs/1/hibernation/bless')
      .send({ blesserFrogId: 9, verificationId: 'verify-1' });

    expect(okResp.status).toBe(200);
    expect(okResp.body.success).toBe(true);
    expect(mockDormancy.blessDormant).toHaveBeenCalledWith({
      blesserFrogId: 9,
      targetFrogId: 1,
      walletAddress: '0xabc0000000000000000000000000000000000001',
      verificationId: 'verify-1',
      requestId: undefined,
    });
  });
});
