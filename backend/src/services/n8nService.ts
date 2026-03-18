/**
 * n8n Workflow Service
 *
 * Integrates with n8n (https://n8n.io) for workflow automation.
 * Supports triggering n8n webhooks and managing workflow executions
 * through the n8n REST API.
 *
 * Requires N8N_URL and optionally N8N_API_KEY to be set.
 */
import axios from 'axios';
import { config } from '../config';

export interface N8nWebhookPayload {
  [key: string]: unknown;
}

export interface N8nWebhookResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface N8nExecution {
  id: string;
  finished: boolean;
  mode: string;
  status: 'success' | 'error' | 'waiting' | 'running' | 'new';
  startedAt: string;
  stoppedAt?: string;
}

export class N8nService {
  isAvailable(): boolean {
    return !!config.N8N_URL;
  }

  private get baseUrl(): string {
    return config.N8N_URL.replace(/\/$/, '');
  }

  private get apiHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(config.N8N_API_KEY ? { 'X-N8N-API-KEY': config.N8N_API_KEY } : {}),
    };
  }

  /**
   * Trigger an n8n webhook by path
   * e.g. triggerWebhook('my-workflow-webhook', { data: '...' })
   */
  async triggerWebhook(
    webhookPath: string,
    payload: N8nWebhookPayload = {},
    method: 'GET' | 'POST' = 'POST',
  ): Promise<N8nWebhookResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'N8N_URL not configured' };
    }
    try {
      const url = `${this.baseUrl}/webhook/${webhookPath}`;
      const response = await (method === 'GET'
        ? axios.get<unknown>(url, { params: payload, timeout: 30000 })
        : axios.post<unknown>(url, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }));
      return { success: true, data: response.data };
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message ?? err.message
        : String(err);
      return { success: false, error: msg };
    }
  }

  async listWorkflows(): Promise<N8nWorkflow[]> {
    if (!this.isAvailable()) return [];
    try {
      const response = await axios.get<{ data: N8nWorkflow[] }>(
        `${this.baseUrl}/api/v1/workflows`,
        { headers: this.apiHeaders, timeout: 10000 },
      );
      return response.data?.data ?? [];
    } catch (err) {
      console.error('[n8n] listWorkflows error:', err);
      return [];
    }
  }

  async getWorkflow(id: string): Promise<N8nWorkflow | null> {
    if (!this.isAvailable()) return null;
    try {
      const response = await axios.get<N8nWorkflow>(
        `${this.baseUrl}/api/v1/workflows/${id}`,
        { headers: this.apiHeaders, timeout: 10000 },
      );
      return response.data;
    } catch {
      return null;
    }
  }

  async activateWorkflow(id: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      await axios.post(
        `${this.baseUrl}/api/v1/workflows/${id}/activate`,
        {},
        { headers: this.apiHeaders, timeout: 10000 },
      );
      return true;
    } catch {
      return false;
    }
  }

  async deactivateWorkflow(id: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      await axios.post(
        `${this.baseUrl}/api/v1/workflows/${id}/deactivate`,
        {},
        { headers: this.apiHeaders, timeout: 10000 },
      );
      return true;
    } catch {
      return false;
    }
  }

  async listExecutions(workflowId?: string, limit = 20): Promise<N8nExecution[]> {
    if (!this.isAvailable()) return [];
    try {
      const params: Record<string, string | number> = { limit };
      if (workflowId) params['workflowId'] = workflowId;
      const response = await axios.get<{ data: N8nExecution[] }>(
        `${this.baseUrl}/api/v1/executions`,
        { headers: this.apiHeaders, params, timeout: 10000 },
      );
      return response.data?.data ?? [];
    } catch {
      return [];
    }
  }

  async getExecution(id: string): Promise<N8nExecution | null> {
    if (!this.isAvailable()) return null;
    try {
      const response = await axios.get<N8nExecution>(
        `${this.baseUrl}/api/v1/executions/${id}`,
        { headers: this.apiHeaders, timeout: 10000 },
      );
      return response.data;
    } catch {
      return null;
    }
  }

  async ping(): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      await axios.get(`${this.baseUrl}/healthz`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

export const n8nService = new N8nService();
