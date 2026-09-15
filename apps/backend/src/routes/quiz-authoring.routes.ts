import { Router } from 'express';
import { z } from 'zod';
import { idParamSchema, quizDraftInputSchema } from '@insightful-phish/shared';
import {
  activateOrganisationQuiz,
  activatePlatformQuiz,
  copyOrganisationQuiz,
  copyPlatformQuiz,
  createOrganisationQuizDraft,
  createPlatformQuizDraft,
  getPlatformQuizForAuthoring,
  getOrganisationQuizForAuthoring,
  updateOrganisationQuizDraft,
  updatePlatformQuizDraft,
} from '../controllers/quiz-authoring.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { apiRateLimit } from '../middleware/apiRateLimit.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody, validateParams } from '../middleware/validateRequest.js';

export const quizAuthoringRouter = Router();

const quizIdParamSchema = z.object({ quizId: idParamSchema }).strict();

const organisationQuizIdParamsSchema = z
  .object({
    organisationId: idParamSchema,
    quizId: idParamSchema,
  })
  .strict();

const organisationIdParamSchema = z.object({ organisationId: idParamSchema }).strict();

quizAuthoringRouter.post(
  '/organisations/:organisationId/quizzes',
  apiRateLimit,
  requireAuth,
  validateParams(organisationIdParamSchema),
  validateBody(quizDraftInputSchema, { statusCode: 422 }),
  asyncHandler(createOrganisationQuizDraft),
);

quizAuthoringRouter.get(
  '/organisations/:organisationId/quizzes/:quizId',
  apiRateLimit,
  requireAuth,
  validateParams(organisationQuizIdParamsSchema),
  asyncHandler(getOrganisationQuizForAuthoring),
);

quizAuthoringRouter.put(
  '/organisations/:organisationId/quizzes/:quizId',
  apiRateLimit,
  requireAuth,
  validateParams(organisationQuizIdParamsSchema),
  validateBody(quizDraftInputSchema, { statusCode: 422 }),
  asyncHandler(updateOrganisationQuizDraft),
);

quizAuthoringRouter.post(
  '/organisations/:organisationId/quizzes/:quizId/activate',
  apiRateLimit,
  requireAuth,
  validateParams(organisationQuizIdParamsSchema),
  asyncHandler(activateOrganisationQuiz),
);

quizAuthoringRouter.post(
  '/organisation/:organisationId/quizzes/:quizId/copy',
  apiRateLimit,
  requireAuth,
  validateParams(organisationQuizIdParamsSchema),
  asyncHandler(copyOrganisationQuiz),
);

quizAuthoringRouter.post(
  '/platform/quizzes',
  apiRateLimit,
  requireAuth,
  validateBody(quizDraftInputSchema, { statusCode: 422 }),
  asyncHandler(createPlatformQuizDraft),
);

quizAuthoringRouter.get(
  '/platform/quizzes/:quizId',
  apiRateLimit,
  requireAuth,
  validateParams(quizIdParamSchema),
  asyncHandler(getPlatformQuizForAuthoring),
);

quizAuthoringRouter.put(
  '/platform/quizzes/:quizId',
  apiRateLimit,
  requireAuth,
  validateParams(quizIdParamSchema),
  validateBody(quizDraftInputSchema, { statusCode: 422 }),
  asyncHandler(updatePlatformQuizDraft),
);

quizAuthoringRouter.post(
  '/platform/quizzes/:quizId/activate',
  apiRateLimit,
  requireAuth,
  validateParams(quizIdParamSchema),
  asyncHandler(activatePlatformQuiz),
);

quizAuthoringRouter.post(
  '/platform/quizzes/:quizId/copy',
  apiRateLimit,
  requireAuth,
  validateParams(quizIdParamSchema),
  asyncHandler(copyPlatformQuiz),
);
