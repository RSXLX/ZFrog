import express from 'express';
import request from 'supertest';
import adminV3MemoryPalacesRoutes from '../../api/routes/admin/v3-memory-palaces.routes';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import {
  resetV3CollaborativeMemoryStoreForTest,
  v3CollaborativeMemoryService,
} from '../../modules/memory-palace-v3/collaborative-memory.service';
import {
  resetV3MemoryPalaceTemplatePackStoreForTest,
  v3MemoryPalaceTemplatePackService,
} from '../../modules/memory-palace-templates/template-pack.service';

describe('Admin V3 Memory Palaces Routes E2E', () => {
  const app = express();
  const originalEnv = {
    V3_RUNTIME_ENABLED: process.env.V3_RUNTIME_ENABLED,
    V3_RUNTIME_KILL_SWITCH: process.env.V3_RUNTIME_KILL_SWITCH,
    V3_RUNTIME_MEMORY_ENABLED: process.env.V3_RUNTIME_MEMORY_ENABLED,
    V3_MEMORY_PALACE_STORAGE_MODE: process.env.V3_MEMORY_PALACE_STORAGE_MODE,
    V3_MEMORY_PALACE_TEMPLATE_STORAGE_MODE: process.env.V3_MEMORY_PALACE_TEMPLATE_STORAGE_MODE,
    V3_MEMORY_PALACE_COLLAB_ENABLED: process.env.V3_MEMORY_PALACE_COLLAB_ENABLED,
    V3_MEMORY_PALACE_VISIT_WRITE_ENABLED: process.env.V3_MEMORY_PALACE_VISIT_WRITE_ENABLED,
    V3_MEMORY_PALACE_TEMPLATE_PACK_ENABLED: process.env.V3_MEMORY_PALACE_TEMPLATE_PACK_ENABLED,
    V3_MEMORY_PALACE_TEMPLATE_PUBLIC_ENABLED: process.env.V3_MEMORY_PALACE_TEMPLATE_PUBLIC_ENABLED,
  };

  app.use(express.json());
  app.use('/api/admin/v3/memory-palaces', adminV3MemoryPalacesRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
    resetV3CollaborativeMemoryStoreForTest();
    resetV3MemoryPalaceTemplatePackStoreForTest();
    process.env.V3_RUNTIME_ENABLED = 'true';
    process.env.V3_RUNTIME_KILL_SWITCH = 'false';
    process.env.V3_RUNTIME_MEMORY_ENABLED = 'true';
    process.env.V3_MEMORY_PALACE_STORAGE_MODE = 'memory';
    process.env.V3_MEMORY_PALACE_TEMPLATE_STORAGE_MODE = 'memory';
    process.env.V3_MEMORY_PALACE_COLLAB_ENABLED = 'true';
    process.env.V3_MEMORY_PALACE_VISIT_WRITE_ENABLED = 'true';
    process.env.V3_MEMORY_PALACE_TEMPLATE_PACK_ENABLED = 'true';
    process.env.V3_MEMORY_PALACE_TEMPLATE_PUBLIC_ENABLED = 'true';
  });

  afterAll(() => {
    process.env.V3_RUNTIME_ENABLED = originalEnv.V3_RUNTIME_ENABLED;
    process.env.V3_RUNTIME_KILL_SWITCH = originalEnv.V3_RUNTIME_KILL_SWITCH;
    process.env.V3_RUNTIME_MEMORY_ENABLED = originalEnv.V3_RUNTIME_MEMORY_ENABLED;
    process.env.V3_MEMORY_PALACE_STORAGE_MODE = originalEnv.V3_MEMORY_PALACE_STORAGE_MODE;
    process.env.V3_MEMORY_PALACE_TEMPLATE_STORAGE_MODE = originalEnv.V3_MEMORY_PALACE_TEMPLATE_STORAGE_MODE;
    process.env.V3_MEMORY_PALACE_COLLAB_ENABLED = originalEnv.V3_MEMORY_PALACE_COLLAB_ENABLED;
    process.env.V3_MEMORY_PALACE_VISIT_WRITE_ENABLED = originalEnv.V3_MEMORY_PALACE_VISIT_WRITE_ENABLED;
    process.env.V3_MEMORY_PALACE_TEMPLATE_PACK_ENABLED = originalEnv.V3_MEMORY_PALACE_TEMPLATE_PACK_ENABLED;
    process.env.V3_MEMORY_PALACE_TEMPLATE_PUBLIC_ENABLED = originalEnv.V3_MEMORY_PALACE_TEMPLATE_PUBLIC_ENABLED;
    resetV3CollaborativeMemoryStoreForTest();
    resetV3MemoryPalaceTemplatePackStoreForTest();
  });

  it('POST /api/admin/v3/memory-palaces/:worldId/feature can feature and unfeature a visit', async () => {
    const world = await v3CollaborativeMemoryService.createWorld({
      journeyId: 'jrn_admin_feature_001',
      requestedBy: {
        appId: 'int_owner',
        keyId: 'ikey_owner',
        actor: 'owner:ikey_owner',
      },
    });

    const visit = await v3CollaborativeMemoryService.addVisit({
      worldId: world.id,
      entryType: 'WITNESS',
      message: 'Witnessed dawn lights at relic gate.',
      requestedBy: {
        appId: 'int_guest',
        keyId: 'ikey_guest',
        actor: 'guest:ikey_guest',
      },
    });

    const featureResponse = await request(app)
      .post(`/api/admin/v3/memory-palaces/${world.id}/feature`)
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001')
      .send({
        visitId: visit.id,
        featured: true,
        reason: 'promote highlighted witness',
      });

    expect(featureResponse.status).toBe(200);
    expect(featureResponse.body.success).toBe(true);
    expect(featureResponse.body.data).toMatchObject({
      worldId: world.id,
      visitId: visit.id,
      featured: true,
      reason: 'promote highlighted witness',
      receipt: {
        action: 'featured',
      },
    });

    const unfeatureResponse = await request(app)
      .post(`/api/admin/v3/memory-palaces/${world.id}/feature`)
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001')
      .send({
        visitId: visit.id,
        featured: false,
      });

    expect(unfeatureResponse.status).toBe(200);
    expect(unfeatureResponse.body.success).toBe(true);
    expect(unfeatureResponse.body.data).toMatchObject({
      worldId: world.id,
      visitId: visit.id,
      featured: false,
      exhibitId: null,
      receipt: {
        action: 'unfeatured',
      },
    });

    const visits = await v3CollaborativeMemoryService.listVisits({
      worldId: world.id,
      scopeAppId: 'int_owner',
      limit: 10,
    });

    expect(visits.total).toBe(1);
    expect(visits.featuredCount).toBe(0);
    expect(visits.items[0]?.featured.isFeatured).toBe(false);
  });

  it('POST /api/admin/v3/memory-palaces/:worldId/feature validates input', async () => {
    const response = await request(app)
      .post('/api/admin/v3/memory-palaces/mpw_invalid/feature')
      .send({
        visitId: 'bad_id',
        featured: 'yes',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('template review routes approve and toggle feature for memory world packs', async () => {
    const draft = await v3MemoryPalaceTemplatePackService.createTemplateDraft({
      slug: 'moonlake-celadon',
      name: 'Moonlake Celadon',
      summary: 'Template awaiting review.',
      theme: {
        palette: {
          background: '#ecfeff',
          surface: '#ffffff',
          accent: '#0ea5e9',
          text: '#0f172a',
        },
        badgeLabel: 'Moonlake',
        coverImageUrl: null,
      },
      requestedBy: {
        appId: 'int_owner',
        keyId: 'ikey_owner',
        actor: 'owner:ikey_owner',
      },
    });

    await v3MemoryPalaceTemplatePackService.submitTemplateForReview({
      templateId: draft.id,
      note: 'please review',
      requestedBy: {
        appId: 'int_owner',
        actor: 'owner:ikey_owner',
      },
    });

    const queueResponse = await request(app)
      .get('/api/admin/v3/memory-palaces/templates/review')
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001');

    expect(queueResponse.status).toBe(200);
    expect(queueResponse.body.success).toBe(true);
    expect(queueResponse.body.data.items[0]).toMatchObject({
      id: draft.id,
      status: 'IN_REVIEW',
    });

    const approveResponse = await request(app)
      .post(`/api/admin/v3/memory-palaces/templates/${draft.id}/review`)
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001')
      .send({
        decision: 'APPROVE',
        note: 'approved for beta',
        featureEnabled: true,
      });

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.success).toBe(true);
    expect(approveResponse.body.data).toMatchObject({
      id: draft.id,
      status: 'PUBLISHED',
      featureEnabled: true,
      receipt: {
        action: 'approved',
      },
    });

    const disableFeatureResponse = await request(app)
      .post(`/api/admin/v3/memory-palaces/templates/${draft.id}/feature`)
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001')
      .send({
        enabled: false,
        reason: 'pause rollout',
      });

    expect(disableFeatureResponse.status).toBe(200);
    expect(disableFeatureResponse.body.success).toBe(true);
    expect(disableFeatureResponse.body.data).toMatchObject({
      id: draft.id,
      featureEnabled: false,
      receipt: {
        action: 'feature_disabled',
      },
    });
  });
});
