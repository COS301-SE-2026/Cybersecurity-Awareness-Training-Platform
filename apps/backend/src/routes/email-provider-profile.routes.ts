import {
  createEmailProviderProfileRequestSchema,
  emailProviderProfileCollectionRequestParamsSchema,
  emailProviderProfileDetailRequestParamsSchema,
  updateEmailProviderProfileRequestSchema,
} from '@insightful-phish/shared';
import { Router } from 'express';
import rateLimit, { MemoryStore } from 'express-rate-limit';
import {
  checkEmailProviderProfileConnectionController,
  createEmailProviderProfileController,
  getEmailProviderProfileController,
  listEmailProviderProfilesController,
  removeEmailProviderProfileController,
  updateEmailProviderProfileController,
  sendEmailProviderProfileTestController,
} from '../controllers/email-provider-profile.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody, validateParams } from '../middleware/validateRequest.js';

export const emailProviderProfileRouter = Router();

const emailProviderProfileReadRateLimitStore = new MemoryStore();
const emailProviderProfileMutationRateLimitStore = new MemoryStore();
const emailProviderProfileRateLimitMessage = {
  error: 'EMAIL_PROVIDER_PROFILE_RATE_LIMITED',
  message: 'Too many email provider profile requests. Please try again later.',
};
const emailProviderProfileReadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  store: emailProviderProfileReadRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
  message: emailProviderProfileRateLimitMessage,
});
const emailProviderProfileMutationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  store: emailProviderProfileMutationRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
  message: emailProviderProfileRateLimitMessage,
});
const collectionPath = '/organisations/:organisationId/email-provider-profiles';
const resourcePath = `${collectionPath}/:profileId`;

export async function clearEmailProviderProfileRateLimitStores() {
  await emailProviderProfileReadRateLimitStore.resetAll();
  await emailProviderProfileMutationRateLimitStore.resetAll();
}

emailProviderProfileRouter.get(
  collectionPath,
  emailProviderProfileReadRateLimit,
  requireAuth,
  validateParams(emailProviderProfileCollectionRequestParamsSchema, { statusCode: 422 }),
  asyncHandler(listEmailProviderProfilesController),
);
emailProviderProfileRouter.post(
  collectionPath,
  emailProviderProfileMutationRateLimit,
  requireAuth,
  validateParams(emailProviderProfileCollectionRequestParamsSchema, { statusCode: 422 }),
  validateBody(createEmailProviderProfileRequestSchema, { statusCode: 422 }),
  asyncHandler(createEmailProviderProfileController),
);
emailProviderProfileRouter.get(
  resourcePath,
  emailProviderProfileReadRateLimit,
  requireAuth,
  validateParams(emailProviderProfileDetailRequestParamsSchema, { statusCode: 422 }),
  asyncHandler(getEmailProviderProfileController),
);
emailProviderProfileRouter.patch(
  resourcePath,
  emailProviderProfileMutationRateLimit,
  requireAuth,
  validateParams(emailProviderProfileDetailRequestParamsSchema, { statusCode: 422 }),
  validateBody(updateEmailProviderProfileRequestSchema, { statusCode: 422 }),
  asyncHandler(updateEmailProviderProfileController),
);
emailProviderProfileRouter.post(
  `${resourcePath}/connection-check`,
  emailProviderProfileMutationRateLimit,
  requireAuth,
  validateParams(emailProviderProfileDetailRequestParamsSchema, { statusCode: 422 }),
  asyncHandler(checkEmailProviderProfileConnectionController),
);
emailProviderProfileRouter.delete(
  resourcePath,
  emailProviderProfileMutationRateLimit,
  requireAuth,
  validateParams(emailProviderProfileDetailRequestParamsSchema, { statusCode: 422 }),
  asyncHandler(removeEmailProviderProfileController),
);
emailProviderProfileRouter.post(
  `${resourcePath}/test-email`,
  emailProviderProfileMutationRateLimit,
  requireAuth,
  validateParams(emailProviderProfileDetailRequestParamsSchema, { statusCode: 422 }),
  asyncHandler(sendEmailProviderProfileTestController),
);
