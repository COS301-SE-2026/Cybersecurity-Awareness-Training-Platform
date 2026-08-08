import {
  accountChangeEmailRequestSchema,
  accountChangePasswordRequestSchema,
  accountProfileUpdateRequestSchema,
  accountSessionIdParamsSchema,
  accountSecurityPreferencesRequestSchema,
  accountVerifyEmailChangeRequestSchema,
} from '@insightful-phish/shared';
import { Router } from 'express';
import {
  changePasswordController,
  getAccountController,
  listSessionsController,
  logoutOtherSessionsController,
  requestEmailChangeController,
  revokeSessionController,
  updateAccountProfileController,
  updateAccountSecurityPreferencesController,
  verifyChange,
} from '../controllers/account.controller.js';
import { authRateLimit } from '../middleware/authRateLimit.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody, validateParams } from '../middleware/validateRequest.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const accountRouter = Router();

/**
 * @openapi
 * /account:
 *   get:
 *     tags: [Account Settings]
 *     summary: Get account settings
 *     description: Returns the authenticated user's profile, security preferences, effective policy, and editable capability flags.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         $ref: '#/components/responses/AccountOk'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
accountRouter.get('/account', authRateLimit, requireAuth, asyncHandler(getAccountController));

/**
 * @openapi
 * /account/profile:
 *   patch:
 *     tags: [Account Settings]
 *     summary: Update account profile
 *     description: Updates the authenticated user's first and last name and records a compact audit event.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       $ref: '#/components/requestBodies/AccountProfileUpdate'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/AccountOk'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
accountRouter.patch(
  '/account/profile',
  authRateLimit,
  requireAuth,
  validateBody(accountProfileUpdateRequestSchema, { statusCode: 422 }),
  asyncHandler(updateAccountProfileController),
);

/**
 * @openapi
 * /account/change-email:
 *   post:
 *     tags: [Account Settings]
 *     summary: Request an account email change
 *     description: Verifies the current password, checks policy, creates a pending email-change request and verification token, and sends confirmation through the central email service.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       $ref: '#/components/requestBodies/AccountChangeEmail'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/AccountChangeEmailRequested'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
accountRouter.post(
  '/account/change-email',
  authRateLimit,
  requireAuth,
  validateBody(accountChangeEmailRequestSchema, { statusCode: 422 }),
  asyncHandler(requestEmailChangeController),
);

/**
 * @openapi
 * /account/change-password:
 *   post:
 *     tags: [Account Settings]
 *     summary: Change account password
 *     description: Verifies the current password, updates the password hash, revokes active sessions and refresh tokens, sends a password-changed notification, and records an audit event.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       $ref: '#/components/requestBodies/AccountChangePassword'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/AccountPasswordChanged'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
accountRouter.post(
  '/account/change-password',
  authRateLimit,
  requireAuth,
  validateBody(accountChangePasswordRequestSchema, { statusCode: 422 }),
  asyncHandler(changePasswordController),
);

/**
 * @openapi
 * /account/sessions:
 *   get:
 *     tags: [Account Settings]
 *     summary: List active account sessions
 *     description: Returns safe summaries for the authenticated user's active sessions. Refresh tokens, token hashes, IP addresses, and raw user agents are never returned.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         $ref: '#/components/responses/AccountSessionsOk'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
accountRouter.get(
  '/account/sessions',
  authRateLimit,
  requireAuth,
  asyncHandler(listSessionsController),
);

/**
 * @openapi
 * /account/sessions/{sessionId}:
 *   delete:
 *     tags: [Account Settings]
 *     summary: Revoke an account session
 *     description: Revokes one active session owned by the authenticated user and revokes its refresh tokens.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/AccountSessionIdPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/AccountSessionRevoked'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
accountRouter.delete(
  '/account/sessions/:sessionId',
  authRateLimit,
  requireAuth,
  validateParams(accountSessionIdParamsSchema),
  asyncHandler(revokeSessionController),
);

/**
 * @openapi
 * /account/sessions/logout-others:
 *   post:
 *     tags: [Account Settings]
 *     summary: Log out other sessions
 *     description: Revokes all active sessions for the authenticated user except the current session.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         $ref: '#/components/responses/AccountOtherSessionsLoggedOut'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
accountRouter.post(
  '/account/sessions/logout-others',
  authRateLimit,
  requireAuth,
  asyncHandler(logoutOtherSessionsController),
);

/**
 * @openapi
 * /account/security-preferences:
 *   patch:
 *     tags: [Account Settings]
 *     summary: Update account security preferences
 *     description: Updates user session preferences where organisation policy permits them and returns the updated account policy/capability view.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       $ref: '#/components/requestBodies/AccountSecurityPreferences'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/AccountOk'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
accountRouter.patch(
  '/account/security-preferences',
  authRateLimit,
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
 *     description: Verifies the email-change verification token, updates the email address, consumes the token, confirms the pending request, and revokes active sessions/refresh tokens.
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
