import {
  getTrainingDocumentRequestParamsSchema,
  recordTrainingProgressRequestParamsSchema,
  recordTrainingProgressRequestSchema,
} from '@insightful-phish/shared';
import { Router } from 'express';
import {
  getAssignedTrainingDocuments,
  getTrainingDocumentDetail,
  postTrainingProgress,
} from '../controllers/training.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody, validateParams } from '../middleware/validateRequest.js';

export const trainingRouter = Router();

trainingRouter.get('/training/assigned', requireAuth, getAssignedTrainingDocuments);
trainingRouter.get(
  '/training/:trainingId',
  requireAuth,
  validateParams(getTrainingDocumentRequestParamsSchema),
  getTrainingDocumentDetail,
);
trainingRouter.post(
  '/training/:trainingId/progress',
  requireAuth,
  validateParams(recordTrainingProgressRequestParamsSchema),
  validateBody(recordTrainingProgressRequestSchema),
  postTrainingProgress,
);
