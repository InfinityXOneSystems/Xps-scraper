/**
 * Bytebot Service
 *
 * Integrates with Bytebot (https://bytebot.ai) for browser-based
 * task automation. Bytebot runs a Playwright-based Docker container
 * that accepts natural-language task instructions over a REST API.
 *
 * When BYTEBOT_URL is not set, the service gracefully reports unavailability.
 */
import axios from 'axios';
import { config } from '../config';

export interface BytebotTask {
  task: string;
  url?: string;
  sessionId?: string;
  timeout?: number;
}

export interface BytebotTaskResult {
  success: boolean;
  sessionId?: string;
  output?: unknown;
  screenshot?: string;
  error?: string;
}

export interface BytebotSession {
  id: string;
  status: 'active' | 'idle' | 'closed';
  createdAt: string;
}

export class BytebotService {
  isAvailable(): boolean {
    return !!config.BYTEBOT_URL;
  }

  private get baseUrl(): string {
    return config.BYTEBOT_URL.replace(/\/$/, '');
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      ...(config.BYTEBOT_API_KEY ? { 'Authorization': `Bearer ${config.BYTEBOT_API_KEY}` } : {}),
    };
  }

  async executeTask(task: BytebotTask): Promise<BytebotTaskResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'BYTEBOT_URL not configured' };
    }
    try {
      const response = await axios.post<BytebotTaskResult>(
        `${this.baseUrl}/tasks`,
        {
          task: task.task,
          url: task.url,
          sessionId: task.sessionId,
          timeout: task.timeout ?? 60000,
        },
        { headers: this.headers, timeout: (task.timeout ?? 60000) + 5000 },
      );
      return response.data;
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string })?.error ?? err.message
        : String(err);
      return { success: false, error: msg };
    }
  }

  async createSession(): Promise<BytebotSession | null> {
    if (!this.isAvailable()) return null;
    try {
      const response = await axios.post<BytebotSession>(
        `${this.baseUrl}/sessions`,
        {},
        { headers: this.headers, timeout: 15000 },
      );
      return response.data;
    } catch (err) {
      console.error('[bytebot] createSession error:', err);
      return null;
    }
  }

  async closeSession(sessionId: string): Promise<boolean> {
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

  async listSessions(): Promise<BytebotSession[]> {
    if (!this.isAvailable()) return [];
    try {
      const response = await axios.get<{ sessions: BytebotSession[] }>(
        `${this.baseUrl}/sessions`,
        { headers: this.headers, timeout: 10000 },
      );
      return response.data?.sessions ?? [];
    } catch {
      return [];
    }
  }

  async ping(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      await axios.get(`${this.baseUrl}/health`, {
        headers: this.headers,
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const bytebotService = new BytebotService();
