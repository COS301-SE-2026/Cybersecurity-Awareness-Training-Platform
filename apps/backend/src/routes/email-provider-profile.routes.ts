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

/**
 * @openapi
 * /organisations/{organisationId}/email-provider-profiles:
 *   get:
 *     tags: [SMTP Profiles]
 *     summary: List SMTP profiles
 *     description: Requires an authenticated organisation admin with VIEW_CAMPAIGNS or MANAGE_CAMPAIGNS. Credentials are omitted from responses.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *     responses:
 *       200:
 *         description: List SMTP profiles result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailProviderProfileList'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
emailProviderProfileRouter.get(
  collectionPath,
  emailProviderProfileReadRateLimit,
  requireAuth,
  validateParams(emailProviderProfileCollectionRequestParamsSchema, { statusCode: 422 }),
  asyncHandler(listEmailProviderProfilesController),
);
/**
 * @openapi
 * /organisations/{organisationId}/email-provider-profiles:
 *   post:
 *     tags: [SMTP Profiles]
 *     summary: Create an SMTP profile
 *     description: Requires an authenticated organisation admin with MANAGE_CAMPAIGNS. Credentials are write only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailProviderProfileCreateRequest'
 *     responses:
 *       201:
 *         description: Create an SMTP profile result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailProviderProfileDetail'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       503:
 *         $ref: '#/components/responses/ServiceUnavailable'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
emailProviderProfileRouter.post(
  collectionPath,
  emailProviderProfileMutationRateLimit,
  requireAuth,
  validateParams(emailProviderProfileCollectionRequestParamsSchema, { statusCode: 422 }),
  validateBody(createEmailProviderProfileRequestSchema, { statusCode: 422 }),
  asyncHandler(createEmailProviderProfileController),
);
/**
 * @openapi
 * /organisations/{organisationId}/email-provider-profiles/{profileId}:
 *   get:
 *     tags: [SMTP Profiles]
 *     summary: Get an SMTP profile
 *     description: Requires an authenticated organisation admin with MANAGE_CAMPAIGNS. Credentials are write only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - name: profileId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Get an SMTP profile result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailProviderProfileDetail'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
emailProviderProfileRouter.get(
  resourcePath,
  emailProviderProfileReadRateLimit,
  requireAuth,
  validateParams(emailProviderProfileDetailRequestParamsSchema, { statusCode: 422 }),
  asyncHandler(getEmailProviderProfileController),
);
/**
 * @openapi
 * /organisations/{organisationId}/email-provider-profiles/{profileId}:
 *   patch:
 *     tags: [SMTP Profiles]
 *     summary: Update an SMTP profile
 *     description: Requires an authenticated organisation admin with MANAGE_CAMPAIGNS. Credentials are write only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - name: profileId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailProviderProfileUpdateRequest'
 *     responses:
 *       200:
 *         description: Update an SMTP profile result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailProviderProfileDetail'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       503:
 *         $ref: '#/components/responses/ServiceUnavailable'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
emailProviderProfileRouter.patch(
  resourcePath,
  emailProviderProfileMutationRateLimit,
  requireAuth,
  validateParams(emailProviderProfileDetailRequestParamsSchema, { statusCode: 422 }),
  validateBody(updateEmailProviderProfileRequestSchema, { statusCode: 422 }),
  asyncHandler(updateEmailProviderProfileController),
);
/**
 * @openapi
 * /organisations/{organisationId}/email-provider-profiles/{profileId}/connection-check:
 *   post:
 *     tags: [SMTP Profiles]
 *     summary: Check an SMTP connection
 *     description: Requires an authenticated organisation admin with MANAGE_CAMPAIGNS. Credentials are write only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - name: profileId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Check an SMTP connection result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailProviderProfileConnectionCheck'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       503:
 *         $ref: '#/components/responses/ServiceUnavailable'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
emailProviderProfileRouter.post(
  `${resourcePath}/connection-check`,
  emailProviderProfileMutationRateLimit,
  requireAuth,
  validateParams(emailProviderProfileDetailRequestParamsSchema, { statusCode: 422 }),
  asyncHandler(checkEmailProviderProfileConnectionController),
);
/**
 * @openapi
 * /organisations/{organisationId}/email-provider-profiles/{profileId}:
 *   delete:
 *     tags: [SMTP Profiles]
 *     summary: Remove an SMTP profile
 *     description: Requires an authenticated organisation admin with MANAGE_CAMPAIGNS. Credentials are write only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - name: profileId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Remove an SMTP profile result
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       503:
 *         $ref: '#/components/responses/ServiceUnavailable'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
emailProviderProfileRouter.delete(
  resourcePath,
  emailProviderProfileMutationRateLimit,
  requireAuth,
  validateParams(emailProviderProfileDetailRequestParamsSchema, { statusCode: 422 }),
  asyncHandler(removeEmailProviderProfileController),
);
/**
 * @openapi
 * /organisations/{organisationId}/email-provider-profiles/{profileId}/test-email:
 *   post:
 *     tags: [SMTP Profiles]
 *     summary: Send an SMTP test email
 *     description: Requires an authenticated organisation admin with MANAGE_CAMPAIGNS. Credentials are write only.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - name: profileId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Send an SMTP test email result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailProviderProfileTestEmail'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       503:
 *         $ref: '#/components/responses/ServiceUnavailable'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
emailProviderProfileRouter.post(
  `${resourcePath}/test-email`,
  emailProviderProfileMutationRateLimit,
  requireAuth,
  validateParams(emailProviderProfileDetailRequestParamsSchema, { statusCode: 422 }),
  asyncHandler(sendEmailProviderProfileTestController),
);
