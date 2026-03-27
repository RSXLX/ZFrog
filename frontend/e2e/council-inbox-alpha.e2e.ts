import { expect, test } from '@playwright/test';

test('@council-alpha mocked inbox detail respond flow', async ({ page }) => {
  let suggestionStatus: 'OPEN' | 'ACCEPTED' | 'REJECTED' | 'DEFERRED' = 'OPEN';
  let responseDecision: 'ACCEPT' | 'REJECT' | 'DEFER' | null = null;
  let responseNote: string | null = null;
  let respondedAt: string | null = null;

  const buildSuggestion = () => ({
    id: 'csg_001',
    runId: 'crn_001',
    title: 'Council Plan: Totem Repair Sprint',
    focus: 'Collect 3 witness notes and repair family totem this week.',
    objective: 'Raise shared trust score.',
    rationale: 'Journey incident logs show repair chance window is active for 48 hours.',
    risk: {
      level: 'MEDIUM',
      reason: 'Requires at least two active participants.',
    },
    dataSources: [
      {
        source: 'journey_incidents',
        referenceId: 'evt_001',
        freshness: '5m',
      },
    ],
    suggestedActions: [
      {
        id: 'act_001',
        label: 'Start Rescue Shift',
        detail: 'Assign one frog for rescue and one for witness.',
      },
    ],
    status: suggestionStatus,
    trace: {
      traceId: 'trace_001',
      promptKitVersion: 'v3-council-suggest-v1',
      model: 'heuristic-council-planner',
      fingerprint: 'abc123def4567890',
    },
    createdAt: '2026-03-23T00:00:00.000Z',
    updatedAt: respondedAt || '2026-03-23T00:00:00.000Z',
    response: {
      decision: responseDecision,
      note: responseNote,
      respondedAt,
      respondedByActor: responseDecision ? 'app_alpha:key_alpha' : null,
    },
    audit: {
      createdByAppId: 'app_alpha',
      createdByKeyId: 'key_alpha',
      createdByActor: 'app_alpha:key_alpha',
      requestId: null,
      updatedByActor: 'app_alpha:key_alpha',
    },
  });

  await page.context().addInitScript(() => {
    (window as any).__ZFROG_V3_COUNCIL_BETA__ = true;
    window.localStorage.setItem('zfrog.v3.integrationApiKey', 'test-key');
  });

  const listHandler = async (route: any) => {
    const url = new URL(route.request().url());
    const statusFilter = url.searchParams.get('status');
    const suggestion = buildSuggestion();
    const items =
      !statusFilter || statusFilter === suggestion.status ? [suggestion] : [];

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          total: items.length,
          items,
        },
      }),
    });
  };

  await page.route('**/api/v3/council/suggestions?*', listHandler);
  await page.route('**/api/v3/council/suggestions', listHandler);

  await page.route('**/api/v3/council/suggestions/*/respond', async (route) => {
    const payload = route.request().postDataJSON() as {
      decision: 'ACCEPT' | 'REJECT' | 'DEFER';
      note?: string;
    };

    responseDecision = payload.decision;
    responseNote = payload.note || null;
    respondedAt = '2026-03-23T01:00:00.000Z';
    suggestionStatus =
      payload.decision === 'ACCEPT'
        ? 'ACCEPTED'
        : payload.decision === 'REJECT'
          ? 'REJECTED'
          : 'DEFERRED';

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: buildSuggestion(),
      }),
    });
  });

  await page.route('**/api/v3/council/suggestions/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: buildSuggestion(),
      }),
    });
  });

  await page.goto('/council');
  if (await page.getByRole('heading', { name: 'Council Inbox 正在灰度' }).isVisible().catch(() => false)) {
    await page.reload();
  }
  await expect(page.getByRole('heading', { name: 'V3 Council Inbox Alpha' })).toBeVisible();

  await page.getByRole('button', { name: 'Load Inbox' }).click();
  await expect(page.getByTestId('council-inbox-item-csg_001')).toBeVisible();

  await page.getByTestId('council-inbox-item-csg_001').click();
  await expect(page.getByRole('heading', { name: 'Council Plan: Totem Repair Sprint' })).toBeVisible();

  await page.getByTestId('council-response-note').fill('Proceed now');
  await page.getByRole('button', { name: 'Accept' }).click();

  await expect(page.getByText('Status: ACCEPTED')).toBeVisible();
  await expect(page.getByText(/Decision: ACCEPT/)).toBeVisible();
});
