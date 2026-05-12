import { authLoginRequestSchema, authRegisterRequestSchema } from '@insightful-phish/shared';
import { Router } from 'express';
import { getMe, login, register } from '../controllers/auth.controller.js';
import { authRateLimit } from '../middleware/authRateLimit.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validateRequest.js';

export const authRouter = Router();

authRouter.post('/auth/register', authRateLimit, validateBody(authRegisterRequestSchema), register);
authRouter.post('/auth/login', authRateLimit, validateBody(authLoginRequestSchema), login);
authRouter.get('/auth/me', requireAuth, getMe);
