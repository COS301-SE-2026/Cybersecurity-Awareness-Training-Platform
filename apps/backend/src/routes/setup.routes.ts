import { setupCompleteRequestSchema, setupTokenParamsSchema } from '@insightful-phish/shared';
import { Router } from 'express';
import { completeSetup, getSetupContext } from '../controllers/setup.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authRateLimit } from '../middleware/authRateLimit.js';
import { validateBody, validateParams } from '../middleware/validateRequest.js';

export const setupRouter = Router();

/**
 * @openapi
 * /setup/token/{token}/context:
 *   get:
 *     tags: [Setup]
 *     summary: Get setup-token context
 *     description: Returns safe setup context for a public setup token without consuming it.
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/SetupTokenPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/SetupTokenContextOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

setupRouter.get(
  '/setup/token/:token/context',
  authRateLimit,
  validateParams(setupTokenParamsSchema),
  asyncHandler(getSetupContext),
);

/**
 * @openapi
 * /setup/token/{token}/complete:
 *   post:
 *     tags: [Setup]
 *     summary: Complete token-driven account setup
 *     description: Completes invite/setup-token account creation and consumes the setup token only after the setup transaction succeeds.
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/SetupTokenPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/SetupComplete'
 *     responses:
 *       201:
 *         $ref: '#/components/responses/SetupCompleteCreated'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

setupRouter.post(
  '/setup/token/:token/complete',
  authRateLimit,
  validateParams(setupTokenParamsSchema),
  validateBody(setupCompleteRequestSchema),
  asyncHandler(completeSetup),
);
