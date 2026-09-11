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
  N8N_LISTING_WEBHOOK_URL: z.string().url().optional(),
  N8N_WEBHOOK_SECRET: z.string().optional()
});

export const env = envSchema.parse(process.env);
