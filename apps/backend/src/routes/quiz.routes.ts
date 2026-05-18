import { Router } from 'express';
import { getQuiz, startAttempt, submitAttempt, getResult } from '../controllers/quiz.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { authRateLimit } from '../middleware/authRateLimit.js';
import { validateBody, validateParams } from '../middleware/validateRequest.js';
import {
  getQuizRequestParamsSchema,
  startQuizAttemptRequestParamsSchema,
  startQuizAttemptRequestSchema,
  submitQuizAttemptRequestParamsSchema,
  getQuizResultRequestParamsSchema,
  submitQuizAttemptRequestSchema,
} from '@insightful-phish/shared';

export const traineeQuizRouter = Router();
export const quizAttemptRouter = Router();

// Routes for /trainee/campaign-items/:campaignItemId/quiz
traineeQuizRouter.get(
  '/:campaignItemId/quiz',
  authRateLimit,
  requireAuth,
  validateParams(getQuizRequestParamsSchema),
  getQuiz,
);

traineeQuizRouter.post(
  '/:campaignItemId/quiz/attempts',
  authRateLimit,
  requireAuth,
  validateParams(startQuizAttemptRequestParamsSchema),
  validateBody(startQuizAttemptRequestSchema),
  startAttempt,
);

// Routes for /quiz-attempts/:attemptId
quizAttemptRouter.post(
  '/:attemptId/submit',
  authRateLimit,
  requireAuth,
  validateParams(submitQuizAttemptRequestParamsSchema),
  validateBody(submitQuizAttemptRequestSchema),
  submitAttempt,
);

quizAttemptRouter.get(
  '/:attemptId/results',
  authRateLimit,
  requireAuth,
  validateParams(getQuizResultRequestParamsSchema),
  getResult,
);
