import express from 'express';
import request from 'supertest';
import v3Routes from '../../api/routes/v3';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import { integrationRegistryService } from '../../platform/integrations/integration-registry.service';
import { resetV3JourneyStoreForTest } from '../../modules/journey/journey.service';
import { resetV3JourneyIncidentStoreForTest } from '../../modules/journey-events/journey-incident.service';
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
    name: 'Seasonal World Lab',
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
  permissions: input.permissions || ['journey.read', 'journey.write'],
});

describe('V3 Journeys Routes E2E', () => {
  const app = express();
  const mockRegistry = integrationRegistryService as jest.Mocked<typeof integrationRegistryService>;
  const originalEnv = {
    V3_RUNTIME_ENABLED: process.env.V3_RUNTIME_ENABLED,
    V3_RUNTIME_KILL_SWITCH: process.env.V3_RUNTIME_KILL_SWITCH,
    V3_RUNTIME_JOURNEY_ENABLED: process.env.V3_RUNTIME_JOURNEY_ENABLED,
    V3_JOURNEY_INCIDENTS_ENABLED: process.env.V3_JOURNEY_INCIDENTS_ENABLED,
  };

  app.use(express.json());
  app.use('/api/v3', v3Routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
    resetV3JourneyStoreForTest();
    resetV3JourneyIncidentStoreForTest();
    process.env.V3_RUNTIME_ENABLED = 'true';
    process.env.V3_RUNTIME_KILL_SWITCH = 'false';
    process.env.V3_RUNTIME_JOURNEY_ENABLED = 'true';
    process.env.V3_JOURNEY_INCIDENTS_ENABLED = 'true';
    jest.clearAllMocks();
    mockRegistry.authenticateKey.mockImplementation(async (secret) => {
      if (String(secret).startsWith('zfi_other')) {
        return buildIntegrationContext({
          appId: 'int_002',
          appSlug: 'other-world-lab',
        });
      }

      return buildIntegrationContext({
        appId: 'int_001',
        appSlug: 'seasonal-world-lab',
      });
    });
  });

  afterAll(() => {
    process.env.V3_RUNTIME_ENABLED = originalEnv.V3_RUNTIME_ENABLED;
    process.env.V3_RUNTIME_KILL_SWITCH = originalEnv.V3_RUNTIME_KILL_SWITCH;
    process.env.V3_RUNTIME_JOURNEY_ENABLED = originalEnv.V3_RUNTIME_JOURNEY_ENABLED;
    process.env.V3_JOURNEY_INCIDENTS_ENABLED = originalEnv.V3_JOURNEY_INCIDENTS_ENABLED;
    resetV3JourneyStoreForTest();
    resetV3JourneyIncidentStoreForTest();
  });

  it('POST/GET/viewer/advance /api/v3/journeys forms a guarded happy path', async () => {
    const createResponse = await request(app)
      .post('/api/v3/journeys')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        slug: 'meteor-rescue-night',
        title: 'Meteor Rescue Night',
        narrativeSeed: 'community rescue',
        partyMembers: [
          '0xabc0000000000000000000000000000000000001',
          '0xabc0000000000000000000000000000000000002',
        ],
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.slug).toBe('meteor-rescue-night');
    expect(createResponse.body.data.steps[0]).toMatchObject({
      id: 'launch',
      status: 'ACTIVE',
    });

    const journeyId = createResponse.body.data.id as string;
    expect(journeyId.startsWith('jrn_')).toBe(true);

    const getResponse = await request(app)
      .get(`/api/v3/journeys/${journeyId}`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial');

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.success).toBe(true);
    expect(getResponse.body.data.id).toBe(journeyId);
    expect(getResponse.body.data.currentStepId).toBe('launch');

    const viewerResponse = await request(app)
      .get(`/api/v3/journeys/${journeyId}/viewer`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send();

    expect(viewerResponse.status).toBe(200);
    expect(viewerResponse.body.success).toBe(true);
    expect(viewerResponse.body.data.progress.totalChapters).toBe(3);
    expect(viewerResponse.body.data.progress.completionPercent).toBe(0);
    expect(viewerResponse.body.data.party.memberCount).toBe(2);
    expect(viewerResponse.body.data.rewards.status).toBe('LOCKED');

    const advanceResponse = await request(app)
      .post(`/api/v3/journeys/${journeyId}/steps/launch/advance`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        reason: 'checkpoint reached',
      });

    expect(advanceResponse.status).toBe(200);
    expect(advanceResponse.body.success).toBe(true);
    expect(advanceResponse.body.data.steps[0]).toMatchObject({
      id: 'launch',
      status: 'COMPLETED',
      settledByActor: 'seasonal-world-lab:ikey_int_001',
      resultNote: 'checkpoint reached',
    });
    expect(advanceResponse.body.data.currentStepId).toBe('midpoint');

    const worldResponse = await request(app)
      .get(`/api/v3/journeys/${journeyId}/world`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial');

    expect(worldResponse.status).toBe(200);
    expect(worldResponse.body.success).toBe(true);
    expect(worldResponse.body.data.journeyId).toBe(journeyId);
    expect(worldResponse.body.data.nodes[0]).toMatchObject({
      stepId: 'launch',
      status: 'CLEARED',
      footprintCount: 1,
    });
    expect(worldResponse.body.data.nodes[1]).toMatchObject({
      stepId: 'midpoint',
      status: 'AVAILABLE',
    });
    expect(worldResponse.body.data.relics[0]).toMatchObject({
      stepId: 'launch',
      status: 'DISCOVERED',
    });
  });

  it('missing integration key is rejected before route logic', async () => {
    const response = await request(app).get('/api/v3/journeys/jrn_abc123');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INTEGRATION_API_KEY_REQUIRED');
  });

  it('journey write routes require journey.write capability', async () => {
    mockRegistry.authenticateKey.mockResolvedValue(
      buildIntegrationContext({
        appId: 'int_001',
        appSlug: 'seasonal-world-lab',
        permissions: ['journey.read'],
      })
    );

    const response = await request(app)
      .post('/api/v3/journeys')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        title: 'Unauthorized Journey',
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INTEGRATION_PERMISSION_DENIED');
    expect(response.body.error.details.module).toBe('journey');
    expect(response.body.error.details.action).toBe('write');
  });

  it('journey reads are scoped to integration app (fail-closed)', async () => {
    const createResponse = await request(app)
      .post('/api/v3/journeys')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        title: 'App Scoped Journey',
      });

    expect(createResponse.status).toBe(201);
    const journeyId = createResponse.body.data.id as string;

    const readByOtherApp = await request(app)
      .get(`/api/v3/journeys/${journeyId}`)
      .set('x-api-key', 'zfi_other.secretmaterial');

    expect(readByOtherApp.status).toBe(404);
    expect(readByOtherApp.body.error.code).toBe('NOT_FOUND');

    const writeByOtherApp = await request(app)
      .post(`/api/v3/journeys/${journeyId}/steps/launch/advance`)
      .set('x-api-key', 'zfi_other.secretmaterial')
      .send({});

    expect(writeByOtherApp.status).toBe(404);
    expect(writeByOtherApp.body.error.code).toBe('NOT_FOUND');

    const worldByOtherApp = await request(app)
      .get(`/api/v3/journeys/${journeyId}/world`)
      .set('x-api-key', 'zfi_other.secretmaterial');

    expect(worldByOtherApp.status).toBe(404);
    expect(worldByOtherApp.body.error.code).toBe('NOT_FOUND');
  });

  it('advance rejects out-of-order step operations', async () => {
    const createResponse = await request(app)
      .post('/api/v3/journeys')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        title: 'Order Guard Journey',
      });

    expect(createResponse.status).toBe(201);
    const journeyId = createResponse.body.data.id as string;

    const response = await request(app)
      .post(`/api/v3/journeys/${journeyId}/steps/midpoint/advance`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        reason: 'skip ahead',
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_STATE');
    expect(response.body.error.details.currentStepId).toBe('launch');
  });

  it('journey settle route still supports explicit failure/skip outcomes', async () => {
    const createResponse = await request(app)
      .post('/api/v3/journeys')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        title: 'Settle Journey',
      });

    expect(createResponse.status).toBe(201);
    const journeyId = createResponse.body.data.id as string;

    const response = await request(app)
      .post(`/api/v3/journeys/${journeyId}/steps/launch/settle`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        result: 'FAILED',
        reason: 'storm blocked extraction',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('SETTLED');
    expect(response.body.data.currentStepId).toBeNull();
    expect(response.body.data.steps[0]).toMatchObject({
      id: 'launch',
      status: 'FAILED',
      resultNote: 'storm blocked extraction',
    });
  });

  it('journey runtime module switch blocks writes when disabled', async () => {
    process.env.V3_RUNTIME_JOURNEY_ENABLED = 'false';

    const response = await request(app)
      .post('/api/v3/journeys')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        title: 'Disabled Journey',
      });

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('V3_MODULE_DISABLED');
    expect(response.body.error.details.module).toBe('journey');
  });

  it('incident trigger/respond creates collaboration outcome and flows back relationship/memory signals', async () => {
    const createResponse = await request(app)
      .post('/api/v3/journeys')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        title: 'Incident Journey',
        partyMembers: [
          '0xabc0000000000000000000000000000000000001',
          '0xabc0000000000000000000000000000000000002',
        ],
      });

    expect(createResponse.status).toBe(201);
    const journeyId = createResponse.body.data.id as string;

    const triggerResponse = await request(app)
      .post(`/api/v3/journeys/${journeyId}/incidents/trigger`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        template: 'METEOR_RESCUE_NIGHT',
        contextNote: 'meteor clusters moving toward launch corridor',
      });

    expect(triggerResponse.status).toBe(201);
    expect(triggerResponse.body.success).toBe(true);
    expect(triggerResponse.body.data.incident.status).toBe('TRIGGERED');
    expect(triggerResponse.body.data.incident.promptTrace.traceId).toContain('trace_');
    const incidentId = triggerResponse.body.data.incident.id as string;

    const respondResponse = await request(app)
      .post(`/api/v3/world-events/${incidentId}/respond`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        decision: 'DEPLOY_RESCUE',
        note: 'dispatch rescue team',
      });

    expect(respondResponse.status).toBe(200);
    expect(respondResponse.body.success).toBe(true);
    expect(respondResponse.body.data.incident.status).toBe('RESOLVED');
    expect(respondResponse.body.data.incident.resolution.outcome).toBe('RESCUED');
    expect(respondResponse.body.data.incident.effects.relationshipSignals.length).toBeGreaterThan(0);
    expect(respondResponse.body.data.incident.effects.memoryFragments.length).toBe(1);
    expect(respondResponse.body.data.journey.currentStepId).toBe('midpoint');

    const listResponse = await request(app)
      .get(`/api/v3/journeys/${journeyId}/incidents`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial');

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data.items).toHaveLength(1);
    expect(listResponse.body.data.items[0]).toMatchObject({
      id: incidentId,
      status: 'RESOLVED',
    });
  });

  it('incident respond is scoped to integration app (fail-closed)', async () => {
    const createResponse = await request(app)
      .post('/api/v3/journeys')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        title: 'Incident Scope Journey',
      });

    expect(createResponse.status).toBe(201);
    const journeyId = createResponse.body.data.id as string;

    const triggerResponse = await request(app)
      .post(`/api/v3/journeys/${journeyId}/incidents/trigger`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        template: 'METEOR_RESCUE_NIGHT',
      });

    expect(triggerResponse.status).toBe(201);
    const incidentId = triggerResponse.body.data.incident.id as string;

    const responseByOtherApp = await request(app)
      .post(`/api/v3/world-events/${incidentId}/respond`)
      .set('x-api-key', 'zfi_other.secretmaterial')
      .send({
        decision: 'HOLD_FORMATION',
      });

    expect(responseByOtherApp.status).toBe(404);
    expect(responseByOtherApp.body.success).toBe(false);
    expect(responseByOtherApp.body.error.code).toBe('NOT_FOUND');
  });

  it('incident trigger falls back to standard step reward when incident engine is disabled', async () => {
    process.env.V3_JOURNEY_INCIDENTS_ENABLED = 'false';

    const createResponse = await request(app)
      .post('/api/v3/journeys')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        title: 'Fallback Incident Journey',
      });

    expect(createResponse.status).toBe(201);
    const journeyId = createResponse.body.data.id as string;

    const triggerResponse = await request(app)
      .post(`/api/v3/journeys/${journeyId}/incidents/trigger`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        template: 'METEOR_RESCUE_NIGHT',
      });

    expect(triggerResponse.status).toBe(201);
    expect(triggerResponse.body.success).toBe(true);
    expect(triggerResponse.body.data.incident.status).toBe('FALLBACK_SETTLED');
    expect(triggerResponse.body.data.incident.resolution.outcome).toBe('FALLBACK_REWARD_APPLIED');
    expect(triggerResponse.body.data.journey.currentStepId).toBe('midpoint');
  });
});
