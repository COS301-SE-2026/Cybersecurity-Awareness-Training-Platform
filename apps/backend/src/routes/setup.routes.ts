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
 *  get:
 *    tags: [setup]
 *    summary: Get setup-token context
 *    description: returns safe setup context for a public setup token without consuming
 *    security: []
 *    parameters:
 *      - $ref: '#/components/parameters/SetupTokenPathParam'
 *    resonses:
 *      200:
 *        $ref: '#/components/responses/SetupTokenContextOk'
 *      400:
 *        $ref: '#/components/responses/BadRequest'
 *      401:
 *        $ref: '#/components/responses/Unauthorised'
 *      409:
 *        $ref: '#/components/responses/Conflict'
 *      429:
 *        $ref: '#/components/responses/AuthRateLimit'
 *      500:
 *        $ref: '#/components/responses/InternalServerError'
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
 *  post:
 *    tags: [setup]
 *    summary: Complete token driven account setup
 *    description: Complete invite account creation and consume the setup token only after the transaction succeeds.
 *    security: []
 *    parameters:
 *      - $ref: '#/components/parameters/SetupTokenPathParam'
 *    resonses:
 *      200:
 *        $ref: '#/components/responses/SetupCompleteCreated'
 *      400:
 *        $ref: '#/components/responses/BadRequest'
 *      401:
 *        $ref: '#/components/responses/Unauthorised'
 *      409:
 *        $ref: '#/components/responses/Conflict'
 *      429:
 *        $ref: '#/components/responses/AuthRateLimit'
 *      500:
 *        $ref: '#/components/responses/InternalServerError'
 */

setupRouter.post(
  '/setup/token/:token/complete',
  authRateLimit,
  validateParams(setupTokenParamsSchema),
  validateBody(setupCompleteRequestSchema),
  asyncHandler(completeSetup),
);
