import { z } from 'zod';

export const trainingInteractionEventTypeSchema = z.enum(['TRAINING_VIEWED', 'TRAINING_COMPLETED']);

const campaignItemIdParamSchema = z.string().trim().uuid();

export const getTrainingDocumentRequestParamsSchema = z.object({
  campaignItemId: campaignItemIdParamSchema,
});

export const recordTrainingInteractionRequestParamsSchema = getTrainingDocumentRequestParamsSchema;

export const recordTrainingInteractionRequestSchema = z.preprocess(
  (value) => value ?? {},
  z.object({}).strict(),
);
