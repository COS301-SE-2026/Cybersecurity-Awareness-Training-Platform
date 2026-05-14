import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  AUTH_TOKEN_SECRET: z.string().min(32).default('this-is-a-demo-auth-secret-token-change-before-production'),
  AUTH_TOKEN_EXPIRES_IN_SECONDS: z.coerce.number().default(60 * 60 * 8),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60 * 1000),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(5),
});

export const env = EnvSchema.parse(process.env);
