import express from 'express';
import request from 'supertest';
import socialRoutes from '../../api/routes/v1/social.routes';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import { ritualService } from '../../modules/social/ritual.service';

jest.mock('../../middlewares/auth.middleware', () => ({
  authRequired: (req: any, _res: any, next: any) => {
    req.user = {
      address: '0xabc0000000000000000000000000000000000001',
      walletAddress: '0xabc0000000000000000000000000000000000001',
    };
    next();
  },
}));

jest.mock('../../modules/social/ritual.service', () => ({
  ritualService: {
    createRitual: jest.fn(),
  },
}));

describe('V1 Social Routes E2E', () => {
  const app = express();
  const mockRitualService = ritualService as jest.Mocked<typeof ritualService>;

  app.use(express.json());
  app.use('/api/v1/social', socialRoutes);
  app.use('/api/v1/rituals', socialRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();

    mockRitualService.createRitual.mockResolvedValue({
      type: 'blessing',
      success: true,
      message: '成功祈福',
      blessingsReceived: 2,
      blesserEnergy: 90,
    });
  });

  it('GET /api/v1/social/status returns module status', async () => {
    const response = await request(app).get('/api/v1/social/status');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.module).toBe('social');
    expect(response.body.data.nextIssue).toBe('V1-I13');
  });

  it('POST /api/v1/rituals delegates to ritualService.createRitual', async () => {
    const response = await request(app).post('/api/v1/rituals').send({
      type: 'blessing',
      targetFrogId: 1,
      initiatorFrogId: 9,
      verificationId: 'verify-001',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.success).toBe(true);

    expect(mockRitualService.createRitual).toHaveBeenCalledWith({
      type: 'blessing',
      targetFrogId: 1,
      initiatorFrogId: 9,
      travelId: undefined,
      verificationId: 'verify-001',
      walletAddress: '0xabc0000000000000000000000000000000000001',
      requestId: undefined,
      source: 'v1_social_routes',
    });
  });

  it('POST /api/v1/social/rituals validates blessing payload', async () => {
    const response = await request(app).post('/api/v1/social/rituals').send({
      type: 'blessing',
      initiatorFrogId: 9,
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_INPUT');
  });
});
