import { z } from 'zod';
import { idParamSchema } from './common.schemas.js';

export const simulatedEmailInteractionEventTypeSchema = z.enum([
  'SIMULATED_EMAIL_OPENED',
  'SIMULATED_EMAIL_LINK_CLICKED',
  'CREDENTIAL_SUBMISSION_ATTEMPTED',
]);

export const getSimulatedEmailRequestParamsSchema = z.object({
  emailId: idParamSchema,
});

export const recordSimulatedEmailInteractionRequestParamsSchema =
  getSimulatedEmailRequestParamsSchema;

export const recordSimulatedEmailInteractionRequestSchema = z.object({
  eventType: simulatedEmailInteractionEventTypeSchema,
  campaignAssignmentId: idParamSchema.optional(),
  campaignItemId: idParamSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});
