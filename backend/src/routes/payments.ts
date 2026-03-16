import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

const router = Router();

// ── Stripe helpers ─────────────────────────────────────────────────────────────
async function stripeRequest(path: string, method: 'GET' | 'POST', body?: Record<string, unknown>) {
  if (!config.STRIPE_SECRET_KEY) throw new Error('Stripe not configured. Set STRIPE_SECRET_KEY in .env');
  const url = `https://api.stripe.com/v1${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  const res = await fetch(url, {
    method,
    headers,
    body: body ? new URLSearchParams(body as Record<string, string>).toString() : undefined,
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error((data.error as { message?: string })?.message ?? `Stripe error ${res.status}`);
  return data;
}

// ── Square helpers ─────────────────────────────────────────────────────────────
function squareBaseUrl() {
  return config.SQUARE_ENVIRONMENT === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

async function squareRequest(path: string, method: 'GET' | 'POST', body?: unknown) {
  if (!config.SQUARE_ACCESS_TOKEN) throw new Error('Square not configured. Set SQUARE_ACCESS_TOKEN in .env');
  const res = await fetch(`${squareBaseUrl()}/v2${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.SQUARE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Square-Version': '2024-01-18',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

// ── Status ─────────────────────────────────────────────────────────────────────
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    stripe: { configured: !!config.STRIPE_SECRET_KEY, publishableKey: config.STRIPE_PUBLISHABLE_KEY || null },
    square: { configured: !!config.SQUARE_ACCESS_TOKEN, applicationId: config.SQUARE_APPLICATION_ID || null, locationId: config.SQUARE_LOCATION_ID || null, environment: config.SQUARE_ENVIRONMENT },
  });
});

// ── Stripe endpoints ───────────────────────────────────────────────────────────
const CreatePaymentIntentSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().default('usd'),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

router.post('/stripe/payment-intent', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = CreatePaymentIntentSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() }); return; }
    const body: Record<string, string> = {
      amount: String(parsed.data.amount),
      currency: parsed.data.currency,
    };
    if (parsed.data.description) body.description = parsed.data.description;
    const data = await stripeRequest('/payment_intents', 'POST', body);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/stripe/payment-intents', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await stripeRequest('/payment_intents?limit=20', 'GET');
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/stripe/customers', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await stripeRequest('/customers?limit=20', 'GET');
    res.json(data);
  } catch (err) { next(err); }
});

router.post('/stripe/customers', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, name, phone } = req.body as { email?: string; name?: string; phone?: string };
    const body: Record<string, string> = {};
    if (email) body.email = email;
    if (name) body.name = name;
    if (phone) body.phone = phone;
    const data = await stripeRequest('/customers', 'POST', body);
    res.json(data);
  } catch (err) { next(err); }
});

// ── Square endpoints ───────────────────────────────────────────────────────────
const CreateSquarePaymentSchema = z.object({
  amount: z.number().int().positive(),
  currency: z.string().default('USD'),
  sourceId: z.string().min(1),
  note: z.string().optional(),
});

router.post('/square/payment', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = CreateSquarePaymentSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() }); return; }
    const body = {
      idempotency_key: uuidv4(),
      source_id: parsed.data.sourceId,
      amount_money: { amount: parsed.data.amount, currency: parsed.data.currency },
      location_id: config.SQUARE_LOCATION_ID,
      ...(parsed.data.note ? { note: parsed.data.note } : {}),
    };
    const data = await squareRequest('/payments', 'POST', body);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/square/payments', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await squareRequest('/payments', 'GET');
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/square/locations', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await squareRequest('/locations', 'GET');
    res.json(data);
  } catch (err) { next(err); }
});

export { router as paymentsRouter };
