import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import {
  listOrganisationRequests,
  getOrganisationRequest,
  markRequestContacted,
  approveOrganisationRequest,
  rejectOrganisationRequest,
  deleteOrganisationRequest,
  getPlatformOrganisationDetail,
  getOrganisationRequestDetails,
  resendInitialAdminSetup,
} from '../controllers/platform.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { apiRateLimit } from '../middleware/apiRateLimit.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validateRequest.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  listOrganisationRequestsQuerySchema,
  approveOrganisationRequestSchema,
  rejectOrganisationRequestSchema,
  organisationRequestIdParamsSchema,
  platformOrganisationIdParamsSchema,
} from '@insightful-phish/shared';

export const platformRouter = Router();

function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.auth?.user.userType !== 'IP_ADMIN') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Platform admin access is required',
    });
  }
  next();
}

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
 *         description: Sort field and direction
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/ApproveOrganisationRequest'
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/requestBodies/RejectOrganisationRequest'
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
  validateParams(platformOrganisationIdParamsSchema),
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
  validateParams(organisationRequestIdParamsSchema),
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
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 emailQueued:
 *                   type: boolean
 *                   example: true
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
  validateParams(platformOrganisationIdParamsSchema),
  asyncHandler(resendInitialAdminSetup),
);
