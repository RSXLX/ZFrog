import { expect, test } from '@playwright/test';

const ADMIN_ADDRESS = '0x1111111111111111111111111111111111111111';

type RuntimeModule =
  | 'journey'
  | 'council'
  | 'memory'
  | 'creator'
  | 'partner'
  | 'relationshipGraph';

const buildRuntimeStatus = (relationshipGraphEnabled: boolean) => ({
  enabled: true,
  effectiveEnabled: true,
  killSwitchActive: false,
  modules: [
    {
      module: 'journey' as RuntimeModule,
      envEnabled: true,
      overrideEnabled: true,
      effectiveEnabled: true,
      reason: 'enabled' as const,
    },
    {
      module: 'council' as RuntimeModule,
      envEnabled: true,
      overrideEnabled: true,
      effectiveEnabled: true,
      reason: 'enabled' as const,
    },
    {
      module: 'memory' as RuntimeModule,
      envEnabled: true,
      overrideEnabled: true,
      effectiveEnabled: true,
      reason: 'enabled' as const,
    },
    {
      module: 'creator' as RuntimeModule,
      envEnabled: true,
      overrideEnabled: true,
      effectiveEnabled: true,
      reason: 'enabled' as const,
    },
    {
      module: 'partner' as RuntimeModule,
      envEnabled: true,
      overrideEnabled: true,
      effectiveEnabled: true,
      reason: 'enabled' as const,
    },
    {
      module: 'relationshipGraph' as RuntimeModule,
      envEnabled: true,
      overrideEnabled: relationshipGraphEnabled,
      effectiveEnabled: relationshipGraphEnabled,
      reason: relationshipGraphEnabled ? ('enabled' as const) : ('module_override_disabled' as const),
    },
  ],
});

test.describe('@v3-dashboard-smoke Admin V3Dashboard dual-state smoke', () => {
  test('beta off: hides menu entry and shows fail-closed notice on route', async ({ page }) => {
    await page.addInitScript(({ adminAddress }) => {
      window.localStorage.setItem('walletAddress', adminAddress);
      delete (window as any).__ZFROG_ADMIN_V3_DASHBOARD_BETA__;
    }, { adminAddress: ADMIN_ADDRESS });

    await page.goto('/v3-dashboard');

    await expect(page.getByText('V3 Dashboard Beta 入口已关闭')).toBeVisible();
    await expect(
      page.locator('.ant-menu-item').filter({ hasText: 'V3 Dashboard' })
    ).toHaveCount(0);
  });

  test('beta on: loads overview, supports runtime toggle, and jumps to graph detail', async ({ page }) => {
    await page.addInitScript(({ adminAddress }) => {
      window.localStorage.setItem('walletAddress', adminAddress);
      (window as any).__ZFROG_ADMIN_V3_DASHBOARD_BETA__ = true;
    }, { adminAddress: ADMIN_ADDRESS });

    let relationshipGraphOverrideEnabled = true;

    await page.route('**/api/admin/v3/runtime/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: buildRuntimeStatus(relationshipGraphOverrideEnabled),
        }),
      });
    });

    await page.route('**/api/admin/v3/runtime/modules/*/toggle', async (route) => {
      const moduleName = route.request().url().split('/').slice(-2, -1)[0];
      const payload = route.request().postDataJSON() as { active: boolean };

      if (moduleName === 'relationshipGraph') {
        relationshipGraphOverrideEnabled = Boolean(payload?.active);
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: buildRuntimeStatus(relationshipGraphOverrideEnabled),
        }),
      });
    });

    await page.route('**/api/admin/v3/creators/review-queue?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            total: 1,
            items: [
              {
                id: 'cpk_001',
                title: 'Moonlake Creator Pack',
                status: 'IN_REVIEW',
                updatedAt: '2026-03-24T06:30:00.000Z',
              },
            ],
          },
        }),
      });
    });

    await page.route('**/api/admin/v3/partners/campaigns?*', async (route) => {
      const url = new URL(route.request().url());
      const status = url.searchParams.get('status');
      const isPublished = status === 'PUBLISHED';

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            total: isPublished ? 1 : 0,
            items: isPublished
              ? [
                  {
                    id: 'pcm_001',
                    title: 'Moonlight Partner Campaign',
                    status: 'PUBLISHED',
                    updatedAt: '2026-03-24T06:31:00.000Z',
                  },
                ]
              : [],
          },
        }),
      });
    });

    await page.route('**/api/admin/v3/memory-palaces/templates/review?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            total: 1,
            items: [
              {
                id: 'tpl_001',
                name: 'Moon Lake Pack',
                status: 'IN_REVIEW',
                featureEnabled: false,
                updatedAt: '2026-03-24T06:32:00.000Z',
              },
            ],
          },
        }),
      });
    });

    await page.route('**/api/admin/v3/council/audit?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            total: 1,
            items: [
              {
                id: 'csg_001',
                title: 'Council Plan: Witness Sprint',
                status: 'OPEN',
                risk: {
                  level: 'MEDIUM',
                },
                updatedAt: '2026-03-24T06:33:00.000Z',
              },
            ],
          },
        }),
      });
    });

    await page.route('**/api/admin/v3/relationship-graph/frogs/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            frogId: 901,
            edges: [],
            snapshots: [],
          },
        }),
      });
    });

    await page.goto('/v3-dashboard');

    await expect(page.getByText('V3 Beta 运营总控看板')).toBeVisible();
    await expect(page.getByText('Moonlake Creator Pack')).toBeVisible();
    await expect(page.getByText('Moonlight Partner Campaign')).toBeVisible();

    const relationshipGraphModuleRow = page
      .locator('.ant-list-item')
      .filter({ hasText: 'Relationship Graph' })
      .first();
    await expect(relationshipGraphModuleRow.getByText('ACTIVE')).toBeVisible();
    await relationshipGraphModuleRow.getByRole('switch').click();
    await expect(relationshipGraphModuleRow.getByText('BLOCKED')).toBeVisible();

    await page.getByPlaceholder('appId, e.g. int_rel_main').fill('int_rel_main');
    await page.getByPlaceholder('frogId, e.g. 901').fill('901');
    await page.getByRole('button', { name: '打开 Relationship Graph' }).click();
    await expect(page).toHaveURL(/\/relationship-graph\/int_rel_main\/901$/);
  });
});
