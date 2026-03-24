import { expect, test } from '@playwright/test';

test('@social-main create family -> join community -> submit attestation', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('walletAddress', '0xabc0000000000000000000000000000000000001');
  });

  await page.route('**/api/v2/families', async (route, request) => {
    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }

    const body = request.postDataJSON() as {
      name: string;
      ownerFrogId: number;
      goal?: string;
      visibility?: string;
    };

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 501,
          name: body.name,
          ownerFrogId: body.ownerFrogId,
          goal: body.goal || null,
          visibility: body.visibility || 'private',
          totemLevel: 1,
          totemProgress: 0,
          weeklyMileage: 0,
          memberCount: 1,
          members: [
            {
              frogId: body.ownerFrogId,
              tokenId: 9001,
              name: 'Flow Leader',
              ownerAddress: '0xabc0000000000000000000000000000000000001',
              role: 'leader',
              joinedAt: '2026-03-23T00:00:00.000Z',
            },
          ],
          createdAt: '2026-03-23T00:00:00.000Z',
          updatedAt: '2026-03-23T00:00:00.000Z',
        },
      }),
    });
  });

  await page.route('**/api/v2/communities/*/join', async (route, request) => {
    const body = request.postDataJSON() as {
      frogId: number;
      role?: 'member' | 'moderator';
    };
    const url = new URL(request.url());
    const communityId = url.pathname.split('/').at(-2) || 'river_guild';

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          community: {
            id: communityId,
            name: 'River Guild',
            icon: 'frog',
            themeColor: '#00AA88',
            description: 'Community for V2 flow test',
            credentialType: 'PUBLIC',
            memberCount: 8,
            creatorAddress: null,
            isOfficial: true,
            isActive: true,
            createdAt: '2026-03-23T00:00:00.000Z',
            updatedAt: '2026-03-23T00:00:00.000Z',
          },
          membership: {
            userAddress: '0xabc0000000000000000000000000000000000001',
            frogId: body.frogId,
            role: body.role || 'member',
            joinedAt: '2026-03-23T00:00:10.000Z',
            isActive: true,
          },
        },
      }),
    });
  });

  await page.route('**/api/v2/attestations/relationship', async (route, request) => {
    if (request.method() !== 'POST') {
      await route.continue();
      return;
    }

    const body = request.postDataJSON() as {
      subjectFrogId: number;
      objectFrogId: number;
      attestationType: string;
      source?: string;
    };

    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'att_flow_001',
          subjectFrogId: body.subjectFrogId,
          objectFrogId: body.objectFrogId,
          attestationType: body.attestationType,
          source: body.source || 'web-social-v2',
          evidence: null,
          status: 'QUEUED',
          idempotencyKey: null,
          createdByAddress: '0xabc0000000000000000000000000000000000001',
          onchainTrace: null,
          createdAt: '2026-03-23T00:00:20.000Z',
          updatedAt: '2026-03-23T00:00:20.000Z',
          idempotentReplay: false,
        },
      }),
    });
  });

  await page.route('**/api/v2/attestations/relationship/*/submit-onchain', async (route, request) => {
    const url = new URL(request.url());
    const attestationId = url.pathname.split('/').at(-2) || 'att_flow_001';

    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          attestationId,
          status: 'CONFIRMED',
          idempotentReplay: false,
          trace: {
            attestationId,
            milestoneId: '9001',
            txHash: '0xfeed00000000000000000000000000000000000000000000000000000000beef',
            chainId: 7001,
            blockNumber: '123456',
            recordedAt: '2026-03-23T00:00:30.000Z',
          },
        },
      }),
    });
  });

  await page.goto('/families');
  await expect(page.getByTestId('family-entry-card')).toBeVisible();

  await page.getByTestId('family-create-name-input').fill('River Keepers');
  await page.getByTestId('family-create-owner-input').fill('101');
  await page.getByTestId('family-create-submit').click();

  await expect(page.getByTestId('family-create-success')).toContainText('Family River Keepers created');

  await page.getByRole('link', { name: 'Continue to Communities' }).click();
  await expect(page).toHaveURL(/\/communities$/);
  await expect(page.getByTestId('community-entry-card')).toBeVisible();

  await page.getByTestId('community-id-input').fill('river_guild');
  await page.getByTestId('community-join-frog-input').fill('101');
  await page.getByTestId('community-join-submit').click();

  await expect(page.getByTestId('community-flow-success')).toContainText('Joined River Guild as member');

  await page.getByTestId('attestation-subject-input').fill('101');
  await page.getByTestId('attestation-object-input').fill('202');
  await page.getByTestId('attestation-type-input').fill('bond');
  await page.getByTestId('attestation-submit').click();

  await expect(page.getByTestId('attestation-success')).toContainText('Attestation #att_flow_001');

  await page.getByTestId('attestation-submit-onchain').click();
  await expect(page.getByTestId('attestation-onchain-result')).toContainText('Onchain status: CONFIRMED');
});
