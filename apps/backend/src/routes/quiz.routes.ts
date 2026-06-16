import { Router } from 'express';
import { getQuiz, startAttempt, submitAttempt, getResult } from '../controllers/quiz.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { authRateLimit } from '../middleware/authRateLimit.js';
import { validateParams } from '../middleware/validateParams.js';
import { validateBody } from '../middleware/validateRequest.js';
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
/**
 * @openapi
 * /trainee/campaign-items/{campaignItemId}/quiz:
 *   get:
 *     tags: [Trainee Quiz]
 *     summary: Get a quiz for a campaign item
 *     description: Returns trainee-safe quiz content without correct answers or feedback.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CampaignItemIdPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/QuizOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/QuizNotFound'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
traineeQuizRouter.get(
  '/:campaignItemId/quiz',
  authRateLimit,
  requireAuth,
  validateParams(getQuizRequestParamsSchema),
  getQuiz,
);

/**
 * @openapi
 * /trainee/campaign-items/{campaignItemId}/quiz/attempts:
 *   post:
 *     tags: [Trainee Quiz]
 *     summary: Start or reuse a quiz attempt
 *     description: Starts an attempt or returns the latest in-progress attempt for the campaign item.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CampaignItemIdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/EmptyJson'
 *     responses:
 *       201:
 *         $ref: '#/components/responses/QuizAttemptCreated'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/QuizNotFound'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
traineeQuizRouter.post(
  '/:campaignItemId/quiz/attempts',
  authRateLimit,
  requireAuth,
  validateParams(startQuizAttemptRequestParamsSchema),
  validateBody(startQuizAttemptRequestSchema),
  startAttempt,
);

// Routes for /quiz-attempts/:attemptId
/**
 * @openapi
 * /quiz-attempts/{attemptId}/submit:
 *   post:
 *     tags: [Trainee Quiz]
 *     summary: Submit a quiz attempt
 *     description: Submits final answers and validates question IDs, option IDs, and selection counts.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/AttemptIdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/SubmitQuizAttempt'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/QuizAttemptSubmitted'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/QuizNotFound'
 *       409:
 *         $ref: '#/components/responses/QuizAttemptAlreadySubmitted'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
quizAttemptRouter.post(
  '/:attemptId/submit',
  authRateLimit,
  requireAuth,
  validateParams(submitQuizAttemptRequestParamsSchema),
  validateBody(submitQuizAttemptRequestSchema),
  submitAttempt,
);

/**
 * @openapi
 * /quiz-attempts/{attemptId}/results:
 *   get:
 *     tags: [Trainee Quiz]
 *     summary: Get quiz attempt results
 *     description: Returns scoring and answer-level feedback after the attempt has been submitted.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/AttemptIdPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/QuizResultOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/QuizResultUnavailable'
 *       404:
 *         $ref: '#/components/responses/QuizNotFound'
 *       429:
 *         $ref: '#/components/responses/AuthRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
quizAttemptRouter.get(
  '/:attemptId/results',
  authRateLimit,
  requireAuth,
  validateParams(getQuizResultRequestParamsSchema),
  getResult,
);
