import OpenAI from 'openai';
import { config } from '../config';
import type { ScrapeResult } from './scraper';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type AgentActionType = 'scrape' | 'harvest_keys' | 'extract' | 'summarize' | 'answer';

export interface AgentAction {
  action: AgentActionType;
  url?: string;
  selectors?: Record<string, string>;
  response: string;
}

const DEFAULT_SYSTEM_PROMPT = `You are an XPS Shadow Scraper AI agent — a super shadow REST API agent with key harvester technology. You help users extract data from websites, analyze scraped content, identify API keys and secrets in web content, and answer questions about web data.

When a user asks you to scrape a URL, respond with a JSON block like:
{"action":"scrape","url":"<url>","response":"<friendly message>"}

When they want to harvest keys from a URL:
{"action":"harvest_keys","url":"<url>","response":"<friendly message>"}

When they want to extract specific data with CSS selectors:
{"action":"extract","url":"<url>","selectors":{"key":"selector"},"response":"<friendly message>"}

When they want a summary of already-scraped content:
{"action":"summarize","response":"<summary>"}

For general questions:
{"action":"answer","response":"<answer>"}

Always respond with valid JSON matching one of the above shapes.`;

export class LLMService {
  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      if (!config.LLM_API_KEY) {
        throw new Error('LLM_API_KEY is not configured');
      }
      this.client = new OpenAI({
        apiKey: config.LLM_API_KEY,
        baseURL: config.LLM_API_URL,
      });
    }
    return this.client;
  }

  async chat(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    if (!config.LLM_API_KEY) {
      return this.mockResponse(messages);
    }

    try {
      const client = this.getClient();
      const systemMessage: ChatMessage = {
        role: 'system',
        content: systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
      };

      const completion = await client.chat.completions.create({
        model: config.LLM_MODEL,
        messages: [systemMessage, ...messages],
        temperature: 0.3,
        max_tokens: 1024,
      });

      return completion.choices[0]?.message?.content ?? '';
    } catch (err) {
      console.error('[LLMService] chat error:', err);
      throw err;
    }
  }

  async interpretScrapeRequest(
    userMessage: string,
    context?: ScrapeResult,
  ): Promise<AgentAction> {
    if (!config.LLM_API_KEY) {
      return this.mockInterpret(userMessage);
    }

    const messages: ChatMessage[] = [];

    if (context) {
      messages.push({
        role: 'user',
        content: `Context from previous scrape of ${context.url}:\nTitle: ${context.title}\nText (first 500 chars): ${context.text.slice(0, 500)}`,
      });
      messages.push({
        role: 'assistant',
        content: JSON.stringify({ action: 'answer', response: 'Context loaded.' }),
      });
    }

    messages.push({ role: 'user', content: userMessage });

    const raw = await this.chat(messages);
    return this.parseAgentAction(raw, userMessage);
  }

  private parseAgentAction(raw: string, fallbackMessage: string): AgentAction {
    try {
      // Extract JSON from the response (may be wrapped in markdown code fences)
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Partial<AgentAction>;
        if (parsed.action) {
          return {
            action: parsed.action,
            url: parsed.url,
            selectors: parsed.selectors,
            response: parsed.response ?? raw,
          };
        }
      }
    } catch {
      // Fall through to default
    }

    return { action: 'answer', response: raw || fallbackMessage };
  }

  private mockResponse(messages: ChatMessage[]): string {
    const last = messages[messages.length - 1];
    const content = last?.content ?? '';
    const lower = content.toLowerCase();

    if (lower.includes('http')) {
      const urlMatch = content.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        return JSON.stringify({
          action: 'scrape',
          url: urlMatch[0],
          response: `I'll scrape ${urlMatch[0]} for you.`,
        });
      }
    }

    return JSON.stringify({
      action: 'answer',
      response:
        'I am the XPS Shadow Scraper AI agent. I can help you scrape websites, harvest API keys, and extract structured data. Provide a URL to get started! (Note: LLM not configured — running in mock mode)',
    });
  }

  private mockInterpret(userMessage: string): AgentAction {
    const lower = userMessage.toLowerCase();
    const urlMatch = userMessage.match(/https?:\/\/[^\s]+/);

    if (urlMatch) {
      if (lower.includes('harvest') || lower.includes('key') || lower.includes('secret')) {
        return {
          action: 'harvest_keys',
          url: urlMatch[0],
          response: `Harvesting keys from ${urlMatch[0]}`,
        };
      }
      return {
        action: 'scrape',
        url: urlMatch[0],
        response: `Scraping ${urlMatch[0]}`,
      };
    }

    return {
      action: 'answer',
      response:
        'XPS Shadow Scraper is ready. Provide a URL to scrape or ask me to harvest keys. (LLM not configured — mock mode active)',
    };
  }
}

export const llmService = new LLMService();
