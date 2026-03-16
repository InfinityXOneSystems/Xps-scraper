import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { keyHarvesterService } from '../services/keyHarvester';

const router = Router();

const HarvestBodySchema = z.object({
  url: z.string().url().optional(),
  content: z.string().optional(),
}).refine((d) => d.url !== undefined || d.content !== undefined, {
  message: 'Either url or content must be provided',
});

const ExportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
});

// POST /keys/harvest
router.post(
  '/harvest',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = HarvestBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }

      let keys;
      if (parsed.data.url) {
        keys = await keyHarvesterService.harvestFromUrl(parsed.data.url);
      } else {
        keys = keyHarvesterService.harvest(parsed.data.content ?? '');
      }

      // Return masked values only
      const safeKeys = keys.map(({ rawValue: _raw, ...rest }) => rest);
      res.json({ keys: safeKeys, count: safeKeys.length });
    } catch (err) {
      next(err);
    }
  },
);

// GET /keys/export  — must be before GET /:id so it isn't captured as an id
router.get(
  '/export',
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = ExportQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }

      const format = parsed.data.format;
      const data = keyHarvesterService.export(format);

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="harvested-keys.csv"');
      } else {
        res.setHeader('Content-Type', 'application/json');
      }
      res.send(data);
    } catch (err) {
      next(err);
    }
  },
);

// GET /keys  — list all harvested keys (masked)
router.get('/', (_req: Request, res: Response): void => {
  const keys = keyHarvesterService.getAll();
  res.json({ keys, count: keys.length });
});

// GET /keys/:id
router.get('/:id', (req: Request, res: Response): void => {
  const key = keyHarvesterService.getById(req.params['id'] as string);
  if (!key) {
    res.status(404).json({ error: 'Key not found' });
    return;
  }
  // Return without rawValue
  const { rawValue: _raw, ...safeKey } = key;
  res.json(safeKey);
});

// DELETE /keys  — clear all
router.delete('/', (_req: Request, res: Response): void => {
  keyHarvesterService.clear();
  res.json({ message: 'All harvested keys cleared' });
});

// DELETE /keys/:id
router.delete('/:id', (req: Request, res: Response): void => {
  const deleted = keyHarvesterService.delete(req.params['id'] as string);
  if (!deleted) {
    res.status(404).json({ error: 'Key not found' });
    return;
  }
  res.json({ message: 'Key deleted' });
});

export { router as keysRouter };
