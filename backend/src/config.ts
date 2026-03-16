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
} as const;
