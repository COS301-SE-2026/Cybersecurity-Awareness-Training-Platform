import {
  campaignAssignmentOptionsQuerySchema,
  campaignAssignmentsReadQuerySchema,
  createCampaignAssignmentsSchema,
  organisationAndCampaignIdParamsSchema,
  organisationAndTraineeProfileIdParamsSchema,
  organisationIdParamsSchema,
} from '@insightful-phish/shared';
import { Router } from 'express';
import rateLimit, { MemoryStore } from 'express-rate-limit';
import {
  createCampaignAssignmentsController,
  getAssignableCampaignsController,
  getAssignmentCandidatesController,
  getCampaignAssignmentsByCampaignController,
  getCampaignAssignmentsByTraineeController,
} from '../controllers/campaign-assignment.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validateRequest.js';

export const campaignAssignmentRouter = Router();

const campaignAssignmentReadRateLimitStore = new MemoryStore();
const campaignAssignmentMutationRateLimitStore = new MemoryStore();

const campaignAssignmentRateLimitMessage = {
  error: 'CAMPAIGN_ASSIGNMENT_RATE_LIMITED',
  message: 'Too many campaign assignment requests. Please try again later.',
};

export const campaignAssignmentReadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  store: campaignAssignmentReadRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
  message: campaignAssignmentRateLimitMessage,
});

export const campaignAssignmentMutationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  store: campaignAssignmentMutationRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
  message: campaignAssignmentRateLimitMessage,
});

export async function clearCampaignAssignmentRateLimitStores(): Promise<void> {
  await campaignAssignmentReadRateLimitStore.resetAll();
  await campaignAssignmentMutationRateLimitStore.resetAll();
}

/**
 * @openapi
 * /organisations/{organisationId}/campaigns/assignable:
 *   get:
 *     tags: [Organisation Campaign Assignment]
 *     summary: Get assignable custom campaigns for organisation
 *     description: Returns paginated active organisation-owned custom campaigns eligible for assignment, guarded by ASSIGN_CAMPAIGNS.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100000
 *           default: 1
 *         description: 1-based page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum records per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search filter for campaign name
 *     responses:
 *       200:
 *         $ref: '#/components/responses/GetAssignableCampaignsOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
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
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
campaignAssignmentRouter.get(
  '/organisations/:organisationId/campaigns/assignable',
  campaignAssignmentReadRateLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema),
  validateQuery(campaignAssignmentOptionsQuerySchema, { statusCode: 422 }),
  asyncHandler(getAssignableCampaignsController),
);

/**
 * @openapi
 * /organisations/{organisationId}/campaign-assignment-candidates:
 *   get:
 *     tags: [Organisation Campaign Assignment]
 *     summary: Get eligible trainee candidates for organisation campaign assignment
 *     description: Returns paginated active same-organisation trainees eligible for assignment, guarded by ASSIGN_CAMPAIGNS.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100000
 *           default: 1
 *         description: 1-based page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum records per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search filter for candidate name or email
 *     responses:
 *       200:
 *         $ref: '#/components/responses/GetCampaignAssignmentCandidatesOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
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
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
campaignAssignmentRouter.get(
  '/organisations/:organisationId/campaign-assignment-candidates',
  campaignAssignmentReadRateLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema),
  validateQuery(campaignAssignmentOptionsQuerySchema, { statusCode: 422 }),
  asyncHandler(getAssignmentCandidatesController),
);

/**
 * @openapi
 * /organisations/{organisationId}/campaign-assignments:
 *   post:
 *     tags: [Organisation Campaign Assignment]
 *     summary: Bulk assign organisation campaigns to trainees
 *     description: Transactionally assigns bounded list of active custom campaigns to active same-organisation trainees, guarded by ASSIGN_CAMPAIGNS.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCampaignAssignmentsRequest'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/CreateCampaignAssignmentsOk'
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
campaignAssignmentRouter.post(
  '/organisations/:organisationId/campaign-assignments',
  campaignAssignmentMutationRateLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema),
  validateBody(createCampaignAssignmentsSchema, { statusCode: 422 }),
  asyncHandler(createCampaignAssignmentsController),
);

/**
 * @openapi
 * /organisations/{organisationId}/campaigns/{campaignId}/assignments:
 *   get:
 *     tags: [Organisation Campaign Assignment]
 *     summary: Get paginated assignments for organisation campaign
 *     description: Returns paginated trainee assignments for specific organisation campaign, guarded by ASSIGN_CAMPAIGNS.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - $ref: '#/components/parameters/CampaignIdPathParam'
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100000
 *           default: 1
 *         description: 1-based page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum records per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search filter for trainee display name or email
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [AVAILABLE, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED, EXPIRED]
 *         description: Filter by assignment status
 *     responses:
 *       200:
 *         $ref: '#/components/responses/GetCampaignAssignmentsOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
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
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
campaignAssignmentRouter.get(
  '/organisations/:organisationId/campaigns/:campaignId/assignments',
  campaignAssignmentReadRateLimit,
  requireAuth,
  validateParams(organisationAndCampaignIdParamsSchema),
  validateQuery(campaignAssignmentsReadQuerySchema, { statusCode: 422 }),
  asyncHandler(getCampaignAssignmentsByCampaignController),
);

/**
 * @openapi
 * /organisations/{organisationId}/trainees/{traineeProfileId}/campaign-assignments:
 *   get:
 *     tags: [Organisation Campaign Assignment]
 *     summary: Get paginated campaign assignments for organisation trainee
 *     description: Returns paginated campaign assignments for specific organisation trainee, guarded by ASSIGN_CAMPAIGNS.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - name: traineeProfileId
 *         in: path
 *         required: true
 *         description: Trainee profile identifier.
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100000
 *           default: 1
 *         description: 1-based page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum records per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search filter for campaign name
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [AVAILABLE, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED, EXPIRED]
 *         description: Filter by assignment status
 *     responses:
 *       200:
 *         $ref: '#/components/responses/GetCampaignAssignmentsOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
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
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
campaignAssignmentRouter.get(
  '/organisations/:organisationId/trainees/:traineeProfileId/campaign-assignments',
  campaignAssignmentReadRateLimit,
  requireAuth,
  validateParams(organisationAndTraineeProfileIdParamsSchema),
  validateQuery(campaignAssignmentsReadQuerySchema, { statusCode: 422 }),
  asyncHandler(getCampaignAssignmentsByTraineeController),
);
