import type { Request, Response } from 'express';
import type { QuizDraftInput } from '@insightful-phish/shared';
import * as ContentLifecycleService from '../services/content-lifecycle.service.js';

function extractActor(req: Request): ContentLifecycleService.UserActorContext {
  if (!req.auth) {
    throw new ContentLifecycleService.ContentLifecycleServiceError(
      401,
      'UNAUTHORIZED',
      'Authentication is required',
    );
  }

  return {
    userId: req.auth.userId,
    userType: req.auth.user.userType,
  };
}

function handleError(res: Response, error: unknown) {
  if (error instanceof ContentLifecycleService.ContentLifecycleServiceError) {
    return res.status(error.statusCode).json({
      error: error.error,
      message: error.message,
    });
  }

  throw error;
}

async function create(req: Request, res: Response, organisationId: string | null) {
  try {
    const quiz = await ContentLifecycleService.createQuizDraft(
      extractActor(req),
      organisationId,
      req.body as QuizDraftInput,
    );
    return res.status(201).json(quiz);
  } catch (error) {
    return handleError(res, error);
  }
}

async function read(req: Request, res: Response, organisationId: string | null) {
  try {
    const quiz = await ContentLifecycleService.getQuizForAuthoring(
      extractActor(req),
      String(req.params.quizId),
      organisationId,
    );
    return res.status(200).json(quiz);
  } catch (error) {
    return handleError(res, error);
  }
}

async function update(req: Request, res: Response, organisationId: string | null) {
  try {
    const quiz = await ContentLifecycleService.editQuizDraft(
      extractActor(req),
      String(req.params.quizId),
      organisationId,
      req.body as QuizDraftInput,
    );
    return res.status(200).json(quiz);
  } catch (error) {
    return handleError(res, error);
  }
}

async function activate(req: Request, res: Response, organisationId: string | null) {
  try {
    const quiz = await ContentLifecycleService.activateQuiz(
      extractActor(req),
      String(req.params.quizId),
      organisationId,
    );
    return res.status(200).json(quiz);
  } catch (error) {
    return handleError(res, error);
  }
}

async function copy(req: Request, res: Response, organisationId: string | null) {
  try {
    const quiz = await ContentLifecycleService.activateQuiz(
      extractActor(req),
      String(req.params.quizId),
      organisationId,
    );
    return res.status(201).json(quiz);
  } catch (error) {
    return handleError(res, error);
  }
}

export function createOrganisationQuizDraft(req: Request, res: Response) {
  return create(req, res, String(req.params.organisationId));
}

export function createPlatformQuizDraft(req: Request, res: Response) {
  return create(req, res, null);
}

export function getOrganisationQuizForAuthoring(req: Request, res: Response) {
  return read(req, res, String(req.params.organisationId));
}

export function getPlatformQuizForAuthoring(req: Request, res: Response) {
  return read(req, res, null);
}

export function updateOrganisationQuizDraft(req: Request, res: Response) {
  return update(req, res, String(req.params.organisationId));
}

export function activateOrganisationQuiz(req: Request, res: Response) {
  return activate(req, res, String(req.params.organisationId));
}

export function copyOrganisationQuiz(req: Request, res: Response) {
  return copy(req, res, String(req.params.organisationId));
}

export function updatePlatformQuizDraft(req: Request, res: Response) {
  return update(req, res, null);
}

export function activatePlatformQuiz(req: Request, res: Response) {
  return activate(req, res, null);
}

export function copyPlatformQuiz(req: Request, res: Response) {
  return copy(req, res, null);
}
