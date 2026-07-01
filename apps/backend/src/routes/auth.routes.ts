import {
  authLoginRequestSchema,
  authRegisterRequestSchema,
  authResendVerificationRequestSchema,
  authVerifyEmailRequestSchema,
  authForgotPasswordRequestSchema,
  authResetPasswordRequestSchema,
  tokenParamsSchema,
} from '@insightful-phish/shared';
import { Router } from 'express';
import {
  getMe,
  login,
  register,
  logout,
  refresh,
  resendVerification,
  verify,
  forgotPassword,
  resetPassword,
  validateTokenContext,
  resendTokenLink,
} from '../controllers/auth.controller.js';
import { authRateLimit } from '../middleware/authRateLimit.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody, validateParams } from '../middleware/validateRequest.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const authRouter = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a trainee account
 *     description: Creates a general trainee account in pending email-verification state and sends a verification email through the email hook.
 *     security: []
 *     requestBody:
 *       $ref: '#/components/requestBodies/AuthRegister'
 *     responses:
 *       201:
 *         $ref: '#/components/responses/AuthRegisterCreated'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.post(
  '/auth/register',
  authRateLimit,
  validateBody(authRegisterRequestSchema),
  asyncHandler(register),
);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email and password
 *     description: Authenticates an active user, creates a session, issues access token and refresh token, and returns user context.
 *     security: []
 *     requestBody:
 *       $ref: '#/components/requestBodies/AuthLogin'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/AuthLoginOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/AuthInvalid'
 *       403:
 *         description: Forbidden. User account disabled or organisation suspended.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.post(
  '/auth/login',
  authRateLimit,
  validateBody(authLoginRequestSchema),
  asyncHandler(login),
);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the current authenticated user context
 *     description: Returns the public user DTO and auth context for the bearer token on the request.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         $ref: '#/components/responses/AuthMeOk'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Forbidden. User account disabled or organisation suspended.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.get('/auth/me', authRateLimit, requireAuth, asyncHandler(getMe));

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out the current session
 *     description: Revokes the current session and clears the refresh token cookie.
 *     security: []
 *     parameters:
 *       - in: cookie
 *         name: refreshToken
 *         required: false
 *         schema:
 *           type: string
 *         description: Refresh token cookie to clear.
 *     responses:
 *       200:
 *         description: Successfully logged out.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: refreshToken=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0
 *             description: Clears the refreshToken cookie.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.post('/auth/logout', authRateLimit, asyncHandler(logout));

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Rotate the refresh token and get a new access token
 *     description: Validates and rotates the refresh token from the cookie, returns a new access token and user context.
 *     security: []
 *     parameters:
 *       - in: cookie
 *         name: refreshToken
 *         required: true
 *         schema:
 *           type: string
 *         description: Hashed rotating refresh token cookie.
 *     responses:
 *       200:
 *         $ref: '#/components/responses/AuthLoginOk'
 *       401:
 *         description: Unauthorized. Refresh token is missing, invalid, or reused.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       403:
 *         description: Forbidden. User account disabled or organisation suspended.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.post('/auth/refresh', authRateLimit, asyncHandler(refresh));

/**
 * @openapi
 * /auth/resend-verification:
 *   post:
 *     tags: [Auth]
 *     summary: Resend verification email
 *     description: Resends the verification email for a user in pending email-verification state. Always returns 200 OK to avoid account enumeration.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthResendVerificationRequest'
 *     responses:
 *       200:
 *         description: Verification email process completed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResendVerificationResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.post(
  '/auth/resend-verification',
  authRateLimit,
  validateBody(authResendVerificationRequestSchema),
  asyncHandler(resendVerification),
);

/**
 * @openapi
 * /auth/verify-email:
 *   post:
 *     tags: [Auth]
 *     summary: Verify registration email token
 *     description: Verifies the email verification token, marks it used, and activates the user account if successful.
 *     security: []
 *     requestBody:
 *       $ref: '#/components/requestBodies/AuthVerifyEmail'
 *     responses:
 *       200:
 *         description: Verification attempt completed. Returns token verification state and user context if valid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthVerifyEmailResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.post(
  '/auth/verify-email',
  authRateLimit,
  validateBody(authVerifyEmailRequestSchema),
  asyncHandler(verify),
);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request a password reset link
 *     description: Initiates a password reset flow. Sends an email containing a secure password reset token when eligible. Always returns a generic success message to prevent account enumeration.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Safe generic accepted response.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthForgotPasswordResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.post(
  '/auth/forgot-password',
  authRateLimit,
  validateBody(authForgotPasswordRequestSchema),
  asyncHandler(forgotPassword),
);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password with a token
 *     description: Resets user password using a valid action token, revoking all existing sessions and refresh tokens on success.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResetPasswordResponse'
 *       400:
 *         description: Bad Request. Token is invalid format.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       401:
 *         description: Unauthorized. Token is invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       403:
 *         description: Forbidden. User account is disabled.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       409:
 *         description: Conflict. Token has already been used.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.post(
  '/auth/reset-password',
  authRateLimit,
  validateBody(authResetPasswordRequestSchema, { statusCode: 422 }),
  asyncHandler(resetPassword),
);

/**
 * @openapi
 * /auth/tokens/{token}/context:
 *   get:
 *     tags: [Auth]
 *     summary: Retrieve action token context
 *     description: Returns the validation state, resend eligibility, and cooldown status of a token without consuming it.
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 32
 *           maxLength: 512
 *           pattern: '^[A-Za-z0-9_-]+$'
 *         description: The raw token value to fetch context for.
 *     responses:
 *       200:
 *         description: Token context retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenContextResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.get(
  '/auth/tokens/:token/context',
  authRateLimit,
  validateParams(tokenParamsSchema),
  asyncHandler(validateTokenContext),
);

/**
 * @openapi
 * /auth/tokens/{token}/resend:
 *   post:
 *     tags: [Auth]
 *     summary: Request a replacement token
 *     description: Revokes the original token and triggers email resend for the associated flow, subject to cooldown.
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 32
 *           maxLength: 512
 *           pattern: '^[A-Za-z0-9_-]+$'
 *         description: The raw token to resend.
 *     responses:
 *       200:
 *         description: Resend process completed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad Request. Resend is ineligible.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       429:
 *         description: Too Many Requests. Cooldown active.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.post(
  '/auth/tokens/:token/resend',
  authRateLimit,
  validateParams(tokenParamsSchema),
  asyncHandler(resendTokenLink),
);
