import { createOrganisationRegistrationRequestSchema } from '@insightful-phish/shared';
import { Router } from 'express';
import { submitOrganisationRegistrationRequest } from '../controllers/organisation-registration-request.controller.js';
import { apiRateLimit } from '../middleware/apiRateLimit.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validateRequest.js';

export const organisationRegistrationRequestRouter = Router();

/**
 * @openapi
 * /organisation-registration-requests:
 *   post:
 *     tags: [Organisation Registration Requests]
 *     summary: Submit a public organisation registration request
 *     description: Creates a pending organisation registration request for platform review. This does not create an organisation, user account, invitation, setup token, or authenticated session. A request-received email is attempted through the central backend email flow.
 *     security: []
 *     requestBody:
 *       $ref: '#/components/requestBodies/CreateOrganisationRegistrationRequest'
 *     responses:
 *       201:
 *         $ref: '#/components/responses/OrganisationRegistrationRequestCreated'
 *       409:
 *         $ref: '#/components/responses/OrganisationRegistrationRequestConflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
organisationRegistrationRequestRouter.post(
  '/organisation-registration-requests',
  apiRateLimit,
  validateBody(createOrganisationRegistrationRequestSchema, { statusCode: 422 }),
  asyncHandler(submitOrganisationRegistrationRequest),
);
