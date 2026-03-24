import { expect, test } from '@playwright/test';

test('home page loads with expected document title', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/ZetaFrog/i);
  await expect(page.locator('#root')).toBeVisible();
});
