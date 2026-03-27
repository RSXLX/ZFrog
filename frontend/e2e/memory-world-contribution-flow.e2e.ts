import { expect, test } from '@playwright/test';

test('@memory-world-alpha mocked contribution flow', async ({ page }) => {
  let currentWorld = {
    id: 'mpw_001',
    journeyId: 'jrn_story_001',
    title: 'Moonlake Witness Hall',
    summary: 'Shared rescue memory world.',
    templateSlug: null,
    status: 'ACTIVE',
    ownerAppId: 'int_001',
    createdAt: '2026-03-23T00:00:00.000Z',
    updatedAt: '2026-03-23T00:00:00.000Z',
    collaborators: [
      {
        appId: 'int_001',
        role: 'OWNER',
        addedByActor: 'owner-app:ikey_001',
        createdAt: '2026-03-23T00:00:00.000Z',
      },
    ],
    contributions: [] as Array<{
      id: string;
      appId: string;
      actor: string;
      type: string;
      content: string;
      metadata: Record<string, unknown> | null;
      createdAt: string;
    }>,
    metrics: {
      collaboratorCount: 1,
      contributionCount: 0,
    },
  };

  await page.addInitScript(() => {
    (window as any).__ZFROG_V3_MEMORY_WORLD_BETA__ = true;
    (window as any).__ZFROG_V3_MEMORY_WORLD_OWNER__ = true;
    window.localStorage.setItem('zfrog.v3.integrationApiKey', 'test-key');
  });

  await page.route('**/api/v3/memory-palaces/templates*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          total: 0,
          items: [],
        },
      }),
    });
  });

  await page.route('**/api/v3/memory-palaces', async (route) => {
    const payload = route.request().postDataJSON() as {
      journeyId: string;
      title?: string;
    };

    currentWorld = {
      ...currentWorld,
      journeyId: payload.journeyId,
      title: payload.title || currentWorld.title,
    };

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: currentWorld,
      }),
    });
  });

  await page.route('**/api/v3/memory-palaces/mpw_001', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: currentWorld,
      }),
    });
  });

  await page.route('**/api/v3/memory-palaces/mpw_001/contributions', async (route) => {
    const payload = route.request().postDataJSON() as {
      type: string;
      content: string;
      metadata?: Record<string, unknown>;
    };

    const nextContribution = {
      id: 'mpc_001',
      appId: 'int_001',
      actor: 'owner-app:ikey_001',
      type: payload.type,
      content: payload.content,
      metadata: payload.metadata || null,
      createdAt: '2026-03-23T01:00:00.000Z',
    };

    currentWorld = {
      ...currentWorld,
      contributions: [nextContribution, ...currentWorld.contributions],
      metrics: {
        ...currentWorld.metrics,
        contributionCount: currentWorld.metrics.contributionCount + 1,
      },
      updatedAt: '2026-03-23T01:00:00.000Z',
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: currentWorld,
      }),
    });
  });

  await page.goto('/memory-world');
  await expect(page.getByRole('heading', { name: 'V3 Memory World Builder Alpha' })).toBeVisible();

  await page.getByPlaceholder('jrn_story_001').fill('jrn_story_001');
  await page.getByPlaceholder('Moonlake Witness Hall').fill('Moonlake Witness Hall');
  await page.getByRole('button', { name: 'Create World' }).click();

  await expect(page.getByText('Moonlake Witness Hall')).toBeVisible();

  await page
    .getByTestId('memory-world-contribution-content')
    .fill('Left a witness note near the lantern gate.');
  await page.getByTestId('memory-world-add-witness').click();

  await expect(page.getByText('Left a witness note near the lantern gate.')).toBeVisible();
  await expect(page.getByText('WITNESS_NOTE')).toBeVisible();
});
