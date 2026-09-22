import {
  reusableContentGenerationRequestSchema,
  contentVariantGenerationRequestSchema,
  organisationIdParamsSchema,
} from '@insightful-phish/shared';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  generateOrganisationEmailDraftHandler,
  generateOrganisationContentVariantHandler,
  generateQuizDraftHandler,
  generateTrainingDocumentDraftHandler,
} from '../controllers/ai-builder-generation.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody, validateParams } from '../middleware/validateRequest.js';

export const aiBuilderGenerationRouter = Router();

const generationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'AI_GENERATION_RATE_LIMITED',
    message: 'Too many AI generation requests. Please try again later.',
  },
});

const generationMiddleware = [
  generationRateLimit,
  requireAuth,
  validateBody(reusableContentGenerationRequestSchema, { statusCode: 422 }),
] as const;

aiBuilderGenerationRouter.post(
  '/platform/training-documents/generate',
  ...generationMiddleware,
  asyncHandler(generateTrainingDocumentDraftHandler),
);
aiBuilderGenerationRouter.post(
  '/organisations/:organisationId/training-documents/generate',
  generationRateLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema),
  validateBody(reusableContentGenerationRequestSchema, { statusCode: 422 }),
  asyncHandler(generateTrainingDocumentDraftHandler),
);
aiBuilderGenerationRouter.post(
  '/platform/quizzes/generate',
  ...generationMiddleware,
  asyncHandler(generateQuizDraftHandler),
);
aiBuilderGenerationRouter.post(
  '/organisations/:organisationId/quizzes/generate',
  generationRateLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema),
  validateBody(reusableContentGenerationRequestSchema, { statusCode: 422 }),
  asyncHandler(generateQuizDraftHandler),
);
aiBuilderGenerationRouter.post(
  '/organisations/:organisationId/email-library/generate',
  generationRateLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema),
  validateBody(reusableContentGenerationRequestSchema, { statusCode: 422 }),
  asyncHandler(generateOrganisationEmailDraftHandler),
);
aiBuilderGenerationRouter.post(
  '/organisations/:organisationId/content-variants/generate',
  generationRateLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema),
  validateBody(contentVariantGenerationRequestSchema, { statusCode: 422 }),
  asyncHandler(generateOrganisationContentVariantHandler),
);
