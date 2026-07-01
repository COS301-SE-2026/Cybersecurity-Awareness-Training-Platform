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
import {
  organisationAdminMutationRateLimit,
  organisationAdminReadRateLimit,
} from '../middleware/organisationAdminRateLimit.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody, validateParams } from '../middleware/validateRequest.js';

export const organisationAdminRouter = Router();

/**
 * @openapi
 * /organisations/{organisationId}/admins:
 *   get:
 *     tags: [Organisation Admins]
 *     summary: List organisation admins and permissions
 *     description: Returns organisation admins, available organisation admin permissions, and the authenticated admin's permission keys.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/OrganisationAdminsOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
organisationAdminRouter.get(
  '/organisations/:organisationId/admins',
  requireAuth,
  organisationAdminReadRateLimit,
  validateParams(organisationIdParamsSchema),
  asyncHandler(listOrganisationAdmins),
);

/**
 * @openapi
 * /organisations/{organisationId}/admin-promotions:
 *   post:
 *     tags: [Organisation Admins]
 *     summary: Promote an active organisation trainee to organisation admin
 *     description: Creates an organisation-admin promotion invitation for an active trainee in the same organisation and sends it through the central email service.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/OrganisationAdminPromotion'
 *     responses:
 *       201:
 *         $ref: '#/components/responses/OrganisationAdminPromotionCreated'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
organisationAdminRouter.post(
  '/organisations/:organisationId/admin-promotions',
  requireAuth,
  organisationAdminMutationRateLimit,
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
 *     description: Replaces one organisation admin's organisation-scoped permission grants while preserving critical-admin safeguards.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - $ref: '#/components/parameters/OrganisationAdminIdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/OrganisationAdminPermissionUpdate'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/OrganisationAdminPermissionsUpdated'
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
organisationAdminRouter.patch(
  '/organisations/:organisationId/admins/:adminId/permissions',
  requireAuth,
  organisationAdminMutationRateLimit,
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
 *     description: Disables an organisation admin in the same organisation after password confirmation and critical-admin safeguard checks.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - $ref: '#/components/parameters/OrganisationAdminIdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/OrganisationAdminRemove'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/OrganisationAdminRemoved'
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
organisationAdminRouter.post(
  '/organisations/:organisationId/admins/:adminId/remove',
  requireAuth,
  organisationAdminMutationRateLimit,
  validateParams(organisationAdminIdParamsSchema),
  validateBody(organisationAdminRemoveRequestSchema, { statusCode: 422 }),
  asyncHandler(removeOrganisationAdmin),
);
