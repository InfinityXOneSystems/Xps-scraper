import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

export type LeadStage = 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Won' | 'Lost';

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  stage: LeadStage;
  score: number;
  value?: number;
  phone?: string;
  notes?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

const leads = new Map<string, Lead>();

const LeadSchema = z.object({
  name: z.string().min(1).max(256),
  email: z.string().email(),
  company: z.string().max(256).default(''),
  stage: z.enum(['New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost']).default('New'),
  score: z.number().min(0).max(100).default(0),
  value: z.number().min(0).optional(),
  phone: z.string().max(50).optional(),
  notes: z.string().max(2048).optional(),
  source: z.string().max(256).optional(),
});

// GET /api/leads
router.get('/', (_req: Request, res: Response) => {
  res.json({ leads: Array.from(leads.values()), count: leads.size });
});

// POST /api/leads
router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = LeadSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }
      const now = new Date().toISOString();
      const lead: Lead = { id: uuidv4(), ...parsed.data, createdAt: now, updatedAt: now };
      leads.set(lead.id, lead);
      res.status(201).json(lead);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/leads/:id
router.put(
  '/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params['id'] as string;
      const existing = leads.get(id);
      if (!existing) {
        res.status(404).json({ error: 'Lead not found' });
        return;
      }
      const parsed = LeadSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }
      const updated: Lead = { ...existing, ...parsed.data, updatedAt: new Date().toISOString() };
      leads.set(id, updated);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/leads/:id
router.delete('/:id', (req: Request, res: Response): void => {
  const id = req.params['id'] as string;
  if (!leads.has(id)) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }
  leads.delete(id);
  res.json({ success: true });
});

export { router as leadsRouter };
