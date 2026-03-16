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

export type Tab =
  | 'dashboard'
  | 'chat'
  | 'scrape'
  | 'crm'
  | 'leads'
  | 'email'
  | 'workflows'
  | 'repos'
  | 'sandbox'
  | 'settings'
  | 'keys'
  | 'connectors'
  | 'payments'
  | 'sms'
  | 'hubspot';

export interface ScrapeOptions {
  extractImages?: boolean;
  extractLinks?: boolean;
  selectors?: Record<string, string>;
  timeout?: number;
  followRedirects?: boolean;
}

// CRM
export type ContactStatus = 'Lead' | 'Prospect' | 'Customer' | 'Inactive';
export interface Contact {
  id: string;
  name: string;
  email: string;
  company: string;
  status: ContactStatus;
  phone?: string;
  notes?: string;
  lastContact?: string;
  createdAt: string;
  updatedAt: string;
}

// Leads
export type LeadStage = 'New' | 'Contacted' | 'Qualified' | 'Proposal' | 'Won' | 'Lost';
export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  stage: LeadStage;
  score: number;
  value?: number;
  phone?: string;
  notes?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
}

// Email
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
export interface Campaign {
  id: string;
  name: string;
  templateId: string;
  status: CampaignStatus;
  scheduledAt?: string;
  recipients: string[];
  sentCount: number;
  openCount: number;
  clickCount: number;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

// Workflows
export type WorkflowNodeType = 'trigger' | 'scrape' | 'filter' | 'transform' | 'save_crm' | 'send_email' | 'llm' | 'webhook';
export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  label: string;
  x: number;
  y: number;
  config: Record<string, unknown>;
}

export interface WorkflowEdge {
  from: string;
  to: string;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

// GitHub Repo
export interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  topics?: string[];
}

// Payments
export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  description?: string;
}

export interface SquarePayment {
  id: string;
  amount_money: { amount: number; currency: string };
  status: string;
  created_at: string;
  note?: string;
}

// SMS
export interface SmsMessage {
  to: string;
  message: string;
}

// HubSpot
export interface HubSpotContact {
  id: string;
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    company?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface HubSpotDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    closedate?: string;
  };
}

// App Connectors
export interface AppConnection {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error';
  testedAt?: string;
  createdAt: string;
}

export type AppConnectorType =
  | 'github'
  | 'vercel'
  | 'railway'
  | 'netlify'
  | 'supabase'
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'stripe'
  | 'hubspot'
  | 'twilio'
  | 'slack'
  | 'notion'
  | 'airtable'
  | 'zapier'
  | 'custom';
