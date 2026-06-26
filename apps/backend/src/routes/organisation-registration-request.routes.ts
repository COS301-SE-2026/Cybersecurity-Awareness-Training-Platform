import { createOrganisationRegistrationRequestSchema } from '@insightful-phish/shared';
import { Router } from 'express';
import { submitOrganisationRegistrationRequest } from '../controllers/organisation-registration-request.controller.js';
import { apiRateLimit } from '../middleware/apiRateLimit.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validateRequest.js';

export const organisationRegistrationRequestRouter = Router();

organisationRegistrationRequestRouter.post(
  '/organisation-registration-requests',
  apiRateLimit,
  validateBody(createOrganisationRegistrationRequestSchema, { statusCode: 422 }),
  asyncHandler(submitOrganisationRegistrationRequest),
);
