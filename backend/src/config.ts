import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT ?? '3001', 10),
  NODE_ENV: process.env.NODE_ENV ?? 'development',

  API_KEY: process.env.API_KEY ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? '',

  LLM_API_URL: process.env.LLM_API_URL ?? 'https://api.openai.com/v1',
  LLM_API_KEY: process.env.LLM_API_KEY ?? '',
  LLM_MODEL: process.env.LLM_MODEL ?? 'gpt-4o-mini',

  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:3000',

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? String(15 * 60 * 1000), 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),

  // Twilio
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ?? '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ?? '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER ?? '',

  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? '',
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ?? '',

  // Square
  SQUARE_ACCESS_TOKEN: process.env.SQUARE_ACCESS_TOKEN ?? '',
  SQUARE_APPLICATION_ID: process.env.SQUARE_APPLICATION_ID ?? '',
  SQUARE_LOCATION_ID: process.env.SQUARE_LOCATION_ID ?? '',
  SQUARE_ENVIRONMENT: (process.env.SQUARE_ENVIRONMENT ?? 'sandbox') as 'sandbox' | 'production',

  // HubSpot
  HUBSPOT_ACCESS_TOKEN: process.env.HUBSPOT_ACCESS_TOKEN ?? '',
  HUBSPOT_PORTAL_ID: process.env.HUBSPOT_PORTAL_ID ?? '',

  // Xtreme AI
  XTREME_AI_API_URL: process.env.XTREME_AI_API_URL ?? '',
  XTREME_AI_API_KEY: process.env.XTREME_AI_API_KEY ?? '',

  // XPS Intelligence System
  XPS_INTELLIGENCE_API_URL: process.env.XPS_INTELLIGENCE_API_URL ?? '',
  XPS_INTELLIGENCE_API_KEY: process.env.XPS_INTELLIGENCE_API_KEY ?? '',
  XPS_LEAD_INTELLIGENCE_URL: process.env.XPS_LEAD_INTELLIGENCE_URL ?? '',
  XPS_LEAD_INTELLIGENCE_KEY: process.env.XPS_LEAD_INTELLIGENCE_KEY ?? '',
  XPS_FRONTEND_URL: process.env.XPS_FRONTEND_URL ?? '',
  XPS_INTELLIGENCE_WEBHOOK_SECRET: process.env.XPS_INTELLIGENCE_WEBHOOK_SECRET ?? '',

  // GitHub App (XPS Orchestrator)
  GITHUB_APP_ID: process.env.GITHUB_APP_ID ?? '',
  GITHUB_APP_PRIVATE_KEY: process.env.GITHUB_APP_PRIVATE_KEY ?? '',
  GITHUB_APP_INSTALLATION_ID: process.env.GITHUB_APP_INSTALLATION_ID ?? '',
  GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET ?? '',
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ?? '',
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET ?? '',

  // App Connectors
  VERCEL_TOKEN: process.env.VERCEL_TOKEN ?? '',
  RAILWAY_API_TOKEN: process.env.RAILWAY_API_TOKEN ?? '',
  NETLIFY_TOKEN: process.env.NETLIFY_TOKEN ?? '',
} as const;
