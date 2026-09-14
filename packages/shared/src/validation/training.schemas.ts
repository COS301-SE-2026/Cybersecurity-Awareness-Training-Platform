import { z } from 'zod';
import { contentCategorySchema } from '../categories.js';
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

export const createTrainingDocumentDraftRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    contentSummary: z.string().trim().max(2000).nullable(),
    rawMarkdown: z.string(),
    estimatedReadTimeMinutes: z.number().int().positive().nullable(),
    categories: z.array(contentCategorySchema),
    difficultyLevel: z.enum(['EASY', 'MEDIUM', 'HARD']),
  })
  .strict();
