import { z } from 'zod';
import { idParamSchema } from './common.schemas.js';

export const getQuizRequestParamsSchema = z.object({
  quizId: idParamSchema,
});

export const startQuizAttemptRequestParamsSchema = getQuizRequestParamsSchema;

export const submitQuizAttemptRequestParamsSchema = z.object({
  attemptId: idParamSchema,
});

export const getQuizResultRequestParamsSchema = submitQuizAttemptRequestParamsSchema;

export const quizAnswerInputSchema = z.object({
  questionId: idParamSchema,
  answerValue: idParamSchema,
});

export const submitQuizAttemptRequestSchema = z.object({
  answers: z.array(quizAnswerInputSchema).min(1),
});
