import { z } from 'zod';
import { idParamSchema } from './common.schemas.js';

export const getLearnerCampaignRequestParamsSchema = z.object({
  campaignId: idParamSchema,
});

export const learnerCampaignItemRequestParamsSchema = z.object({
  campaignItemId: idParamSchema,
});
