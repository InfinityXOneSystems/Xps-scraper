import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';

export interface Campaign {
  id: string;
  name: string;
  templateId: string;
  status: CampaignStatus;
  scheduledAt?: string;
  recipients: string[];
  sentCount: number;
  openCount: number;
  clickCount: number;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

const templates = new Map<string, EmailTemplate>();
const campaigns = new Map<string, Campaign>();

const TemplateSchema = z.object({
  name: z.string().min(1).max(256),
  subject: z.string().min(1).max(512),
  body: z.string().min(1),
});

const CampaignSchema = z.object({
  name: z.string().min(1).max(256),
  templateId: z.string().uuid(),
  status: z.enum(['draft', 'scheduled', 'running', 'completed', 'paused']).default('draft'),
  scheduledAt: z.string().optional(),
  recipients: z.array(z.string().email()).default([]),
});

// GET /api/email/templates
router.get('/templates', (_req: Request, res: Response) => {
  res.json({ templates: Array.from(templates.values()), count: templates.size });
});

// POST /api/email/templates
router.post(
  '/templates',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = TemplateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }
      const now = new Date().toISOString();
      const template: EmailTemplate = { id: uuidv4(), ...parsed.data, createdAt: now, updatedAt: now };
      templates.set(template.id, template);
      res.status(201).json(template);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/email/campaigns
router.get('/campaigns', (_req: Request, res: Response) => {
  res.json({ campaigns: Array.from(campaigns.values()), count: campaigns.size });
});

// POST /api/email/campaigns
router.post(
  '/campaigns',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = CampaignSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }
      const now = new Date().toISOString();
      const campaign: Campaign = {
        id: uuidv4(),
        ...parsed.data,
        sentCount: 0,
        openCount: 0,
        clickCount: 0,
        replyCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      campaigns.set(campaign.id, campaign);
      res.status(201).json(campaign);
    } catch (err) {
      next(err);
    }
  },
);

export { router as emailRouter };
