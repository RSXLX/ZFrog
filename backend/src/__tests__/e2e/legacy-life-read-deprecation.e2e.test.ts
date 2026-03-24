import express from 'express';
import request from 'supertest';
import interactionRoutes from '../../api/routes/interaction.routes';
import nurtureRoutes from '../../api/routes/nurture.routes';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import { prisma } from '../../database';
import { lifeQueryService } from '../../modules/life/life.query';

jest.mock('../../database', () => ({
  prisma: {
    frog: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../modules/life/life.query', () => ({
  lifeQueryService: {
    getLifeByTokenId: jest.fn(),
    getLifeByFrogId: jest.fn(),
  },
}));

jest.mock('../../services/daily-task.service', () => ({
  recordTaskProgress: jest.fn(),
}));

jest.mock('../../services/lily.service', () => ({
  __esModule: true,
  default: {
    buyFood: jest.fn(),
    rewardClean: jest.fn(),
    getBalance: jest.fn(),
  },
}));

describe('Legacy Life Read Deprecation E2E', () => {
  const app = express();
  const mockPrisma = prisma as unknown as {
    frog: {
      findUnique: jest.Mock;
    };
  };
  const mockLifeQuery = lifeQueryService as jest.Mocked<typeof lifeQueryService>;

  app.use(express.json());
  app.use('/api/frogs', interactionRoutes);
  app.use('/api/nurture', nurtureRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma.frog.findUnique.mockResolvedValue({
      lastFedAt: new Date(),
    });

    mockLifeQuery.getLifeByTokenId.mockResolvedValue({
      frogId: 1,
      tokenId: 1,
      name: 'LegacyFrog',
      walletAddress: '0xabc0000000000000000000000000000000000001',
      hunger: 80,
      happiness: 90,
      cleanliness: 85,
      health: 88,
      energy: 84,
      mood: 'HAPPY',
      isSick: false,
      needsClean: false,
      isDormant: false,
      hibernationStatus: 'ACTIVE',
      lifeStage: 'ACTIVE',
      lastCareAt: null,
      lastFedAt: new Date().toISOString(),
      lastInteractedAt: new Date().toISOString(),
      lastStateSyncAt: new Date().toISOString(),
    });

    mockLifeQuery.getLifeByFrogId.mockResolvedValue({
      frogId: 1,
      tokenId: 1,
      name: 'LegacyFrog',
      walletAddress: '0xabc0000000000000000000000000000000000001',
      hunger: 80,
      happiness: 90,
      cleanliness: 85,
      health: 88,
      energy: 84,
      mood: 'HAPPY',
      isSick: false,
      needsClean: false,
      isDormant: false,
      hibernationStatus: 'ACTIVE',
      lifeStage: 'ACTIVE',
      lastCareAt: null,
      lastFedAt: new Date().toISOString(),
      lastInteractedAt: new Date().toISOString(),
      lastStateSyncAt: new Date().toISOString(),
    });
  });

  it('GET /api/frogs/:tokenId/status includes deprecation headers', async () => {
    const response = await request(app).get('/api/frogs/1/status');

    expect(response.status).toBe(200);
    expect(response.header.deprecation).toBe('true');
    expect(response.header['x-api-deprecated']).toBe('true');
    expect(response.header.link).toContain('/api/v1/frogs/:frogId/life');
  });

  it('GET /api/nurture/:frogId/status includes deprecation headers', async () => {
    const response = await request(app).get('/api/nurture/1/status');

    expect(response.status).toBe(200);
    expect(response.header.deprecation).toBe('true');
    expect(response.header['x-api-deprecated']).toBe('true');
    expect(response.header.link).toContain('/api/v1/frogs/:frogId/life');
  });
});
