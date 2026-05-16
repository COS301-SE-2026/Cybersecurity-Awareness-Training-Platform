import { z } from 'zod';
import { idParamSchema } from './common.schemas.js';

export const trainingInteractionEventTypeSchema = z.enum(['TRAINING_VIEWED', 'TRAINING_COMPLETED']);

export const getTrainingDocumentRequestParamsSchema = z.object({
  campaignItemId: idParamSchema,
});

export const recordTrainingInteractionRequestParamsSchema = getTrainingDocumentRequestParamsSchema;

export const recordTrainingInteractionRequestSchema = z.object({
  eventType: trainingInteractionEventTypeSchema,
  campaignAssignmentId: idParamSchema.optional(),
});
