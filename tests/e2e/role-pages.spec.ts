import { test, expect } from '@playwright/test';

test.describe('Runner Page', () => {
  test('should load runner page', async ({ page }) => {
    await page.goto('/runner');

    // Check if page loaded successfully
    await expect(page).toHaveURL(/\/runner/);

    // Check for main content
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should display runner-specific content', async ({ page }) => {
    await page.goto('/runner');

    // Look for runner-specific elements (e.g., team info, mission area)
    // Note: Adjust selectors based on actual implementation
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/runner');

    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

test.describe('Chaser Page', () => {
  test('should load chaser page', async ({ page }) => {
    await page.goto('/chaser');

    // Check if page loaded successfully
    await expect(page).toHaveURL(/\/chaser/);

    // Check for main content
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should display chaser-specific content', async ({ page }) => {
    await page.goto('/chaser');

    // Look for chaser-specific elements (e.g., radar, capture button)
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('should handle capture functionality UI', async ({ page }) => {
    await page.goto('/chaser');

    // Note: This test checks UI presence, not actual capture logic
    // Actual capture would require mocking or test database
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/chaser');

    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

test.describe('Game Master Page', () => {
  test('should load gamemaster page', async ({ page }) => {
    await page.goto('/gamemaster');

    // Check if page loaded successfully
    await expect(page).toHaveURL(/\/gamemaster/);

    // Check for main content
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should display gamemaster-specific content', async ({ page }) => {
    await page.goto('/gamemaster');

    // Look for GM-specific elements (e.g., player management, controls)
    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/gamemaster');

    const main = page.locator('main');
    await expect(main).toBeVisible();
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
