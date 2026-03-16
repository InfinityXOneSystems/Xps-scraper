import axios from 'axios';
import type { ChatMessage, ScrapeResult, HarvestedKey, AgentChatResponse, ScrapeOptions } from './types';

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
  if (!url && !content) {
    throw new Error('Either url or content must be provided');
  }
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

export default api;
