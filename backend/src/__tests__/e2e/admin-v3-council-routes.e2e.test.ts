import express from 'express';
import request from 'supertest';
import adminV3CouncilRoutes from '../../api/routes/admin/v3-council.routes';
import { errorHandler, notFoundHandler } from '../../middlewares/errorHandler';
import {
  resetCouncilRiskPolicyForTest,
  setCouncilRiskLevelOverride,
} from '../../modules/council/council-policy.service';
import {
  resetV3CouncilSuggestionStoreForTest,
  v3CouncilSuggestionService,
} from '../../modules/council/council-suggestion.service';
import * as councilAuditService from '../../modules/council/council-audit.service';

jest.mock('../../modules/council/council-audit.service', () => ({
  recordCouncilPolicyAuditEvent: jest.fn().mockResolvedValue(undefined),
  listCouncilPolicyAuditEvents: jest.fn().mockResolvedValue([]),
}));

describe('Admin V3 Council Routes E2E', () => {
  const app = express();
  const mockCouncilAudit = councilAuditService as jest.Mocked<typeof councilAuditService>;
  const originalEnv = {
    V3_COUNCIL_STORAGE_MODE: process.env.V3_COUNCIL_STORAGE_MODE,
    V3_COUNCIL_ACTIONS_ENABLED: process.env.V3_COUNCIL_ACTIONS_ENABLED,
    V3_COUNCIL_ALLOW_LOW_RISK: process.env.V3_COUNCIL_ALLOW_LOW_RISK,
    V3_COUNCIL_ALLOW_MEDIUM_RISK: process.env.V3_COUNCIL_ALLOW_MEDIUM_RISK,
    V3_COUNCIL_ALLOW_HIGH_RISK: process.env.V3_COUNCIL_ALLOW_HIGH_RISK,
  };

  app.use(express.json());
  app.use('/api/admin/v3/council', adminV3CouncilRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();
    resetV3CouncilSuggestionStoreForTest();
    resetCouncilRiskPolicyForTest();
    process.env.V3_COUNCIL_STORAGE_MODE = 'memory';
    process.env.V3_COUNCIL_ACTIONS_ENABLED = 'true';
    process.env.V3_COUNCIL_ALLOW_LOW_RISK = 'true';
    process.env.V3_COUNCIL_ALLOW_MEDIUM_RISK = 'true';
    process.env.V3_COUNCIL_ALLOW_HIGH_RISK = 'true';
    mockCouncilAudit.listCouncilPolicyAuditEvents.mockResolvedValue([]);
  });

  afterAll(() => {
    resetV3CouncilSuggestionStoreForTest();
    resetCouncilRiskPolicyForTest();
    process.env.V3_COUNCIL_STORAGE_MODE = originalEnv.V3_COUNCIL_STORAGE_MODE;
    process.env.V3_COUNCIL_ACTIONS_ENABLED = originalEnv.V3_COUNCIL_ACTIONS_ENABLED;
    process.env.V3_COUNCIL_ALLOW_LOW_RISK = originalEnv.V3_COUNCIL_ALLOW_LOW_RISK;
    process.env.V3_COUNCIL_ALLOW_MEDIUM_RISK = originalEnv.V3_COUNCIL_ALLOW_MEDIUM_RISK;
    process.env.V3_COUNCIL_ALLOW_HIGH_RISK = originalEnv.V3_COUNCIL_ALLOW_HIGH_RISK;
  });

  it('GET /api/admin/v3/council/audit returns suggestion trace/data-source/result fields', async () => {
    const suggestion = await v3CouncilSuggestionService.createSuggestion({
      focus: 'stabilize council memory growth',
      objective: 'reduce summary churn',
      riskLevel: 'HIGH',
      dataSources: [
        {
          source: 'memory.summary.daily',
          referenceId: 'ms_001',
          freshness: 'latest',
        },
      ],
      requestedBy: {
        appId: 'int_001',
        keyId: 'ikey_001',
        actor: 'council-app:ikey_001',
        requestId: 'req_001',
      },
    });

    await v3CouncilSuggestionService.respondSuggestion({
      suggestionId: suggestion.id,
      decision: 'DEFER',
      note: 'need more evidence',
      requestedBy: {
        appId: 'int_001',
        actor: 'council-app:ikey_001',
      },
    });

    const response = await request(app)
      .get('/api/admin/v3/council/audit')
      .query({
        status: 'DEFERRED',
        riskLevel: 'HIGH',
        appId: 'int_001',
        limit: 10,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.total).toBe(1);
    expect(response.body.data.items[0]).toMatchObject({
      id: suggestion.id,
      status: 'DEFERRED',
      risk: {
        level: 'HIGH',
      },
      trace: {
        promptKitVersion: 'v3-council-suggest-v1',
      },
    });
    expect(response.body.data.items[0].dataSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'memory.summary.daily',
        }),
      ])
    );
    expect(response.body.data.items[0].response).toMatchObject({
      decision: 'DEFER',
      note: 'need more evidence',
    });
  });

  it('POST /api/admin/v3/council/policy/risk-levels/:level/toggle updates policy and records audit', async () => {
    const response = await request(app)
      .post('/api/admin/v3/council/policy/risk-levels/high/toggle')
      .set('x-admin-address', '0xabc0000000000000000000000000000000000001')
      .send({
        active: false,
        reason: 'pause high risk rollouts',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.receipt).toMatchObject({
      action: 'risk_level_disabled',
      riskLevel: 'HIGH',
      updatedBy: '0xabc0000000000000000000000000000000000001',
      reason: 'pause high risk rollouts',
    });
    expect(response.body.data.levels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          riskLevel: 'HIGH',
          effectiveEnabled: false,
          reason: 'policy_override_disabled',
        }),
      ])
    );
    expect(mockCouncilAudit.recordCouncilPolicyAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'risk_level_disabled',
        riskLevel: 'HIGH',
        actor: '0xabc0000000000000000000000000000000000001',
      })
    );
  });

  it('GET /api/admin/v3/council/policy returns risk-level policy snapshot', async () => {
    setCouncilRiskLevelOverride({
      riskLevel: 'LOW',
      enabled: false,
      updatedBy: '0xadmin',
      reason: 'pause low risk suggestions',
    });

    const response = await request(app).get('/api/admin/v3/council/policy');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.levels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          riskLevel: 'LOW',
          effectiveEnabled: false,
          reason: 'policy_override_disabled',
        }),
      ])
    );
  });

  it('GET /api/admin/v3/council/policy/audit returns policy audit feed', async () => {
    mockCouncilAudit.listCouncilPolicyAuditEvents.mockResolvedValue([
      {
        id: '901',
        action: 'risk_level_disabled',
        riskLevel: 'HIGH',
        actor: '0xabc0000000000000000000000000000000000001',
        reason: 'pause high risk rollouts',
        requestId: 'req_admin_1',
        source: 'admin.v3.council',
        occurredAt: '2026-03-23T00:00:00.000Z',
        details: {
          effectiveEnabled: false,
        },
      },
    ]);

    const response = await request(app)
      .get('/api/admin/v3/council/policy/audit')
      .query({
        riskLevel: 'HIGH',
        limit: 10,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.count).toBe(1);
    expect(response.body.data.items[0]).toMatchObject({
      action: 'risk_level_disabled',
      riskLevel: 'HIGH',
    });
    expect(mockCouncilAudit.listCouncilPolicyAuditEvents).toHaveBeenCalledWith({
      riskLevel: 'HIGH',
      limit: 10,
    });
  });
});
