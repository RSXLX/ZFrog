import express from 'express';
import request from 'supertest';
import v3Routes from '../../api/routes/v3';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import { integrationRegistryService } from '../../platform/integrations/integration-registry.service';
import { resetV3CreatorPipelineStoreForTest } from '../../modules/creator/creator-pipeline.service';
import { resetV3CreatorLicenseAnchorStoreForTest } from '../../modules/creator-onchain/creator-license-anchor.service';
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
  permissions: IntegrationPermissionValue[];
}): AuthenticatedIntegrationContext => ({
  app: {
    id: input.appId,
    slug: input.appSlug,
    name: 'Creator Pipeline App',
    appType: 'CREATOR',
    status: 'ACTIVE',
  },
  key: {
    id: `ikey_${input.appId}`,
    keyPrefix: 'zfi_abcd1234',
    label: 'preview',
    status: 'ACTIVE',
    issuedBy: '0xabc0000000000000000000000000000000000001',
    issuedAt: '2026-03-24T00:00:00.000Z',
    expiresAt: null,
    lastUsedAt: '2026-03-24T00:10:00.000Z',
  },
  permissions: input.permissions,
});

const issuedAtForTest = (offsetMs = -60_000): string => new Date(Date.now() + offsetMs).toISOString();

describe('V3 Creator Routes E2E', () => {
  const app = express();
  const mockRegistry = integrationRegistryService as jest.Mocked<typeof integrationRegistryService>;
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
  app.use('/api/v3', v3Routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
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
    resetV3CreatorPipelineStoreForTest();
    resetV3CreatorLicenseAnchorStoreForTest();

    jest.clearAllMocks();
    mockRegistry.authenticateKey.mockImplementation(async (secret) => {
      const key = String(secret);
      if (key.startsWith('zfi_asset')) {
        return buildIntegrationContext({
          appId: 'int_001',
          appSlug: 'creator-assets',
          permissions: ['creator.asset.write'],
        });
      }

      if (key.startsWith('zfi_pack')) {
        return buildIntegrationContext({
          appId: 'int_001',
          appSlug: 'creator-packs',
          permissions: ['creator.pack.write'],
        });
      }

      if (key.startsWith('zfi_other')) {
        return buildIntegrationContext({
          appId: 'int_002',
          appSlug: 'creator-other',
          permissions: ['creator.asset.write', 'creator.pack.write'],
        });
      }

      return buildIntegrationContext({
        appId: 'int_001',
        appSlug: 'creator-both',
        permissions: ['creator.asset.write', 'creator.pack.write'],
      });
    });
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

  it('supports guarded create/list assets and create/list/get pack draft with app-scope isolation', async () => {
    const createAssetResponse = await request(app)
      .post('/api/v3/creator/assets')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        type: 'IMAGE',
        mimeType: 'image/png',
        sourceUrl: 'https://cdn.example.com/assets/frog.png',
        checksum: 'aabbccddeeff00112233445566778899',
        bytes: 2048,
      });

    expect(createAssetResponse.status).toBe(201);
    expect(createAssetResponse.body.success).toBe(true);
    expect(createAssetResponse.body.data.creatorAppId).toBe('int_001');
    const assetId = createAssetResponse.body.data.id as string;

    const listAssetsResponse = await request(app)
      .get('/api/v3/creator/assets')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .query({ limit: 10 });

    expect(listAssetsResponse.status).toBe(200);
    expect(listAssetsResponse.body.success).toBe(true);
    expect(listAssetsResponse.body.data.total).toBe(1);
    expect(listAssetsResponse.body.data.items[0].id).toBe(assetId);

    const createPackResponse = await request(app)
      .post('/api/v3/creator/packs')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        slug: 'moonlake-kit',
        title: 'Moonlake Kit',
        assetIds: [assetId],
      });

    expect(createPackResponse.status).toBe(201);
    expect(createPackResponse.body.success).toBe(true);
    expect(createPackResponse.body.data.status).toBe('DRAFT');
    const packId = createPackResponse.body.data.id as string;

    const listPacksResponse = await request(app)
      .get('/api/v3/creator/packs')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .query({ status: 'DRAFT', limit: 10 });

    expect(listPacksResponse.status).toBe(200);
    expect(listPacksResponse.body.success).toBe(true);
    expect(listPacksResponse.body.data.total).toBe(1);
    expect(listPacksResponse.body.data.items[0].id).toBe(packId);

    const getPackResponse = await request(app)
      .get(`/api/v3/creator/packs/${packId}`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial');

    expect(getPackResponse.status).toBe(200);
    expect(getPackResponse.body.success).toBe(true);
    expect(getPackResponse.body.data.assetIds).toEqual([assetId]);

    const deniedCrossAppRead = await request(app)
      .get(`/api/v3/creator/packs/${packId}`)
      .set('x-api-key', 'zfi_other.secretmaterial');

    expect(deniedCrossAppRead.status).toBe(404);
    expect(deniedCrossAppRead.body.error.code).toBe('NOT_FOUND');
  });

  it('enforces permission boundary between asset.write and pack.write', async () => {
    const createAssetResponse = await request(app)
      .post('/api/v3/creator/assets')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        type: 'IMAGE',
        mimeType: 'image/png',
        sourceUrl: 'https://cdn.example.com/assets/pack-frog.png',
        checksum: '11112222333344445555666677778888',
        bytes: 2048,
      });

    expect(createAssetResponse.status).toBe(201);
    const assetId = createAssetResponse.body.data.id as string;

    const createPackDenied = await request(app)
      .post('/api/v3/creator/packs')
      .set('x-api-key', 'zfi_asset.secretmaterial')
      .send({
        slug: 'no-pack-permission',
        title: 'No Pack Permission',
        assetIds: [assetId],
      });

    expect(createPackDenied.status).toBe(403);
    expect(createPackDenied.body.error.code).toBe('INTEGRATION_PERMISSION_DENIED');
  });

  it('fails closed on runtime/module disable and pack kill switch', async () => {
    process.env.V3_RUNTIME_CREATOR_ENABLED = 'false';

    const runtimeDenied = await request(app)
      .get('/api/v3/creator/assets')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial');

    expect(runtimeDenied.status).toBe(503);
    expect(runtimeDenied.body.error.code).toBe('V3_MODULE_DISABLED');

    process.env.V3_RUNTIME_CREATOR_ENABLED = 'true';
    process.env.V3_CREATOR_PACK_DRAFT_ENABLED = 'false';

    const createAssetResponse = await request(app)
      .post('/api/v3/creator/assets')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        type: 'IMAGE',
        mimeType: 'image/png',
        sourceUrl: 'https://cdn.example.com/assets/pack-disabled.png',
        checksum: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        bytes: 1024,
      });
    const assetId = createAssetResponse.body.data.id as string;

    const packDenied = await request(app)
      .post('/api/v3/creator/packs')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        slug: 'pack-disabled',
        title: 'Pack Disabled',
        assetIds: [assetId],
      });

    expect(packDenied.status).toBe(503);
    expect(packDenied.body.error.code).toBe('CREATOR_PACK_DRAFT_DISABLED');
  });

  it('supports creator pack resubmit flow and fails closed when review queue is disabled', async () => {
    const createAssetResponse = await request(app)
      .post('/api/v3/creator/assets')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        type: 'IMAGE',
        mimeType: 'image/png',
        sourceUrl: 'https://cdn.example.com/assets/review-pack.png',
        checksum: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        bytes: 1024,
      });
    const assetId = createAssetResponse.body.data.id as string;

    const createPackResponse = await request(app)
      .post('/api/v3/creator/packs')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        slug: 'review-pack',
        title: 'Review Pack',
        assetIds: [assetId],
      });
    const packId = createPackResponse.body.data.id as string;

    const submitResponse = await request(app)
      .post(`/api/v3/creator/packs/${packId}/resubmit`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        note: 'submit for review',
      });

    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body.success).toBe(true);
    expect(submitResponse.body.data.status).toBe('IN_REVIEW');

    process.env.V3_CREATOR_PACK_REVIEW_ENABLED = 'false';

    const blockedSubmit = await request(app)
      .post(`/api/v3/creator/packs/${packId}/resubmit`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        note: 'submit again',
      });

    expect(blockedSubmit.status).toBe(503);
    expect(blockedSubmit.body.error.code).toBe('CREATOR_PACK_REVIEW_DISABLED');
  });

  it('supports creator license anchor create/list/replay with app scope isolation', async () => {
    const issuedAt = issuedAtForTest();
    const createAssetResponse = await request(app)
      .post('/api/v3/creator/assets')
      .set('x-api-key', 'zfi_asset.secretmaterial')
      .send({
        type: 'IMAGE',
        mimeType: 'image/png',
        sourceUrl: 'https://cdn.example.com/assets/license-anchor.png',
        checksum: 'cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd',
        bytes: 1024,
      });

    expect(createAssetResponse.status).toBe(201);
    const assetId = createAssetResponse.body.data.id as string;

    const anchorResponse = await request(app)
      .post(`/api/v3/creator/assets/${assetId}/license-anchor`)
      .set('x-api-key', 'zfi_asset.secretmaterial')
      .send({
        ownerWallet: '0xabc0000000000000000000000000000000000001',
        issuedAt,
      });

    expect(anchorResponse.status).toBe(201);
    expect(anchorResponse.body.success).toBe(true);
    expect(anchorResponse.body.data.binding.status).toBe('ANCHORED');
    const bindingId = anchorResponse.body.data.binding.id as string;

    const listResponse = await request(app)
      .get(`/api/v3/creator/assets/${assetId}/license-anchor`)
      .set('x-api-key', 'zfi_asset.secretmaterial');

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data.total).toBe(1);
    expect(listResponse.body.data.items[0].id).toBe(bindingId);

    const crossAppReplay = await request(app)
      .post(`/api/v3/creator/license-anchors/${bindingId}/replay`)
      .set('x-api-key', 'zfi_other.secretmaterial')
      .send({});

    expect(crossAppReplay.status).toBe(404);
    expect(crossAppReplay.body.error.code).toBe('NOT_FOUND');

    const replayResponse = await request(app)
      .post(`/api/v3/creator/license-anchors/${bindingId}/replay`)
      .set('x-api-key', 'zfi_asset.secretmaterial')
      .send({});

    expect(replayResponse.status).toBe(200);
    expect(replayResponse.body.success).toBe(true);
    expect(replayResponse.body.data.idempotentReplay).toBe(true);
    expect(replayResponse.body.data.replayed).toBe(false);
  });

  it('stores failed license anchor and supports replay recovery', async () => {
    const issuedAt = issuedAtForTest();
    process.env.V3_CREATOR_LICENSE_FORCE_FAIL = 'true';

    const createAssetResponse = await request(app)
      .post('/api/v3/creator/assets')
      .set('x-api-key', 'zfi_asset.secretmaterial')
      .send({
        type: 'IMAGE',
        mimeType: 'image/png',
        sourceUrl: 'https://cdn.example.com/assets/license-anchor-replay.png',
        checksum: 'efefefefefefefefefefefefefefefef',
        bytes: 1024,
      });

    expect(createAssetResponse.status).toBe(201);
    const assetId = createAssetResponse.body.data.id as string;

    const failedAnchorResponse = await request(app)
      .post(`/api/v3/creator/assets/${assetId}/license-anchor`)
      .set('x-api-key', 'zfi_asset.secretmaterial')
      .send({
        ownerWallet: '0xabc0000000000000000000000000000000000001',
        issuedAt,
      });

    expect(failedAnchorResponse.status).toBe(201);
    expect(failedAnchorResponse.body.success).toBe(true);
    expect(failedAnchorResponse.body.data.binding.status).toBe('FAILED');
    const bindingId = failedAnchorResponse.body.data.binding.id as string;

    process.env.V3_CREATOR_LICENSE_FORCE_FAIL = 'false';

    const replayResponse = await request(app)
      .post(`/api/v3/creator/license-anchors/${bindingId}/replay`)
      .set('x-api-key', 'zfi_asset.secretmaterial')
      .send({});

    expect(replayResponse.status).toBe(200);
    expect(replayResponse.body.success).toBe(true);
    expect(replayResponse.body.data.replayed).toBe(true);
    expect(replayResponse.body.data.binding.status).toBe('ANCHORED');
    expect(replayResponse.body.data.binding.replayCount).toBe(1);
  });

  it('fails closed when creator license anchor switch is disabled', async () => {
    const issuedAt = issuedAtForTest();
    process.env.V3_CREATOR_LICENSE_ANCHOR_ENABLED = 'false';

    const createAssetResponse = await request(app)
      .post('/api/v3/creator/assets')
      .set('x-api-key', 'zfi_asset.secretmaterial')
      .send({
        type: 'IMAGE',
        mimeType: 'image/png',
        sourceUrl: 'https://cdn.example.com/assets/license-anchor-disabled.png',
        checksum: '12121212121212121212121212121212',
        bytes: 1024,
      });

    expect(createAssetResponse.status).toBe(201);
    const assetId = createAssetResponse.body.data.id as string;

    const disabledResponse = await request(app)
      .post(`/api/v3/creator/assets/${assetId}/license-anchor`)
      .set('x-api-key', 'zfi_asset.secretmaterial')
      .send({
        ownerWallet: '0xabc0000000000000000000000000000000000001',
        issuedAt,
      });

    expect(disabledResponse.status).toBe(503);
    expect(disabledResponse.body.error.code).toBe('CREATOR_LICENSE_ANCHOR_DISABLED');
  });
});
