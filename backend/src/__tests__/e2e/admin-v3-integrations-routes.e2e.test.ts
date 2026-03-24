import express from 'express';
import request from 'supertest';
import adminV3IntegrationsRoutes from '../../api/routes/admin/v3-integrations.routes';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import { integrationRegistryService } from '../../platform/integrations/integration-registry.service';

jest.mock('../../platform/integrations/integration-registry.service', () => ({
  integrationRegistryService: {
    getCatalog: jest.fn(),
    listApps: jest.fn(),
    getAppById: jest.fn(),
    registerApp: jest.fn(),
    issueKey: jest.fn(),
    revokeKey: jest.fn(),
  },
}));

describe('Admin V3 Integration Routes E2E', () => {
  const app = express();
  const mockRegistry = integrationRegistryService as jest.Mocked<typeof integrationRegistryService>;

  app.use(express.json());
  app.use('/api/admin/v3/integrations', adminV3IntegrationsRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/admin/v3/integrations/catalog returns enum catalog', async () => {
    mockRegistry.getCatalog.mockReturnValue({
      appTypes: ['INTERNAL', 'CREATOR', 'PARTNER', 'PLUGIN'],
      appStatuses: ['ACTIVE', 'DISABLED'],
      keyStatuses: ['ACTIVE', 'REVOKED', 'EXPIRED'],
      permissions: ['runtime.read', 'memory.write'],
    });

    const response = await request(app).get('/api/admin/v3/integrations/catalog');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.permissions).toContain('memory.write');
    expect(mockRegistry.getCatalog).toHaveBeenCalledTimes(1);
  });

  it('POST /api/admin/v3/integrations registers app and returns read model', async () => {
    mockRegistry.registerApp.mockResolvedValue({
      id: 'int_001',
      slug: 'seasonal-world-lab',
      name: 'Seasonal World Lab',
      appType: 'CREATOR',
      status: 'ACTIVE',
      permissions: ['memory.write', 'creator.pack.write'],
      metadata: { region: 'global' },
      createdAt: '2026-03-23T00:00:00.000Z',
      updatedAt: '2026-03-23T00:00:00.000Z',
      keys: [],
    });

    const response = await request(app)
      .post('/api/admin/v3/integrations')
      .send({
        slug: 'seasonal-world-lab',
        name: 'Seasonal World Lab',
        appType: 'CREATOR',
        permissions: ['memory.write', 'creator.pack.write'],
        metadata: { region: 'global' },
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      id: 'int_001',
      slug: 'seasonal-world-lab',
      appType: 'CREATOR',
      permissions: ['memory.write', 'creator.pack.write'],
    });

    expect(mockRegistry.registerApp).toHaveBeenCalledWith(expect.objectContaining({
      slug: 'seasonal-world-lab',
      appType: 'CREATOR',
      permissions: ['memory.write', 'creator.pack.write'],
      source: 'admin.v3.integrations',
    }));
  });

  it('POST /api/admin/v3/integrations/:appId/keys issues integration key and returns secret once', async () => {
    mockRegistry.issueKey.mockResolvedValue({
      app: {
        id: 'int_001',
        slug: 'seasonal-world-lab',
        name: 'Seasonal World Lab',
        appType: 'CREATOR',
        status: 'ACTIVE',
        permissions: ['memory.write'],
        metadata: null,
        createdAt: '2026-03-23T00:00:00.000Z',
        updatedAt: '2026-03-23T00:00:00.000Z',
        keys: [],
      },
      key: {
        id: 'ikey_001',
        keyPrefix: 'zfi_abcd1234',
        label: 'preview',
        status: 'ACTIVE',
        issuedBy: '0xabc0000000000000000000000000000000000001',
        issuedAt: '2026-03-23T00:00:00.000Z',
        revokedAt: null,
        expiresAt: null,
        lastUsedAt: null,
        createdAt: '2026-03-23T00:00:00.000Z',
        updatedAt: '2026-03-23T00:00:00.000Z',
      },
      secret: 'zfi_abcd1234.secretmaterial',
    });

    const response = await request(app)
      .post('/api/admin/v3/integrations/int_001/keys')
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001')
      .send({
        label: 'preview',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.secret).toBe('zfi_abcd1234.secretmaterial');
    expect(response.body.data.key).toMatchObject({
      id: 'ikey_001',
      keyPrefix: 'zfi_abcd1234',
      status: 'ACTIVE',
    });

    expect(mockRegistry.issueKey).toHaveBeenCalledWith(expect.objectContaining({
      appId: 'int_001',
      label: 'preview',
      issuedBy: '0xabc0000000000000000000000000000000000001',
      source: 'admin.v3.integrations',
    }));
  });

  it('POST /api/admin/v3/integrations/:appId/keys/:keyId/revoke revokes key', async () => {
    mockRegistry.revokeKey.mockResolvedValue({
      id: 'ikey_001',
      keyPrefix: 'zfi_abcd1234',
      label: 'preview',
      status: 'REVOKED',
      issuedBy: '0xabc0000000000000000000000000000000000001',
      issuedAt: '2026-03-23T00:00:00.000Z',
      revokedAt: '2026-03-23T01:00:00.000Z',
      expiresAt: null,
      lastUsedAt: null,
      createdAt: '2026-03-23T00:00:00.000Z',
      updatedAt: '2026-03-23T01:00:00.000Z',
    });

    const response = await request(app)
      .post('/api/admin/v3/integrations/int_001/keys/ikey_001/revoke')
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('REVOKED');
    expect(mockRegistry.revokeKey).toHaveBeenCalledWith(expect.objectContaining({
      appId: 'int_001',
      keyId: 'ikey_001',
      revokedBy: '0xabc0000000000000000000000000000000000001',
      source: 'admin.v3.integrations',
    }));
  });
});
