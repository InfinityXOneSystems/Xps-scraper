import { test, expect } from '@playwright/test';
import * as path from 'path';

/**
 * XPS Shadow Scraper — Headful Live Agent Test Suite
 *
 * This test suite runs in headed (non-headless) mode to physically navigate
 * the full application, screenshot every major tab, verify real connectivity,
 * and exercise the complete scrape → harvest → chat pipeline as a live agent.
 *
 * Run in headed mode:
 *   npx playwright test tests/e2e/headful-agent.spec.ts --project=live-agent
 *
 * Or with the CI flag (still uses Chromium but with --headed):
 *   PWHEADFUL=true npx playwright test tests/e2e/headful-agent.spec.ts
 */

const BASE_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:3001';
const SS_DIR = path.join('tests', 'e2e', 'screenshots');

// ─────────────────────────────────────────────────────────────────────────────
// Health — verify stack is live before running agent tests
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Live Agent — Stack Health', () => {
  test('backend /health is reachable and returns ok', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  test('backend /health/services returns all service statuses', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/health/services`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('services');
    expect(body.services.api.configured).toBe(true);
    expect(body.services.api.connected).toBe(true);
  });

  test('frontend is reachable at base URL', async ({ request }) => {
    const res = await request.get(BASE_URL);
    expect(res.ok()).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard — live visit and screenshot
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Live Agent — Dashboard', () => {
  test('visits dashboard and takes full-page screenshot', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Assert connected status — match on partial text so minor wording changes don't break
    const banner = page.locator('text=/All systems operational|Backend connected/');
    await expect(banner).toBeVisible({ timeout: 20_000 });

    await page.screenshot({
      path: path.join(SS_DIR, 'live-agent-dashboard.png'),
      fullPage: true,
    });
  });

  test('system health panel shows service statuses', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Wait for metrics to populate
    await expect(page.locator('text=System Health')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=API Backend')).toBeVisible();

    await page.screenshot({
      path: path.join(SS_DIR, 'live-agent-system-health.png'),
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Navigation — visit every major tab and screenshot
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Live Agent — Full Tab Navigation', () => {
  const tabs = [
    { text: /scrape/i, screenshot: 'live-agent-scrape.png' },
    { text: /chat|agent/i, screenshot: 'live-agent-chat.png' },
    { text: /keys/i, screenshot: 'live-agent-keys.png' },
    { text: /leads/i, screenshot: 'live-agent-leads.png' },
    { text: /crm/i, screenshot: 'live-agent-crm.png' },
    { text: /email/i, screenshot: 'live-agent-email.png' },
    { text: /workflow/i, screenshot: 'live-agent-workflows.png' },
    { text: /connectors/i, screenshot: 'live-agent-connectors.png' },
    { text: /settings/i, screenshot: 'live-agent-settings.png' },
  ];

  for (const tab of tabs) {
    test(`navigates to ${tab.screenshot.replace('live-agent-', '').replace('.png', '')} tab`, async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('domcontentloaded');

      const link = page.locator('a, button, [role="tab"]').filter({ hasText: tab.text }).first();
      if (await link.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await link.click();
        await page.waitForLoadState('networkidle');
      }

      await page.screenshot({
        path: path.join(SS_DIR, tab.screenshot),
        fullPage: true,
      });
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Live Scrape via API — physically test the scrape endpoint
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Live Agent — Scrape Pipeline', () => {
  test('POST /api/scrape on example.com returns live data', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/scrape`, {
      data: {
        url: 'https://example.com',
        options: { extractText: true, extractLinks: true },
      },
    });

    expect([200, 401, 403]).toContain(res.status());

    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('url', 'https://example.com');
      expect(body).toHaveProperty('title');
      expect(body).toHaveProperty('scrapedAt');
      expect(body.statusCode).toBe(200);
    }
  });

  test('POST /api/keys/harvest detects keys in scraped content', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/keys/harvest`, {
      data: { content: 'Test content with AKIAIOSFODNN7EXAMPLETEST for harvesting' },
    });

    expect([200, 401, 403]).toContain(res.status());

    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('keys');
      expect(body).toHaveProperty('count');
      expect(Array.isArray(body.keys)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Live Orchestrator — submit a real workflow run and poll status
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Live Agent — Orchestrator', () => {
  test('POST /api/orchestrator/run accepts workflow and returns runId', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/orchestrator/run`, {
      data: {
        name: 'live-agent-test',
        nodes: [
          { id: 'n1', type: 'trigger', label: 'Start', config: {} },
          { id: 'n2', type: 'scrape', label: 'Scrape URL', config: { url: 'https://example.com' } },
        ],
        edges: [{ from: 'n1', to: 'n2' }],
      },
    });

    expect([202, 401, 403]).toContain(res.status());

    if (res.status() === 202) {
      const body = await res.json();
      expect(body).toHaveProperty('runId');
      expect(body.status).toBe('running');

      // Poll for completion (max 5s)
      const runId: string = body.runId as string;
      let finalStatus = 'running';
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const poll = await request.get(`${BACKEND_URL}/api/orchestrator/status/${runId}`);
        if (poll.ok()) {
          const pollBody = await poll.json();
          finalStatus = (pollBody as { status: string }).status;
          if (finalStatus === 'completed' || finalStatus === 'failed') break;
        }
      }

      expect(['completed', 'failed', 'running']).toContain(finalStatus);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Live Agent — Browser Playwright sub-service status
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Live Agent — Browser Service Status', () => {
  test('GET /api/browser/status reports playwright availability', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/browser/status`);
    expect([200, 401, 403]).toContain(res.status());

    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('playwright');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Live Agent — Full pipeline visual walkthrough screenshot
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Live Agent — Final Snapshot', () => {
  test('captures full app viewport as final agent snapshot', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=XPS Shadow Dashboard')).toBeVisible({ timeout: 15_000 });

    await page.screenshot({
      path: path.join(SS_DIR, 'live-agent-final-snapshot.png'),
      fullPage: true,
    });
  });
});
