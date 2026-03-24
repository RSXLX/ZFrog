import {
  resetCouncilRiskPolicyForTest,
  setCouncilRiskLevelOverride,
} from '../../modules/council/council-policy.service';
import {
  resetV3CouncilSuggestionStoreForTest,
  v3CouncilSuggestionService,
} from '../../modules/council/council-suggestion.service';

describe('Council Risk Policy Integration', () => {
  const originalEnv = {
    V3_COUNCIL_STORAGE_MODE: process.env.V3_COUNCIL_STORAGE_MODE,
    V3_COUNCIL_ACTIONS_ENABLED: process.env.V3_COUNCIL_ACTIONS_ENABLED,
    V3_COUNCIL_ALLOW_LOW_RISK: process.env.V3_COUNCIL_ALLOW_LOW_RISK,
    V3_COUNCIL_ALLOW_MEDIUM_RISK: process.env.V3_COUNCIL_ALLOW_MEDIUM_RISK,
    V3_COUNCIL_ALLOW_HIGH_RISK: process.env.V3_COUNCIL_ALLOW_HIGH_RISK,
  };

  beforeEach(() => {
    resetV3CouncilSuggestionStoreForTest();
    resetCouncilRiskPolicyForTest();
    process.env.V3_COUNCIL_STORAGE_MODE = 'memory';
    process.env.V3_COUNCIL_ACTIONS_ENABLED = 'true';
    process.env.V3_COUNCIL_ALLOW_LOW_RISK = 'true';
    process.env.V3_COUNCIL_ALLOW_MEDIUM_RISK = 'true';
    process.env.V3_COUNCIL_ALLOW_HIGH_RISK = 'true';
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

  it('blocks suggestion creation when risk level is paused by override', async () => {
    setCouncilRiskLevelOverride({
      riskLevel: 'HIGH',
      enabled: false,
      updatedBy: '0xadmin',
      reason: 'pause-high-risk',
    });

    await expect(
      v3CouncilSuggestionService.createSuggestion({
        focus: 'high risk launch',
        riskLevel: 'HIGH',
        requestedBy: {
          appId: 'int_001',
          keyId: 'ikey_001',
          actor: 'council-app:ikey_001',
        },
      })
    ).rejects.toMatchObject({
      code: 'COUNCIL_RISK_LEVEL_DISABLED',
      statusCode: 503,
    });
  });

  it('blocks suggestion creation when risk level is disabled by env gate', async () => {
    process.env.V3_COUNCIL_ALLOW_MEDIUM_RISK = 'false';

    await expect(
      v3CouncilSuggestionService.createSuggestion({
        focus: 'medium risk launch',
        riskLevel: 'MEDIUM',
        requestedBy: {
          appId: 'int_001',
          keyId: 'ikey_001',
          actor: 'council-app:ikey_001',
        },
      })
    ).rejects.toMatchObject({
      code: 'COUNCIL_RISK_LEVEL_DISABLED',
      statusCode: 503,
    });
  });

  it('supports admin risk/status filtering through listSuggestionsForAdmin', async () => {
    const high = await v3CouncilSuggestionService.createSuggestion({
      focus: 'high risk',
      riskLevel: 'HIGH',
      requestedBy: {
        appId: 'int_001',
        keyId: 'ikey_001',
        actor: 'council-app:ikey_001',
      },
    });

    const medium = await v3CouncilSuggestionService.createSuggestion({
      focus: 'medium risk',
      riskLevel: 'MEDIUM',
      requestedBy: {
        appId: 'int_001',
        keyId: 'ikey_001',
        actor: 'council-app:ikey_001',
      },
    });

    await v3CouncilSuggestionService.respondSuggestion({
      suggestionId: medium.id,
      decision: 'DEFER',
      requestedBy: {
        appId: 'int_001',
        actor: 'council-app:ikey_001',
      },
    });

    const filtered = await v3CouncilSuggestionService.listSuggestionsForAdmin({
      scopeAppId: 'int_001',
      riskLevel: 'HIGH',
      status: 'OPEN',
      limit: 10,
    });

    expect(filtered.total).toBe(1);
    expect(filtered.items[0]?.id).toBe(high.id);
  });
});
