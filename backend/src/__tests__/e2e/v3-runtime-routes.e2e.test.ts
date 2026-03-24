import express from 'express';
import request from 'supertest';
import v3Routes from '../../api/routes/v3';
import adminV3RuntimeRoutes from '../../api/routes/admin/v3-runtime.routes';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import { integrationRegistryService } from '../../platform/integrations/integration-registry.service';
import { resetV3RuntimeStateForTest } from '../../platform/runtime/v3-runtime.service';
import * as runtimeAuditService from '../../platform/runtime/v3-runtime-audit.service';

jest.mock('../../platform/integrations/integration-registry.service', () => ({
  integrationRegistryService: {
    authenticateKey: jest.fn(),
  },
}));

jest.mock('../../platform/runtime/v3-runtime-audit.service', () => ({
  recordV3RuntimeAuditEvent: jest.fn().mockResolvedValue(undefined),
  listV3RuntimeAuditEvents: jest.fn().mockResolvedValue([]),
}));

describe('V3 Runtime Routes E2E', () => {
  const app = express();
  const mockRegistry = integrationRegistryService as jest.Mocked<typeof integrationRegistryService>;
  const mockRuntimeAudit = runtimeAuditService as jest.Mocked<typeof runtimeAuditService>;
  const originalEnv = {
    V3_RUNTIME_ENABLED: process.env.V3_RUNTIME_ENABLED,
    V3_RUNTIME_KILL_SWITCH: process.env.V3_RUNTIME_KILL_SWITCH,
    V3_RUNTIME_JOURNEY_ENABLED: process.env.V3_RUNTIME_JOURNEY_ENABLED,
  };

  app.use(express.json());
  app.use('/api/v3', v3Routes);
  app.use('/api/admin/v3/runtime', adminV3RuntimeRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
    resetV3RuntimeStateForTest();
    process.env.V3_RUNTIME_ENABLED = 'true';
    process.env.V3_RUNTIME_KILL_SWITCH = 'false';
    process.env.V3_RUNTIME_JOURNEY_ENABLED = 'true';
    jest.clearAllMocks();
    mockRuntimeAudit.listV3RuntimeAuditEvents.mockResolvedValue([]);
    mockRegistry.authenticateKey.mockResolvedValue({
      app: {
        id: 'int_001',
        slug: 'seasonal-world-lab',
        name: 'Seasonal World Lab',
        appType: 'CREATOR',
        status: 'ACTIVE',
      },
      key: {
        id: 'ikey_001',
        keyPrefix: 'zfi_abcd1234',
        label: 'preview',
        status: 'ACTIVE',
        issuedBy: '0xabc0000000000000000000000000000000000001',
        issuedAt: '2026-03-23T00:00:00.000Z',
        expiresAt: null,
        lastUsedAt: '2026-03-23T00:10:00.000Z',
      },
      permissions: ['runtime.read', 'journey.read', 'memory.write'],
    });
  });

  afterAll(() => {
    resetV3RuntimeStateForTest();
    process.env.V3_RUNTIME_ENABLED = originalEnv.V3_RUNTIME_ENABLED;
    process.env.V3_RUNTIME_KILL_SWITCH = originalEnv.V3_RUNTIME_KILL_SWITCH;
    process.env.V3_RUNTIME_JOURNEY_ENABLED = originalEnv.V3_RUNTIME_JOURNEY_ENABLED;
  });

  it('GET /api/v3/runtime/status returns runtime snapshot in structured envelope', async () => {
    const response = await request(app)
      .get('/api/v3/runtime/status')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      enabled: true,
      effectiveEnabled: true,
      killSwitchActive: false,
      env: {
        enabled: true,
        killSwitchActive: false,
      },
    });
    expect(response.body.data.modules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: 'journey',
          overrideEnabled: true,
          effectiveEnabled: true,
          reason: 'enabled',
        }),
      ])
    );
    expect(response.body.data.moduleOverrides).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: 'journey',
          enabled: true,
        }),
      ])
    );
    expect(response.body.data.access).toMatchObject({
      app: {
        id: 'int_001',
        slug: 'seasonal-world-lab',
      },
      key: {
        id: 'ikey_001',
        keyPrefix: 'zfi_abcd1234',
      },
      permissions: ['runtime.read', 'journey.read', 'memory.write'],
      hasRuntimeRead: true,
    });
    expect(response.body.data.access.moduleCapabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: 'journey',
          grantedPermissions: ['journey.read'],
          canRead: true,
          canWrite: false,
          runtimeEnabled: true,
          runtimeReason: 'enabled',
        }),
        expect.objectContaining({
          module: 'memory',
          grantedPermissions: ['memory.write'],
          canRead: true,
          canWrite: true,
          runtimeEnabled: true,
          runtimeReason: 'enabled',
        }),
      ])
    );
    expect(response.body.meta.requestId).toBeTruthy();
    expect(mockRegistry.authenticateKey).toHaveBeenCalledWith('zfi_abcd1234.secretmaterial');
  });

  it('GET /api/v3/runtime/status requires an integration api key', async () => {
    const response = await request(app).get('/api/v3/runtime/status');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INTEGRATION_API_KEY_REQUIRED');
    expect(response.body.error.message).toContain('api key');
  });

  it('GET /api/v3/runtime/status requires runtime.read permission', async () => {
    mockRegistry.authenticateKey.mockResolvedValue({
      app: {
        id: 'int_001',
        slug: 'seasonal-world-lab',
        name: 'Seasonal World Lab',
        appType: 'CREATOR',
        status: 'ACTIVE',
      },
      key: {
        id: 'ikey_001',
        keyPrefix: 'zfi_abcd1234',
        label: 'preview',
        status: 'ACTIVE',
        issuedBy: '0xabc0000000000000000000000000000000000001',
        issuedAt: '2026-03-23T00:00:00.000Z',
        expiresAt: null,
        lastUsedAt: '2026-03-23T00:10:00.000Z',
      },
      permissions: ['journey.read'],
    });

    const response = await request(app)
      .get('/api/v3/runtime/status')
      .set('Authorization', 'Bearer zfi_abcd1234.secretmaterial');

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INTEGRATION_PERMISSION_DENIED');
    expect(response.body.error.details.requiredPermission).toBe('runtime.read');
  });

  it('POST /api/admin/v3/runtime/kill-switch toggles process-local kill switch override', async () => {
    const response = await request(app)
      .post('/api/admin/v3/runtime/kill-switch')
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001')
      .send({
        active: true,
        reason: 'manual-safety-stop',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      killSwitchActive: true,
      effectiveEnabled: false,
      override: {
        active: true,
        updatedBy: '0xabc0000000000000000000000000000000000001',
        reason: 'manual-safety-stop',
      },
      receipt: {
        action: 'kill_switch_enabled',
        updatedBy: '0xabc0000000000000000000000000000000000001',
      },
    });

    const statusResponse = await request(app)
      .get('/api/v3/runtime/status')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial');
    expect(statusResponse.body.data.killSwitchActive).toBe(true);
    expect(statusResponse.body.data.effectiveEnabled).toBe(false);
    expect(statusResponse.body.data.modules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: 'journey',
          overrideEnabled: true,
          effectiveEnabled: false,
          reason: 'kill_switch_active',
        }),
      ])
    );
    expect(mockRuntimeAudit.recordV3RuntimeAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: 'kill_switch_enabled',
      actor: '0xabc0000000000000000000000000000000000001',
      source: 'admin.v3.runtime',
    }));
  });

  it('POST /api/admin/v3/runtime/kill-switch validates boolean active', async () => {
    const response = await request(app)
      .post('/api/admin/v3/runtime/kill-switch')
      .send({ active: 'yes' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('active');
  });

  it('environment kill switch remains effective even after admin override disables local flag', async () => {
    process.env.V3_RUNTIME_KILL_SWITCH = 'true';

    const response = await request(app)
      .post('/api/admin/v3/runtime/kill-switch')
      .send({ active: false });

    expect(response.status).toBe(200);
    expect(response.body.data.killSwitchActive).toBe(true);
    expect(response.body.data.effectiveEnabled).toBe(false);
    expect(response.body.data.env.killSwitchActive).toBe(true);
  });

  it('POST /api/admin/v3/runtime/modules/:module/toggle applies module override and disables runtime capability', async () => {
    const response = await request(app)
      .post('/api/admin/v3/runtime/modules/journey/toggle')
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001')
      .send({
        active: false,
        reason: 'manual-journey-gate-off',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.modules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: 'journey',
          envEnabled: true,
          overrideEnabled: false,
          effectiveEnabled: false,
          reason: 'module_override_disabled',
        }),
      ])
    );
    expect(response.body.data.receipt).toMatchObject({
      action: 'module_disabled',
      module: 'journey',
      updatedBy: '0xabc0000000000000000000000000000000000001',
      reason: 'manual-journey-gate-off',
    });

    const statusResponse = await request(app)
      .get('/api/v3/runtime/status')
      .set('x-api-key', 'zfi_abcd1234.secretmaterial');

    expect(statusResponse.status).toBe(200);
    expect(statusResponse.body.data.modules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: 'journey',
          effectiveEnabled: false,
          reason: 'module_override_disabled',
        }),
      ])
    );
    expect(statusResponse.body.data.access.moduleCapabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          module: 'journey',
          runtimeEnabled: false,
          runtimeReason: 'module_override_disabled',
        }),
      ])
    );
    expect(mockRuntimeAudit.recordV3RuntimeAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: 'module_disabled',
      module: 'journey',
      actor: '0xabc0000000000000000000000000000000000001',
    }));
  });

  it('POST /api/admin/v3/runtime/modules/:module/toggle validates module', async () => {
    const response = await request(app)
      .post('/api/admin/v3/runtime/modules/unknown/toggle')
      .send({ active: true });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('module');
  });

  it('GET /api/admin/v3/runtime/audit returns runtime audit entries', async () => {
    mockRuntimeAudit.listV3RuntimeAuditEvents.mockResolvedValue([
      {
        id: '9001',
        action: 'module_disabled',
        module: 'journey',
        actor: '0xabc0000000000000000000000000000000000001',
        reason: 'manual-journey-gate-off',
        requestId: 'req_v3_runtime_1',
        source: 'admin.v3.runtime',
        occurredAt: '2026-03-23T00:00:00.000Z',
        details: {
          moduleEffectiveEnabled: false,
        },
      },
    ]);

    const response = await request(app)
      .get('/api/admin/v3/runtime/audit')
      .query({ limit: 1 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.count).toBe(1);
    expect(response.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: '9001',
          action: 'module_disabled',
          module: 'journey',
        }),
      ])
    );
    expect(mockRuntimeAudit.listV3RuntimeAuditEvents).toHaveBeenCalledWith({
      limit: 1,
      module: undefined,
    });
  });
});
