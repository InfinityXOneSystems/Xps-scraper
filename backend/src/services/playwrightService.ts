/**
 * Playwright Browser Service
 *
 * Provides server-side browser automation using Playwright.
 * Playwright and its browser binaries are large; this service
 * gracefully degrades when playwright is not installed.
 *
 * Install: npm install playwright && npx playwright install chromium
 */

export interface PlaywrightScrapeOptions {
  url: string;
  waitForSelector?: string;
  waitForTimeout?: number;
  extractText?: boolean;
  extractLinks?: boolean;
  screenshot?: boolean;
  fullPageScreenshot?: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
  evaluate?: string;
}

export interface PlaywrightScrapeResult {
  url: string;
  title?: string;
  text?: string;
  html?: string;
  links?: string[];
  screenshot?: string;
  evaluateResult?: unknown;
  error?: string;
}

type BrowserModule = {
  chromium: {
    launch: (opts?: { headless?: boolean; args?: string[] }) => Promise<BrowserInstance>;
  };
};

type BrowserInstance = {
  newPage: () => Promise<PageInstance>;
  close: () => Promise<void>;
};

type PageInstance = {
  setViewportSize: (size: { width: number; height: number }) => Promise<void>;
  setExtraHTTPHeaders: (headers: Record<string, string>) => Promise<void>;
  goto: (url: string, opts?: { waitUntil?: string; timeout?: number }) => Promise<unknown>;
  title: () => Promise<string>;
  content: () => Promise<string>;
  textContent: (selector: string) => Promise<string | null>;
  screenshot: (opts?: { fullPage?: boolean }) => Promise<Buffer>;
  evaluate: (fn: string) => Promise<unknown>;
  waitForSelector: (selector: string, opts?: { timeout?: number }) => Promise<unknown>;
};

export class PlaywrightService {
  private pw: BrowserModule | null = null;
  private available: boolean | null = null;

  isAvailable(): boolean {
    if (this.available !== null) return this.available;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.pw = require('playwright') as BrowserModule;
      this.available = true;
    } catch {
      this.available = false;
    }
    return this.available;
  }

  async scrape(options: PlaywrightScrapeOptions): Promise<PlaywrightScrapeResult> {
    if (!this.isAvailable() || !this.pw) {
      return {
        url: options.url,
        error: 'Playwright is not installed. Run: npm install playwright && npx playwright install chromium',
      };
    }

    let browser: BrowserInstance | null = null;
    try {
      browser = await this.pw.chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();

      await page.setViewportSize(
        options.viewport ?? { width: 1280, height: 800 },
      );

      if (options.userAgent) {
        await page.setExtraHTTPHeaders({ 'User-Agent': options.userAgent });
      }

      await page.goto(options.url, {
        waitUntil: 'networkidle',
        timeout: options.waitForTimeout ?? 30000,
      });

      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, {
          timeout: options.waitForTimeout ?? 10000,
        });
      }

      const title = await page.title();
      const html = await page.content();

      let text: string | undefined;
      if (options.extractText !== false) {
        text = (await page.textContent('body')) ?? '';
        text = text.replace(/\s+/g, ' ').trim();
      }

      let links: string[] | undefined;
      if (options.extractLinks) {
        links = (await page.evaluate(`
          Array.from(document.querySelectorAll('a[href]'))
            .map(a => a.href)
            .filter(h => h.startsWith('http'))
        `)) as string[];
      }

      let screenshotBase64: string | undefined;
      if (options.screenshot) {
        const buf = await page.screenshot({ fullPage: options.fullPageScreenshot ?? false });
        screenshotBase64 = buf.toString('base64');
      }

      let evaluateResult: unknown;
      if (options.evaluate) {
        evaluateResult = await page.evaluate(options.evaluate);
      }

      return {
        url: options.url,
        title,
        text,
        html,
        links,
        screenshot: screenshotBase64,
        evaluateResult,
      };
    } finally {
      if (browser) await browser.close();
    }
  }
}

export const playwrightService = new PlaywrightService();
