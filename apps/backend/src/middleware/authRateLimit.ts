import rateLimit, { MemoryStore } from 'express-rate-limit';
import { env } from '../config/env.js';

const authRateLimitStore = new MemoryStore();

export const authRateLimit = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  store: authRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'AUTH_RATE_LIMITED',
    message: 'Too many authentication requests. Please try again later.',
  },
});

export function clearAuthRateLimitStore() {
  void authRateLimitStore.resetAll();
}
