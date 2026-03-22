import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import { rateLimiter } from './middleware/rateLimiter';
import { authMiddleware } from './middleware/auth';
import { databaseService } from './services/database';
import { redisService } from './services/redis';
import {
  scrapeRouter, agentRouter, keysRouter, crmRouter, leadsRouter,
  emailRouter, orchestratorRouter, smsRouter, paymentsRouter,
  hubspotRouter, connectorsRouter,
  crawlRouter, browserRouter, n8nRouter, cacheRouter,
} from './routes';

const app = express();

// ── Core middleware ────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: config.FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true,
  }),
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// ── Health endpoint (public) ───────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'xps-scraper-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Full diagnostics endpoint (public) ────────────────────────────────────────
app.get('/health/services', async (_req: Request, res: Response) => {
  const [dbPing, redisPing] = await Promise.all([
    databaseService.isAvailable()
      ? databaseService.query('SELECT 1').then(() => true).catch(() => false)
      : Promise.resolve(false),
    redisService.ping(),
  ]);

  const llmConfigured = !!(config.LLM_API_KEY || process.env['GROQ_API_KEY']);

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      api: { configured: true, connected: true },
      database: { configured: databaseService.isAvailable(), connected: dbPing },
      redis: { configured: redisService.isAvailable(), connected: redisPing },
      llm: {
        configured: llmConfigured,
        model: config.LLM_MODEL,
        provider: config.LLM_API_URL.includes('ollama')
          ? 'ollama'
          : config.LLM_API_URL.includes('groq')
          ? 'groq'
          : 'openai',
      },
      playwright: { configured: true },
      firecrawl: { configured: !!config.FIRECRAWL_API_KEY },
      twilio: { configured: !!(config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN) },
      stripe: { configured: !!config.STRIPE_SECRET_KEY },
      hubspot: { configured: !!config.HUBSPOT_ACCESS_TOKEN },
    },
  });
});

// ── Protected API routes ───────────────────────────────────────────────────────
app.use('/api/scrape', authMiddleware, scrapeRouter);
app.use('/api/agent', authMiddleware, agentRouter);
app.use('/api/keys', authMiddleware, keysRouter);
app.use('/api/crm', authMiddleware, crmRouter);
app.use('/api/leads', authMiddleware, leadsRouter);
app.use('/api/email', authMiddleware, emailRouter);
app.use('/api/orchestrator', authMiddleware, orchestratorRouter);
app.use('/api/sms', authMiddleware, smsRouter);
app.use('/api/payments', authMiddleware, paymentsRouter);
app.use('/api/hubspot', authMiddleware, hubspotRouter);
app.use('/api/connectors', authMiddleware, connectorsRouter);
app.use('/api/crawl', authMiddleware, crawlRouter);
app.use('/api/browser', authMiddleware, browserRouter);
app.use('/api/n8n', authMiddleware, n8nRouter);
app.use('/api/cache', authMiddleware, cacheRouter);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found', message: 'The requested endpoint does not exist' });
});

// ── Global error handler ───────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err.message, err.stack);
  const status = (err as NodeJS.ErrnoException & { status?: number }).status ?? 500;
  res.status(status).json({
    error: status === 500 ? 'Internal Server Error' : err.message,
    message: config.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
  });
});

// ── Start server ───────────────────────────────────────────────────────────────
app.listen(config.PORT, () => {
  console.log(`🚀 XPS Shadow Scraper backend running`);
  console.log(`   PORT        : ${config.PORT}`);
  console.log(`   NODE_ENV    : ${config.NODE_ENV}`);
  console.log(`   FRONTEND_URL: ${config.FRONTEND_URL}`);
  console.log(`   API_BASE_URL: http://localhost:${config.PORT}`);
  console.log(`   LLM_MODEL   : ${config.LLM_MODEL}`);
  console.log(`   Auth        : ${config.API_KEY || config.JWT_SECRET ? 'enabled' : 'dev-passthrough'}`);
});

export default app;
