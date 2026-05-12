import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const authRateLimit = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'AUTH_RATE_LIMITED',
    message: 'Too many authentication requests. Please try again later.',
  },
});
