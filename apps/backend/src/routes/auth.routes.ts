import { authRegisterRequestSchema } from '@insightful-phish/shared';
import { Router } from 'express';
import { register } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validateReqeust.js';

export const authRouter = Router();

authRouter.post('/auth/register', validateBody(authRegisterRequestSchema), register);
