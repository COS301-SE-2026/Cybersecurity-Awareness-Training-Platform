import {
  listOrganisationEmailsQuerySchema,
  organisationEmailDraftInputSchema,
  organisationEmailDraftUpdateInputSchema,
  organisationEmailIdParamsSchema,
  organisationEmailMutationRequestSchema,
  organisationIdParamsSchema,
} from '@insightful-phish/shared';
import { Router } from 'express';
import rateLimit, { MemoryStore } from 'express-rate-limit';
import {
  activateOrganisationEmailController,
  copyOrganisationEmailController,
  createOrganisationEmailController,
  getOrganisationEmailController,
  listOrganisationEmailsController,
  updateOrganisationEmailController,
} from '../controllers/organisation-email.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validateRequest.js';

export const organisationEmailRouter = Router();

const readRateLimitStore = new MemoryStore();
const mutationRateLimitStore = new MemoryStore();

const rateLimitMessage = {
  error: 'ORGANISATION_EMAIL_RATE_LIMITED',
  message: 'Too many organisation email requests. Please try again later.',
};

const readRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  store: readRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

const mutationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  store: mutationRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
});

export async function clearOrganisationEmailRateLimitStores() {
  await readRateLimitStore.resetAll();
  await mutationRateLimitStore.resetAll();
}

organisationEmailRouter.get(
  '/organisations/:organisationId/email-library',
  readRateLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema, { statusCode: 422 }),
  validateQuery(listOrganisationEmailsQuerySchema, { statusCode: 422 }),
  asyncHandler(listOrganisationEmailsController),
);

organisationEmailRouter.post(
  '/organisations/:organisationId/email-library',
  mutationRateLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema, { statusCode: 422 }),
  validateBody(organisationEmailDraftInputSchema, { statusCode: 422 }),
  asyncHandler(createOrganisationEmailController),
);

organisationEmailRouter.get(
  '/organisations/:organisationId/email-library/:emailId',
  readRateLimit,
  requireAuth,
  validateParams(organisationEmailIdParamsSchema, { statusCode: 422 }),
  asyncHandler(getOrganisationEmailController),
);

organisationEmailRouter.patch(
  '/organisations/:organisationId/email-library/:emailId',
  mutationRateLimit,
  requireAuth,
  validateParams(organisationEmailIdParamsSchema, { statusCode: 422 }),
  validateBody(organisationEmailDraftUpdateInputSchema, { statusCode: 422 }),
  asyncHandler(updateOrganisationEmailController),
);

organisationEmailRouter.post(
  '/organisations/:organisationId/email-library/:emailId/activate',
  mutationRateLimit,
  requireAuth,
  validateParams(organisationEmailIdParamsSchema, { statusCode: 422 }),
  validateBody(organisationEmailMutationRequestSchema, { statusCode: 422 }),
  asyncHandler(activateOrganisationEmailController),
);

organisationEmailRouter.post(
  '/organisations/:organisationId/email-library/:emailId/copy',
  mutationRateLimit,
  requireAuth,
  validateParams(organisationEmailIdParamsSchema, { statusCode: 422 }),
  validateBody(organisationEmailMutationRequestSchema, { statusCode: 422 }),
  asyncHandler(copyOrganisationEmailController),
);
