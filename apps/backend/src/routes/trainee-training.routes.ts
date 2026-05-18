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
 *     tags: [Trainee Training]
 *     summary: Get a training document for a campaign item
 *     description: Resolves a trainee-accessible training document through campaign item access.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CampaignItemIdPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/TrainingDocumentOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/TrainingDocumentNotFound'
 *       429:
 *         $ref: '#/components/responses/TrainingRateLimited'
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
 *     tags: [Trainee Training]
 *     summary: Record a training document view
 *     description: Records a TRAINING_VIEWED interaction for the campaign item.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CampaignItemIdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/EmptyJson'
 *     responses:
 *       201:
 *         $ref: '#/components/responses/TrainingViewedCreated'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/TrainingDocumentNotFound'
 *       429:
 *         $ref: '#/components/responses/TrainingRateLimited'
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
 *     tags: [Trainee Training]
 *     summary: Record training document completion
 *     description: Records a TRAINING_COMPLETED interaction for the campaign item.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CampaignItemIdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/EmptyJson'
 *     responses:
 *       201:
 *         $ref: '#/components/responses/TrainingCompletedCreated'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/TrainingDocumentNotFound'
 *       429:
 *         $ref: '#/components/responses/TrainingRateLimited'
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
