import { z } from 'zod';
import { idParamSchema } from './common.schemas.js';

export const simulatedEmailInteractionEventTypeSchema = z.enum([
  'SIMULATED_EMAIL_OPENED',
  'SIMULATED_EMAIL_LINK_CLICKED',
  'CREDENTIAL_SUBMISSION_ATTEMPTED',
]);

export const getSimulatedEmailRequestParamsSchema = z.object({
  campaignItemId: idParamSchema,
  emailId: idParamSchema,
});

export const getSimulatedInboxRequestParamsSchema = z.object({
  campaignItemId: idParamSchema,
});

export const recordSimulatedEmailInteractionRequestParamsSchema =
  getSimulatedEmailRequestParamsSchema;

export const classifySimulatedEmailRequestParamsSchema = getSimulatedEmailRequestParamsSchema;

export const recordSimulatedEmailInteractionRequestSchema = z
  .object({
    eventType: simulatedEmailInteractionEventTypeSchema,
  })
  .strict();

export const classifySimulatedEmailRequestSchema = z
  .object({
    selectedClassification: z.enum(['SAFE', 'SUSPICIOUS', 'PHISHING']),
    selectedRedFlagIds: z.array(idParamSchema).optional(),
    freeTextReason: z.string().trim().max(1000).optional(),
  })
  .strict();
