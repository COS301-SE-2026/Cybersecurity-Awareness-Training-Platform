import { tokenParamsSchema } from '@insightful-phish/shared';
import { validateParams } from '../middleware/validateRequest.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getInvitationContext } from '../controllers/invitation-context.controller.js';
import { Router } from 'express';
export const invitationContextRouter = Router();
import { authRateLimit } from '../middleware/authRateLimit.js';

invitationContextRouter.get(
  '/invitations/token/:token/context',
  authRateLimit,
  validateParams(tokenParamsSchema),
  asyncHandler(getInvitationContext),
);
