import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import { rateLimiter } from './middleware/rateLimiter';
import { authMiddleware } from './middleware/auth';
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
