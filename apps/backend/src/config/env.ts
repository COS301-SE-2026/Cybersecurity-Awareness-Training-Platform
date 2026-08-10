import dotenv from 'dotenv';
import { z } from 'zod';
import { isSupportEmailAddress, supportEmailAddressSchema } from './support-email.js';

dotenv.config();

const DEMO_AUTH_TOKEN_SECRET = 'this-is-a-demo-auth-secret-token-change-before-production';

const optionalNonEmptyString = z.string().optional().transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined));

const smtpSecureInputSchema = z.enum(['true','false']);
const smtpSecureSchema = smtpSecureInputSchema.default('false').transform((value)=>value ==='true');
function isProductionSmtpHost(value:string):boolean{
  const normaliedHost = value.trim().toLocaleLowerCase();
  return ( normaliedHost.length>0 && normaliedHost!=='localhost'&&normaliedHost!=='mailpit');
}
function isNonLocalEmailAddress(value:string):boolean{
  const domain = value.split('@').at(-1)?.toLowerCase();
  return Boolean(domain&&domain!=='localhost'&&domain!=='local'&&!domain.endsWith('.local'));
}
const ProductionSmtpSchema=z.object({
  SMTP_HOST: z.string().trim().min(1).refine(isProductionSmtpHost, 'SMTP_HOST must be configured for a production SMTP provider'),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  SMTP_SECURE: smtpSecureInputSchema,
  SMTP_FROM_ADDRESS: z.string().trim().email().refine(isNonLocalEmailAddress,'SMTP_FROM_ADDRESS must be a non local email address in production'),
  SMTP_FROM_NAME: z.string().trim().min(1),
  SUPPORT_EMAIL_ADDRESS: z.string().refine(isSupportEmailAddress, "Invalid production support email address"),
  SMTP_USER: optionalNonEmptyString,
  SMTP_PASSWORD: optionalNonEmptyString,
}).superRefine((value, context) => {const hasUsername = Boolean(value.SMTP_USER);
  const hasPassword = Boolean(value.SMTP_PASSWORD);
  if (hasUsername!==hasPassword){
    context.addIssue({code:z.ZodIssueCode.custom, path:hasUsername?['SMTP_PASSWORD']:['SMTP_USER'], message: 'SMTP_USER and SMTP_PASSWORD must either both be set or both be absent'})
  }
})

const dispatcherBackoffSecondsSchema = z
  .string()
  .default('15,30,60')
  .transform((value, context) => {
    const parsed = value.split(',').map((part) => Number.parseInt(part.trim(),10));

    if (parsed.length === 0 || parsed.some((part) => !Number.isInteger(part) || part <= 0)){
      context.addIssue({
        code:z.ZodIssueCode.custom,
        message: 'EMAIL_DISPATCHER_BACKOFF_SECONDS must be comma-separated positive integers',
      });
      return z.NEVER;
    }
    return parsed;

  });

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  FRONTEND_ORIGIN: z.string().default('http://localhost:5173'),
  AUTH_TOKEN_SECRET: z.string().min(32).default(DEMO_AUTH_TOKEN_SECRET),
  AUTH_COOKIE_SECURE: z.enum(['true', 'false']).optional().transform((value) => value === undefined ? undefined : value === 'true'),
  AUTH_TOKEN_EXPIRES_IN_SECONDS: z.coerce.number().default(60 * 60 * 8),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60 * 1000),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(5),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().min(1).max(65535).default(1025),
  SMTP_SECURE: smtpSecureSchema,
  SMTP_FROM_ADDRESS: z.string().email().default('noreply@insightful-phish.local'),
  SMTP_FROM_NAME: z.string().default('Insightful Phish'),
  SUPPORT_EMAIL_ADDRESS: supportEmailAddressSchema,
  SMTP_USER: optionalNonEmptyString,
  SMTP_PASSWORD: optionalNonEmptyString,

  EMAIL_DISPATCHER_ENABLED: z
  .enum(['true', 'false'])
  .default('true')
  .transform((value) => value === 'true'),
  EMAIL_DISPATCHER_POLL_INTERVAL_MS: z.coerce.number().int().min(250).max(60_000).default(1_000),
  EMAIL_DISPATCHER_BATCH_SIZE: z.coerce.number().int().min(1).max(50).default(10),
  EMAIL_DISPATCHER_LEASE_SECONDS: z.coerce.number().int().min(30).max(300).default(75),
  EMAIL_DISPATCHER_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(4).default(4),
  EMAIL_DISPATCHER_BACKOFF_SECONDS: dispatcherBackoffSecondsSchema,
  EMAIL_DISPATCHER_RETRY_DEADLINE_SECONDS: z.coerce.number().int().min(15).max(600).default(120),
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'production' && value.AUTH_TOKEN_SECRET===DEMO_AUTH_TOKEN_SECRET) { //If we are not in production, we can use the demo auth token secret
    context.addIssue({code:z.ZodIssueCode.custom, message: 'AUTH_TOKEN_SECRET must be changed before deploying to production'})
  }
});

export function parseEnv(input: NodeJS.ProcessEnv) {
  const parsed = EnvSchema.parse(input);
  if (parsed.NODE_ENV === 'production'){
    ProductionSmtpSchema.parse(input);
  }
  return {
    ...parsed, AUTH_COOKIE_SECURE: parsed.AUTH_COOKIE_SECURE ?? parsed.NODE_ENV === 'production'
  };
}

export const env = parseEnv(process.env);
