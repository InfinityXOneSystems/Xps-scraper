import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { firecrawlService } from '../services/firecrawl';

const router = Router();

// GET /api/crawl/status
router.get('/status', (_req: Request, res: Response) => {
  res.json({ available: firecrawlService.isAvailable() });
});

const ScrapeSchema = z.object({
  url: z.string().url('Invalid URL'),
  formats: z
    .array(z.enum(['markdown', 'html', 'rawHtml', 'content', 'links', 'screenshot']))
    .optional(),
  onlyMainContent: z.boolean().optional(),
  includeTags: z.array(z.string()).optional(),
  excludeTags: z.array(z.string()).optional(),
  timeout: z.number().int().positive().max(120).optional(),
  waitFor: z.number().int().nonnegative().optional(),
});

const CrawlSchema = z.object({
  url: z.string().url('Invalid URL'),
  limit: z.number().int().positive().max(500).optional(),
  includePaths: z.array(z.string()).optional(),
  excludePaths: z.array(z.string()).optional(),
  maxDepth: z.number().int().positive().max(10).optional(),
  allowBackwardLinks: z.boolean().optional(),
  allowExternalLinks: z.boolean().optional(),
  scrapeOptions: ScrapeSchema.omit({ url: true }).optional(),
});

const MapSchema = z.object({
  url: z.string().url('Invalid URL'),
  search: z.string().optional(),
  limit: z.number().int().positive().max(5000).optional(),
});

// POST /api/crawl/scrape — scrape a single URL via Firecrawl
router.post(
  '/scrape',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = ScrapeSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }
      const result = await firecrawlService.scrapeUrl(parsed.data.url, {
        formats: parsed.data.formats,
        onlyMainContent: parsed.data.onlyMainContent,
        includeTags: parsed.data.includeTags,
        excludeTags: parsed.data.excludeTags,
        timeout: parsed.data.timeout,
        waitFor: parsed.data.waitFor,
      });
      if (!result.success) {
        res.status(502).json({ error: result.error ?? 'Firecrawl scrape failed' });
        return;
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/crawl/start — start a crawl job
router.post(
  '/start',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = CrawlSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }
      const result = await firecrawlService.crawlUrl(parsed.data.url, {
        limit: parsed.data.limit,
        includePaths: parsed.data.includePaths,
        excludePaths: parsed.data.excludePaths,
        maxDepth: parsed.data.maxDepth,
        allowBackwardLinks: parsed.data.allowBackwardLinks,
        allowExternalLinks: parsed.data.allowExternalLinks,
        scrapeOptions: parsed.data.scrapeOptions,
      });
      if (!result.success) {
        res.status(502).json({ error: result.error ?? 'Firecrawl crawl failed to start' });
        return;
      }
      res.status(202).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/crawl/:jobId — get crawl job status
router.get(
  '/:jobId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { jobId } = req.params as { jobId: string };
      const status = await firecrawlService.getCrawlStatus(jobId);
      if (!status) {
        res.status(404).json({ error: 'Crawl job not found or Firecrawl not configured' });
        return;
      }
      res.json(status);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/crawl/:jobId — cancel a crawl job
router.delete(
  '/:jobId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { jobId } = req.params as { jobId: string };
      const cancelled = await firecrawlService.cancelCrawl(jobId);
      if (!cancelled) {
        res.status(404).json({ error: 'Could not cancel crawl job' });
        return;
      }
      res.json({ message: 'Crawl job cancelled' });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/crawl/map — map all URLs on a site
router.post(
  '/map',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = MapSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }
      const links = await firecrawlService.mapUrl(parsed.data.url, {
        search: parsed.data.search,
        limit: parsed.data.limit,
      });
      res.json({ url: parsed.data.url, links, count: links.length });
    } catch (err) {
      next(err);
    }
  },
);

export { router as crawlRouter };
