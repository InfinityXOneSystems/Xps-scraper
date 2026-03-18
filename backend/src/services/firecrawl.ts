import axios from 'axios';
import { config } from '../config';

export interface FirecrawlScrapeOptions {
  formats?: Array<'markdown' | 'html' | 'rawHtml' | 'content' | 'links' | 'screenshot'>;
  onlyMainContent?: boolean;
  includeTags?: string[];
  excludeTags?: string[];
  timeout?: number;
  waitFor?: number;
}

export interface FirecrawlCrawlOptions {
  limit?: number;
  includePaths?: string[];
  excludePaths?: string[];
  maxDepth?: number;
  allowBackwardLinks?: boolean;
  allowExternalLinks?: boolean;
  scrapeOptions?: FirecrawlScrapeOptions;
}

export interface FirecrawlScrapeResult {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    rawHtml?: string;
    content?: string;
    links?: string[];
    screenshot?: string;
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
      sourceURL?: string;
      statusCode?: number;
    };
  };
  error?: string;
}

export interface FirecrawlCrawlResult {
  success: boolean;
  id?: string;
  url?: string;
  error?: string;
}

export interface FirecrawlCrawlStatus {
  status: 'scraping' | 'completed' | 'failed' | 'cancelled';
  completed: number;
  total: number;
  creditsUsed: number;
  expiresAt: string;
  data?: FirecrawlScrapeResult['data'][];
}

const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v1';

export class FirecrawlService {
  isAvailable(): boolean {
    return !!config.FIRECRAWL_API_KEY;
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${config.FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  async scrapeUrl(url: string, options: FirecrawlScrapeOptions = {}): Promise<FirecrawlScrapeResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'FIRECRAWL_API_KEY not configured' };
    }
    try {
      const response = await axios.post<FirecrawlScrapeResult>(
        `${FIRECRAWL_BASE_URL}/scrape`,
        { url, ...options },
        { headers: this.headers, timeout: (options.timeout ?? 30) * 1000 + 5000 },
      );
      return response.data;
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string })?.error ?? err.message
        : String(err);
      return { success: false, error: msg };
    }
  }

  async crawlUrl(url: string, options: FirecrawlCrawlOptions = {}): Promise<FirecrawlCrawlResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'FIRECRAWL_API_KEY not configured' };
    }
    try {
      const response = await axios.post<FirecrawlCrawlResult>(
        `${FIRECRAWL_BASE_URL}/crawl`,
        { url, ...options },
        { headers: this.headers, timeout: 30000 },
      );
      return response.data;
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string })?.error ?? err.message
        : String(err);
      return { success: false, error: msg };
    }
  }

  async getCrawlStatus(jobId: string): Promise<FirecrawlCrawlStatus | null> {
    if (!this.isAvailable()) return null;
    try {
      const response = await axios.get<FirecrawlCrawlStatus>(
        `${FIRECRAWL_BASE_URL}/crawl/${jobId}`,
        { headers: this.headers, timeout: 10000 },
      );
      return response.data;
    } catch (err) {
      console.error('[firecrawl] getCrawlStatus error:', err);
      return null;
    }
  }

  async cancelCrawl(jobId: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      await axios.delete(`${FIRECRAWL_BASE_URL}/crawl/${jobId}`, {
        headers: this.headers,
        timeout: 10000,
      });
      return true;
    } catch {
      return false;
    }
  }

  async mapUrl(url: string, options?: { search?: string; limit?: number }): Promise<string[]> {
    if (!this.isAvailable()) return [];
    try {
      const response = await axios.post<{ success: boolean; links?: string[] }>(
        `${FIRECRAWL_BASE_URL}/map`,
        { url, ...options },
        { headers: this.headers, timeout: 30000 },
      );
      return response.data?.links ?? [];
    } catch (err) {
      console.error('[firecrawl] mapUrl error:', err);
      return [];
    }
  }
}

export const firecrawlService = new FirecrawlService();
