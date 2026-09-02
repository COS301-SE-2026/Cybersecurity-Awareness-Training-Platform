import { z } from 'zod';
import { idParamSchema, optionalTrimmedStringSchema } from './common.schemas.js';

export const getQuizRequestParamsSchema = z
  .object({
    campaignItemId: idParamSchema,
  })
  .strict();

export const startQuizAttemptRequestParamsSchema = getQuizRequestParamsSchema;

export const startQuizAttemptRequestSchema = z.preprocess(
  (value) => value ?? {},
  z.object({}).strict(),
);

export const submitQuizAttemptRequestParamsSchema = z
  .object({
    attemptId: idParamSchema,
  })
  .strict();

export const getQuizResultRequestParamsSchema = submitQuizAttemptRequestParamsSchema;

export const quizAnswerInputSchema = z
  .object({
    questionId: idParamSchema,
    selectedOptionIds: z.array(idParamSchema).min(1, 'Please select at least one answer.'),
    responseSummary: optionalTrimmedStringSchema(
      1000,
      'Response summary must be at most 1000 characters.',
    ).optional(),
    typedResponse: optionalTrimmedStringSchema(
      4000,
      'Typed response must be at most 4000 characters.',
    ).optional(),
  })
  .strict();

export const submitQuizAttemptRequestSchema = z
  .object({
    answers: z.array(quizAnswerInputSchema).min(1, 'Please select at least one answer.'),
  })
  .strict();

export const currentQuizAttemptSummarySchema = z
  .object({
    attemptId: idParamSchema,
    status: z.enum(['IN_PROGRESS', 'SUBMITTED']),
    hasResult: z.boolean(),
  })
  .strict();
