import {
  accountProfileUpdateRequestSchema,
  accountSecurityPreferencesRequestSchema,
  accountVerifyEmailChangeRequestSchema,
} from '@insightful-phish/shared';
import { Router } from 'express';
import {
  getAccountController,
  updateAccountProfileController,
  updateAccountSecurityPreferencesController,
  verifyChange,
} from '../controllers/account.controller.js';
import { authRateLimit } from '../middleware/authRateLimit.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validateRequest.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const accountRouter = Router();

accountRouter.get('/account', requireAuth, asyncHandler(getAccountController));

accountRouter.patch(
  '/account/profile',
  requireAuth,
  validateBody(accountProfileUpdateRequestSchema, { statusCode: 422 }),
  asyncHandler(updateAccountProfileController),
);

accountRouter.patch(
  '/account/security-preferences',
  requireAuth,
  validateBody(accountSecurityPreferencesRequestSchema, { statusCode: 422 }),
  asyncHandler(updateAccountSecurityPreferencesController),
);

/**
 * @openapi
 * /account/verify-email-change:
 *   post:
 *     tags: [Auth]
 *     summary: Complete email change verification
 *     description: Verifies the email-change verification token, updates the email address, revokes active sessions/refresh tokens, and notifies the old and new email addresses.
 *     security: []
 *     requestBody:
 *       $ref: '#/components/requestBodies/AccountVerifyEmailChange'
 *     responses:
 *       200:
 *         description: Email change verification attempt completed. Returns token verification state.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountVerifyEmailChangeResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
accountRouter.post(
  '/account/verify-email-change',
  authRateLimit,
  validateBody(accountVerifyEmailChangeRequestSchema),
  asyncHandler(verifyChange),
);
