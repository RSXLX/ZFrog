import {
  resetV3CouncilBriefServiceForTest,
  v3CouncilBriefService,
} from '../../modules/council/council-brief.service';
import {
  resetV3CouncilSuggestionStoreForTest,
  v3CouncilSuggestionService,
} from '../../modules/council/council-suggestion.service';

describe('CouncilBriefService Integration', () => {
  const originalEnv = {
    V3_COUNCIL_STORAGE_MODE: process.env.V3_COUNCIL_STORAGE_MODE,
    V3_COUNCIL_ACTIONS_ENABLED: process.env.V3_COUNCIL_ACTIONS_ENABLED,
    V3_COUNCIL_BRIEF_ENABLED: process.env.V3_COUNCIL_BRIEF_ENABLED,
  };

  beforeEach(() => {
    process.env.V3_COUNCIL_STORAGE_MODE = 'memory';
    process.env.V3_COUNCIL_ACTIONS_ENABLED = 'true';
    process.env.V3_COUNCIL_BRIEF_ENABLED = 'true';
    resetV3CouncilSuggestionStoreForTest();
    resetV3CouncilBriefServiceForTest();
  });

  afterAll(() => {
    process.env.V3_COUNCIL_STORAGE_MODE = originalEnv.V3_COUNCIL_STORAGE_MODE;
    process.env.V3_COUNCIL_ACTIONS_ENABLED = originalEnv.V3_COUNCIL_ACTIONS_ENABLED;
    process.env.V3_COUNCIL_BRIEF_ENABLED = originalEnv.V3_COUNCIL_BRIEF_ENABLED;
    resetV3CouncilSuggestionStoreForTest();
    resetV3CouncilBriefServiceForTest();
  });

  it('builds a council brief for scoped app and enforces throttle on repeated pull', async () => {
    await v3CouncilSuggestionService.createSuggestion({
      focus: 'weekly rescue drill',
      requestedBy: {
        appId: 'int_001',
        keyId: 'ikey_001',
        actor: 'council-app:ikey_001',
      },
    });

    const firstBrief = await v3CouncilBriefService.getBrief({
      scopeAppId: 'int_001',
      channel: 'desktop',
    });

    expect(firstBrief.delivery.status).toBe('DELIVERED');
    expect(firstBrief.delivery.shouldNotify).toBe(true);
    expect(firstBrief.metrics.open).toBe(1);

    const secondBrief = await v3CouncilBriefService.getBrief({
      scopeAppId: 'int_001',
      channel: 'desktop',
    });

    expect(secondBrief.delivery.status).toBe('THROTTLED');
    expect(secondBrief.delivery.shouldNotify).toBe(false);
    expect(secondBrief.delivery.nextAllowedAt).toBeTruthy();
  });

  it('applies channel preference update and fail-closes disabled channel delivery', async () => {
    await v3CouncilSuggestionService.createSuggestion({
      focus: 'mobile recall test',
      requestedBy: {
        appId: 'int_001',
        keyId: 'ikey_001',
        actor: 'council-app:ikey_001',
      },
    });

    const updated = v3CouncilBriefService.updatePreferences({
      channels: {
        mobileLite: false,
      },
      requestedBy: {
        appId: 'int_001',
        keyId: 'ikey_001',
        actor: 'council-app:ikey_001',
      },
    });

    expect(updated.channels.mobileLite).toBe(false);

    const mobileBrief = await v3CouncilBriefService.getBrief({
      scopeAppId: 'int_001',
      channel: 'mobile_lite',
    });

    expect(mobileBrief.delivery.status).toBe('DISABLED');
    expect(mobileBrief.delivery.shouldNotify).toBe(false);
    expect(mobileBrief.delivery.notificationsEnabled).toBe(false);
  });
});
