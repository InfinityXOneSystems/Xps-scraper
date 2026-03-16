export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ScrapeResult {
  url: string;
  statusCode: number;
  title: string;
  description: string;
  text: string;
  links: Array<{ href: string; text: string; isExternal?: boolean }>;
  images: Array<{ src: string; alt: string; title?: string }>;
  headings: Array<{ level: number; text: string }>;
  tables: Array<{ headers: string[]; rows: string[][] }>;
  meta: Record<string, string>;
  structuredData: Record<string, string[]>;
  scrapedAt: string;
  responseTime: number;
}

export interface HarvestedKey {
  id: string;
  type: string;
  value: string;
  context: string;
  source: string;
  confidence: number;
  harvestedAt: string;
}

export interface AgentChatResponse {
  reply: string;
  action?: {
    action: string;
    url?: string;
    selectors?: Record<string, string>;
    response: string;
  };
  scrapeResult?: ScrapeResult;
  conversationHistory?: ChatMessage[];
}

export type Tab = 'chat' | 'scrape' | 'keys';

export interface ScrapeOptions {
  extractImages?: boolean;
  extractLinks?: boolean;
  selectors?: Record<string, string>;
  timeout?: number;
  followRedirects?: boolean;
}
