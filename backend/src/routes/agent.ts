import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { llmService, ChatMessage } from '../services/llm';
import { scraperService, ScrapeResult } from '../services/scraper';

const router = Router();

interface Conversation {
  id: string;
  history: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// In-memory conversation store
const conversations = new Map<string, Conversation>();

const ChatBodySchema = z.object({
  message: z.string().min(1).max(4096),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string(),
      }),
    )
    .optional(),
  context: z.record(z.unknown()).optional(),
});

const NewConversationSchema = z.object({
  initialMessage: z.string().optional(),
});

// POST /agent/chat
router.post(
  '/chat',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = ChatBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }

      const { message, conversationHistory, context } = parsed.data;
      const scrapeContext = context as ScrapeResult | undefined;

      const history: ChatMessage[] = conversationHistory ?? [];
      const action = await llmService.interpretScrapeRequest(message, scrapeContext);

      let scrapeResult: ScrapeResult | undefined;

      // If action asks to scrape, do it automatically
      if (action.action === 'scrape' && action.url) {
        try {
          scrapeResult = await scraperService.scrapeUrl(action.url);
        } catch (scrapeErr) {
          console.error('[agent/chat] scrape error:', scrapeErr);
        }
      }

      // Append user message to history for the reply
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: action.response });

      res.json({
        reply: action.response,
        action,
        scrapeResult,
        conversationHistory: history,
      });
    } catch (err) {
      next(err);
    }
  },
);

// GET /agent/conversation/:id
router.get(
  '/conversation/:id',
  (req: Request, res: Response): void => {
    const conv = conversations.get(req.params['id'] as string);
    if (!conv) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json(conv);
  },
);

// POST /agent/conversation  — start a new conversation
router.post(
  '/conversation',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = NewConversationSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation error', details: parsed.error.flatten() });
        return;
      }

      const id = uuidv4();
      const now = new Date().toISOString();
      const conv: Conversation = {
        id,
        history: [],
        createdAt: now,
        updatedAt: now,
      };

      if (parsed.data.initialMessage) {
        conv.history.push({ role: 'user', content: parsed.data.initialMessage });
      }

      conversations.set(id, conv);
      res.status(201).json(conv);
    } catch (err) {
      next(err);
    }
  },
);

// POST /agent/shadow — headless background scraping agent
router.post(
  '/shadow',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { url, location, subject, extractKeys } = req.body as {
        url?: string;
        location?: string;
        subject?: string;
        extractKeys?: boolean;
      };

      if (!url) {
        res.status(400).json({ error: 'url is required' });
        return;
      }

      let scrapeResult;
      try {
        scrapeResult = await scraperService.scrapeUrl(url);
      } catch (scrapeErr) {
        res.status(502).json({ error: 'Scrape failed', details: String(scrapeErr) });
        return;
      }

      const summary = await llmService.chat([
        {
          role: 'user',
          content: `Analyze this scraped content from ${url}${location ? ` (location: ${location})` : ''}${subject ? ` (subject: ${subject})` : ''}.
Title: ${scrapeResult.title}
Text: ${scrapeResult.text.slice(0, 1000)}
Provide a brief structured summary.`,
        },
      ]);

      res.json({
        url,
        scrapeResult,
        summary,
        extractedKeys: extractKeys ? [] : undefined,
        processedAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

export { router as agentRouter };
