import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { scraperService, ScrapeResult } from '../services/scraper';

const router = Router();

const ScrapeBodySchema = z.object({
  url: z.string().url('Invalid URL'),
  options: z
    .object({
      timeout: z.number().int().positive().optional(),
      userAgent: z.string().optional(),
      followRedirects: z.boolean().optional(),
      extractImages: z.boolean().optional(),
      extractLinks: z.boolean().optional(),
      maxContentLength: z.number().int().positive().optional(),
      selectors: z.record(z.string()).optional(),
    })
    .optional(),
});

const BulkScrapeBodySchema = z.object({
  urls: z.array(z.string().url()).min(1).max(20),
  options: ScrapeBodySchema.shape.options,
});

const ExtractBodySchema = z
  .object({
    url: z.string().url('Invalid URL'),
    selectors: z.record(z.string()),
  })
  .refine((d) => Object.keys(d.selectors).length > 0, {
    message: 'At least one selector is required',
    path: ['selectors'],
  });

// POST /scrape  — scrape a single URL
router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = ScrapeBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }

      const result = await scraperService.scrapeUrl(parsed.data.url, parsed.data.options);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /scrape/bulk  — scrape multiple URLs
router.post(
  '/bulk',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = BulkScrapeBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }

      const settled = await Promise.allSettled(
        parsed.data.urls.map((url) => scraperService.scrapeUrl(url, parsed.data.options)),
      );

      type FulfilledScrape = PromiseFulfilledResult<ScrapeResult>;
      const results = settled
        .filter((r): r is FulfilledScrape => r.status === 'fulfilled')
        .map((r) => r.value);

      const errors = settled
        .map((r, i) =>
          r.status === 'rejected'
            ? { url: parsed.data.urls[i], error: (r.reason as Error).message }
            : null,
        )
        .filter(Boolean);

      res.json({ results, errors });
    } catch (err) {
      next(err);
    }
  },
);

// POST /scrape/extract  — extract by CSS selectors
router.post(
  '/extract',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = ExtractBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }

      const response = await scraperService.scrapeUrl(parsed.data.url, {
        selectors: parsed.data.selectors,
        extractImages: false,
        extractLinks: false,
      });

      res.json({
        url: parsed.data.url,
        structuredData: response.structuredData,
        scrapedAt: response.scrapedAt,
      });
    } catch (err) {
      next(err);
    }
  },
);

export { router as scrapeRouter };
