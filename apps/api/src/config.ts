import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1d'),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:3000'),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  COOKIE_DOMAIN: z.string().optional(),
  N8N_LISTING_WEBHOOK_URL: z.string().url().optional(),
  N8N_WEBHOOK_SECRET: z.string().optional(),
  INTERNAL_API_URL: z.string().url().optional(),
  QDRANT_URL: z.string().url().default('http://classifieds-qdrant:6333'),
  QDRANT_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  AI_API_KEY: z.string().min(1).optional(),
  AI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  RECAPTCHA_SECRET_KEY: z.string().optional(),
  RECAPTCHA_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.5)
  ,FIREBASE_PROJECT_ID: z.string().optional()
  ,FIREBASE_CLIENT_EMAIL: z.string().optional()
  ,FIREBASE_PRIVATE_KEY: z.string().optional()
});

export const env = envSchema.parse(process.env);
