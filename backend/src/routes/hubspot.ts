import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { config } from '../config';

const router = Router();

async function hsRequest(path: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', body?: unknown) {
  if (!config.HUBSPOT_ACCESS_TOKEN) {
    throw new Error('HubSpot not configured. Set HUBSPOT_ACCESS_TOKEN in .env');
  }
  const base = 'https://api.hubapi.com';
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error((data.message as string) ?? `HubSpot error ${res.status}`);
  return data;
}

// GET /api/hubspot/status
router.get('/status', (_req: Request, res: Response) => {
  res.json({ configured: !!config.HUBSPOT_ACCESS_TOKEN, portalId: config.HUBSPOT_PORTAL_ID || null });
});

// GET /api/hubspot/contacts
router.get('/contacts', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = req.query['limit'] ?? '20';
    const after = req.query['after'] ? `&after=${req.query['after']}` : '';
    const data = await hsRequest(`/crm/v3/objects/contacts?limit=${limit}&properties=firstname,lastname,email,phone,company${after}`, 'GET');
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/hubspot/contacts
const ContactSchema = z.object({
  email: z.string().email(),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
});

router.post('/contacts', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = ContactSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() }); return; }
    const data = await hsRequest('/crm/v3/objects/contacts', 'POST', { properties: parsed.data });
    res.status(201).json(data);
  } catch (err) { next(err); }
});

// PATCH /api/hubspot/contacts/:id
router.patch('/contacts/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await hsRequest(`/crm/v3/objects/contacts/${req.params['id']}`, 'PATCH', { properties: req.body });
    res.json(data);
  } catch (err) { next(err); }
});

// DELETE /api/hubspot/contacts/:id
router.delete('/contacts/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await hsRequest(`/crm/v3/objects/contacts/${req.params['id']}`, 'DELETE');
    res.status(204).send();
  } catch (err) { next(err); }
});

// GET /api/hubspot/deals
router.get('/deals', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = req.query['limit'] ?? '20';
    const data = await hsRequest(`/crm/v3/objects/deals?limit=${limit}&properties=dealname,amount,dealstage,closedate`, 'GET');
    res.json(data);
  } catch (err) { next(err); }
});

// POST /api/hubspot/deals
router.post('/deals', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await hsRequest('/crm/v3/objects/deals', 'POST', { properties: req.body });
    res.status(201).json(data);
  } catch (err) { next(err); }
});

// POST /api/hubspot/sync-contact - sync a contact from local CRM to HubSpot
router.post('/sync-contact', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, company, phone } = req.body as { name?: string; email?: string; company?: string; phone?: string };
    if (!email) { res.status(400).json({ error: 'email required' }); return; }
    const [firstName, ...rest] = (name ?? '').split(' ');
    const props = {
      email,
      firstname: firstName ?? '',
      lastname: rest.join(' '),
      company: company ?? '',
      phone: phone ?? '',
    };
    // Try to create, fall back to update if exists
    try {
      const data = await hsRequest('/crm/v3/objects/contacts', 'POST', { properties: props });
      res.status(201).json({ action: 'created', data });
    } catch {
      // Search by email and update
      const search = await hsRequest('/crm/v3/objects/contacts/search', 'POST', {
        filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
        properties: ['id'],
      }) as { results?: Array<{ id: string }> };
      if (search.results && search.results.length > 0) {
        const id = search.results[0]!.id;
        const updated = await hsRequest(`/crm/v3/objects/contacts/${id}`, 'PATCH', { properties: props });
        res.json({ action: 'updated', data: updated });
      } else {
        throw new Error('Could not create or update HubSpot contact');
      }
    }
  } catch (err) { next(err); }
});

// GET /api/hubspot/pipelines
router.get('/pipelines', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await hsRequest('/crm/v3/pipelines/deals', 'GET');
    res.json(data);
  } catch (err) { next(err); }
});

export { router as hubspotRouter };
