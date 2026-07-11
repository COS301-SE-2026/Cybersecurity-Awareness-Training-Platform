import { tokenParamsSchema } from '@insightful-phish/shared';
import { validateParams } from '../middleware/validateRequest.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getInvitationContext } from '../controllers/invitation-context.controller.js';
import { Router } from 'express';
export const invitationContextRouter = Router();
import { authRateLimit } from '../middleware/authRateLimit.js';

/**
 * @openapi
 * /invitations/token/{token}/context:
 *   get:
 *     tags: [Invitations]
 *     summary: Get invitation token context
 *     description: Returns non-consuming context for a supported invitation token
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         description: Raw invitation token received through the invitation link
 *         schema:
 *           type: string
 *           minLength: 32
 *           maxLength: 512
 *           pattern: '^[A-Za-z0-9_-]+$'
 *     responses:
 *       200:
 *         description: Invitation token context retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InvitationTokenContextResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
invitationContextRouter.get(
  '/invitations/token/:token/context',
  authRateLimit,
  validateParams(tokenParamsSchema),
  asyncHandler(getInvitationContext),
);
