import { z } from 'zod';
import { idParamSchema } from './common.schemas.js';

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
    selectedOptionIds: z.array(idParamSchema).min(1),
    responseSummary: z.string().trim().max(1000).optional(),
    typedResponse: z.string().trim().max(4000).optional(),
  })
  .strict();

export const submitQuizAttemptRequestSchema = z
  .object({
    answers: z.array(quizAnswerInputSchema).min(1),
  })
  .strict();
