import {
  campaignAssignmentOptionsQuerySchema,
  organisationIdParamsSchema,
} from '@insightful-phish/shared';
import { Router } from 'express';
import rateLimit, { MemoryStore } from 'express-rate-limit';
import {
  getAssignableCampaignsController,
  getAssignmentCandidatesController,
} from '../controllers/campaign-assignment.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateParams, validateQuery } from '../middleware/validateRequest.js';

export const campaignAssignmentRouter = Router();

const campaignAssignmentReadRateLimitStore = new MemoryStore();

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

export async function clearCampaignAssignmentRateLimitStores(): Promise<void> {
  await campaignAssignmentReadRateLimitStore.resetAll();
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
