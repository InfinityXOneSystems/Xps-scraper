import axios from 'axios';
import type { ChatMessage, ScrapeResult, HarvestedKey, AgentChatResponse, ScrapeOptions, Contact, Lead, EmailTemplate, Campaign, Workflow, AppConnection } from './types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const key = localStorage.getItem('xps_api_key');
  if (key) {
    config.headers['X-API-Key'] = key;
  }
  return config;
});

export async function agentChat(
  message: string,
  history: ChatMessage[],
  context?: ScrapeResult,
): Promise<AgentChatResponse> {
  const { data } = await api.post<AgentChatResponse>('/agent/chat', {
    message,
    conversationHistory: history,
    ...(context ? { context } : {}),
  });
  return data;
}

export async function scrapeUrl(url: string, options?: ScrapeOptions): Promise<ScrapeResult> {
  const { data } = await api.post<ScrapeResult>('/scrape', { url, options });
  return data;
}

export async function scrapeUrls(
  urls: string[],
  options?: ScrapeOptions,
): Promise<{ results: ScrapeResult[]; errors: Array<{ url: string; error: string }> }> {
  const { data } = await api.post('/scrape/bulk', { urls, options });
  return data;
}

export async function harvestKeys(
  url?: string,
  content?: string,
): Promise<{ keys: HarvestedKey[]; count: number }> {
  if (!url && !content) throw new Error('Either url or content must be provided');
  const { data } = await api.post('/keys/harvest', { url, content });
  return data;
}

export async function getKeys(): Promise<HarvestedKey[]> {
  const { data } = await api.get<{ keys: HarvestedKey[]; count: number }>('/keys');
  return data.keys;
}

export async function deleteKey(id: string): Promise<void> {
  await api.delete(`/keys/${id}`);
}

export async function clearKeys(): Promise<void> {
  await api.delete('/keys');
}

export async function exportKeys(format: 'json' | 'csv'): Promise<string> {
  const { data } = await api.get<string>(`/keys/export?format=${format}`);
  return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}

export async function healthCheck(): Promise<{ status: string }> {
  const res = await api.get<{ status: string }>('/health', {
    baseURL: import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
      : '',
    // Accept 200 (healthy) and 429 (rate-limited) — both mean the backend is running
    validateStatus: (s) => s === 200 || s === 429,
  });
  // 429 = rate-limited but backend is reachable → treat as connected
  if (res.status === 429) return { status: 'ok' };
  return res.data;
}

export interface ServiceHealth {
  configured: boolean;
  connected?: boolean;
  model?: string;
  provider?: string;
}

export interface ServicesHealthResponse {
  status: string;
  timestamp: string;
  services: {
    api: ServiceHealth;
    database: ServiceHealth;
    redis: ServiceHealth;
    llm: ServiceHealth;
    playwright: ServiceHealth;
    firecrawl: ServiceHealth;
    twilio: ServiceHealth;
    stripe: ServiceHealth;
    hubspot: ServiceHealth;
  };
}

export async function getServicesHealth(): Promise<ServicesHealthResponse> {
  const { data } = await api.get<ServicesHealthResponse>('/health/services', {
    baseURL: import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
      : '',
  });
  return data;
}

// CRM
export async function getContacts(): Promise<Contact[]> {
  const { data } = await api.get<{ contacts: Contact[] }>('/crm/contacts');
  return data.contacts;
}
export async function createContact(c: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
  const { data } = await api.post<Contact>('/crm/contacts', c);
  return data;
}
export async function updateContact(id: string, c: Partial<Contact>): Promise<Contact> {
  const { data } = await api.put<Contact>(`/crm/contacts/${id}`, c);
  return data;
}
export async function deleteContact(id: string): Promise<void> {
  await api.delete(`/crm/contacts/${id}`);
}

// Leads
export async function getLeads(): Promise<Lead[]> {
  const { data } = await api.get<{ leads: Lead[] }>('/leads');
  return data.leads;
}
export async function createLead(l: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> {
  const { data } = await api.post<Lead>('/leads', l);
  return data;
}
export async function updateLead(id: string, l: Partial<Lead>): Promise<Lead> {
  const { data } = await api.put<Lead>(`/leads/${id}`, l);
  return data;
}
export async function deleteLead(id: string): Promise<void> {
  await api.delete(`/leads/${id}`);
}

// Email
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const { data } = await api.get<{ templates: EmailTemplate[] }>('/email/templates');
  return data.templates;
}
export async function createEmailTemplate(t: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> {
  const { data } = await api.post<EmailTemplate>('/email/templates', t);
  return data;
}
export async function getCampaigns(): Promise<Campaign[]> {
  const { data } = await api.get<{ campaigns: Campaign[] }>('/email/campaigns');
  return data.campaigns;
}
export async function createCampaign(c: { name: string; templateId: string; recipients: string[] }): Promise<Campaign> {
  const { data } = await api.post<Campaign>('/email/campaigns', c);
  return data;
}

// Orchestrator
export async function runWorkflow(workflow: Workflow): Promise<{ runId: string; status: string }> {
  const { data } = await api.post('/orchestrator/run', workflow);
  return data;
}
export async function getWorkflowStatus(runId: string): Promise<{ status: string; log: string[] }> {
  const { data } = await api.get(`/orchestrator/status/${runId}`);
  return data;
}

// SMS
export async function sendSms(to: string, message: string): Promise<{ success: boolean; sid?: string }> {
  const { data } = await api.post('/sms/send', { to, message });
  return data;
}

export async function sendBulkSms(recipients: string[], message: string): Promise<{ sent: number; failed: number }> {
  const { data } = await api.post('/sms/bulk', { recipients, message });
  return data;
}

export async function getSmsStatus(): Promise<{ configured: boolean; from: string | null }> {
  const { data } = await api.get('/sms/status');
  return data;
}

// Payments
export async function getPaymentsStatus(): Promise<{ stripe: { configured: boolean; publishableKey: string | null }; square: { configured: boolean } }> {
  const { data } = await api.get('/payments/status');
  return data;
}

export async function createStripePaymentIntent(amount: number, currency: string, description?: string): Promise<Record<string, unknown>> {
  const { data } = await api.post('/payments/stripe/payment-intent', { amount, currency, description });
  return data;
}

export async function getStripePaymentIntents(): Promise<{ data: unknown[] }> {
  const { data } = await api.get('/payments/stripe/payment-intents');
  return data;
}

export async function getStripeCustomers(): Promise<{ data: unknown[] }> {
  const { data } = await api.get('/payments/stripe/customers');
  return data;
}

export async function getSquareLocations(): Promise<{ locations: unknown[] }> {
  const { data } = await api.get('/payments/square/locations');
  return data;
}

// HubSpot
export async function getHubSpotStatus(): Promise<{ configured: boolean; portalId: string | null }> {
  const { data } = await api.get('/hubspot/status');
  return data;
}

export async function getHubSpotContacts(limit?: number): Promise<{ results: unknown[]; total: number }> {
  const { data } = await api.get(`/hubspot/contacts?limit=${limit ?? 20}`);
  return data;
}

export async function createHubSpotContact(contact: { email: string; firstname?: string; lastname?: string; phone?: string; company?: string }): Promise<unknown> {
  const { data } = await api.post('/hubspot/contacts', contact);
  return data;
}

export async function syncContactToHubSpot(contact: { name: string; email: string; company?: string; phone?: string }): Promise<{ action: string; data: unknown }> {
  const { data } = await api.post('/hubspot/sync-contact', contact);
  return data;
}

export async function getHubSpotDeals(): Promise<{ results: unknown[] }> {
  const { data } = await api.get('/hubspot/deals');
  return data;
}

// Connectors
export async function getConnections(): Promise<{ connections: AppConnection[]; count: number }> {
  const { data } = await api.get<{ connections: AppConnection[]; count: number }>('/connectors');
  return data;
}

export async function addConnection(conn: { name: string; type: string; credentials: Record<string, string> }): Promise<AppConnection> {
  const { data } = await api.post<AppConnection>('/connectors', conn);
  return data;
}

export async function testConnection(id: string): Promise<{ status: string; testedAt: string }> {
  const { data } = await api.post(`/connectors/${id}/test`);
  return data;
}

export async function deleteConnection(id: string): Promise<void> {
  await api.delete(`/connectors/${id}`);
}

export async function getGitHubOAuthUrl(): Promise<{ url: string }> {
  const { data } = await api.get('/connectors/oauth/github');
  return data;
}

export default api;
