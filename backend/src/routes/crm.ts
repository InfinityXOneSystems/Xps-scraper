import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

export type ContactStatus = 'Lead' | 'Prospect' | 'Customer' | 'Inactive';

export interface Contact {
  id: string;
  name: string;
  email: string;
  company: string;
  status: ContactStatus;
  phone?: string;
  notes?: string;
  lastContact?: string;
  createdAt: string;
  updatedAt: string;
}

const contacts = new Map<string, Contact>();

const ContactSchema = z.object({
  name: z.string().min(1).max(256),
  email: z.string().email(),
  company: z.string().max(256).default(''),
  status: z.enum(['Lead', 'Prospect', 'Customer', 'Inactive']).default('Lead'),
  phone: z.string().max(50).optional(),
  notes: z.string().max(2048).optional(),
  lastContact: z.string().optional(),
});

// GET /api/crm/contacts
router.get('/contacts', (_req: Request, res: Response) => {
  res.json({ contacts: Array.from(contacts.values()), count: contacts.size });
});

// POST /api/crm/contacts
router.post(
  '/contacts',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = ContactSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }
      const now = new Date().toISOString();
      const contact: Contact = {
        id: uuidv4(),
        ...parsed.data,
        createdAt: now,
        updatedAt: now,
      };
      contacts.set(contact.id, contact);
      res.status(201).json(contact);
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/crm/contacts/:id
router.put(
  '/contacts/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params['id'] as string;
      const existing = contacts.get(id);
      if (!existing) {
        res.status(404).json({ error: 'Contact not found' });
        return;
      }
      const parsed = ContactSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }
      const updated: Contact = { ...existing, ...parsed.data, updatedAt: new Date().toISOString() };
      contacts.set(id, updated);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/crm/contacts/:id
router.delete('/contacts/:id', (req: Request, res: Response): void => {
  const id = req.params['id'] as string;
  if (!contacts.has(id)) {
    res.status(404).json({ error: 'Contact not found' });
    return;
  }
  contacts.delete(id);
  res.json({ success: true });
});

export { router as crmRouter };
