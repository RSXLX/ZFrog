import { createHmac } from 'crypto';
import express from 'express';
import request from 'supertest';
import adminV3PartnersRoutes from '../../api/routes/admin/v3-partners.routes';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import {
  resetV3PartnerCampaignStoreForTest,
  v3PartnerCampaignService,
} from '../../modules/partners/partner-campaign.service';

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

describe('Admin V3 Partners Routes E2E', () => {
  const app = express();
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
    V3_PARTNER_ALLOWED_APPS: process.env.V3_PARTNER_ALLOWED_APPS,
    V3_PARTNER_CALLBACK_MAX_SKEW_SECONDS: process.env.V3_PARTNER_CALLBACK_MAX_SKEW_SECONDS,
  };

  app.use(express.json());
  app.use('/api/admin/v3/partners', adminV3PartnersRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
    resetV3PartnerCampaignStoreForTest();
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
    delete process.env.V3_PARTNER_ALLOWED_APPS;
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
    process.env.V3_PARTNER_ALLOWED_APPS = originalEnv.V3_PARTNER_ALLOWED_APPS;
    process.env.V3_PARTNER_CALLBACK_MAX_SKEW_SECONDS = originalEnv.V3_PARTNER_CALLBACK_MAX_SKEW_SECONDS;
    resetV3PartnerCampaignStoreForTest();
  });

  it('supports admin lifecycle actions and rollback for partner campaigns', async () => {
    const draft = await v3PartnerCampaignService.createCampaign({
      slug: 'admin-route-campaign',
      title: 'Admin Route Campaign',
      callbackEndpoint: 'https://partner.example.com/callbacks/admin',
      callbackSecret: 'partner-secret-admin-route-001',
      requestedBy: {
        appId: 'int_partner_admin',
        keyId: 'ikey_partner_admin',
        actor: 'partner-admin:ikey_partner_admin',
      },
    });

    const listResponse = await request(app)
      .get('/api/admin/v3/partners/campaigns?status=DRAFT')
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001');

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data.total).toBeGreaterThan(0);
    expect(listResponse.body.data.items[0]).toMatchObject({
      id: draft.id,
      status: 'DRAFT',
    });

    const publishResponse = await request(app)
      .post(`/api/admin/v3/partners/campaigns/${draft.id}/publish`)
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001');

    expect(publishResponse.status).toBe(200);
    expect(publishResponse.body.success).toBe(true);
    expect(publishResponse.body.data).toMatchObject({
      id: draft.id,
      status: 'PUBLISHED',
      receipt: {
        action: 'publish',
      },
    });

    const pauseResponse = await request(app)
      .post(`/api/admin/v3/partners/campaigns/${draft.id}/pause`)
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001');

    expect(pauseResponse.status).toBe(200);
    expect(pauseResponse.body.success).toBe(true);
    expect(pauseResponse.body.data).toMatchObject({
      id: draft.id,
      status: 'PAUSED',
      receipt: {
        action: 'pause',
      },
    });

    const resumeResponse = await request(app)
      .post(`/api/admin/v3/partners/campaigns/${draft.id}/resume`)
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001');

    expect(resumeResponse.status).toBe(200);
    expect(resumeResponse.body.success).toBe(true);
    expect(resumeResponse.body.data).toMatchObject({
      id: draft.id,
      status: 'PUBLISHED',
      receipt: {
        action: 'resume',
      },
    });

    const rollbackResponse = await request(app)
      .post(`/api/admin/v3/partners/campaigns/${draft.id}/rollback`)
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001')
      .send({
        reason: 'safety rollback',
      });

    expect(rollbackResponse.status).toBe(200);
    expect(rollbackResponse.body.success).toBe(true);
    expect(rollbackResponse.body.data).toMatchObject({
      id: draft.id,
      status: 'PAUSED',
      receipt: {
        action: 'rollback_to_paused',
        reason: 'safety rollback',
      },
    });
  });

  it('returns callbacks and rewards audit trace for admin queries', async () => {
    const campaign = await v3PartnerCampaignService.createCampaign({
      slug: 'admin-audit-campaign',
      title: 'Admin Audit Campaign',
      callbackEndpoint: 'https://partner.example.com/callbacks/audit',
      callbackSecret: 'partner-secret-admin-audit-001',
      requestedBy: {
        appId: 'int_partner_admin',
        keyId: 'ikey_partner_admin',
        actor: 'partner-admin:ikey_partner_admin',
      },
    });

    await v3PartnerCampaignService.publishCampaign({
      campaignId: campaign.id,
      scopeAppId: 'int_partner_admin',
      requestedBy: {
        actor: 'partner-admin:ikey_partner_admin',
      },
    });

    const callbackPayload = {
      source: 'partner.rewards',
      campaignVersion: 'v1',
      externalRewardId: 'rw_admin_001',
    };
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = computeSignature('partner-secret-admin-audit-001', timestamp, callbackPayload);

    await v3PartnerCampaignService.receiveCallback({
      campaignId: campaign.id,
      partnerEventId: 'evt_admin_001',
      eventType: 'REWARD_GRANTED',
      timestamp,
      signature: `sha256=${signature}`,
      payload: callbackPayload,
      reward: {
        recipientWallet: '0xabc0000000000000000000000000000000000002',
        rewardType: 'POINTS',
        amount: '88',
      },
    });

    const callbacksResponse = await request(app)
      .get(`/api/admin/v3/partners/campaigns/${campaign.id}/callbacks`)
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001');

    expect(callbacksResponse.status).toBe(200);
    expect(callbacksResponse.body.success).toBe(true);
    expect(callbacksResponse.body.data.total).toBe(1);
    expect(callbacksResponse.body.data.items[0]).toMatchObject({
      campaignId: campaign.id,
      partnerEventId: 'evt_admin_001',
      status: 'ACCEPTED',
      verified: true,
    });

    const rewardsResponse = await request(app)
      .get(`/api/admin/v3/partners/campaigns/${campaign.id}/rewards`)
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001');

    expect(rewardsResponse.status).toBe(200);
    expect(rewardsResponse.body.success).toBe(true);
    expect(rewardsResponse.body.data.total).toBe(1);
    expect(rewardsResponse.body.data.items[0]).toMatchObject({
      campaignId: campaign.id,
      rewardType: 'POINTS',
      status: 'GRANTED',
      amount: '88',
    });
  });

  it('fails closed when partner runtime module is disabled', async () => {
    process.env.V3_RUNTIME_PARTNER_ENABLED = 'false';

    const response = await request(app)
      .get('/api/admin/v3/partners/campaigns')
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001');

    expect(response.status).toBe(503);
    expect(response.body.code).toBe('V3_MODULE_DISABLED');
  });
});
