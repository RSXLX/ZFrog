import express from 'express';
import request from 'supertest';
import v3Routes from '../../api/routes/v3';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import { integrationRegistryService } from '../../platform/integrations/integration-registry.service';
import { resetV3CouncilBriefServiceForTest } from '../../modules/council/council-brief.service';
import { resetV3CouncilSuggestionStoreForTest } from '../../modules/council/council-suggestion.service';
import {
  resetCouncilRiskPolicyForTest,
  setCouncilRiskLevelOverride,
} from '../../modules/council/council-policy.service';
import type {
  AuthenticatedIntegrationContext,
  IntegrationPermissionValue,
} from '../../platform/integrations/integration-registry.service';

jest.mock('../../platform/integrations/integration-registry.service', () => ({
  integrationRegistryService: {
    authenticateKey: jest.fn(),
  },
}));

const buildIntegrationContext = (input: {
  appId: string;
  appSlug: string;
  permissions?: IntegrationPermissionValue[];
}): AuthenticatedIntegrationContext => ({
  app: {
    id: input.appId,
    slug: input.appSlug,
    name: 'Council Integration',
    appType: 'CREATOR',
    status: 'ACTIVE',
  },
  key: {
    id: `ikey_${input.appId}`,
    keyPrefix: 'zfi_abcd1234',
    label: 'preview',
    status: 'ACTIVE',
    issuedBy: '0xabc0000000000000000000000000000000000001',
    issuedAt: '2026-03-23T00:00:00.000Z',
    expiresAt: null,
    lastUsedAt: '2026-03-23T00:10:00.000Z',
  },
  permissions: input.permissions || ['council.read', 'council.write'],
});

describe('V3 Council Routes E2E', () => {
  const app = express();
  const mockRegistry = integrationRegistryService as jest.Mocked<typeof integrationRegistryService>;
  const originalEnv = {
    V3_RUNTIME_ENABLED: process.env.V3_RUNTIME_ENABLED,
    V3_RUNTIME_KILL_SWITCH: process.env.V3_RUNTIME_KILL_SWITCH,
    V3_RUNTIME_COUNCIL_ENABLED: process.env.V3_RUNTIME_COUNCIL_ENABLED,
    V3_COUNCIL_ACTIONS_ENABLED: process.env.V3_COUNCIL_ACTIONS_ENABLED,
    V3_COUNCIL_STORAGE_MODE: process.env.V3_COUNCIL_STORAGE_MODE,
    V3_COUNCIL_BRIEF_ENABLED: process.env.V3_COUNCIL_BRIEF_ENABLED,
    V3_COUNCIL_ALLOW_LOW_RISK: process.env.V3_COUNCIL_ALLOW_LOW_RISK,
    V3_COUNCIL_ALLOW_MEDIUM_RISK: process.env.V3_COUNCIL_ALLOW_MEDIUM_RISK,
    V3_COUNCIL_ALLOW_HIGH_RISK: process.env.V3_COUNCIL_ALLOW_HIGH_RISK,
  };

  app.use(express.json());
  app.use('/api/v3', v3Routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
    resetV3CouncilSuggestionStoreForTest();
    resetV3CouncilBriefServiceForTest();
    process.env.V3_RUNTIME_ENABLED = 'true';
    process.env.V3_RUNTIME_KILL_SWITCH = 'false';
    process.env.V3_RUNTIME_COUNCIL_ENABLED = 'true';
    process.env.V3_COUNCIL_ACTIONS_ENABLED = 'true';
    process.env.V3_COUNCIL_STORAGE_MODE = 'memory';
    process.env.V3_COUNCIL_BRIEF_ENABLED = 'true';
    process.env.V3_COUNCIL_ALLOW_LOW_RISK = 'true';
    process.env.V3_COUNCIL_ALLOW_MEDIUM_RISK = 'true';
    process.env.V3_COUNCIL_ALLOW_HIGH_RISK = 'true';
    resetCouncilRiskPolicyForTest();
    jest.clearAllMocks();
    mockRegistry.authenticateKey.mockImplementation(async (secret) => {
      if (String(secret).startsWith('zfi_other')) {
        return buildIntegrationContext({
          appId: 'int_002',
          appSlug: 'other-council-app',
        });
      }
      return buildIntegrationContext({
        appId: 'int_001',
        appSlug: 'council-app',
      });
    });
  });

  afterAll(() => {
    process.env.V3_RUNTIME_ENABLED = originalEnv.V3_RUNTIME_ENABLED;
    process.env.V3_RUNTIME_KILL_SWITCH = originalEnv.V3_RUNTIME_KILL_SWITCH;
    process.env.V3_RUNTIME_COUNCIL_ENABLED = originalEnv.V3_RUNTIME_COUNCIL_ENABLED;
    process.env.V3_COUNCIL_ACTIONS_ENABLED = originalEnv.V3_COUNCIL_ACTIONS_ENABLED;
    process.env.V3_COUNCIL_STORAGE_MODE = originalEnv.V3_COUNCIL_STORAGE_MODE;
    process.env.V3_COUNCIL_BRIEF_ENABLED = originalEnv.V3_COUNCIL_BRIEF_ENABLED;
    process.env.V3_COUNCIL_ALLOW_LOW_RISK = originalEnv.V3_COUNCIL_ALLOW_LOW_RISK;
    process.env.V3_COUNCIL_ALLOW_MEDIUM_RISK = originalEnv.V3_COUNCIL_ALLOW_MEDIUM_RISK;
    process.env.V3_COUNCIL_ALLOW_HIGH_RISK = originalEnv.V3_COUNCIL_ALLOW_HIGH_RISK;
    resetCouncilRiskPolicyForTest();
    resetV3CouncilSuggestionStoreForTest();
    resetV3CouncilBriefServiceForTest();
  });

  it('create/list/respond council suggestions forms a guarded happy path', async () => {
    const createResponse = await request(app)
      .post('/api/v3/council/suggestions')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        focus: 'starlight rescue operation',
        objective: 'recover lost relics with minimal risk',
        dataSources: [
          {
            source: 'journey.viewer.summary',
            referenceId: 'jrn_001',
            freshness: '2026-03-23T00:00:00.000Z',
          },
        ],
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.status).toBe('OPEN');
    expect(createResponse.body.data.trace.promptKitVersion).toBe('v3-council-suggest-v1');
    expect(createResponse.body.data.dataSources).toHaveLength(1);

    const suggestionId = createResponse.body.data.id as string;

    const listResponse = await request(app)
      .get('/api/v3/council/suggestions')
      .query({ limit: 10 })
      .set('x-api-key', 'zfi_abcd1234.secretmaterial');

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data.total).toBe(1);
    expect(listResponse.body.data.items[0]).toMatchObject({
      id: suggestionId,
      status: 'OPEN',
    });

    const getResponse = await request(app)
      .get(`/api/v3/council/suggestions/${suggestionId}`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial');

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.success).toBe(true);
    expect(getResponse.body.data.id).toBe(suggestionId);

    const respondResponse = await request(app)
      .post(`/api/v3/council/suggestions/${suggestionId}/respond`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        decision: 'ACCEPT',
        note: 'ship with guarded rollout',
      });

    expect(respondResponse.status).toBe(200);
    expect(respondResponse.body.success).toBe(true);
    expect(respondResponse.body.data.status).toBe('ACCEPTED');
    expect(respondResponse.body.data.response).toMatchObject({
      decision: 'ACCEPT',
      note: 'ship with guarded rollout',
    });
  });

  it('missing integration key is rejected before council route logic', async () => {
    const response = await request(app).get('/api/v3/council/suggestions');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INTEGRATION_API_KEY_REQUIRED');
  });

  it('council write routes require council.write capability', async () => {
    mockRegistry.authenticateKey.mockResolvedValue(
      buildIntegrationContext({
        appId: 'int_001',
        appSlug: 'council-app',
        permissions: ['council.read'],
      })
    );

    const response = await request(app)
      .post('/api/v3/council/suggestions')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        focus: 'write capability missing',
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INTEGRATION_PERMISSION_DENIED');
    expect(response.body.error.details.module).toBe('council');
    expect(response.body.error.details.action).toBe('write');
  });

  it('council brief route is throttled and can be paused via preference toggle', async () => {
    const createResponse = await request(app)
      .post('/api/v3/council/suggestions')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        focus: 'weekly planning',
      });

    expect(createResponse.status).toBe(201);

    const firstBriefResponse = await request(app)
      .get('/api/v3/council/brief')
      .query({ channel: 'desktop' })
      .set('x-api-key', 'zfi_abcd1234.secretmaterial');

    expect(firstBriefResponse.status).toBe(200);
    expect(firstBriefResponse.body.success).toBe(true);
    expect(firstBriefResponse.body.data.delivery.channel).toBe('desktop');
    expect(firstBriefResponse.body.data.delivery.status).toBe('DELIVERED');
    expect(firstBriefResponse.body.data.delivery.shouldNotify).toBe(true);
    expect(firstBriefResponse.body.data.metrics.open).toBe(1);

    const secondBriefResponse = await request(app)
      .get('/api/v3/council/brief')
      .query({ channel: 'desktop' })
      .set('x-api-key', 'zfi_abcd1234.secretmaterial');

    expect(secondBriefResponse.status).toBe(200);
    expect(secondBriefResponse.body.data.delivery.status).toBe('THROTTLED');
    expect(secondBriefResponse.body.data.delivery.shouldNotify).toBe(false);
    expect(secondBriefResponse.body.data.delivery.nextAllowedAt).toBeTruthy();

    const updatePreferenceResponse = await request(app)
      .post('/api/v3/council/brief/preferences')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        channels: {
          desktop: false,
        },
      });

    expect(updatePreferenceResponse.status).toBe(200);
    expect(updatePreferenceResponse.body.success).toBe(true);
    expect(updatePreferenceResponse.body.data.channels.desktop).toBe(false);

    const disabledBriefResponse = await request(app)
      .get('/api/v3/council/brief')
      .query({ channel: 'desktop' })
      .set('x-api-key', 'zfi_abcd1234.secretmaterial');

    expect(disabledBriefResponse.status).toBe(200);
    expect(disabledBriefResponse.body.data.delivery.status).toBe('DISABLED');
    expect(disabledBriefResponse.body.data.delivery.shouldNotify).toBe(false);
  });

  it('council brief preferences write endpoint requires council.write capability', async () => {
    mockRegistry.authenticateKey.mockResolvedValue(
      buildIntegrationContext({
        appId: 'int_001',
        appSlug: 'council-app',
        permissions: ['council.read'],
      })
    );

    const response = await request(app)
      .post('/api/v3/council/brief/preferences')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        enabled: false,
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INTEGRATION_PERMISSION_DENIED');
    expect(response.body.error.details.module).toBe('council');
    expect(response.body.error.details.action).toBe('write');
  });

  it('council suggestions are scoped to integration app (fail-closed)', async () => {
    const createResponse = await request(app)
      .post('/api/v3/council/suggestions')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        focus: 'scope test',
      });

    expect(createResponse.status).toBe(201);
    const suggestionId = createResponse.body.data.id as string;

    const readByOtherApp = await request(app)
      .get(`/api/v3/council/suggestions/${suggestionId}`)
      .set('x-api-key', 'zfi_other.secretmaterial');

    expect(readByOtherApp.status).toBe(404);
    expect(readByOtherApp.body.error.code).toBe('NOT_FOUND');
  });

  it('council runtime module switch blocks writes when disabled', async () => {
    process.env.V3_RUNTIME_COUNCIL_ENABLED = 'false';

    const response = await request(app)
      .post('/api/v3/council/suggestions')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        focus: 'disabled module',
      });

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('V3_MODULE_DISABLED');
    expect(response.body.error.details.module).toBe('council');
  });

  it('council brief delivery can be fail-closed by env kill switch', async () => {
    process.env.V3_COUNCIL_BRIEF_ENABLED = 'false';

    const response = await request(app)
      .get('/api/v3/council/brief')
      .query({ channel: 'mobile_lite' })
      .set('x-api-key', 'zfi_abcd1234.secretmaterial');

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('COUNCIL_BRIEF_DISABLED');
  });

  it('council actions kill switch blocks create/respond operations', async () => {
    process.env.V3_COUNCIL_ACTIONS_ENABLED = 'false';

    const createResponse = await request(app)
      .post('/api/v3/council/suggestions')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        focus: 'disabled actions',
      });

    expect(createResponse.status).toBe(503);
    expect(createResponse.body.error.code).toBe('COUNCIL_ACTIONS_DISABLED');
  });

  it('respond cannot be replayed once suggestion is resolved', async () => {
    const createResponse = await request(app)
      .post('/api/v3/council/suggestions')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        focus: 'single decision guard',
      });

    expect(createResponse.status).toBe(201);
    const suggestionId = createResponse.body.data.id as string;

    const firstResponse = await request(app)
      .post(`/api/v3/council/suggestions/${suggestionId}/respond`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        decision: 'DEFER',
      });

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body.data.status).toBe('DEFERRED');

    const secondResponse = await request(app)
      .post(`/api/v3/council/suggestions/${suggestionId}/respond`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        decision: 'ACCEPT',
      });

    expect(secondResponse.status).toBe(409);
    expect(secondResponse.body.error.code).toBe('INVALID_STATE');
  });

  it('risk-level policy blocks disabled suggestion risk classes', async () => {
    setCouncilRiskLevelOverride({
      riskLevel: 'HIGH',
      enabled: false,
      updatedBy: '0xadmin',
      reason: 'pause-high-risk-suggestions',
    });

    const response = await request(app)
      .post('/api/v3/council/suggestions')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        focus: 'high risk suggestion should be blocked',
        riskLevel: 'HIGH',
      });

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('COUNCIL_RISK_LEVEL_DISABLED');
    expect(response.body.error.details.riskLevel).toBe('HIGH');
  });
});
