import { test, expect } from '@playwright/test';

test.describe('Runner Page', () => {
  test('should load runner page and show access denied for unauthenticated users', async ({
    page,
  }) => {
    await page.goto('/runner');

    // Check if page loaded successfully
    await expect(page).toHaveURL(/\/runner/);

    // Check for access denied message (since no authentication)
    const accessDenied = page.getByText('アクセス拒否');
    await expect(accessDenied).toBeVisible();
  });

  test('should display access denied message', async ({ page }) => {
    await page.goto('/runner');

    // Look for access denied content
    const message = page.getByText('逃走者の権限が必要です');
    await expect(message).toBeVisible();
  });

  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/runner');

    // Check that page renders
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Chaser Page', () => {
  test('should load chaser page and show access denied for unauthenticated users', async ({
    page,
  }) => {
    await page.goto('/chaser');

    // Check if page loaded successfully
    await expect(page).toHaveURL(/\/chaser/);

    // Check for access denied message
    const accessDenied = page.getByText('アクセス拒否');
    await expect(accessDenied).toBeVisible();
  });

  test('should display access denied message', async ({ page }) => {
    await page.goto('/chaser');

    // Look for access denied content
    const message = page.getByText('鬼の権限が必要です');
    await expect(message).toBeVisible();
  });

  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/chaser');

    // Check that page renders
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Game Master Page', () => {
  test('should load gamemaster page and show access denied for unauthenticated users', async ({
    page,
  }) => {
    await page.goto('/gamemaster');

    // Check if page loaded successfully
    await expect(page).toHaveURL(/\/gamemaster/);

    // Check for access denied message
    const accessDenied = page.getByText('アクセス拒否');
    await expect(accessDenied).toBeVisible();
  });

  test('should display access denied message', async ({ page }) => {
    await page.goto('/gamemaster');

    // Look for access denied content
    const message = page.getByText('ゲームマスターの権限が必要です');
    await expect(message).toBeVisible();
  });

  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/gamemaster');

    // Check that page renders
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Navigation Between Roles', () => {
  test('should navigate between different role pages', async ({ page }) => {
    // Start at home
    await page.goto('/');

    // Navigate to runner
    await page.goto('/runner');
    await expect(page).toHaveURL(/\/runner/);

    // Navigate to chaser
    await page.goto('/chaser');
    await expect(page).toHaveURL(/\/chaser/);

    // Navigate to gamemaster
    await page.goto('/gamemaster');
    await expect(page).toHaveURL(/\/gamemaster/);
  });
});

test.describe('Page Performance', () => {
  test('runner page should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/runner');
    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('chaser page should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/chaser');
    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('gamemaster page should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/gamemaster');
    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});
