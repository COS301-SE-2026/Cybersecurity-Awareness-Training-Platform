import { z } from 'zod';
import { idParamSchema, optionalTrimmedStringSchema } from './common.schemas.js';

export const simulatedEmailInteractionEventTypeSchema = z.enum(
  ['SIMULATED_EMAIL_OPENED', 'SIMULATED_EMAIL_LINK_CLICKED', 'CREDENTIAL_SUBMISSION_ATTEMPTED'],
  {
    errorMap: () => ({ message: 'Please select a supported simulated email interaction event.' }),
  },
);

export const getSimulatedEmailRequestParamsSchema = z
  .object({
    campaignItemId: idParamSchema,
    emailId: idParamSchema,
  })
  .strict();

export const getSimulatedInboxRequestParamsSchema = z
  .object({
    campaignItemId: idParamSchema,
  })
  .strict();

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
    selectedClassification: z.enum(['SAFE', 'SUSPICIOUS', 'PHISHING'], {
      errorMap: () => ({ message: 'Please select a valid email classification.' }),
    }),
    selectedRedFlagIds: z.array(idParamSchema).optional(),
    freeTextReason: optionalTrimmedStringSchema(
      1000,
      'Reason must be at most 1000 characters.',
    ).optional(),
  })
  .strict();
