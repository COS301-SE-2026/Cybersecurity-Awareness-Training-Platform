import {
  createTrainingDocumentDraftRequestSchema,
  idParamSchema,
  organisationIdParamsSchema,
  updateTrainingDocumentDraftRequestSchema,
} from '@insightful-phish/shared';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody, validateParams } from '../middleware/validateRequest.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  createTrainingDocumentDraftHandler,
  getTrainingDocumentAuthoringHandler,
  updateTrainingDocumentDraftHandler,
  activateTrainingDocumentHandler,
  copyTrainingDocumentHandler,
} from '../controllers/training-document-authoring.controller.js';

export const trainingDocumentAuthoringRouter = Router();
const documentIdParamsSchema = z.object({ trainingDocumentId: idParamSchema }).strict();
const scopedDocumentIdParamsSchema = organisationIdParamsSchema
  .extend({ trainingDocumentId: idParamSchema })
  .strict();

trainingDocumentAuthoringRouter.post(
  '/platform/training-documents',
  requireAuth,
  validateBody(createTrainingDocumentDraftRequestSchema, { statusCode: 422 }),
  asyncHandler(createTrainingDocumentDraftHandler),
);
trainingDocumentAuthoringRouter.post(
  '/organisations/:organisationId/training-documents',
  requireAuth,
  validateParams(organisationIdParamsSchema),
  validateBody(createTrainingDocumentDraftRequestSchema, { statusCode: 422 }),
  asyncHandler(createTrainingDocumentDraftHandler),
);

trainingDocumentAuthoringRouter.get(
  '/platform/training-documents/:trainingDocumentId',
  requireAuth,
  validateParams(documentIdParamsSchema),
  asyncHandler(getTrainingDocumentAuthoringHandler),
);
trainingDocumentAuthoringRouter.get(
  '/organisations/:organisationId/training-documents/:trainingDocumentId',
  requireAuth,
  validateParams(scopedDocumentIdParamsSchema),
  asyncHandler(getTrainingDocumentAuthoringHandler),
);

trainingDocumentAuthoringRouter.put(
  '/platform/training-documents/:trainingDocumentId',
  requireAuth,
  validateParams(documentIdParamsSchema),
  validateBody(updateTrainingDocumentDraftRequestSchema, { statusCode: 422 }),
  asyncHandler(updateTrainingDocumentDraftHandler),
);
trainingDocumentAuthoringRouter.put(
  '/organisations/:organisationId/training-documents/:trainingDocumentId',
  requireAuth,
  validateParams(scopedDocumentIdParamsSchema),
  validateBody(updateTrainingDocumentDraftRequestSchema, { statusCode: 422 }),
  asyncHandler(updateTrainingDocumentDraftHandler),
);

trainingDocumentAuthoringRouter.post(
  '/platform/training-documents/:trainingDocumentId/activate',
  requireAuth,
  validateParams(documentIdParamsSchema),
  asyncHandler(activateTrainingDocumentHandler),
);
trainingDocumentAuthoringRouter.post(
  '/platform/training-documents/:trainingDocumentId/copy',
  requireAuth,
  validateParams(documentIdParamsSchema),
  asyncHandler(copyTrainingDocumentHandler),
);
trainingDocumentAuthoringRouter.post(
  '/organisations/:organisationId/training-documents/:trainingDocumentId/activate',
  requireAuth,
  validateParams(scopedDocumentIdParamsSchema),
  asyncHandler(activateTrainingDocumentHandler),
);
trainingDocumentAuthoringRouter.post(
  '/organisations/:organisationId/training-documents/:trainingDocumentId/copy',
  requireAuth,
  validateParams(scopedDocumentIdParamsSchema),
  asyncHandler(copyTrainingDocumentHandler),
);
