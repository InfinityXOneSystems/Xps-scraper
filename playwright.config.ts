import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['**/headful-agent.spec.ts'],
    },
    {
      name: 'live-agent',
      use: {
        ...devices['Desktop Chrome'],
        // Run headful so the agent physically sees the browser; honour
        // PWHEADFUL env var so CI can override to headless when needed.
        headless: process.env['PWHEADFUL'] !== 'true' && process.env['CI'] === 'true',
        viewport: { width: 1280, height: 900 },
        screenshot: 'on',
        video: 'on',
      },
      testMatch: ['**/headful-agent.spec.ts'],
    },
  ],
  webServer: [
    {
      command: 'cd backend && npm run dev',
      url: 'http://localhost:3001/health',
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'cd frontend && npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
