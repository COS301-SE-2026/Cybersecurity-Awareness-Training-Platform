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
/**
 * @openapi
 * /trainee/campaign-items/{campaignItemId}/quiz:
 *   get:
 *     tags:
 *       - Trainee Quiz
 *     summary: Get a quiz for a campaign item
 *     description: Resolves a trainee-accessible quiz through campaign assignment and campaign item availability. The trainee-facing response does not expose correct answers or answer feedback before submission.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CampaignItemIdPathParam'
 *     responses:
 *       200:
 *         description: Quiz content safe for trainee pre-submission display.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetQuizResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Quiz or associated campaign item was not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       429:
 *         description: Too many authentication-protected quiz requests.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthRateLimitErrorResponse'
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
 *     tags:
 *       - Trainee Quiz
 *     summary: Start or reuse a quiz attempt
 *     description: Starts a quiz attempt for the campaign item, or returns the latest in-progress attempt when one already exists.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CampaignItemIdPathParam'
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmptyRequestBody'
 *     responses:
 *       201:
 *         description: Quiz attempt is ready for answers.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StartQuizAttemptResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Quiz or associated campaign item was not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       429:
 *         description: Too many authentication-protected quiz requests.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthRateLimitErrorResponse'
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
 *     tags:
 *       - Trainee Quiz
 *     summary: Submit a quiz attempt
 *     description: Submits final answers for an in-progress attempt and scores the quiz. Validation rejects malformed IDs, duplicate question answers, unknown question or option IDs, duplicate selected options, missing answers, and invalid selection counts.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/AttemptIdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitQuizAttemptRequest'
 *           examples:
 *             singleChoiceSubmission:
 *               summary: Submit a selected option
 *               value:
 *                 answers:
 *                   - questionId: 33333333-3333-3333-3333-333333333333
 *                     selectedOptionIds:
 *                       - 44444444-4444-4444-4444-444444444444
 *     responses:
 *       200:
 *         description: Quiz attempt submitted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmitQuizAttemptResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Quiz attempt was not found for this trainee.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       409:
 *         description: Quiz attempt has already been submitted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       429:
 *         description: Too many authentication-protected quiz requests.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthRateLimitErrorResponse'
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
 *     tags:
 *       - Trainee Quiz
 *     summary: Get quiz attempt results
 *     description: Returns quiz result scoring and answer-level feedback after the attempt has been submitted.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/AttemptIdPathParam'
 *     responses:
 *       200:
 *         description: Quiz result and answer feedback for a submitted attempt.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetQuizResultResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Results are not available until the attempt is submitted, or the user cannot access the attempt.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       404:
 *         description: Quiz attempt was not found for this trainee.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       429:
 *         description: Too many authentication-protected quiz requests.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthRateLimitErrorResponse'
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
