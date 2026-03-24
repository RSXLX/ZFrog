import express from 'express';
import request from 'supertest';
import adminV3CreatorsRoutes from '../../api/routes/admin/v3-creators.routes';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import {
  resetV3CreatorPipelineStoreForTest,
  v3CreatorPipelineService,
} from '../../modules/creator/creator-pipeline.service';
import {
  resetV3CreatorLicenseAnchorStoreForTest,
  v3CreatorLicenseAnchorService,
} from '../../modules/creator-onchain/creator-license-anchor.service';

const issuedAtForTest = (offsetMs = -60_000): string => new Date(Date.now() + offsetMs).toISOString();

describe('Admin V3 Creators Routes E2E', () => {
  const app = express();
  const originalEnv = {
    V3_RUNTIME_ENABLED: process.env.V3_RUNTIME_ENABLED,
    V3_RUNTIME_KILL_SWITCH: process.env.V3_RUNTIME_KILL_SWITCH,
    V3_RUNTIME_CREATOR_ENABLED: process.env.V3_RUNTIME_CREATOR_ENABLED,
    V3_CREATOR_STORAGE_MODE: process.env.V3_CREATOR_STORAGE_MODE,
    V3_CREATOR_ASSET_PIPELINE_ENABLED: process.env.V3_CREATOR_ASSET_PIPELINE_ENABLED,
    V3_CREATOR_PACK_DRAFT_ENABLED: process.env.V3_CREATOR_PACK_DRAFT_ENABLED,
    V3_CREATOR_PACK_REVIEW_ENABLED: process.env.V3_CREATOR_PACK_REVIEW_ENABLED,
    V3_CREATOR_PACK_PUBLISH_ENABLED: process.env.V3_CREATOR_PACK_PUBLISH_ENABLED,
    V3_CREATOR_PREVIEW_RENDER_ENABLED: process.env.V3_CREATOR_PREVIEW_RENDER_ENABLED,
    V3_CREATOR_LICENSE_ANCHOR_ENABLED: process.env.V3_CREATOR_LICENSE_ANCHOR_ENABLED,
    V3_CREATOR_LICENSE_ONCHAIN_ENABLED: process.env.V3_CREATOR_LICENSE_ONCHAIN_ENABLED,
    V3_CREATOR_LICENSE_ONCHAIN_REQUIRED: process.env.V3_CREATOR_LICENSE_ONCHAIN_REQUIRED,
    V3_CREATOR_LICENSE_FORCE_FAIL: process.env.V3_CREATOR_LICENSE_FORCE_FAIL,
  };

  app.use(express.json());
  app.use('/api/admin/v3/creators', adminV3CreatorsRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
    resetV3CreatorPipelineStoreForTest();
    resetV3CreatorLicenseAnchorStoreForTest();
    process.env.V3_RUNTIME_ENABLED = 'true';
    process.env.V3_RUNTIME_KILL_SWITCH = 'false';
    process.env.V3_RUNTIME_CREATOR_ENABLED = 'true';
    process.env.V3_CREATOR_STORAGE_MODE = 'memory';
    process.env.V3_CREATOR_ASSET_PIPELINE_ENABLED = 'true';
    process.env.V3_CREATOR_PACK_DRAFT_ENABLED = 'true';
    process.env.V3_CREATOR_PACK_REVIEW_ENABLED = 'true';
    process.env.V3_CREATOR_PACK_PUBLISH_ENABLED = 'true';
    process.env.V3_CREATOR_PREVIEW_RENDER_ENABLED = 'true';
    process.env.V3_CREATOR_LICENSE_ANCHOR_ENABLED = 'true';
    process.env.V3_CREATOR_LICENSE_ONCHAIN_ENABLED = 'true';
    process.env.V3_CREATOR_LICENSE_ONCHAIN_REQUIRED = 'false';
    process.env.V3_CREATOR_LICENSE_FORCE_FAIL = 'false';
  });

  afterAll(() => {
    process.env.V3_RUNTIME_ENABLED = originalEnv.V3_RUNTIME_ENABLED;
    process.env.V3_RUNTIME_KILL_SWITCH = originalEnv.V3_RUNTIME_KILL_SWITCH;
    process.env.V3_RUNTIME_CREATOR_ENABLED = originalEnv.V3_RUNTIME_CREATOR_ENABLED;
    process.env.V3_CREATOR_STORAGE_MODE = originalEnv.V3_CREATOR_STORAGE_MODE;
    process.env.V3_CREATOR_ASSET_PIPELINE_ENABLED = originalEnv.V3_CREATOR_ASSET_PIPELINE_ENABLED;
    process.env.V3_CREATOR_PACK_DRAFT_ENABLED = originalEnv.V3_CREATOR_PACK_DRAFT_ENABLED;
    process.env.V3_CREATOR_PACK_REVIEW_ENABLED = originalEnv.V3_CREATOR_PACK_REVIEW_ENABLED;
    process.env.V3_CREATOR_PACK_PUBLISH_ENABLED = originalEnv.V3_CREATOR_PACK_PUBLISH_ENABLED;
    process.env.V3_CREATOR_PREVIEW_RENDER_ENABLED = originalEnv.V3_CREATOR_PREVIEW_RENDER_ENABLED;
    process.env.V3_CREATOR_LICENSE_ANCHOR_ENABLED = originalEnv.V3_CREATOR_LICENSE_ANCHOR_ENABLED;
    process.env.V3_CREATOR_LICENSE_ONCHAIN_ENABLED = originalEnv.V3_CREATOR_LICENSE_ONCHAIN_ENABLED;
    process.env.V3_CREATOR_LICENSE_ONCHAIN_REQUIRED = originalEnv.V3_CREATOR_LICENSE_ONCHAIN_REQUIRED;
    process.env.V3_CREATOR_LICENSE_FORCE_FAIL = originalEnv.V3_CREATOR_LICENSE_FORCE_FAIL;
    resetV3CreatorPipelineStoreForTest();
    resetV3CreatorLicenseAnchorStoreForTest();
  });

  it('supports review queue, preview smoke, reject/resubmit/approve and rollback', async () => {
    const asset = await v3CreatorPipelineService.createAsset({
      type: 'IMAGE',
      mimeType: 'image/png',
      sourceUrl: 'https://cdn.example.com/assets/admin-review.png',
      checksum: '1234567890abcdef1234567890abcdef',
      bytes: 2048,
      requestedBy: {
        appId: 'int_creator',
        keyId: 'ikey_creator',
        actor: 'creator-lab:ikey_creator',
      },
    });

    const draft = await v3CreatorPipelineService.createPackDraft({
      slug: 'admin-review-pack',
      title: 'Admin Review Pack',
      assetIds: [asset.id],
      requestedBy: {
        appId: 'int_creator',
        keyId: 'ikey_creator',
        actor: 'creator-lab:ikey_creator',
      },
    });

    await v3CreatorPipelineService.submitPackForReview({
      packId: draft.id,
      scopeAppId: 'int_creator',
      note: 'submit from creator',
      requestedBy: {
        appId: 'int_creator',
        actor: 'creator-lab:ikey_creator',
      },
    });

    const queueResponse = await request(app)
      .get('/api/admin/v3/creators/review-queue')
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001');

    expect(queueResponse.status).toBe(200);
    expect(queueResponse.body.success).toBe(true);
    expect(queueResponse.body.data.items[0]).toMatchObject({
      id: draft.id,
      status: 'IN_REVIEW',
    });

    const previewResponse = await request(app)
      .get(`/api/admin/v3/creators/packs/${draft.id}/preview`)
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001');

    expect(previewResponse.status).toBe(200);
    expect(previewResponse.body.success).toBe(true);
    expect(previewResponse.body.data).toMatchObject({
      pack: {
        id: draft.id,
      },
      render: {
        mode: 'SAFE',
        ready: true,
      },
    });

    const rejectResponse = await request(app)
      .post(`/api/admin/v3/creators/packs/${draft.id}/review`)
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001')
      .send({
        decision: 'REJECT',
        note: 'missing final polish',
      });

    expect(rejectResponse.status).toBe(200);
    expect(rejectResponse.body.success).toBe(true);
    expect(rejectResponse.body.data).toMatchObject({
      id: draft.id,
      status: 'REJECTED',
      receipt: {
        action: 'rejected',
      },
    });

    await v3CreatorPipelineService.submitPackForReview({
      packId: draft.id,
      scopeAppId: 'int_creator',
      note: 'resubmit after fix',
      requestedBy: {
        appId: 'int_creator',
        actor: 'creator-lab:ikey_creator',
      },
    });

    const approveResponse = await request(app)
      .post(`/api/admin/v3/creators/packs/${draft.id}/review`)
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001')
      .send({
        decision: 'APPROVE',
        note: 'approved for beta',
      });

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.success).toBe(true);
    expect(approveResponse.body.data).toMatchObject({
      id: draft.id,
      status: 'PUBLISHED',
      receipt: {
        action: 'approved',
      },
    });

    const rollbackResponse = await request(app)
      .post(`/api/admin/v3/creators/packs/${draft.id}/rollback`)
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001')
      .send({
        reason: 'emergency rollback',
      });

    expect(rollbackResponse.status).toBe(200);
    expect(rollbackResponse.body.success).toBe(true);
    expect(rollbackResponse.body.data).toMatchObject({
      id: draft.id,
      status: 'DRAFT',
      receipt: {
        action: 'rolled_back',
      },
    });
  });

  it('fails closed when publish or preview switch is disabled', async () => {
    const asset = await v3CreatorPipelineService.createAsset({
      type: 'IMAGE',
      mimeType: 'image/png',
      sourceUrl: 'https://cdn.example.com/assets/admin-preview-disabled.png',
      checksum: 'fedcba0987654321fedcba0987654321',
      bytes: 2048,
      requestedBy: {
        appId: 'int_creator',
        keyId: 'ikey_creator',
        actor: 'creator-lab:ikey_creator',
      },
    });

    const draft = await v3CreatorPipelineService.createPackDraft({
      slug: 'admin-preview-disabled-pack',
      title: 'Admin Preview Disabled Pack',
      assetIds: [asset.id],
      requestedBy: {
        appId: 'int_creator',
        keyId: 'ikey_creator',
        actor: 'creator-lab:ikey_creator',
      },
    });

    await v3CreatorPipelineService.submitPackForReview({
      packId: draft.id,
      scopeAppId: 'int_creator',
      requestedBy: {
        appId: 'int_creator',
        actor: 'creator-lab:ikey_creator',
      },
    });

    process.env.V3_CREATOR_PACK_PUBLISH_ENABLED = 'false';

    const approveBlocked = await request(app)
      .post(`/api/admin/v3/creators/packs/${draft.id}/review`)
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001')
      .send({
        decision: 'APPROVE',
      });

    expect(approveBlocked.status).toBe(503);
    expect(approveBlocked.body.code).toBe('CREATOR_PACK_PUBLISH_DISABLED');

    process.env.V3_CREATOR_PREVIEW_RENDER_ENABLED = 'false';

    const previewBlocked = await request(app)
      .get(`/api/admin/v3/creators/packs/${draft.id}/preview`)
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001');

    expect(previewBlocked.status).toBe(503);
    expect(previewBlocked.body.code).toBe('CREATOR_PREVIEW_RENDER_DISABLED');
  });

  it('supports admin audit list and replay for creator license anchors', async () => {
    const issuedAt = issuedAtForTest();
    process.env.V3_CREATOR_LICENSE_FORCE_FAIL = 'true';

    const asset = await v3CreatorPipelineService.createAsset({
      type: 'IMAGE',
      mimeType: 'image/png',
      sourceUrl: 'https://cdn.example.com/assets/admin-anchor.png',
      checksum: 'abababababababababababababababab',
      bytes: 1024,
      requestedBy: {
        appId: 'int_creator',
        keyId: 'ikey_creator',
        actor: 'creator-lab:ikey_creator',
      },
    });

    const failedAnchor = await v3CreatorLicenseAnchorService.createBinding({
      assetId: asset.id,
      ownerWallet: '0xabc0000000000000000000000000000000000001',
      issuedAt,
      requestedBy: {
        appId: 'int_creator',
        keyId: 'ikey_creator',
        actor: 'creator-lab:ikey_creator',
      },
    });

    expect(failedAnchor.binding.status).toBe('FAILED');

    const listResponse = await request(app)
      .get('/api/admin/v3/creators/license-anchors')
      .query({ status: 'FAILED', appId: 'int_creator', assetId: asset.id })
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001');

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data.total).toBe(1);
    expect(listResponse.body.data.items[0].id).toBe(failedAnchor.binding.id);

    process.env.V3_CREATOR_LICENSE_FORCE_FAIL = 'false';

    const replayResponse = await request(app)
      .post(`/api/admin/v3/creators/license-anchors/${failedAnchor.binding.id}/replay`)
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001')
      .send({
        force: true,
      });

    expect(replayResponse.status).toBe(200);
    expect(replayResponse.body.success).toBe(true);
    expect(replayResponse.body.data.binding.status).toBe('ANCHORED');
    expect(replayResponse.body.data.replayed).toBe(true);
    expect(replayResponse.body.data.receipt.action).toBe('anchor_replay');
  });
});
