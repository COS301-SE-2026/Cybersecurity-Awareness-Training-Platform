import type {
  ContentVariantGenerationRequestDto,
  ReusableContentGenerationRequestDto,
} from '@insightful-phish/shared';
import type { Request, Response } from 'express';
import {
  AiBuilderGenerationError,
  generateOrganisationEmailDraft,
  generateOrganisationContentVariant,
  generateQuizDraft,
  generateTrainingDocumentDraft,
} from '../services/ai-builder-generation.service.js';

function requestScope(req: Request) {
  if (!req.auth) {
    throw new AiBuilderGenerationError(401, 'AUTH_REQUIRED', 'Authentication is required', false);
  }
  return {
    userId: req.auth.userId,
    organisationId:
      typeof req.params.organisationId === 'string' ? req.params.organisationId : null,
    request: req.body as ReusableContentGenerationRequestDto,
  };
}

function handleGenerationError(error: unknown, res: Response) {
  if (error instanceof AiBuilderGenerationError) {
    return res.status(error.statusCode).json({
      error: error.error,
      message: error.message,
      retryable: error.retryable,
    });
  }
  throw error;
}

export async function generateTrainingDocumentDraftHandler(req: Request, res: Response) {
  try {
    return res.status(200).json(await generateTrainingDocumentDraft(requestScope(req)));
  } catch (error) {
    return handleGenerationError(error, res);
  }
}

export async function generateQuizDraftHandler(req: Request, res: Response) {
  try {
    return res.status(200).json(await generateQuizDraft(requestScope(req)));
  } catch (error) {
    return handleGenerationError(error, res);
  }
}

export async function generateOrganisationEmailDraftHandler(req: Request, res: Response) {
  try {
    const scope = requestScope(req);
    if (scope.organisationId === null) {
      throw new AiBuilderGenerationError(403, 'FORBIDDEN', 'Organisation scope is required', false);
    }
    return res
      .status(200)
      .json(
        await generateOrganisationEmailDraft({ ...scope, organisationId: scope.organisationId }),
      );
  } catch (error) {
    return handleGenerationError(error, res);
  }
}

export async function generateOrganisationContentVariantHandler(req: Request, res: Response) {
  try {
    const scope = requestScope(req);
    if (scope.organisationId === null) {
      throw new AiBuilderGenerationError(403, 'FORBIDDEN', 'Organisation scope is required', false);
    }
    return res.status(200).json(
      await generateOrganisationContentVariant({
        userId: scope.userId,
        organisationId: scope.organisationId,
        request: req.body as ContentVariantGenerationRequestDto,
      }),
    );
  } catch (error) {
    return handleGenerationError(error, res);
  }
}
