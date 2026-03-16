import { test, expect } from '@playwright/test';

test.describe('XPS Shadow Backend Health', () => {
  test('backend /health endpoint returns ok', async ({ request }) => {
    const response = await request.get('http://localhost:3001/health');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('xps-scraper-backend');
  });

  test('dashboard shows Backend connected status', async ({ page }) => {
    await page.goto('/');

    // Wait for health check to resolve (banner changes from loading to ok/error)
    const banner = page.locator('text=All systems operational — Backend connected');
    await expect(banner).toBeVisible({ timeout: 15_000 });
  });

  test('dashboard does NOT show Backend offline message', async ({ page }) => {
    await page.goto('/');
    // Wait for the health banner to settle (either connected or error)
    await page.waitForLoadState('networkidle');
    const offlineBanner = page.locator('text=Backend offline');
    await expect(offlineBanner).not.toBeVisible();
  });

  test('dashboard metrics are displayed', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Core metric cards should be visible
    await expect(page.locator('text=Active Workflows')).toBeVisible();
    await expect(page.locator('text=Total Leads')).toBeVisible();
    await expect(page.locator('text=API Keys Harvested')).toBeVisible();
  });

  test('dashboard screenshot shows connected state', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.locator('text=All systems operational — Backend connected'),
    ).toBeVisible({ timeout: 15_000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/e2e/screenshots/dashboard-connected.png', fullPage: true });
  });
});
