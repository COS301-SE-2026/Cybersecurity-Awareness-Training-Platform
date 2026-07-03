import {
  organisationIdParamsSchema,
  updateOrganisationSecuritySettingsRequestSchema,
} from '@insightful-phish/shared';
import { Router } from 'express';
import rateLimit, { MemoryStore } from 'express-rate-limit';
import {
  getOrganisationSecuritySettingsController,
  updateOrganisationSecuritySettingsController,
} from '../controllers/organisation-security-settings.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody, validateParams } from '../middleware/validateRequest.js';

export const organisationSecuritySettingsRouter = Router();

const organisationSecuritySettingsReadRateLimitStore = new MemoryStore();
const organisationSecuritySettingsMutationRateLimitStore = new MemoryStore();

const organisationSecuritySettingsRateLimitMessage = {
  error: 'ORGANISATION_SECURITY_SETTINGS_RATE_LIMITED',
  message: 'Too many organisation security settings requests. Please try again later.',
};

export const organisationSecuritySettingsReadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  store: organisationSecuritySettingsReadRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
  message: organisationSecuritySettingsRateLimitMessage,
});

export const organisationSecuritySettingsMutationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  store: organisationSecuritySettingsMutationRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
  message: organisationSecuritySettingsRateLimitMessage,
});

export async function clearOrganisationSecuritySettingsRateLimitStores() {
  await organisationSecuritySettingsReadRateLimitStore.resetAll();
  await organisationSecuritySettingsMutationRateLimitStore.resetAll();
}

/**
 * @openapi
 * /organisations/{organisationId}/security-settings:
 *   get:
 *     tags: [Organisation Security Settings]
 *     summary: Get organisation security settings
 *     description: Returns organisation-scoped security settings, the effective policy, platform limits, and edit capabilities for the authenticated organisation admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/OrganisationSecuritySettingsOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
organisationSecuritySettingsRouter.get(
  '/organisations/:organisationId/security-settings',
  organisationSecuritySettingsReadRateLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema),
  asyncHandler(getOrganisationSecuritySettingsController),
);

/**
 * @openapi
 * /organisations/{organisationId}/security-settings:
 *   patch:
 *     tags: [Organisation Security Settings]
 *     summary: Update organisation security settings
 *     description: Updates organisation-scoped security settings for an active organisation when the authenticated organisation admin has the required security-settings permission.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/OrganisationSecuritySettingsUpdate'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/OrganisationSecuritySettingsUpdated'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
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
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
organisationSecuritySettingsRouter.patch(
  '/organisations/:organisationId/security-settings',
  organisationSecuritySettingsMutationRateLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema),
  validateBody(updateOrganisationSecuritySettingsRequestSchema, { statusCode: 422 }),
  asyncHandler(updateOrganisationSecuritySettingsController),
);
