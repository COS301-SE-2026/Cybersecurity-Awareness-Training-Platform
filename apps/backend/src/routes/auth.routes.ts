import { authLoginRequestSchema, authRegisterRequestSchema } from '@insightful-phish/shared';
import { Router } from 'express';
import { getMe, login, register } from '../controllers/auth.controller.js';
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
 *     description: Creates a general trainee user account and returns the public user DTO.
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
 *     description: Authenticates an active user and returns a bearer token.
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
 *     summary: Get the current authenticated user
 *     description: Returns the public user DTO for the bearer token on the request.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         $ref: '#/components/responses/AuthMeOk'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.get('/auth/me', authRateLimit, requireAuth, asyncHandler(getMe));
