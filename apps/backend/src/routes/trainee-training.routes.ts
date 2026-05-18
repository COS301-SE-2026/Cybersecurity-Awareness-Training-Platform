import {
  getTrainingDocumentRequestParamsSchema,
  recordTrainingInteractionRequestParamsSchema,
  recordTrainingInteractionRequestSchema,
} from '@insightful-phish/shared';
import { Router } from 'express';
import {
  getTrainingDocument,
  recordTrainingCompleted,
  recordTrainingViewed,
} from '../controllers/trainee-training.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { traineeTrainingRateLimit } from '../middleware/traineeTrainingRateLimit.js';
import { validateBody } from '../middleware/validateRequest.js';
import { validateParams } from '../middleware/validateParams.js';

export const traineeTrainingRouter = Router();

/**
 * @openapi
 * /trainee/campaign-items/{campaignItemId}/training-document:
 *   get:
 *     tags:
 *       - Trainee Training
 *     summary: Get a training document for a campaign item
 *     description: Resolves a trainee-accessible training document through the authenticated user's campaign assignment and campaign item availability.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CampaignItemIdPathParam'
 *     responses:
 *       200:
 *         description: Training document resolved for the campaign item.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetTrainingDocumentResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Training document is missing, unavailable, or not accessible to the trainee.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrainingDocumentNotFoundErrorResponse'
 *       429:
 *         description: Too many trainee training requests.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrainingRateLimitErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
traineeTrainingRouter.get(
  '/trainee/campaign-items/:campaignItemId/training-document',
  traineeTrainingRateLimit,
  requireAuth,
  validateParams(getTrainingDocumentRequestParamsSchema),
  getTrainingDocument,
);

/**
 * @openapi
 * /trainee/campaign-items/{campaignItemId}/training-document/viewed:
 *   post:
 *     tags:
 *       - Trainee Training
 *     summary: Record a training document view
 *     description: Records a TRAINING_VIEWED interaction after resolving access through the authenticated user's campaign assignment and campaign item availability.
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
 *         description: Training view interaction recorded.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecordTrainingInteractionResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Training document is missing, unavailable, or not accessible to the trainee.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrainingDocumentNotFoundErrorResponse'
 *       429:
 *         description: Too many trainee training requests.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrainingRateLimitErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
traineeTrainingRouter.post(
  '/trainee/campaign-items/:campaignItemId/training-document/viewed',
  traineeTrainingRateLimit,
  requireAuth,
  validateParams(recordTrainingInteractionRequestParamsSchema),
  validateBody(recordTrainingInteractionRequestSchema),
  recordTrainingViewed,
);

/**
 * @openapi
 * /trainee/campaign-items/{campaignItemId}/training-document/completed:
 *   post:
 *     tags:
 *       - Trainee Training
 *     summary: Record training document completion
 *     description: Records a TRAINING_COMPLETED interaction after resolving access through the authenticated user's campaign assignment and campaign item availability.
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
 *         description: Training completion interaction recorded.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecordTrainingInteractionResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Training document is missing, unavailable, or not accessible to the trainee.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrainingDocumentNotFoundErrorResponse'
 *       429:
 *         description: Too many trainee training requests.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrainingRateLimitErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
traineeTrainingRouter.post(
  '/trainee/campaign-items/:campaignItemId/training-document/completed',
  traineeTrainingRateLimit,
  requireAuth,
  validateParams(recordTrainingInteractionRequestParamsSchema),
  validateBody(recordTrainingInteractionRequestSchema),
  recordTrainingCompleted,
);
