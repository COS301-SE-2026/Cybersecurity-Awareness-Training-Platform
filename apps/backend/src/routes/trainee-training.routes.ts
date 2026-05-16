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

traineeTrainingRouter.get(
  '/trainee/campaign-items/:campaignItemId/training-document',
  traineeTrainingRateLimit,
  requireAuth,
  validateParams(getTrainingDocumentRequestParamsSchema),
  getTrainingDocument,
);

traineeTrainingRouter.post(
  '/trainee/campaign-items/:campaignItemId/training-document/viewed',
  traineeTrainingRateLimit,
  requireAuth,
  validateParams(recordTrainingInteractionRequestParamsSchema),
  validateBody(recordTrainingInteractionRequestSchema),
  recordTrainingViewed,
);

traineeTrainingRouter.post(
  '/trainee/campaign-items/:campaignItemId/training-document/completed',
  traineeTrainingRateLimit,
  requireAuth,
  validateParams(recordTrainingInteractionRequestParamsSchema),
  validateBody(recordTrainingInteractionRequestSchema),
  recordTrainingCompleted,
);
