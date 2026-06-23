import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const DEMO_AUTH_TOKEN_SECRET = 'this-is-a-demo-auth-secret-token-change-before-production';

const optionalNonEmptyString = z.string().optional().transform((value) => (value && value.trim().length > 0 ? value: undefined));
const smtpSecureSchema = z.enum(['true','false']).default('false').transform((value) => value === 'true');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  AUTH_TOKEN_SECRET: z.string().min(32).default(DEMO_AUTH_TOKEN_SECRET),
  AUTH_TOKEN_EXPIRES_IN_SECONDS: z.coerce.number().default(60 * 60 * 8),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60 * 1000),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(5),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_SECURE: smtpSecureSchema,
  SMTP_FROM_ADDRESS: z.string().email().default('noreply@insightful-phish.local'),
  SMTP_USER: optionalNonEmptyString,
  SMTP_PASSWORD: optionalNonEmptyString,
}).superRefine((value, context) => {
  if (value.NODE_ENV !== 'production') { //If we are not in production, we can use the demo auth token secret
    return;
  }

  if (value.AUTH_TOKEN_SECRET === DEMO_AUTH_TOKEN_SECRET) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'AUTH_TOKEN_SECRET must be changed before deploying to production',
    });
  }
});

export function parseEnv(input: NodeJS.ProcessEnv) {
  return EnvSchema.parse(input);
}

export const env = parseEnv(process.env);
