import { createHmac } from 'crypto';
import express from 'express';
import request from 'supertest';
import v3Routes from '../../api/routes/v3';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import { integrationRegistryService } from '../../platform/integrations/integration-registry.service';
import { resetV3PartnerCampaignStoreForTest } from '../../modules/partners/partner-campaign.service';
import type {
  AuthenticatedIntegrationContext,
  IntegrationPermissionValue,
} from '../../platform/integrations/integration-registry.service';

jest.mock('../../platform/integrations/integration-registry.service', () => ({
  integrationRegistryService: {
    authenticateKey: jest.fn(),
  },
}));

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  return `{${entries
    .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
    .join(',')}}`;
};

const computeSignature = (secret: string, timestamp: string, payload: Record<string, unknown>): string => {
  const message = `${timestamp}.${stableStringify(payload)}`;
  return createHmac('sha256', secret).update(message).digest('hex');
};

const buildIntegrationContext = (input: {
  appId: string;
  appSlug: string;
  permissions: IntegrationPermissionValue[];
}): AuthenticatedIntegrationContext => ({
  app: {
    id: input.appId,
    slug: input.appSlug,
    name: 'Partner Campaign App',
    appType: 'PARTNER',
    status: 'ACTIVE',
  },
  key: {
    id: `ikey_${input.appId}`,
    keyPrefix: 'zfi_partner',
    label: 'partner-runtime',
    status: 'ACTIVE',
    issuedBy: '0xabc0000000000000000000000000000000000001',
    issuedAt: '2026-03-24T00:00:00.000Z',
    expiresAt: null,
    lastUsedAt: '2026-03-24T00:10:00.000Z',
  },
  permissions: input.permissions,
});

describe('V3 Partner Routes E2E', () => {
  const app = express();
  const mockRegistry = integrationRegistryService as jest.Mocked<typeof integrationRegistryService>;
  const originalEnv = {
    V3_RUNTIME_ENABLED: process.env.V3_RUNTIME_ENABLED,
    V3_RUNTIME_KILL_SWITCH: process.env.V3_RUNTIME_KILL_SWITCH,
    V3_RUNTIME_PARTNER_ENABLED: process.env.V3_RUNTIME_PARTNER_ENABLED,
    V3_PARTNER_STORAGE_MODE: process.env.V3_PARTNER_STORAGE_MODE,
    V3_PARTNER_CAMPAIGN_RUNTIME_ENABLED: process.env.V3_PARTNER_CAMPAIGN_RUNTIME_ENABLED,
    V3_PARTNER_CAMPAIGN_PUBLISH_ENABLED: process.env.V3_PARTNER_CAMPAIGN_PUBLISH_ENABLED,
    V3_PARTNER_CAMPAIGN_PAUSE_ENABLED: process.env.V3_PARTNER_CAMPAIGN_PAUSE_ENABLED,
    V3_PARTNER_CAMPAIGN_RESUME_ENABLED: process.env.V3_PARTNER_CAMPAIGN_RESUME_ENABLED,
    V3_PARTNER_CALLBACKS_ENABLED: process.env.V3_PARTNER_CALLBACKS_ENABLED,
    V3_PARTNER_REWARD_RECORD_ENABLED: process.env.V3_PARTNER_REWARD_RECORD_ENABLED,
    V3_PARTNER_CALLBACK_MAX_SKEW_SECONDS: process.env.V3_PARTNER_CALLBACK_MAX_SKEW_SECONDS,
  };

  app.use(express.json());
  app.use('/api/v3', v3Routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
    process.env.V3_RUNTIME_ENABLED = 'true';
    process.env.V3_RUNTIME_KILL_SWITCH = 'false';
    process.env.V3_RUNTIME_PARTNER_ENABLED = 'true';
    process.env.V3_PARTNER_STORAGE_MODE = 'memory';
    process.env.V3_PARTNER_CAMPAIGN_RUNTIME_ENABLED = 'true';
    process.env.V3_PARTNER_CAMPAIGN_PUBLISH_ENABLED = 'true';
    process.env.V3_PARTNER_CAMPAIGN_PAUSE_ENABLED = 'true';
    process.env.V3_PARTNER_CAMPAIGN_RESUME_ENABLED = 'true';
    process.env.V3_PARTNER_CALLBACKS_ENABLED = 'true';
    process.env.V3_PARTNER_REWARD_RECORD_ENABLED = 'true';
    process.env.V3_PARTNER_CALLBACK_MAX_SKEW_SECONDS = '600';

    resetV3PartnerCampaignStoreForTest();
    jest.clearAllMocks();

    mockRegistry.authenticateKey.mockImplementation(async (secret) => {
      const key = String(secret);
      if (key.startsWith('zfi_partner_other')) {
        return buildIntegrationContext({
          appId: 'int_partner_002',
          appSlug: 'partner-secondary',
          permissions: ['partner.campaign.write'],
        });
      }

      return buildIntegrationContext({
        appId: 'int_partner_001',
        appSlug: 'partner-primary',
        permissions: ['partner.campaign.write'],
      });
    });
  });

  afterAll(() => {
    process.env.V3_RUNTIME_ENABLED = originalEnv.V3_RUNTIME_ENABLED;
    process.env.V3_RUNTIME_KILL_SWITCH = originalEnv.V3_RUNTIME_KILL_SWITCH;
    process.env.V3_RUNTIME_PARTNER_ENABLED = originalEnv.V3_RUNTIME_PARTNER_ENABLED;
    process.env.V3_PARTNER_STORAGE_MODE = originalEnv.V3_PARTNER_STORAGE_MODE;
    process.env.V3_PARTNER_CAMPAIGN_RUNTIME_ENABLED = originalEnv.V3_PARTNER_CAMPAIGN_RUNTIME_ENABLED;
    process.env.V3_PARTNER_CAMPAIGN_PUBLISH_ENABLED = originalEnv.V3_PARTNER_CAMPAIGN_PUBLISH_ENABLED;
    process.env.V3_PARTNER_CAMPAIGN_PAUSE_ENABLED = originalEnv.V3_PARTNER_CAMPAIGN_PAUSE_ENABLED;
    process.env.V3_PARTNER_CAMPAIGN_RESUME_ENABLED = originalEnv.V3_PARTNER_CAMPAIGN_RESUME_ENABLED;
    process.env.V3_PARTNER_CALLBACKS_ENABLED = originalEnv.V3_PARTNER_CALLBACKS_ENABLED;
    process.env.V3_PARTNER_REWARD_RECORD_ENABLED = originalEnv.V3_PARTNER_REWARD_RECORD_ENABLED;
    process.env.V3_PARTNER_CALLBACK_MAX_SKEW_SECONDS = originalEnv.V3_PARTNER_CALLBACK_MAX_SKEW_SECONDS;
    resetV3PartnerCampaignStoreForTest();
  });

  it('supports guarded publish/pause/resume lifecycle and app-scope isolation', async () => {
    const createResponse = await request(app)
      .post('/api/v3/partners/campaigns')
      .set('x-api-key', 'zfi_partner_primary.secret')
      .send({
        slug: 'q2-growth-campaign',
        title: 'Q2 Growth Campaign',
        callback: {
          endpoint: 'https://partner.example.com/callbacks/zfrog',
          secret: 'partner-secret-0123456789',
        },
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.status).toBe('DRAFT');
    const campaignId = createResponse.body.data.id as string;

    const publishResponse = await request(app)
      .post(`/api/v3/partners/campaigns/${campaignId}/publish`)
      .set('x-api-key', 'zfi_partner_primary.secret');

    expect(publishResponse.status).toBe(200);
    expect(publishResponse.body.data.status).toBe('PUBLISHED');

    const pauseResponse = await request(app)
      .post(`/api/v3/partners/campaigns/${campaignId}/pause`)
      .set('x-api-key', 'zfi_partner_primary.secret');

    expect(pauseResponse.status).toBe(200);
    expect(pauseResponse.body.data.status).toBe('PAUSED');

    const resumeResponse = await request(app)
      .post(`/api/v3/partners/campaigns/${campaignId}/resume`)
      .set('x-api-key', 'zfi_partner_primary.secret');

    expect(resumeResponse.status).toBe(200);
    expect(resumeResponse.body.data.status).toBe('PUBLISHED');

    const deniedCrossAppRead = await request(app)
      .get(`/api/v3/partners/campaigns/${campaignId}`)
      .set('x-api-key', 'zfi_partner_other.secret');

    expect(deniedCrossAppRead.status).toBe(404);
    expect(deniedCrossAppRead.body.error.code).toBe('NOT_FOUND');
  });

  it('verifies callback signature, records reward trace, and blocks replay', async () => {
    const createResponse = await request(app)
      .post('/api/v3/partners/campaigns')
      .set('x-api-key', 'zfi_partner_primary.secret')
      .send({
        slug: 'callback-signed-campaign',
        title: 'Callback Signed Campaign',
        callback: {
          endpoint: 'https://partner.example.com/callbacks/zfrog',
          secret: 'partner-secret-signature-001',
        },
      });

    const campaignId = createResponse.body.data.id as string;

    await request(app)
      .post(`/api/v3/partners/campaigns/${campaignId}/publish`)
      .set('x-api-key', 'zfi_partner_primary.secret');

    const callbackPayload = {
      source: 'partner.rewards',
      campaignVersion: 'v1',
      externalRewardId: 'rw_001',
    };
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = `sha256=${computeSignature('partner-secret-signature-001', timestamp, callbackPayload)}`;

    const callbackResponse = await request(app)
      .post(`/api/v3/partners/campaigns/${campaignId}/callbacks`)
      .set('x-partner-timestamp', timestamp)
      .set('x-partner-signature', signature)
      .send({
        partnerEventId: 'evt_001',
        eventType: 'REWARD_GRANTED',
        payload: callbackPayload,
        reward: {
          recipientWallet: '0xabc0000000000000000000000000000000000001',
          rewardType: 'POINTS',
          amount: '100',
        },
      });

    expect(callbackResponse.status).toBe(201);
    expect(callbackResponse.body.success).toBe(true);
    expect(callbackResponse.body.data.callback.status).toBe('ACCEPTED');
    expect(callbackResponse.body.data.callback.verified).toBe(true);
    expect(callbackResponse.body.data.reward.status).toBe('GRANTED');

    const replayResponse = await request(app)
      .post(`/api/v3/partners/campaigns/${campaignId}/callbacks`)
      .set('x-partner-timestamp', timestamp)
      .set('x-partner-signature', signature)
      .send({
        partnerEventId: 'evt_001',
        eventType: 'REWARD_GRANTED',
        payload: callbackPayload,
      });

    expect(replayResponse.status).toBe(409);
    expect(replayResponse.body.error.code).toBe('PARTNER_CALLBACK_REPLAYED');

    const invalidSignatureResponse = await request(app)
      .post(`/api/v3/partners/campaigns/${campaignId}/callbacks`)
      .set('x-partner-timestamp', timestamp)
      .set('x-partner-signature', 'sha256=deadbeef')
      .send({
        partnerEventId: 'evt_002',
        eventType: 'CAMPAIGN_STATUS_SYNC',
        payload: {
          from: 'PUBLISHED',
          to: 'PAUSED',
        },
      });

    expect(invalidSignatureResponse.status).toBe(401);
    expect(invalidSignatureResponse.body.error.code).toBe('PARTNER_CALLBACK_SIGNATURE_INVALID');
  });
});
