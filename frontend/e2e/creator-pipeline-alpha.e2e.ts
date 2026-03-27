import { expect, test } from '@playwright/test';

test('@creator-alpha mocked upload and pack draft flow', async ({ page }) => {
  const currentAssets: Array<{
    id: string;
    creatorAppId: string;
    type: 'IMAGE' | 'AUDIO' | 'MODEL' | 'TEXTURE' | 'SCRIPT';
    mimeType: string;
    sourceUrl: string;
    checksum: string;
    bytes: number;
    status: 'READY' | 'REJECTED';
    metadata: Record<string, unknown> | null;
    preview: {
      validatorVersion: string;
      acceptedMimeTypes: string[];
      maxBytes: number;
      checksumAlgorithm: 'sha256';
    };
    createdAt: string;
    updatedAt: string;
    audit: {
      createdByKeyId: string;
      createdByActor: string;
      requestId: string | null;
    };
  }> = [];

  const currentPacks: Array<{
    id: string;
    creatorAppId: string;
    slug: string;
    title: string;
    summary: string | null;
    status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
    previewState: 'READY' | 'NEEDS_REVIEW';
    assetIds: string[];
    assetCount: number;
    createdAt: string;
    updatedAt: string;
    audit: {
      createdByKeyId: string;
      createdByActor: string;
      requestId: string | null;
    };
  }> = [];

  await page.context().addInitScript(() => {
    (window as any).__ZFROG_V3_CREATOR_BETA__ = true;
    window.localStorage.setItem('zfrog.v3.integrationApiKey', 'test-key');
  });

  await page.route('**/api/v3/creator/assets', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            total: currentAssets.length,
            items: currentAssets,
          },
        }),
      });
      return;
    }

    const payload = route.request().postDataJSON() as {
      type: 'IMAGE' | 'AUDIO' | 'MODEL' | 'TEXTURE' | 'SCRIPT';
      mimeType: string;
      sourceUrl: string;
      checksum: string;
      bytes: number;
      metadata?: Record<string, unknown>;
    };
    const createdAt = '2026-03-24T01:00:00.000Z';
    const nextAsset = {
      id: `cas_${String(currentAssets.length + 1).padStart(3, '0')}`,
      creatorAppId: 'int_001',
      type: payload.type,
      mimeType: payload.mimeType,
      sourceUrl: payload.sourceUrl,
      checksum: payload.checksum,
      bytes: payload.bytes,
      status: 'READY' as const,
      metadata: payload.metadata || null,
      preview: {
        validatorVersion: 'v3-creator-preview-v1',
        acceptedMimeTypes: [payload.mimeType],
        maxBytes: 8 * 1024 * 1024,
        checksumAlgorithm: 'sha256' as const,
      },
      createdAt,
      updatedAt: createdAt,
      audit: {
        createdByKeyId: 'ikey_alpha',
        createdByActor: 'app_alpha:ikey_alpha',
        requestId: null,
      },
    };
    currentAssets.unshift(nextAsset);

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: nextAsset,
      }),
    });
  });

  await page.route('**/api/v3/creator/packs?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          total: currentPacks.length,
          items: currentPacks,
        },
      }),
    });
  });

  await page.route('**/api/v3/creator/packs', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            total: currentPacks.length,
            items: currentPacks,
          },
        }),
      });
      return;
    }

    const payload = route.request().postDataJSON() as {
      slug: string;
      title: string;
      summary?: string;
      assetIds: string[];
    };
    const createdAt = '2026-03-24T01:05:00.000Z';
    const nextPack = {
      id: `cpk_${String(currentPacks.length + 1).padStart(3, '0')}`,
      creatorAppId: 'int_001',
      slug: payload.slug,
      title: payload.title,
      summary: payload.summary || null,
      status: 'DRAFT' as const,
      previewState: 'READY' as const,
      assetIds: payload.assetIds,
      assetCount: payload.assetIds.length,
      createdAt,
      updatedAt: createdAt,
      audit: {
        createdByKeyId: 'ikey_alpha',
        createdByActor: 'app_alpha:ikey_alpha',
        requestId: null,
      },
    };
    currentPacks.unshift(nextPack);

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: nextPack,
      }),
    });
  });

  await page.route('**/api/v3/creator/packs/*', async (route) => {
    const packId = route.request().url().split('/').pop() || '';
    const found = currentPacks.find((item) => item.id === packId);
    if (!found) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'pack not found',
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: found,
      }),
    });
  });

  await page.goto('/creator');
  if (await page.getByRole('heading', { name: 'Creator Pipeline 正在灰度' }).isVisible().catch(() => false)) {
    await page.reload();
  }
  await expect(page.getByRole('heading', { name: 'V3 Creator Pipeline Alpha' })).toBeVisible();

  await page
    .getByTestId('creator-asset-source')
    .fill('https://cdn.example.com/assets/frog-kit.png');
  await page
    .getByTestId('creator-asset-checksum')
    .fill('aabbccddeeff00112233445566778899');
  await page.getByTestId('creator-asset-bytes').fill('4096');
  await page.getByTestId('creator-asset-upload').click();

  await expect(page.getByText('Asset uploaded: cas_001')).toBeVisible();

  await page.getByPlaceholder('moonlake-kit').fill('moonlake-kit');
  await page.getByPlaceholder('Moonlake Creator Kit').fill('Moonlake Creator Kit');
  await page
    .getByPlaceholder('Seasonal world visuals for moonlake narrative.')
    .fill('Seasonal world visuals.');
  await page.getByRole('button', { name: 'Create Pack Draft' }).click();

  await expect(page.getByText('Pack drafted: cpk_001')).toBeVisible();
  await expect(page.getByText('Pack ID: cpk_001')).toBeVisible();
});
