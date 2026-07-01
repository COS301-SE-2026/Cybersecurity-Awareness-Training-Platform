import {
  organisationAdminIdParamsSchema,
  organisationAdminPermissionUpdateRequestSchema,
  organisationAdminPromotionRequestSchema,
  organisationAdminRemoveRequestSchema,
  organisationIdParamsSchema,
} from '@insightful-phish/shared';
import { Router } from 'express';
import {
  listOrganisationAdmins,
  promoteOrganisationAdmin,
  removeOrganisationAdmin,
  updateOrganisationAdminPermissions,
} from '../controllers/organisation-admin.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody, validateParams } from '../middleware/validateRequest.js';

export const organisationAdminRouter = Router();

/**
 * @openapi
 * /organisations/{organisationId}/admins:
 *   get:
 *     tags: [Organisation Admins]
 *     summary: List organisation admins and permissions
 *     security:
 *       - bearerAuth: []
 */
organisationAdminRouter.get(
  '/organisations/:organisationId/admins',
  requireAuth,
  validateParams(organisationIdParamsSchema),
  asyncHandler(listOrganisationAdmins),
);

/**
 * @openapi
 * /organisations/{organisationId}/admin-promotions:
 *   post:
 *     tags: [Organisation Admins]
 *     summary: Promote an active organisation trainee to organisation admin
 *     security:
 *       - bearerAuth: []
 */
organisationAdminRouter.post(
  '/organisations/:organisationId/admin-promotions',
  requireAuth,
  validateParams(organisationIdParamsSchema),
  validateBody(organisationAdminPromotionRequestSchema, { statusCode: 422 }),
  asyncHandler(promoteOrganisationAdmin),
);

/**
 * @openapi
 * /organisations/{organisationId}/admins/{adminId}/permissions:
 *   patch:
 *     tags: [Organisation Admins]
 *     summary: Update organisation admin permissions
 *     security:
 *       - bearerAuth: []
 */
organisationAdminRouter.patch(
  '/organisations/:organisationId/admins/:adminId/permissions',
  requireAuth,
  validateParams(organisationAdminIdParamsSchema),
  validateBody(organisationAdminPermissionUpdateRequestSchema, { statusCode: 422 }),
  asyncHandler(updateOrganisationAdminPermissions),
);

/**
 * @openapi
 * /organisations/{organisationId}/admins/{adminId}/remove:
 *   post:
 *     tags: [Organisation Admins]
 *     summary: Remove organisation admin privileges
 *     security:
 *       - bearerAuth: []
 */
organisationAdminRouter.post(
  '/organisations/:organisationId/admins/:adminId/remove',
  requireAuth,
  validateParams(organisationAdminIdParamsSchema),
  validateBody(organisationAdminRemoveRequestSchema, { statusCode: 422 }),
  asyncHandler(removeOrganisationAdmin),
);
