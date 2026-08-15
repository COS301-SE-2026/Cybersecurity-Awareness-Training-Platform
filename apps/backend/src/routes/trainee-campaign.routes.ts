import {
  enrolPlatformCampaignParamsSchema,
  getTraineeCampaignRequestParamsSchema,
  listPlatformCampaignsQuerySchema,
} from '@insightful-phish/shared';
import { Router } from 'express';
import {
  enrolPlatformCampaignController,
  getTraineeCampaign,
  listPlatformCampaignsController,
  listTraineeCampaigns,
} from '../controllers/trainee-campaign.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateParams, validateQuery } from '../middleware/validateRequest.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const traineeCampaignRouter = Router();

/**
 * @openapi
 * /trainee/campaigns:
 *   get:
 *     tags: [Trainee Campaigns]
 *     summary: List trainee campaigns
 *     description: Returns active campaigns assigned or available to the authenticated active trainee.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         $ref: '#/components/responses/TraineeCampaignsOk'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
traineeCampaignRouter.get('/campaigns', requireAuth, asyncHandler(listTraineeCampaigns));

/**
 * @openapi
 * /trainee/campaigns/{campaignId}:
 *   get:
 *     tags: [Trainee Campaigns]
 *     summary: Get trainee campaign detail
 *     description: Returns trainee-safe campaign detail with an ordered item tree. Supported activity components include activityApiPath values for simulated inbox, training document, and quiz endpoints.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CampaignIdPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/TraineeCampaignDetailOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/TraineeCampaignNotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
traineeCampaignRouter.get(
  '/campaigns/:campaignId',
  requireAuth,
  validateParams(getTraineeCampaignRequestParamsSchema),
  asyncHandler(getTraineeCampaign),
);

/**
 * @openapi
 * /trainee/platform-campaigns:
 *   get:
 *     tags: [Trainee Campaigns]
 *     summary: Discover platform campaigns for general trainees
 *     description: Returns paginated active premade platform campaigns available for self-enrolment by authenticated active general trainees.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100000
 *           default: 1
 *         description: Page number (1-based)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Maximum records per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Optional search filter for campaign name
 *     responses:
 *       200:
 *         $ref: '#/components/responses/GetPlatformCampaignsOk'
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
traineeCampaignRouter.get(
  '/platform-campaigns',
  requireAuth,
  validateQuery(listPlatformCampaignsQuerySchema),
  asyncHandler(listPlatformCampaignsController),
);

/**
 * @openapi
 * /trainee/platform-campaigns/{campaignId}/enrol:
 *   post:
 *     tags: [Trainee Campaigns]
 *     summary: Self-enrol in a platform campaign
 *     description: Enrols the authenticated active general trainee in the active premade platform campaign using SELF_SELECTED access. Duplicate enrolment is idempotent and returns the existing assignment without resetting progress. An existing admin-assigned assignment is returned without downgrade.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CampaignIdPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/EnrolPlatformCampaignOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/TraineeCampaignNotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
traineeCampaignRouter.post(
  '/platform-campaigns/:campaignId/enrol',
  requireAuth,
  validateParams(enrolPlatformCampaignParamsSchema),
  asyncHandler(enrolPlatformCampaignController),
);
