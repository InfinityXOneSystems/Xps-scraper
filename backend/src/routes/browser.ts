import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { steelBrowserService } from '../services/steelBrowser';
import { playwrightService } from '../services/playwrightService';
import { bytebotService } from '../services/bytebotService';

const router = Router();

// GET /api/browser/status
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    steel: { available: steelBrowserService.isAvailable() },
    playwright: { available: playwrightService.isAvailable() },
    bytebot: { available: bytebotService.isAvailable() },
  });
});

// ── Steel Browser ─────────────────────────────────────────────────────────────

const SteelSessionSchema = z.object({
  sessionTimeout: z.number().int().positive().optional(),
  useProxy: z.boolean().optional(),
  proxyUrl: z.string().url().optional(),
  solveCaptcha: z.boolean().optional(),
  userAgent: z.string().optional(),
});

const SteelScrapeSchema = z.object({
  url: z.string().url('Invalid URL'),
  sessionId: z.string().optional(),
  format: z.enum(['html', 'readability', 'cleaned_html', 'markdown']).optional(),
  screenshot: z.boolean().optional(),
  pdf: z.boolean().optional(),
  waitFor: z.number().int().nonnegative().optional(),
  delay: z.number().int().nonnegative().optional(),
  selector: z.string().optional(),
});

// POST /api/browser/steel/sessions — create a Steel Browser session
router.post(
  '/steel/sessions',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = SteelSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }
      const session = await steelBrowserService.createSession(parsed.data);
      if (!session) {
        res.status(502).json({ error: 'STEEL_API_KEY not configured or session creation failed' });
        return;
      }
      res.status(201).json(session);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/browser/steel/sessions — list active Steel sessions
router.get(
  '/steel/sessions',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessions = await steelBrowserService.listSessions();
      res.json({ sessions, count: sessions.length });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/browser/steel/sessions/:id — get a specific Steel session
router.get(
  '/steel/sessions/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = await steelBrowserService.getSession(req.params['id'] as string);
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      res.json(session);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/browser/steel/sessions/:id — release a Steel session
router.delete(
  '/steel/sessions/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const released = await steelBrowserService.releaseSession(req.params['id'] as string);
      if (!released) {
        res.status(404).json({ error: 'Session not found or could not be released' });
        return;
      }
      res.json({ message: 'Session released' });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/browser/steel/scrape — scrape a URL using Steel Browser
router.post(
  '/steel/scrape',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = SteelScrapeSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }
      const result = await steelBrowserService.scrape(parsed.data);
      if (!result) {
        res.status(502).json({ error: 'STEEL_API_KEY not configured or scrape failed' });
        return;
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ── Playwright ────────────────────────────────────────────────────────────────

const PlaywrightScrapeSchema = z.object({
  url: z.string().url('Invalid URL'),
  waitForSelector: z.string().optional(),
  waitForTimeout: z.number().int().positive().max(60000).optional(),
  extractText: z.boolean().optional(),
  extractLinks: z.boolean().optional(),
  screenshot: z.boolean().optional(),
  fullPageScreenshot: z.boolean().optional(),
  viewport: z
    .object({ width: z.number().int().positive(), height: z.number().int().positive() })
    .optional(),
  userAgent: z.string().optional(),
  evaluate: z.string().optional(),
});

// POST /api/browser/playwright/scrape — scrape via Playwright
router.post(
  '/playwright/scrape',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = PlaywrightScrapeSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }
      const result = await playwrightService.scrape(parsed.data);
      if (result.error) {
        res.status(result.error.includes('not installed') ? 501 : 502).json({ error: result.error });
        return;
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// ── Bytebot ───────────────────────────────────────────────────────────────────

const BytebotTaskSchema = z.object({
  task: z.string().min(1, 'Task description is required'),
  url: z.string().url('Invalid URL').optional(),
  sessionId: z.string().optional(),
  timeout: z.number().int().positive().max(300000).optional(),
});

// POST /api/browser/bytebot/tasks — execute a Bytebot browser task
router.post(
  '/bytebot/tasks',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = BytebotTaskSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }
      const result = await bytebotService.executeTask(parsed.data);
      if (!result.success) {
        res.status(502).json({ error: result.error ?? 'Bytebot task failed' });
        return;
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/browser/bytebot/sessions — create a Bytebot session
router.post(
  '/bytebot/sessions',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = await bytebotService.createSession();
      if (!session) {
        res.status(502).json({ error: 'BYTEBOT_URL not configured or session creation failed' });
        return;
      }
      res.status(201).json(session);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/browser/bytebot/sessions — list Bytebot sessions
router.get(
  '/bytebot/sessions',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessions = await bytebotService.listSessions();
      res.json({ sessions, count: sessions.length });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/browser/bytebot/sessions/:id — close a Bytebot session
router.delete(
  '/bytebot/sessions/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const closed = await bytebotService.closeSession(req.params['id'] as string);
      if (!closed) {
        res.status(404).json({ error: 'Session not found or could not be closed' });
        return;
      }
      res.json({ message: 'Session closed' });
    } catch (err) {
      next(err);
    }
  },
);

export { router as browserRouter };
