import axios from 'axios';
import type { ChatMessage, ScrapeResult, HarvestedKey, AgentChatResponse, ScrapeOptions, Contact, Lead, EmailTemplate, Campaign, Workflow } from './types';

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
  const { data } = await api.get<{ status: string }>('/health', {
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

export default api;
