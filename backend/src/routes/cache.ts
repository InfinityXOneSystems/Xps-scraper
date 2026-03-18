import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { redisService } from '../services/redis';

const router = Router();

// GET /api/cache/status
router.get('/status', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const available = redisService.isAvailable();
    const connected = available ? await redisService.ping() : false;
    res.json({ available, connected });
  } catch (err) {
    next(err);
  }
});

const SetSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  ttl: z.number().int().positive().optional(),
});

const GetSchema = z.object({
  key: z.string().min(1),
});

// GET /api/cache/:key — get a cached value
router.get(
  '/:key',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = GetSchema.safeParse({ key: req.params['key'] });
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }
      const value = await redisService.get(parsed.data.key);
      const ttl = await redisService.ttl(parsed.data.key);
      if (value === null) {
        res.status(404).json({ error: 'Key not found' });
        return;
      }
      res.json({ key: parsed.data.key, value, ttl });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/cache — set a cached value
router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = SetSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }
      const ok = await redisService.set(parsed.data.key, parsed.data.value, parsed.data.ttl);
      if (!ok) {
        res.status(502).json({ error: 'REDIS_URL not configured or set failed' });
        return;
      }
      res.json({ key: parsed.data.key, stored: true });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/cache/:key — delete a cached value
router.delete(
  '/:key',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = req.params['key'] as string;
      const ok = await redisService.del(key);
      if (!ok) {
        res.status(404).json({ error: 'Key not found or Redis not configured' });
        return;
      }
      res.json({ key, deleted: true });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/cache — list keys by pattern
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pattern = (req.query['pattern'] as string) ?? '*';
      const keys = await redisService.keys(pattern);
      res.json({ keys, count: keys.length });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/cache/flush — flush all cached values (admin)
router.post(
  '/flush',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ok = await redisService.flush();
      if (!ok) {
        res.status(502).json({ error: 'REDIS_URL not configured or flush failed' });
        return;
      }
      res.json({ flushed: true });
    } catch (err) {
      next(err);
    }
  },
);

// ── Queue helpers ─────────────────────────────────────────────────────────────

const EnqueueSchema = z.object({
  queue: z.string().min(1),
  payload: z.unknown(),
});

// POST /api/cache/queue/enqueue — push to a Redis queue
router.post(
  '/queue/enqueue',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = EnqueueSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }
      const ok = await redisService.enqueue(parsed.data.queue, parsed.data.payload);
      if (!ok) {
        res.status(502).json({ error: 'REDIS_URL not configured or enqueue failed' });
        return;
      }
      const length = await redisService.queueLength(parsed.data.queue);
      res.json({ queue: parsed.data.queue, enqueued: true, length });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/cache/queue/dequeue — pop from a Redis queue
router.post(
  '/queue/dequeue',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const queue = z.string().min(1).safeParse((req.body as { queue?: string })?.queue);
      if (!queue.success) {
        res.status(400).json({ error: 'queue name is required' });
        return;
      }
      const item = await redisService.dequeue(queue.data);
      const length = await redisService.queueLength(queue.data);
      res.json({ queue: queue.data, item, length });
    } catch (err) {
      next(err);
    }
  },
);

export { router as cacheRouter };
