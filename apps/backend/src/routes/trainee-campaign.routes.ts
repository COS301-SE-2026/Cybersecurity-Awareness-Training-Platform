import { getTraineeCampaignRequestParamsSchema } from '@insightful-phish/shared';
import { Router } from 'express';
import {
  getTraineeCampaign,
  listTraineeCampaigns,
} from '../controllers/trainee-campaign.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateParams } from '../middleware/validateRequest.js';

export const traineeCampaignRouter = Router();

traineeCampaignRouter.get('/campaigns', requireAuth, listTraineeCampaigns);

traineeCampaignRouter.get(
  '/campaigns/:campaignId',
  requireAuth,
  validateParams(getTraineeCampaignRequestParamsSchema),
  getTraineeCampaign,
);
