import { Router } from 'express';
import {
  listOrganisationRequests,
  getOrganisationRequest,
  markRequestContacted,
  approveOrganisationRequest,
  rejectOrganisationRequest,
  deleteOrganisationRequest,
  listPlatformAdmins,
  invitePlatformAdmin,
  resendPlatformAdminInvite,
  transferSuperAdmin,
  demotePlatformAdmin,
} from '../controllers/platform.controller.js';
import {
  getPlatformOrganisationDetail,
  getOrganisationRequestDetails,
  resendInitialAdminSetup,
} from '../controllers/platformOrganisation.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requirePlatformAdmin } from '../middleware/requirePlatformAdmin.js';
import { apiRateLimit } from '../middleware/apiRateLimit.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validateRequest.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  listOrganisationRequestsQuerySchema,
  approveOrganisationRequestSchema,
  rejectOrganisationRequestSchema,
  organisationRequestIdParamsSchema,
  getPlatformOrganisationParamsSchema,
  resendInitialAdminSetupParamsSchema,
  getOrganisationRequestDetailsParamsSchema,
  platformAdminUserIdParamsSchema,
  platformAdminInviteIdParamsSchema,
  invitePlatformAdminRequestSchema,
  transferSuperAdminRequestSchema,
  demotePlatformAdminRequestSchema,
} from '@insightful-phish/shared';

export const platformRouter = Router();

// All platform routes require rate limiting, authentication, and platform admin privileges
platformRouter.use('/platform', apiRateLimit, requireAuth, requirePlatformAdmin);

/**
 * @openapi
 * /platform/organisation-requests:
 *   get:
 *     tags: [Platform Organisation Requests]
 *     summary: List organisation requests
 *     description: Returns a paginated list of organisation registration requests with filters, search, and sorting.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING_REVIEW, CONTACTED, APPROVED, REJECTED, CANCELLED]
 *         description: Filter requests by status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or representative name
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: createdAt:desc
 *         description: Sort field and direction. Allowed fields are organisationName, submittedOrganisationName, representativeEmail, status, createdAt, updatedAt. Allowed directions are asc, desc. Format is field:direction.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Page size
 *     responses:
 *       200:
 *         description: List of organisation registration requests and pagination details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlatformOrganisationRequestsListResponse'
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
platformRouter.get(
  '/platform/organisation-requests',
  validateQuery(listOrganisationRequestsQuerySchema),
  asyncHandler(listOrganisationRequests),
);

/**
 * @openapi
 * /platform/organisation-requests/{requestId}:
 *   get:
 *     tags: [Platform Organisation Requests]
 *     summary: Get organisation request details
 *     description: Returns detailed fields for an organisation registration request, including platform admin logs.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The registration request ID
 *     responses:
 *       200:
 *         description: Organisation registration request detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlatformOrganisationRequest'
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
platformRouter.get(
  '/platform/organisation-requests/:requestId',
  validateParams(organisationRequestIdParamsSchema),
  asyncHandler(getOrganisationRequest),
);

/**
 * @openapi
 * /platform/organisation-requests/{requestId}/contacted:
 *   patch:
 *     tags: [Platform Organisation Requests]
 *     summary: Mark request contacted
 *     description: Marks the registration request as contacted by the active platform admin.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The registration request ID
 *     responses:
 *       200:
 *         description: Request successfully marked contacted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlatformOrganisationRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
platformRouter.patch(
  '/platform/organisation-requests/:requestId/contacted',
  validateParams(organisationRequestIdParamsSchema),
  asyncHandler(markRequestContacted),
);

/**
 * @openapi
 * /platform/organisation-requests/{requestId}/approve:
 *   post:
 *     tags: [Platform Organisation Requests]
 *     summary: Approve request
 *     description: Approves the registration request, creates the organisation, seeds defaults, generates initial setup token, and emails the representative.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The registration request ID
 *     requestBody:
 *       $ref: '#/components/requestBodies/ApproveOrganisationRequest'
 *     responses:
 *       200:
 *         description: Request approved, organisation and invitation initialized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 status:
 *                   type: string
 *                   example: APPROVED
 *                 approvedOrganisation:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                 setupEmailQueued:
 *                   type: boolean
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
platformRouter.post(
  '/platform/organisation-requests/:requestId/approve',
  validateParams(organisationRequestIdParamsSchema),
  validateBody(approveOrganisationRequestSchema, { statusCode: 422 }),
  asyncHandler(approveOrganisationRequest),
);

/**
 * @openapi
 * /platform/organisation-requests/{requestId}/reject:
 *   post:
 *     tags: [Platform Organisation Requests]
 *     summary: Reject request
 *     description: Rejects the registration request, stores the reason, and sends a rejection email to the representative.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The registration request ID
 *     requestBody:
 *       $ref: '#/components/requestBodies/RejectOrganisationRequest'
 *     responses:
 *       200:
 *         description: Request successfully rejected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlatformOrganisationRequest'
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
platformRouter.post(
  '/platform/organisation-requests/:requestId/reject',
  validateParams(organisationRequestIdParamsSchema),
  validateBody(rejectOrganisationRequestSchema, { statusCode: 422 }),
  asyncHandler(rejectOrganisationRequest),
);

/**
 * @openapi
 * /platform/organisation-requests/{requestId}:
 *   delete:
 *     tags: [Platform Organisation Requests]
 *     summary: Delete rejected/cancelled request
 *     description: Deletes the rejected or cancelled registration request from the system.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The registration request ID
 *     responses:
 *       200:
 *         description: Request successfully deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmptyRequestBody'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
platformRouter.delete(
  '/platform/organisation-requests/:requestId',
  validateParams(organisationRequestIdParamsSchema),
  asyncHandler(deleteOrganisationRequest),
);

/**
 * @openapi
 * /platform/organisations/{organisationId}:
 *   get:
 *     tags: [Platform Organisation Requests]
 *     summary: Get organisation surface details
 *     description: Returns basic details of an organisation including admin and trainee counts.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organisationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The organisation ID
 *     responses:
 *       200:
 *         description: Organisation surface details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlatformOrganisationDetail'
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
platformRouter.get(
  '/platform/organisations/:organisationId',
  validateParams(getPlatformOrganisationParamsSchema),
  asyncHandler(getPlatformOrganisationDetail),
);

/**
 * @openapi
 * /platform/organisation-requests/{requestId}/details:
 *   get:
 *     tags: [Platform Organisation Requests]
 *     summary: Get organisation request fallback details
 *     description: Returns detailed request fields, setup status, resend eligibility, and platform audit timeline.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The registration request ID
 *     responses:
 *       200:
 *         description: Request detailed fallback and timeline logs
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PlatformOrganisationRequestDetailsResponse'
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
platformRouter.get(
  '/platform/organisation-requests/:requestId/details',
  validateParams(getOrganisationRequestDetailsParamsSchema),
  asyncHandler(getOrganisationRequestDetails),
);

/**
 * @openapi
 * /platform/organisations/{organisationId}/resend-initial-admin-setup:
 *   post:
 *     tags: [Platform Organisation Requests]
 *     summary: Resend initial organisation admin setup email
 *     description: Revokes active action tokens, creates a new invite token, records audit entry, and sends setup email.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organisationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The organisation ID
 *     responses:
 *       200:
 *         description: Resend request completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, emailQueued, setupStatus]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 emailQueued:
 *                   type: boolean
 *                   example: true
 *                 setupStatus:
 *                   $ref: '#/components/schemas/OrganisationInitialSetupStatus'
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
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
platformRouter.post(
  '/platform/organisations/:organisationId/resend-initial-admin-setup',
  validateParams(resendInitialAdminSetupParamsSchema),
  asyncHandler(resendInitialAdminSetup),
);

/**
 * @openapi
 * /platform/admins:
 *   get:
 *     tags: [Platform Admins]
 *     summary: List platform admins and allowed actions
 *     description: Returns a list of platform admins including pending invites and upgrade confirmations, with row-level allowed actions.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of platform administrators
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 admins:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       email:
 *                         type: string
 *                       platformAdminRole:
 *                         type: string
 *                         enum: [SUPER_ADMIN, NORMAL_ADMIN]
 *                       adminStatus:
 *                         type: string
 *                         enum: [ACTIVE, DISABLED]
 *                       authStatus:
 *                         type: string
 *                       invitationStatus:
 *                         type: string
 *                         nullable: true
 *                       inviteId:
 *                         type: string
 *                         format: uuid
 *                         nullable: true
 *                       allowedActions:
 *                         type: object
 *                         properties:
 *                           canTransferSuperAdmin:
 *                             type: boolean
 *                           canDemote:
 *                             type: boolean
 *                           canResendInvite:
 *                             type: boolean
 *                 allowedToInvite:
 *                   type: boolean
 *                 allowedToTransfer:
 *                   type: boolean
 *                 allowedToDemote:
 *                   type: boolean
 *                 allowedToResendInvites:
 *                   type: boolean
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
platformRouter.get('/platform/admins', asyncHandler(listPlatformAdmins));

/**
 * @openapi
 * /platform/admin-invitations:
 *   post:
 *     tags: [Platform Admins]
 *     summary: Invite a new platform admin or request trainee upgrade
 *     description: Invites a new platform administrator or requests upgrade of an existing trainee account.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: Invitation sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   enum: [new-invite, upgrade-confirmation]
 *                 userId:
 *                   type: string
 *                   format: uuid
 *                 email:
 *                   type: string
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
platformRouter.post(
  '/platform/admin-invitations',
  validateBody(invitePlatformAdminRequestSchema, { statusCode: 422 }),
  asyncHandler(invitePlatformAdmin),
);

/**
 * @openapi
 * /platform/admin-invitations/{id}/resend:
 *   post:
 *     tags: [Platform Admins]
 *     summary: Resend platform admin invite
 *     description: Revokes the old invite token and issues a new platform admin invitation or upgrade email.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The action token ID of the invitation to resend
 *     responses:
 *       200:
 *         description: Invitation resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 emailQueued:
 *                   type: boolean
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
platformRouter.post(
  '/platform/admin-invitations/:id/resend',
  validateParams(platformAdminInviteIdParamsSchema),
  asyncHandler(resendPlatformAdminInvite),
);

/**
 * @openapi
 * /platform/admins/transfer-super-admin:
 *   post:
 *     tags: [Platform Admins]
 *     summary: Transfer super admin role
 *     description: Swaps the super admin role of the current actor user to the target user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetUserId, password, confirmation]
 *             properties:
 *               targetUserId:
 *                 type: string
 *                 format: uuid
 *               password:
 *                 type: string
 *               confirmation:
 *                 type: string
 *                 enum: [TRANSFER]
 *     responses:
 *       200:
 *         description: Role transfer completed. Returns updated actor user context.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthMeResponse'
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
platformRouter.post(
  '/platform/admins/transfer-super-admin',
  validateBody(transferSuperAdminRequestSchema, { statusCode: 422 }),
  asyncHandler(transferSuperAdmin),
);

/**
 * @openapi
 * /platform/admins/{userId}/demote:
 *   post:
 *     tags: [Platform Admins]
 *     summary: Demote a normal platform admin
 *     description: Disables the target normal platform admin, revoking all active sessions.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The user ID of the platform admin to demote
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password, confirmation]
 *             properties:
 *               password:
 *                 type: string
 *               confirmation:
 *                 type: string
 *                 enum: [DEMOTE]
 *     responses:
 *       200:
 *         description: Platform admin successfully demoted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                   format: uuid
 *                 email:
 *                   type: string
 *                 adminStatus:
 *                   type: string
 *                 authStatus:
 *                   type: string
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
platformRouter.post(
  '/platform/admins/:userId/demote',
  validateParams(platformAdminUserIdParamsSchema),
  validateBody(demotePlatformAdminRequestSchema, { statusCode: 422 }),
  asyncHandler(demotePlatformAdmin),
);
