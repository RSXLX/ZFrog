import express from 'express';
import request from 'supertest';
import v3Routes from '../../api/routes/v3';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import { integrationRegistryService } from '../../platform/integrations/integration-registry.service';
import { resetV3CollaborativeMemoryStoreForTest } from '../../modules/memory-palace-v3/collaborative-memory.service';
import {
  resetV3MemoryPalaceTemplatePackStoreForTest,
  v3MemoryPalaceTemplatePackService,
} from '../../modules/memory-palace-templates/template-pack.service';
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
    name: 'Memory Collaboration App',
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
  permissions: input.permissions || ['memory.read', 'memory.write'],
});

describe('V3 Memory Palaces Routes E2E', () => {
  const app = express();
  const mockRegistry = integrationRegistryService as jest.Mocked<typeof integrationRegistryService>;
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
  app.use('/api/v3', v3Routes);
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

    jest.clearAllMocks();
    mockRegistry.authenticateKey.mockImplementation(async (secret) => {
      if (String(secret).startsWith('zfi_other')) {
        return buildIntegrationContext({
          appId: 'int_002',
          appSlug: 'witness-app',
        });
      }

      return buildIntegrationContext({
        appId: 'int_001',
        appSlug: 'owner-app',
      });
    });
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

  it('create/contribute/visit flow is guarded and supports collaborator onboarding', async () => {
    const createResponse = await request(app)
      .post('/api/v3/memory-palaces')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        journeyId: 'jrn_story_001',
        title: 'Meteors Over Moonlake',
        summary: 'A shared rescue memory world.',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data.ownerAppId).toBe('int_001');
    expect(createResponse.body.data.metrics.collaboratorCount).toBe(1);

    const worldId = createResponse.body.data.id as string;

    const deniedRead = await request(app)
      .get(`/api/v3/memory-palaces/${worldId}`)
      .set('x-api-key', 'zfi_other.secretmaterial');

    expect(deniedRead.status).toBe(404);
    expect(deniedRead.body.error.code).toBe('NOT_FOUND');

    const deniedContribution = await request(app)
      .post(`/api/v3/memory-palaces/${worldId}/contributions`)
      .set('x-api-key', 'zfi_other.secretmaterial')
      .send({
        type: 'WITNESS_NOTE',
        content: 'We saw the relic flash above the lake.',
      });

    expect(deniedContribution.status).toBe(404);
    expect(deniedContribution.body.error.code).toBe('NOT_FOUND');

    const visitorWriteResponse = await request(app)
      .post(`/api/v3/memory-palaces/${worldId}/visits`)
      .set('x-api-key', 'zfi_other.secretmaterial')
      .send({
        entryType: 'WITNESS',
        message: 'Visited and left witness trace near gate.',
      });

    expect(visitorWriteResponse.status).toBe(201);
    expect(visitorWriteResponse.body.success).toBe(true);
    expect(visitorWriteResponse.body.data).toMatchObject({
      worldId,
      visitorAppId: 'int_002',
      entryType: 'WITNESS',
      featured: {
        isFeatured: false,
      },
    });

    const collaboratorResponse = await request(app)
      .post(`/api/v3/memory-palaces/${worldId}/collaborators`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        appId: 'int_002',
        role: 'CONTRIBUTOR',
      });

    expect(collaboratorResponse.status).toBe(200);
    expect(collaboratorResponse.body.success).toBe(true);
    expect(collaboratorResponse.body.data.metrics.collaboratorCount).toBe(2);

    const contributionResponse = await request(app)
      .post(`/api/v3/memory-palaces/${worldId}/contributions`)
      .set('x-api-key', 'zfi_other.secretmaterial')
      .send({
        type: 'WITNESS_NOTE',
        content: 'We stabilized the beacon before dawn.',
        metadata: {
          witnessCount: 2,
        },
      });

    expect(contributionResponse.status).toBe(200);
    expect(contributionResponse.body.success).toBe(true);
    expect(contributionResponse.body.data.metrics.contributionCount).toBe(1);

    const readResponse = await request(app)
      .get(`/api/v3/memory-palaces/${worldId}`)
      .set('x-api-key', 'zfi_other.secretmaterial');

    expect(readResponse.status).toBe(200);
    expect(readResponse.body.success).toBe(true);
    expect(readResponse.body.data.contributions[0]).toMatchObject({
      appId: 'int_002',
      type: 'WITNESS_NOTE',
      content: 'We stabilized the beacon before dawn.',
    });

    const visitsResponse = await request(app)
      .get(`/api/v3/memory-palaces/${worldId}/visits`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .query({ limit: 10 });

    expect(visitsResponse.status).toBe(200);
    expect(visitsResponse.body.success).toBe(true);
    expect(visitsResponse.body.data).toMatchObject({
      worldId,
      total: 1,
      featuredCount: 0,
    });
    expect(visitsResponse.body.data.items[0]).toMatchObject({
      visitorAppId: 'int_002',
      entryType: 'WITNESS',
    });
  });

  it('template publish flow gates world creation by reviewed and feature-enabled template packs', async () => {
    const createTemplateResponse = await request(app)
      .post('/api/v3/memory-palaces/templates')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        slug: 'moonlake-celadon',
        name: 'Moonlake Celadon',
        summary: 'Reviewed moonlake template.',
        theme: {
          palette: {
            background: '#ecfeff',
            surface: '#ffffff',
            accent: '#0ea5e9',
            text: '#0f172a',
          },
          badgeLabel: 'Moonlake',
        },
      });

    expect(createTemplateResponse.status).toBe(201);
    expect(createTemplateResponse.body.success).toBe(true);
    const templateId = createTemplateResponse.body.data.id as string;

    const submitResponse = await request(app)
      .post(`/api/v3/memory-palaces/templates/${templateId}/submit-review`)
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        note: 'requesting publish review',
      });

    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body.data.status).toBe('IN_REVIEW');

    const deniedCreate = await request(app)
      .post('/api/v3/memory-palaces')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        journeyId: 'jrn_template_denied_001',
        templateSlug: 'moonlake-celadon',
      });

    expect(deniedCreate.status).toBe(403);
    expect(deniedCreate.body.error.code).toBe('MEMORY_TEMPLATE_UNAVAILABLE');

    await v3MemoryPalaceTemplatePackService.adminReviewTemplate({
      templateId,
      decision: 'APPROVE',
      featureEnabled: true,
      requestedBy: {
        actor: 'admin:seed',
      },
    });

    const listResponse = await request(app)
      .get('/api/v3/memory-palaces/templates')
      .set('x-api-key', 'zfi_other.secretmaterial');

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.total).toBe(1);
    expect(listResponse.body.data.items[0]).toMatchObject({
      id: templateId,
      slug: 'moonlake-celadon',
      status: 'PUBLISHED',
      featureEnabled: true,
    });

    const createWorldResponse = await request(app)
      .post('/api/v3/memory-palaces')
      .set('x-api-key', 'zfi_other.secretmaterial')
      .send({
        journeyId: 'jrn_template_enabled_001',
        templateSlug: 'moonlake-celadon',
      });

    expect(createWorldResponse.status).toBe(201);
    expect(createWorldResponse.body.data.templateSlug).toBe('moonlake-celadon');
  });

  it('write routes require memory.write capability', async () => {
    mockRegistry.authenticateKey.mockResolvedValue(
      buildIntegrationContext({
        appId: 'int_001',
        appSlug: 'owner-app',
        permissions: ['memory.read'],
      })
    );

    const response = await request(app)
      .post('/api/v3/memory-palaces')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        journeyId: 'jrn_denied_001',
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INTEGRATION_PERMISSION_DENIED');
    expect(response.body.error.details.module).toBe('memory');
    expect(response.body.error.details.action).toBe('write');
  });

  it('runtime module switch blocks collaborative writes when memory module is disabled', async () => {
    process.env.V3_RUNTIME_MEMORY_ENABLED = 'false';

    const response = await request(app)
      .post('/api/v3/memory-palaces')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        journeyId: 'jrn_disabled_001',
      });

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('V3_MODULE_DISABLED');
    expect(response.body.error.details.module).toBe('memory');
  });

  it('collaborative write gate can fail-closed by env switch', async () => {
    process.env.V3_MEMORY_PALACE_COLLAB_ENABLED = 'false';

    const response = await request(app)
      .post('/api/v3/memory-palaces')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        journeyId: 'jrn_collab_disabled_001',
      });

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MEMORY_COLLAB_DISABLED');
  });

  it('visit write gate can fail-closed by env switch', async () => {
    const createResponse = await request(app)
      .post('/api/v3/memory-palaces')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial')
      .send({
        journeyId: 'jrn_visit_gate_001',
      });

    expect(createResponse.status).toBe(201);
    const worldId = createResponse.body.data.id as string;

    process.env.V3_MEMORY_PALACE_VISIT_WRITE_ENABLED = 'false';

    const response = await request(app)
      .post(`/api/v3/memory-palaces/${worldId}/visits`)
      .set('x-api-key', 'zfi_other.secretmaterial')
      .send({
        entryType: 'GUESTBOOK',
        message: 'visit should be blocked',
      });

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MEMORY_VISIT_WRITE_DISABLED');
  });
});
