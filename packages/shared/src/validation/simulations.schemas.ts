import { z } from 'zod';
import { idParamSchema } from './common.schemas.js';

export const simulatedEmailInteractionEventTypeSchema = z.enum([
  'EMAIL_OPENED',
  'EMAIL_LINK_CLICKED',
]);

export const getSimulatedEmailRequestParamsSchema = z.object({
  emailId: idParamSchema,
});

export const recordSimulatedEmailInteractionRequestParamsSchema =
  getSimulatedEmailRequestParamsSchema;

export const recordSimulatedEmailInteractionRequestSchema = z.object({
  eventType: simulatedEmailInteractionEventTypeSchema,
});
