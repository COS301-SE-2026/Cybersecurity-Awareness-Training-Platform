import { z } from 'zod';
import { idParamSchema } from './common.schemas.js';

export const trainingProgressStatusSchema = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']);

export const recordTrainingProgressStatusSchema = z.enum(['STARTED', 'VIEWED', 'COMPLETED']);

export const getTrainingDocumentRequestParamsSchema = z.object({
  trainingId: idParamSchema,
});

export const recordTrainingProgressRequestParamsSchema = getTrainingDocumentRequestParamsSchema;

export const recordTrainingProgressRequestSchema = z.object({
  status: recordTrainingProgressStatusSchema,
});
