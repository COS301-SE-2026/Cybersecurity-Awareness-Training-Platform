import { authLoginRequestSchema, authRegisterRequestSchema } from '@insightful-phish/shared';
import { Router } from 'express';
import { getMe, login, register } from '../controllers/auth.controller.js';
import { authRateLimit } from '../middleware/authRateLimit.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody } from '../middleware/validateRequest.js';

export const authRouter = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a trainee account
 *     description: Creates a general trainee user account and returns the safe public user representation.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRegisterRequest'
 *           examples:
 *             traineeRegistration:
 *               summary: Register a trainee
 *               value:
 *                 email: johan@example.com
 *                 password: correct-horse-battery-staple
 *                 firstName: Johan
 *                 lastName: Botha
 *     responses:
 *       201:
 *         description: Account registered successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthRegisterResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         description: A user with the provided email already exists.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthEmailExistsErrorResponse'
 *       429:
 *         description: Too many authentication requests.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthRateLimitErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.post('/auth/register', authRateLimit, validateBody(authRegisterRequestSchema), register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Log in with email and password
 *     description: Authenticates an active user and returns a bearer token with the safe public user representation.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLoginRequest'
 *           examples:
 *             traineeLogin:
 *               summary: Log in a user
 *               value:
 *                 email: johan@example.com
 *                 password: correct-horse-battery-staple
 *     responses:
 *       200:
 *         description: Login successful.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthLoginResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: Email, password, or account status is invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthInvalidErrorResponse'
 *       429:
 *         description: Too many authentication requests.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthRateLimitErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.post('/auth/login', authRateLimit, validateBody(authLoginRequestSchema), login);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get the current authenticated user
 *     description: Returns the safe public user representation for the bearer token on the request.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current authenticated user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthMeResponse'
 *       401:
 *         description: Authentication credentials are missing or invalid.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ApiErrorResponse'
 *                 - $ref: '#/components/schemas/AuthInvalidErrorResponse'
 *       429:
 *         description: Too many authentication requests.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthRateLimitErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
authRouter.get('/auth/me', authRateLimit, requireAuth, getMe);
