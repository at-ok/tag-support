import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');

  // Check if the page loaded
  await expect(page).toHaveTitle(/Tag Support/i);
});

test('has basic content', async ({ page }) => {
  await page.goto('/');

  // Check for heading
  const heading = page.getByRole('heading', { name: /リアル鬼ごっこ/i });
  await expect(heading).toBeVisible();

  // Check for login form
  const nicknameInput = page.getByPlaceholder(/ニックネームを入力/i);
  await expect(nicknameInput).toBeVisible();
});
