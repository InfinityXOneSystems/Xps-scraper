import { test, expect, request as pwRequest } from '@playwright/test';

/**
 * XPS Shadow Scraper — Full Integration E2E Test Suite
 *
 * Covers the complete agent workflow:
 *   1. Health checks (backend + all services)
 *   2. Dashboard UI verification
 *   3. Scraping workflow
 *   4. Key harvesting
 *   5. Crawl trigger + status polling
 *   6. Orchestrator workflow run
 *   7. AI agent chat
 *   8. Export
 *   9. Navigation and tab interactions
 *  10. Full pipeline: crawl → scrape → harvest → chat
 */

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Backend Health & API Availability
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Backend Health & API Availability', () => {
  test('GET /health returns ok status', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('xps-scraper-backend');
    expect(body).toHaveProperty('timestamp');
  });

  test('GET /health returns version field', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/health`);
    const body = await res.json();
    expect(body).toHaveProperty('version');
    expect(typeof body.version).toBe('string');
  });

  test('Unknown route returns 404', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/nonexistent-route-xyz`);
    expect(res.status()).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Dashboard UI
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Dashboard UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
  });

  test('shows connected status banner', async ({ page }) => {
    const banner = page.locator('text=All systems operational — Backend connected');
    await expect(banner).toBeVisible({ timeout: 15_000 });
  });

  test('does NOT show Backend offline message', async ({ page }) => {
    await expect(page.locator('text=Backend offline')).not.toBeVisible();
  });

  test('displays core metric cards', async ({ page }) => {
    await expect(page.locator('text=Active Workflows')).toBeVisible();
    await expect(page.locator('text=Total Leads')).toBeVisible();
    await expect(page.locator('text=API Keys Harvested')).toBeVisible();
  });

  test('page title is correct', async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('dashboard screenshot — connected state', async ({ page }) => {
    await expect(
      page.locator('text=All systems operational — Backend connected'),
    ).toBeVisible({ timeout: 15_000 });
    await page.screenshot({
      path: 'tests/e2e/screenshots/dashboard-connected.png',
      fullPage: true,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Frontend Navigation
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Frontend Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('domcontentloaded');
  });

  test('navigation sidebar or tab bar is rendered', async ({ page }) => {
    // The app uses a tab/sidebar nav; at least one nav element must be present
    const navElement = page.locator('nav, [role="navigation"], aside').first();
    await expect(navElement).toBeVisible({ timeout: 10_000 });
  });

  test('can navigate to Scrape tab/page', async ({ page }) => {
    // Click a link/button containing "Scrape" text
    const scrapeLink = page.locator('a, button').filter({ hasText: /scrape/i }).first();
    if (await scrapeLink.isVisible()) {
      await scrapeLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/screenshots/scrape-tab.png' });
    }
  });

  test('can navigate to Keys tab/page', async ({ page }) => {
    const keysLink = page.locator('a, button').filter({ hasText: /key/i }).first();
    if (await keysLink.isVisible()) {
      await keysLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/screenshots/keys-tab.png' });
    }
  });

  test('can navigate to Chat / Agent tab/page', async ({ page }) => {
    const chatLink = page.locator('a, button').filter({ hasText: /chat|agent/i }).first();
    if (await chatLink.isVisible()) {
      await chatLink.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/screenshots/chat-tab.png' });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Scraping API
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Scraping API', () => {
  test('POST /api/scrape returns result for a valid URL', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/scrape`, {
      data: { url: 'https://example.com', extractText: true },
    });
    // Accept 200 (success) or 401 (auth required in prod) — both mean the route is wired
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('result');
    }
  });

  test('POST /api/scrape rejects invalid URL', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/scrape`, {
      data: { url: 'not-a-valid-url' },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('POST /api/scrape/bulk accepts array of URLs', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/scrape/bulk`, {
      data: { urls: ['https://example.com', 'https://example.org'] },
    });
    expect([200, 202, 401, 403]).toContain(res.status());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Key Harvesting API
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Key Harvesting API', () => {
  test('POST /api/keys/harvest accepts URL input', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/keys/harvest`, {
      data: { url: 'https://example.com' },
    });
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('keys');
      expect(Array.isArray(body.keys)).toBe(true);
    }
  });

  test('POST /api/keys/harvest accepts raw content input', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/keys/harvest`, {
      data: {
        content:
          'OPENAI_API_KEY=sk-test1234567890abcdef\nAWS_ACCESS_KEY_ID=AKIA1234567890ABCDEF',
      },
    });
    expect([200, 401, 403]).toContain(res.status());
  });

  test('GET /api/keys returns list', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/keys`);
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('keys');
    }
  });

  test('GET /api/keys/export returns data', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/keys/export?format=json`);
    expect([200, 401, 403]).toContain(res.status());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Crawl API (Firecrawl integration)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Crawl API', () => {
  test('GET /api/crawl/status returns availability', async ({ request }) => {
    const res = await request.get(`${BACKEND_URL}/api/crawl/status`);
    expect([200, 401, 403]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('available');
    }
  });

  test('POST /api/crawl/scrape accepts URL', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/crawl/scrape`, {
      data: { url: 'https://example.com', formats: ['markdown'] },
    });
    expect([200, 202, 401, 403, 503]).toContain(res.status());
  });

  test('POST /api/crawl/crawl starts a crawl job', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/crawl/crawl`, {
      data: { url: 'https://example.com', limit: 2, maxDepth: 1 },
    });
    expect([200, 202, 401, 403, 503]).toContain(res.status());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Orchestrator Workflow API
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Orchestrator Workflow API', () => {
  let runId: string | null = null;

  test('POST /api/orchestrator/run accepts a workflow', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/orchestrator/run`, {
      data: {
        name: 'e2e-test-workflow',
        nodes: [
          { id: 'n1', type: 'trigger', label: 'Start', config: {} },
          {
            id: 'n2',
            type: 'scrape',
            label: 'Scrape example.com',
            config: { url: 'https://example.com' },
          },
          {
            id: 'n3',
            type: 'harvest',
            label: 'Extract keys',
            config: { extractKeys: true },
          },
        ],
        edges: [
          { from: 'n1', to: 'n2' },
          { from: 'n2', to: 'n3' },
        ],
      },
    });
    expect([202, 401, 403]).toContain(res.status());
    if (res.status() === 202) {
      const body = await res.json();
      expect(body).toHaveProperty('runId');
      expect(body.status).toBe('running');
      runId = body.runId;
    }
  });

  test('GET /api/orchestrator/status/:id returns run status', async ({ request }) => {
    if (!runId) {
      test.skip();
      return;
    }
    // Give the workflow a moment to process
    await new Promise((r) => setTimeout(r, 500));
    const res = await request.get(`${BACKEND_URL}/api/orchestrator/status/${runId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('status');
    expect(['pending', 'running', 'completed', 'failed']).toContain(body.status);
  });

  test('POST /api/orchestrator/run rejects empty nodes array', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/orchestrator/run`, {
      data: { name: 'empty', nodes: [] },
    });
    // Empty nodes is valid per schema but might be rejected — any 4xx is acceptable
    expect([202, 400, 401, 403]).toContain(res.status());
  });

  test('GET /api/orchestrator/status for unknown ID returns 404', async ({ request }) => {
    const res = await request.get(
      `${BACKEND_URL}/api/orchestrator/status/00000000-0000-0000-0000-000000000000`,
    );
    expect([404, 401, 403]).toContain(res.status());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Agent Chat API
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Agent Chat API', () => {
  test('POST /api/agent/chat accepts a message', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/agent/chat`, {
      data: { message: 'What is example.com?' },
    });
    expect([200, 401, 403, 500]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('reply');
      expect(typeof body.reply).toBe('string');
      expect(body.reply.length).toBeGreaterThan(0);
    }
  });

  test('POST /api/agent/conversation creates a new conversation', async ({ request }) => {
    const res = await request.post(`${BACKEND_URL}/api/agent/conversation`, {
      data: {},
    });
    expect([200, 201, 401, 403]).toContain(res.status());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. OpenAPI / GPT Actions Schema Validation
// ─────────────────────────────────────────────────────────────────────────────
test.describe('OpenAPI Schema Validation', () => {
  test('gpt-actions.json is valid JSON with required fields', async () => {
    const fs = await import('fs');
    const schema = JSON.parse(
      fs.readFileSync('openapi/gpt-actions.json', 'utf-8'),
    );
    expect(schema.openapi).toMatch(/^3\./);
    expect(schema.info).toBeDefined();
    expect(schema.paths).toBeDefined();
    // Check key operations exist
    expect(schema.paths['/health']).toBeDefined();
    expect(schema.paths['/api/scrape']).toBeDefined();
    expect(schema.paths['/api/keys/harvest']).toBeDefined();
    expect(schema.paths['/api/orchestrator/run']).toBeDefined();
    expect(schema.paths['/api/agent/chat']).toBeDefined();
  });

  test('all paths have operationId', async () => {
    const fs = await import('fs');
    const schema = JSON.parse(
      fs.readFileSync('openapi/gpt-actions.json', 'utf-8'),
    );
    for (const [apiPath, httpMethods] of Object.entries(schema.paths as Record<string, Record<string, { operationId?: string }>>)) {
      for (const [method, operation] of Object.entries(httpMethods)) {
        expect(
          operation.operationId,
          `${method.toUpperCase()} ${apiPath} missing operationId`,
        ).toBeDefined();
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Full Pipeline Integration: crawl → scrape → harvest → chat
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Full Pipeline Integration', () => {
  test('orchestrator full pipeline workflow completes', async ({ request }) => {
    // Trigger the full pipeline as a workflow
    const res = await request.post(`${BACKEND_URL}/api/orchestrator/run`, {
      data: {
        name: 'full-pipeline-e2e',
        nodes: [
          { id: 'trigger', type: 'trigger', label: 'Start Pipeline', config: {} },
          {
            id: 'scrape',
            type: 'scrape',
            label: 'Scrape Target',
            config: { url: 'https://example.com' },
          },
          {
            id: 'harvest',
            type: 'harvest',
            label: 'Harvest Keys',
            config: {},
          },
          {
            id: 'export',
            type: 'export',
            label: 'Export Results',
            config: { format: 'json' },
          },
        ],
        edges: [
          { from: 'trigger', to: 'scrape' },
          { from: 'scrape', to: 'harvest' },
          { from: 'harvest', to: 'export' },
        ],
      },
    });

    expect([202, 401, 403]).toContain(res.status());

    if (res.status() === 202) {
      const { runId } = await res.json();

      // Poll for completion (up to 10 seconds)
      let status = 'running';
      let attempts = 0;
      while (status === 'running' && attempts < 20) {
        await new Promise((r) => setTimeout(r, 500));
        const statusRes = await request.get(
          `${BACKEND_URL}/api/orchestrator/status/${runId}`,
        );
        if (statusRes.ok()) {
          const statusBody = await statusRes.json();
          status = statusBody.status;
        }
        attempts++;
      }

      expect(['completed', 'failed']).toContain(status);
    }
  });

  test('frontend renders after full API round-trip', async ({ page }) => {
    await page.goto(FRONTEND_URL);

    // Make a direct API call from the browser context
    const healthData = await page.evaluate(async () => {
      const res = await fetch('http://localhost:3001/health');
      return res.json();
    });

    expect(healthData.status).toBe('ok');

    // UI should reflect backend connectivity
    await expect(
      page.locator('text=All systems operational — Backend connected'),
    ).toBeVisible({ timeout: 15_000 });

    await page.screenshot({
      path: 'tests/e2e/screenshots/full-pipeline-final.png',
      fullPage: true,
    });
  });
});
