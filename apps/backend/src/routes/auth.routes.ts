import { authLoginRequestSchema, authRegisterRequestSchema } from '@insightful-phish/shared';
import { Router } from 'express';
import { getMe, login, register } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validateReqeust.js';

export const authRouter = Router();

authRouter.post('/auth/register', validateBody(authRegisterRequestSchema), register);
authRouter.post('/auth/login', validateBody(authLoginRequestSchema), login);
authRouter.get('/auth/me', requireAuth, getMe);
