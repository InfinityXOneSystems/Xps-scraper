import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { config } from '../config';

const router = Router();

const SendSmsSchema = z.object({
  to: z.string().min(1),
  message: z.string().min(1).max(1600),
  from: z.string().optional(),
});

const BulkSmsSchema = z.object({
  recipients: z.array(z.string()).min(1).max(50),
  message: z.string().min(1).max(1600),
});

async function twilioSend(to: string, body: string, from?: string): Promise<{ sid: string; status: string }> {
  if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
  }
  const fromNumber = from ?? config.TWILIO_PHONE_NUMBER;
  if (!fromNumber) throw new Error('No from number configured. Set TWILIO_PHONE_NUMBER in .env');

  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.TWILIO_ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: fromNumber, Body: body });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const err = await response.json() as { message?: string; code?: number };
    throw new Error(err.message ?? `Twilio error ${response.status}`);
  }

  const data = await response.json() as { sid: string; status: string };
  return { sid: data.sid, status: data.status };
}

// POST /api/sms/send
router.post('/send', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = SendSmsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      return;
    }
    const result = await twilioSend(parsed.data.to, parsed.data.message, parsed.data.from);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// POST /api/sms/bulk
router.post('/bulk', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = BulkSmsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
      return;
    }
    const results = await Promise.allSettled(
      parsed.data.recipients.map((r) => twilioSend(r, parsed.data.message))
    );
    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    res.json({
      sent,
      failed,
      results: results.map((r, i) => ({
        to: parsed.data.recipients[i],
        success: r.status === 'fulfilled',
        ...(r.status === 'fulfilled' ? r.value : { error: (r.reason as Error).message }),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/sms/status
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    configured: !!(config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN && config.TWILIO_PHONE_NUMBER),
    from: config.TWILIO_PHONE_NUMBER || null,
  });
});

export { router as smsRouter };
