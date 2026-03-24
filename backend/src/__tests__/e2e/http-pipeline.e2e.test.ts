import express from 'express';
import request from 'supertest';
import healthRoutes from '../../api/routes/health.routes';
import { AppError, errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import { logger } from '../../utils/logger';

describe('HTTP Pipeline E2E', () => {
  let loggerErrorSpy: jest.SpyInstance;

  const app = express();

  app.use('/api/health', healthRoutes);
  app.get('/boom', () => {
    throw new AppError(503, 'maintenance');
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeAll(() => {
    loggerErrorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);
  });

  afterAll(() => {
    loggerErrorSpy.mockRestore();
  });

  it('GET /api/health/ready returns readiness payload', async () => {
    const response = await request(app).get('/api/health/ready');

    expect(response.status).toBe(200);
    expect(response.body.ready).toBe(true);
    expect(typeof response.body.timestamp).toBe('string');
  });

  it('returns 404 payload for unknown routes', async () => {
    const response = await request(app).get('/api/not-exists');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('NOT_FOUND');
    expect(typeof response.body.error).toBe('string');
  });

  it('maps AppError to expected status and error payload', async () => {
    const response = await request(app).get('/boom');

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('maintenance');
    expect(loggerErrorSpy).toHaveBeenCalled();
  });
});
