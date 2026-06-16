import { getTraineeCampaignRequestParamsSchema } from '@insightful-phish/shared';
import { Router } from 'express';
import {
  getTraineeCampaign,
  listTraineeCampaigns,
} from '../controllers/trainee-campaign.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateParams } from '../middleware/validateParams.js';

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
traineeCampaignRouter.get('/campaigns', requireAuth, listTraineeCampaigns);

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
  getTraineeCampaign,
);
