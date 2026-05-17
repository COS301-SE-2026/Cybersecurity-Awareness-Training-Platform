import { Router } from 'express';
import { getQuiz, startAttempt, submitAttempt, getResult } from '../controllers/quiz.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody, validateParams } from '../middleware/validateRequest.js';
import {
  getQuizRequestParamsSchema,
  startQuizAttemptRequestParamsSchema,
  submitQuizAttemptRequestParamsSchema,
  getQuizResultRequestParamsSchema,
  submitQuizAttemptRequestSchema,
} from '@insightful-phish/shared/validation';

export const traineeQuizRouter = Router();
export const quizAttemptRouter = Router();

// Routes for /trainee/campaign-items/:campaignItemId/quiz
traineeQuizRouter.get(
  '/:campaignItemId/quiz',
  requireAuth,
  validateParams(getQuizRequestParamsSchema),
  getQuiz,
);

traineeQuizRouter.post(
  '/:campaignItemId/quiz/attempts',
  requireAuth,
  validateParams(startQuizAttemptRequestParamsSchema),
  startAttempt,
);

// Routes for /quiz-attempts/:attemptId
quizAttemptRouter.post(
  '/:attemptId/submit',
  requireAuth,
  validateParams(submitQuizAttemptRequestParamsSchema),
  validateBody(submitQuizAttemptRequestSchema),
  submitAttempt,
);

quizAttemptRouter.get(
  '/:attemptId/results',
  requireAuth,
  validateParams(getQuizResultRequestParamsSchema),
  getResult,
);
