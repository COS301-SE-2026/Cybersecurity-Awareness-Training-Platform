import {
  createTrainingDocumentDraftRequestSchema,
  idParamSchema,
  organisationIdParamsSchema,
  previewTrainingDocumentRequestSchema,
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
  listTrainingDocumentsAuthoringHandler,
  updateTrainingDocumentDraftHandler,
  activateTrainingDocumentHandler,
  copyTrainingDocumentHandler,
  previewTrainingDocumentHandler,
} from '../controllers/training-document-authoring.controller.js';
import rateLimit from 'express-rate-limit';

export const trainingDocumentAuthoringRouter = Router();
//100 requests every 15 minutes
const trainingDocumentAuthoringRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TRAINING_DOCUMENT_AUTHORING_RATE_LIMITED',
    message: 'Too many training document authoring requests. Please try again later.',
  },
});
const documentIdParamsSchema = z.object({ trainingDocumentId: idParamSchema }).strict();
const scopedDocumentIdParamsSchema = organisationIdParamsSchema
  .extend({ trainingDocumentId: idParamSchema })
  .strict();

/**
 * @openapi
 * /platform/training-documents:
 *   post:
 *     tags: [Training Document Authoring]
 *     summary: Create a platform Training Document draft
 *     description: Creates a platform-owned draft with raw Markdown.
 *     security: [{ bearerAuth: [] }]
 *     requestBody: { $ref: '#/components/requestBodies/TrainingDocumentDraft' }
 *     responses:
 *       201: { $ref: '#/components/responses/TrainingDocumentDraftCreated' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/UnprocessableEntity' }
 *       429: { $ref: '#/components/responses/TrainingDocumentAuthoringRateLimited' }
 *       500: { $ref: '#/components/responses/InternalServerError' }
 */
trainingDocumentAuthoringRouter.post(
  '/platform/training-documents',
  trainingDocumentAuthoringRateLimit,
  requireAuth,
  validateBody(createTrainingDocumentDraftRequestSchema, { statusCode: 422 }),
  asyncHandler(createTrainingDocumentDraftHandler),
);
/**
 * @openapi
 * /organisations/{organisationId}/training-documents:
 *   post:
 *     tags: [Training Document Authoring]
 *     summary: Create an organisation Training Document draft
 *     description: Creates a draft owned by the selected active organisation.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/OrganisationIdPathParam' }]
 *     requestBody: { $ref: '#/components/requestBodies/TrainingDocumentDraft' }
 *     responses:
 *       201: { $ref: '#/components/responses/TrainingDocumentDraftCreated' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/UnprocessableEntity' }
 *       429: { $ref: '#/components/responses/TrainingDocumentAuthoringRateLimited' }
 *       500: { $ref: '#/components/responses/InternalServerError' }
 */
trainingDocumentAuthoringRouter.post(
  '/organisations/:organisationId/training-documents',
  trainingDocumentAuthoringRateLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema),
  validateBody(createTrainingDocumentDraftRequestSchema, { statusCode: 422 }),
  asyncHandler(createTrainingDocumentDraftHandler),
);
trainingDocumentAuthoringRouter.get(
  '/organisations/:organisationId/training-documents',
  trainingDocumentAuthoringRateLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema),
  asyncHandler(listTrainingDocumentsAuthoringHandler),
);

/**
 * @openapi
 * /platform/training-documents/{trainingDocumentId}:
 *   get:
 *     tags: [Training Document Authoring]
 *     summary: Get a platform Training Document
 *     description: Returns a platform-owned Training Document for management.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/TrainingDocumentIdPathParam' }]
 *     responses:
 *       200: { $ref: '#/components/responses/TrainingDocumentAuthoringOk' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       429: { $ref: '#/components/responses/TrainingDocumentAuthoringRateLimited' }
 *       500: { $ref: '#/components/responses/InternalServerError' }
 */
trainingDocumentAuthoringRouter.get(
  '/platform/training-documents/:trainingDocumentId',
  trainingDocumentAuthoringRateLimit,
  requireAuth,
  validateParams(documentIdParamsSchema),
  asyncHandler(getTrainingDocumentAuthoringHandler),
);
/**
 * @openapi
 * /organisations/{organisationId}/training-documents/{trainingDocumentId}:
 *   get:
 *     tags: [Training Document Authoring]
 *     summary: Get an organisation-accessible Training Document
 *     description: Returns an organisation-owned Training Document or an AVAILABLE platform document.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/OrganisationIdPathParam' }, { $ref: '#/components/parameters/TrainingDocumentIdPathParam' }]
 *     responses:
 *       200: { $ref: '#/components/responses/TrainingDocumentAuthoringOk' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       429: { $ref: '#/components/responses/TrainingDocumentAuthoringRateLimited' }
 *       500: { $ref: '#/components/responses/InternalServerError' }
 */
trainingDocumentAuthoringRouter.get(
  '/organisations/:organisationId/training-documents/:trainingDocumentId',
  trainingDocumentAuthoringRateLimit,
  requireAuth,
  validateParams(scopedDocumentIdParamsSchema),
  asyncHandler(getTrainingDocumentAuthoringHandler),
);

/**
 * @openapi
 * /platform/training-documents/{trainingDocumentId}:
 *   put:
 *     tags: [Training Document Authoring]
 *     summary: Update a platform Training Document draft
 *     description: Replaces the editable fields of a platform-owned DRAFT document.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/TrainingDocumentIdPathParam' }]
 *     requestBody: { $ref: '#/components/requestBodies/TrainingDocumentDraft' }
 *     responses:
 *       200: { $ref: '#/components/responses/TrainingDocumentAuthoringOk' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/UnprocessableEntity' }
 *       429: { $ref: '#/components/responses/TrainingDocumentAuthoringRateLimited' }
 *       500: { $ref: '#/components/responses/InternalServerError' }
 */
trainingDocumentAuthoringRouter.put(
  '/platform/training-documents/:trainingDocumentId',
  trainingDocumentAuthoringRateLimit,
  requireAuth,
  validateParams(documentIdParamsSchema),
  validateBody(updateTrainingDocumentDraftRequestSchema, { statusCode: 422 }),
  asyncHandler(updateTrainingDocumentDraftHandler),
);
/**
 * @openapi
 * /organisations/{organisationId}/training-documents/{trainingDocumentId}:
 *   put:
 *     tags: [Training Document Authoring]
 *     summary: Update an organisation Training Document draft
 *     description: Replaces the editable fields of an organisation-owned DRAFT document.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/OrganisationIdPathParam' }, { $ref: '#/components/parameters/TrainingDocumentIdPathParam' }]
 *     requestBody: { $ref: '#/components/requestBodies/TrainingDocumentDraft' }
 *     responses:
 *       200: { $ref: '#/components/responses/TrainingDocumentAuthoringOk' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/UnprocessableEntity' }
 *       429: { $ref: '#/components/responses/TrainingDocumentAuthoringRateLimited' }
 *       500: { $ref: '#/components/responses/InternalServerError' }
 */
trainingDocumentAuthoringRouter.put(
  '/organisations/:organisationId/training-documents/:trainingDocumentId',
  trainingDocumentAuthoringRateLimit,
  requireAuth,
  validateParams(scopedDocumentIdParamsSchema),
  validateBody(updateTrainingDocumentDraftRequestSchema, { statusCode: 422 }),
  asyncHandler(updateTrainingDocumentDraftHandler),
);

/**
 * @openapi
 * /platform/training-documents/{trainingDocumentId}/activate:
 *   post:
 *     tags: [Training Document Authoring]
 *     summary: Activate a platform Training Document draft
 *     description: Activates a valid platform-owned draft and returns it with AVAILABLE status.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/TrainingDocumentIdPathParam' }]
 *     responses:
 *       200: { $ref: '#/components/responses/TrainingDocumentAuthoringOk' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/InvalidTrainingDocument' }
 *       429: { $ref: '#/components/responses/TrainingDocumentAuthoringRateLimited' }
 *       500: { $ref: '#/components/responses/InternalServerError' }
 */
trainingDocumentAuthoringRouter.post(
  '/platform/training-documents/:trainingDocumentId/activate',
  trainingDocumentAuthoringRateLimit,
  requireAuth,
  validateParams(documentIdParamsSchema),
  asyncHandler(activateTrainingDocumentHandler),
);
/**
 * @openapi
 * /platform/training-documents/{trainingDocumentId}/copy:
 *   post:
 *     tags: [Training Document Authoring]
 *     summary: Copy an active platform Training Document
 *     description: Copies an AVAILABLE platform Training Document into a new platform-owned draft.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/TrainingDocumentIdPathParam' }]
 *     responses:
 *       201: { $ref: '#/components/responses/TrainingDocumentDraftCreated' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       429: { $ref: '#/components/responses/TrainingDocumentAuthoringRateLimited' }
 *       500: { $ref: '#/components/responses/InternalServerError' }
 */
trainingDocumentAuthoringRouter.post(
  '/platform/training-documents/:trainingDocumentId/copy',
  trainingDocumentAuthoringRateLimit,
  requireAuth,
  validateParams(documentIdParamsSchema),
  asyncHandler(copyTrainingDocumentHandler),
);
/**
 * @openapi
 * /organisations/{organisationId}/training-documents/{trainingDocumentId}/activate:
 *   post:
 *     tags: [Training Document Authoring]
 *     summary: Activate an organisation Training Document draft
 *     description: Activates a valid organisation-owned draft and returns it with AVAILABLE status.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/OrganisationIdPathParam' }, { $ref: '#/components/parameters/TrainingDocumentIdPathParam' }]
 *     responses:
 *       200: { $ref: '#/components/responses/TrainingDocumentAuthoringOk' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/InvalidTrainingDocument' }
 *       429: { $ref: '#/components/responses/TrainingDocumentAuthoringRateLimited' }
 *       500: { $ref: '#/components/responses/InternalServerError' }
 */
trainingDocumentAuthoringRouter.post(
  '/organisations/:organisationId/training-documents/:trainingDocumentId/activate',
  trainingDocumentAuthoringRateLimit,
  requireAuth,
  validateParams(scopedDocumentIdParamsSchema),
  asyncHandler(activateTrainingDocumentHandler),
);
/**
 * @openapi
 * /organisations/{organisationId}/training-documents/{trainingDocumentId}/copy:
 *   post:
 *     tags: [Training Document Authoring]
 *     summary: Copy an active Training Document into an organisation
 *     description: Copies an AVAILABLE organisation or platform Training Document into a new organisation-owned draft.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/OrganisationIdPathParam' }, { $ref: '#/components/parameters/TrainingDocumentIdPathParam' }]
 *     responses:
 *       201: { $ref: '#/components/responses/TrainingDocumentDraftCreated' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       429: { $ref: '#/components/responses/TrainingDocumentAuthoringRateLimited' }
 *       500: { $ref: '#/components/responses/InternalServerError' }
 */
trainingDocumentAuthoringRouter.post(
  '/organisations/:organisationId/training-documents/:trainingDocumentId/copy',
  trainingDocumentAuthoringRateLimit,
  requireAuth,
  validateParams(scopedDocumentIdParamsSchema),
  asyncHandler(copyTrainingDocumentHandler),
);

/**
 * @openapi
 * /platform/training-documents/preview:
 *   post:
 *     tags: [Training Document Authoring]
 *     summary: Preview platform Training Document Markdown
 *     description: Renders current unsaved Markdown through GitHub and returns sanitised HTML without changing saved content.
 *     security: [{ bearerAuth: [] }]
 *     requestBody: { $ref: '#/components/requestBodies/TrainingDocumentPreview' }
 *     responses:
 *       200: { $ref: '#/components/responses/TrainingDocumentPreviewOk' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       422: { $ref: '#/components/responses/UnprocessableEntity' }
 *       429: { $ref: '#/components/responses/TrainingDocumentAuthoringRateLimited' }
 *       502: { $ref: '#/components/responses/MarkdownPreviewUnavailable' }
 *       500: { $ref: '#/components/responses/InternalServerError' }
 */
trainingDocumentAuthoringRouter.post(
  '/platform/training-documents/preview',
  trainingDocumentAuthoringRateLimit,
  requireAuth,
  validateBody(previewTrainingDocumentRequestSchema, { statusCode: 422 }),
  asyncHandler(previewTrainingDocumentHandler),
);
/**
 * @openapi
 * /organisations/{organisationId}/training-documents/preview:
 *   post:
 *     tags: [Training Document Authoring]
 *     summary: Preview organisation Training Document Markdown
 *     description: Renders current unsaved Markdown through GitHub and returns sanitised HTML without changing saved content.
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: '#/components/parameters/OrganisationIdPathParam' }]
 *     requestBody: { $ref: '#/components/requestBodies/TrainingDocumentPreview' }
 *     responses:
 *       200: { $ref: '#/components/responses/TrainingDocumentPreviewOk' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       422: { $ref: '#/components/responses/UnprocessableEntity' }
 *       429: { $ref: '#/components/responses/TrainingDocumentAuthoringRateLimited' }
 *       502: { $ref: '#/components/responses/MarkdownPreviewUnavailable' }
 *       500: { $ref: '#/components/responses/InternalServerError' }
 */
trainingDocumentAuthoringRouter.post(
  '/organisations/:organisationId/training-documents/preview',
  trainingDocumentAuthoringRateLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema),
  validateBody(previewTrainingDocumentRequestSchema, { statusCode: 422 }),
  asyncHandler(previewTrainingDocumentHandler),
);
