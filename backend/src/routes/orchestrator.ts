import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  startedAt: string;
  completedAt?: string;
  log: string[];
  output?: unknown;
}

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'scrape' | 'filter' | 'transform' | 'save_crm' | 'send_email' | 'llm' | 'webhook';
  label: string;
  config: Record<string, unknown>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: Array<{ from: string; to: string }>;
}

const workflowRuns = new Map<string, WorkflowRun>();

const NODE_EXECUTION_DELAY_MS = 50;

const NodeSchema = z.object({
  id: z.string(),
  type: z.enum(['trigger', 'scrape', 'filter', 'transform', 'save_crm', 'send_email', 'llm', 'webhook']),
  label: z.string(),
  config: z.record(z.unknown()).default({}),
});

const WorkflowSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  nodes: z.array(NodeSchema),
  edges: z.array(z.object({ from: z.string(), to: z.string() })).default([]),
});

// POST /api/orchestrator/run
router.post(
  '/run',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = WorkflowSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }

      const runId = uuidv4();
      const now = new Date().toISOString();

      const run: WorkflowRun = {
        id: runId,
        workflowId: parsed.data.id ?? uuidv4(),
        status: 'running',
        startedAt: now,
        log: [`[${now}] Workflow "${parsed.data.name}" started with ${parsed.data.nodes.length} nodes`],
      };

      workflowRuns.set(runId, run);

      // Simulate async execution
      setImmediate(async () => {
        const nodeLog: string[] = [];
        try {
          for (const node of parsed.data.nodes) {
            const ts = new Date().toISOString();
            nodeLog.push(`[${ts}] Executing node: ${node.type} — ${node.label}`);
            // Simulate processing time per node type
            await new Promise<void>((r) => setTimeout(r, NODE_EXECUTION_DELAY_MS));
          }
          const completedRun = workflowRuns.get(runId);
          if (completedRun) {
            completedRun.status = 'completed';
            completedRun.completedAt = new Date().toISOString();
            completedRun.log.push(...nodeLog);
            completedRun.log.push(`[${completedRun.completedAt}] Workflow completed successfully`);
          }
        } catch (err) {
          const failedRun = workflowRuns.get(runId);
          if (failedRun) {
            failedRun.status = 'failed';
            failedRun.completedAt = new Date().toISOString();
            failedRun.log.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      });

      res.status(202).json({ runId, status: 'running', message: 'Workflow started' });
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/orchestrator/status/:id
router.get('/status/:id', (req: Request, res: Response): void => {
  const id = req.params['id'] as string;
  const run = workflowRuns.get(id);
  if (!run) {
    res.status(404).json({ error: 'Workflow run not found' });
    return;
  }
  res.json(run);
});

export { router as orchestratorRouter };
