import axios from 'axios';
import { config } from '../config';

export interface SteelSessionOptions {
  sessionTimeout?: number;
  useProxy?: boolean;
  proxyUrl?: string;
  solveCaptcha?: boolean;
  userAgent?: string;
}

export interface SteelSession {
  id: string;
  status: string;
  createdAt: string;
  expiresAt: string;
  proxyUrl?: string;
  userAgent?: string;
  cdpUrl?: string;
  websocketUrl?: string;
}

export interface SteelScrapeOptions {
  url: string;
  sessionId?: string;
  format?: 'html' | 'readability' | 'cleaned_html' | 'markdown';
  screenshot?: boolean;
  pdf?: boolean;
  waitFor?: number;
  delay?: number;
  selector?: string;
}

export interface SteelScrapeResult {
  url: string;
  content?: string;
  screenshot?: string;
  pdf?: string;
  metadata?: {
    title?: string;
    description?: string;
    statusCode?: number;
  };
  requestId?: string;
}

export class SteelBrowserService {
  private readonly baseUrl = 'https://api.steel.dev/v1';

  isAvailable(): boolean {
    return !!config.STEEL_API_KEY;
  }

  private get headers() {
    return {
      'Steel-Api-Key': config.STEEL_API_KEY,
      'Content-Type': 'application/json',
    };
  }

  async createSession(options: SteelSessionOptions = {}): Promise<SteelSession | null> {
    if (!this.isAvailable()) return null;
    try {
      const response = await axios.post<SteelSession>(
        `${this.baseUrl}/sessions`,
        {
          sessionTimeout: options.sessionTimeout ?? 900000,
          useProxy: options.useProxy ?? false,
          proxyUrl: options.proxyUrl,
          solveCaptcha: options.solveCaptcha ?? false,
          userAgent: options.userAgent,
        },
        { headers: this.headers, timeout: 15000 },
      );
      return response.data;
    } catch (err) {
      console.error('[steel] createSession error:', err);
      return null;
    }
  }

  async getSession(sessionId: string): Promise<SteelSession | null> {
    if (!this.isAvailable()) return null;
    try {
      const response = await axios.get<SteelSession>(
        `${this.baseUrl}/sessions/${sessionId}`,
        { headers: this.headers, timeout: 10000 },
      );
      return response.data;
    } catch (err) {
      console.error('[steel] getSession error:', err);
      return null;
    }
  }

  async listSessions(): Promise<SteelSession[]> {
    if (!this.isAvailable()) return [];
    try {
      const response = await axios.get<{ sessions: SteelSession[] }>(
        `${this.baseUrl}/sessions`,
        { headers: this.headers, timeout: 10000 },
      );
      return response.data?.sessions ?? [];
    } catch (err) {
      console.error('[steel] listSessions error:', err);
      return [];
    }
  }

  async releaseSession(sessionId: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      await axios.delete(`${this.baseUrl}/sessions/${sessionId}`, {
        headers: this.headers,
        timeout: 10000,
      });
      return true;
    } catch {
      return false;
    }
  }

  async scrape(options: SteelScrapeOptions): Promise<SteelScrapeResult | null> {
    if (!this.isAvailable()) return null;
    try {
      const response = await axios.post<SteelScrapeResult>(
        `${this.baseUrl}/scrape`,
        {
          url: options.url,
          sessionId: options.sessionId,
          format: options.format ?? 'readability',
          screenshot: options.screenshot ?? false,
          pdf: options.pdf ?? false,
          waitFor: options.waitFor,
          delay: options.delay,
          selector: options.selector,
        },
        { headers: this.headers, timeout: 60000 },
      );
      return response.data;
    } catch (err) {
      console.error('[steel] scrape error:', err);
      return null;
    }
  }
}

export const steelBrowserService = new SteelBrowserService();
