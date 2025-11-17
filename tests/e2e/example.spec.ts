import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');

  // Check if the page loaded
  await expect(page).toHaveTitle(/Tag Support/i);
});

test('has basic navigation', async ({ page }) => {
  await page.goto('/');

  // Check for main content
  const main = page.locator('main');
  await expect(main).toBeVisible();
});
