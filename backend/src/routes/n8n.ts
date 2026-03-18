import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { n8nService } from '../services/n8nService';

const router = Router();

// GET /api/n8n/status
router.get('/status', (_req: Request, res: Response) => {
  res.json({ available: n8nService.isAvailable() });
});

const WebhookSchema = z.object({
  path: z.string().min(1, 'Webhook path is required'),
  payload: z.record(z.unknown()).optional().default({}),
  method: z.enum(['GET', 'POST']).optional().default('POST'),
});

// POST /api/n8n/webhook — trigger an n8n webhook
router.post(
  '/webhook',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = WebhookSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }
      const result = await n8nService.triggerWebhook(
        parsed.data.path,
        parsed.data.payload,
        parsed.data.method,
      );
      if (!result.success) {
        res.status(502).json({ error: result.error ?? 'Webhook trigger failed' });
        return;
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/n8n/workflows — list all n8n workflows
router.get(
  '/workflows',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workflows = await n8nService.listWorkflows();
      res.json({ workflows, count: workflows.length });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/n8n/workflows/:id — get a specific workflow
router.get(
  '/workflows/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workflow = await n8nService.getWorkflow(req.params['id'] as string);
      if (!workflow) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }
      res.json(workflow);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/n8n/workflows/:id/activate — activate a workflow
router.post(
  '/workflows/:id/activate',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const activated = await n8nService.activateWorkflow(req.params['id'] as string);
      if (!activated) {
        res.status(502).json({ error: 'Could not activate workflow' });
        return;
      }
      res.json({ message: 'Workflow activated' });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/n8n/workflows/:id/deactivate — deactivate a workflow
router.post(
  '/workflows/:id/deactivate',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const deactivated = await n8nService.deactivateWorkflow(req.params['id'] as string);
      if (!deactivated) {
        res.status(502).json({ error: 'Could not deactivate workflow' });
        return;
      }
      res.json({ message: 'Workflow deactivated' });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/n8n/executions — list workflow executions
router.get(
  '/executions',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workflowId = req.query['workflowId'] as string | undefined;
      const limit = parseInt((req.query['limit'] as string) ?? '20', 10);
      const executions = await n8nService.listExecutions(workflowId, limit);
      res.json({ executions, count: executions.length });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/n8n/executions/:id — get a specific execution
router.get(
  '/executions/:id',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const execution = await n8nService.getExecution(req.params['id'] as string);
      if (!execution) {
        res.status(404).json({ error: 'Execution not found' });
        return;
      }
      res.json(execution);
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/n8n/inbound — receive webhooks FROM n8n (n8n → this API)
router.post(
  '/inbound',
  (req: Request, res: Response): void => {
    const payload = req.body as Record<string, unknown>;
    console.log('[n8n] inbound webhook payload:', JSON.stringify(payload));
    // Applications can extend this endpoint to handle specific n8n events
    res.json({ received: true, timestamp: new Date().toISOString() });
  },
);

export { router as n8nRouter };
