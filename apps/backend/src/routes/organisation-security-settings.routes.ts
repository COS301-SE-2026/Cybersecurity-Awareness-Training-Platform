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

export function clearOrganisationSecuritySettingsRateLimitStores() {
  void organisationSecuritySettingsReadRateLimitStore.resetAll();
  void organisationSecuritySettingsMutationRateLimitStore.resetAll();
}

organisationSecuritySettingsRouter.get(
  '/organisations/:organisationId/security-settings',
  organisationSecuritySettingsReadRateLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema),
  asyncHandler(getOrganisationSecuritySettingsController),
);

organisationSecuritySettingsRouter.patch(
  '/organisations/:organisationId/security-settings',
  organisationSecuritySettingsMutationRateLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema),
  validateBody(updateOrganisationSecuritySettingsRequestSchema, { statusCode: 422 }),
  asyncHandler(updateOrganisationSecuritySettingsController),
);
