import express from 'express';
import request from 'supertest';
import memoryRoutes from '../../api/routes/v1/memory.routes';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import { memoryPalaceQueryService } from '../../modules/memory-palace/memory-palace.query';

jest.mock('../../middlewares/auth.middleware', () => ({
  authOptional: (req: any, _res: any, next: any) => {
    req.user = {
      address: '0xabc0000000000000000000000000000000000001',
      walletAddress: '0xabc0000000000000000000000000000000000001',
    };
    next();
  },
}));

jest.mock('../../modules/memory-palace/memory-palace.query', () => ({
  memoryPalaceQueryService: {
    getByFrogId: jest.fn(),
  },
}));

describe('V1 Memory Routes E2E', () => {
  const app = express();
  const mockMemoryQuery = memoryPalaceQueryService as jest.Mocked<typeof memoryPalaceQueryService>;

  app.use(express.json());
  app.use('/api/v1/memory-palaces', memoryRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();
    mockMemoryQuery.getByFrogId.mockResolvedValue({
      id: '11',
      frogId: 1,
      frog: {
        id: 1,
        tokenId: 101,
        name: '呱呱',
        ownerAddress: '0xabc0000000000000000000000000000000000001',
        birthday: new Date('2025-01-01T00:00:00.000Z').toISOString(),
        totalTravels: 3,
        status: 'Idle',
        xp: 12,
        level: 2,
      },
      title: '海风中的第一次远行',
      summary: '呱呱第一次穿越到目标链并带回纪念品',
      journal: {
        title: '旅行日志',
        content: '今天我看见了新的链上世界。',
        mood: 'EXCITED',
      },
      souvenir: {
        id: 88,
        name: '潮汐碎片',
      },
      highlights: ['带回纪念品：潮汐碎片'],
      comments: [],
      timeline: [],
      updatedAt: new Date().toISOString(),
    });
  });

  it('GET /api/v1/memory-palaces/status exposes memory module status', async () => {
    const response = await request(app).get('/api/v1/memory-palaces/status');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.module).toBe('memory-palaces');
  });

  it('GET /api/v1/memory-palaces/:id delegates query to memory-palace.query', async () => {
    const response = await request(app).get('/api/v1/memory-palaces/1');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('海风中的第一次远行');
    expect(mockMemoryQuery.getByFrogId).toHaveBeenCalledWith(
      1,
      '0xabc0000000000000000000000000000000000001'
    );
  });

  it('GET /api/v1/memory-palaces/:id validates positive integer id', async () => {
    const response = await request(app).get('/api/v1/memory-palaces/not-a-number');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_INPUT');
  });
});
