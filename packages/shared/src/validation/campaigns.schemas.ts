import { z } from 'zod';
import { idParamSchema } from './common.schemas.js';

export const getTraineeCampaignRequestParamsSchema = z.object({
  campaignId: idParamSchema,
});

export const traineeCampaignItemRequestParamsSchema = z.object({
  campaignItemId: idParamSchema,
});
