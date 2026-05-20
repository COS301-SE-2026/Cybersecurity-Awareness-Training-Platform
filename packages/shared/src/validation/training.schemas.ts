import { z } from 'zod';
import { idParamSchema } from './common.schemas.js';

export const trainingInteractionEventTypeSchema = z.enum(['TRAINING_VIEWED', 'TRAINING_COMPLETED']);

export const getTrainingDocumentRequestParamsSchema = z
  .object({
    campaignItemId: idParamSchema,
  })
  .strict();

export const recordTrainingInteractionRequestParamsSchema = getTrainingDocumentRequestParamsSchema;

export const recordTrainingInteractionRequestSchema = z.preprocess(
  (value) => value ?? {},
  z.object({}).strict(),
);
