import {
  authLoginRequestSchema,
  authRegisterRequestSchema,
  authResendVerificationRequestSchema,
} from '@insightful-phish/shared';
import { Router } from 'express';
import {
  getMe,
  login,
  register,
  logout,
  refresh,
  resendVerification,
} from '../controllers/auth.controller.js';
import { authRateLimit } from '../middleware/authRateLimit.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validateRequest.js';
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
 *       409:
 *         $ref: '#/components/responses/AuthEmailExists'
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
