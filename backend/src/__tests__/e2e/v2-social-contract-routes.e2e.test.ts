import express from 'express';
import request from 'supertest';
import v2Routes from '../../api/routes/v2';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';

jest.mock('../../middlewares/auth.middleware', () => ({
  authRequired: (req: any, _res: any, next: any) => {
    req.user = {
      address: '0xabc0000000000000000000000000000000000001',
      walletAddress: '0xabc0000000000000000000000000000000000001',
    };
    next();
  },
}));

const ROLLOUT_ENV_KEYS = [
  'V2_SOCIAL_ROLLOUT_ENABLED',
  'V2_SOCIAL_ROLLOUT_PERCENT',
  'V2_SOCIAL_FORCE_FALLBACK',
  'V2_SOCIAL_ROLLOUT_SALT',
] as const;

const originalRolloutEnv = ROLLOUT_ENV_KEYS.reduce<Record<string, string | undefined>>(
  (acc, key) => {
    acc[key] = process.env[key];
    return acc;
  },
  {}
);

const applyDefaultRolloutEnv = () => {
  process.env.V2_SOCIAL_ROLLOUT_ENABLED = 'true';
  process.env.V2_SOCIAL_ROLLOUT_PERCENT = '100';
  process.env.V2_SOCIAL_FORCE_FALLBACK = 'false';
  process.env.V2_SOCIAL_ROLLOUT_SALT = 'test-social-rollout';
};

describe('V2 Social Contract Routes E2E', () => {
  const app = express();

  app.use(express.json());
  app.use('/api/v2', v2Routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
    applyDefaultRolloutEnv();
  });

  afterAll(() => {
    for (const key of ROLLOUT_ENV_KEYS) {
      const value = originalRolloutEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('GET /api/v2/health returns contract-ready metadata', async () => {
    const response = await request(app).get('/api/v2/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.api).toBe('v2');
    expect(response.body.data.status).toBe('contract-ready');
    expect(response.body.data.contractVersion).toBe('2026-03-22');
    expect(response.body.data.socialRollout.rolloutPercent).toBe(100);
  });

  it('POST /api/v2/communities/:id/join validates role and frogId', async () => {
    const response = await request(app).post('/api/v2/communities/1/join').send({
      frogId: 'x',
      role: 'owner',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('COMMUNITY_INVALID_INPUT');
  });

  it('POST /api/v2/attestations/relationship validates relationship payload', async () => {
    const invalid = await request(app).post('/api/v2/attestations/relationship').send({
      subjectFrogId: 1,
      objectFrogId: 1,
      attestationType: 'blessing',
    });

    expect(invalid.status).toBe(400);
    expect(invalid.body.success).toBe(false);
    expect(invalid.body.error.code).toBe('ATTESTATION_INVALID_INPUT');

    const invalidEvidence = await request(app).post('/api/v2/attestations/relationship').send({
      subjectFrogId: 1,
      objectFrogId: 2,
      attestationType: 'blessing',
      evidence: 'invalid',
    });

    expect(invalidEvidence.status).toBe(400);
    expect(invalidEvidence.body.success).toBe(false);
    expect(invalidEvidence.body.error.code).toBe('ATTESTATION_INVALID_INPUT');
  });

  it('POST /api/v2/families applies write rate limit for burst traffic', async () => {
    const responses = [];

    for (let i = 0; i < 7; i += 1) {
      const response = await request(app).post('/api/v2/families').send({
        name: 'x',
        ownerFrogId: 0,
      });
      responses.push(response);
    }

    const limited = responses.find((resp) => resp.status === 429);
    expect(limited).toBeDefined();
    expect(limited?.body.success).toBe(false);
    expect(limited?.body.error.code).toBe('FAMILY_RATE_LIMITED');
  });

  it('POST /api/v2/families is blocked when fallback switch is enabled', async () => {
    process.env.V2_SOCIAL_FORCE_FALLBACK = 'true';

    const response = await request(app).post('/api/v2/families').send({
      name: 'Fallback Switch',
      ownerFrogId: 123,
    });

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('V2_SOCIAL_ROLLOUT_BLOCKED');
    expect(response.body.error.details.reason).toBe('force_fallback');
  });

  it('POST /api/v2/families is blocked when wallet is outside rollout bucket', async () => {
    process.env.V2_SOCIAL_ROLLOUT_PERCENT = '0';

    const response = await request(app).post('/api/v2/families').send({
      name: 'Rollout Bucket',
      ownerFrogId: 123,
    });

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('V2_SOCIAL_ROLLOUT_BLOCKED');
    expect(response.body.error.details.reason).toBe('rollout_blocked');
  });

  it('GET /api/v2/families/status exposes rollout snapshot for observability', async () => {
    process.env.V2_SOCIAL_ROLLOUT_PERCENT = '25';

    const response = await request(app)
      .get('/api/v2/families/status')
      .set('x-wallet-address', '0xabc0000000000000000000000000000000000001');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.rollout.enabled).toBe(true);
    expect(response.body.data.rollout.rolloutPercent).toBe(25);
    expect(typeof response.body.data.rollout.walletBucket).toBe('number');
    expect(typeof response.body.data.rollout.walletEligible).toBe('boolean');
  });

  it('GET /api/v2/frogs/:frogId/relationship-memory validates route params', async () => {
    const invalidFrogId = await request(app).get('/api/v2/frogs/not-a-number/relationship-memory');
    expect(invalidFrogId.status).toBe(400);
    expect(invalidFrogId.body.success).toBe(false);
    expect(invalidFrogId.body.error.code).toBe('INVALID_INPUT');

    const invalidTimelineLimit = await request(app).get('/api/v2/frogs/1/relationship-memory?timelineLimit=NaN');
    expect(invalidTimelineLimit.status).toBe(400);
    expect(invalidTimelineLimit.body.success).toBe(false);
    expect(invalidTimelineLimit.body.error.code).toBe('INVALID_INPUT');
  });
});
