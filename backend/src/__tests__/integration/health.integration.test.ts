import express from 'express';
import request from 'supertest';
import healthRoutes from '../../api/routes/health.routes';

describe('Health Route Integration', () => {
  const app = express();
  app.use('/api/health', healthRoutes);

  it('GET /api/health returns service health payload', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('zetafrog-backend');
    expect(response.body.version).toBe('1.0.0');
    expect(typeof response.body.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
  });
});
