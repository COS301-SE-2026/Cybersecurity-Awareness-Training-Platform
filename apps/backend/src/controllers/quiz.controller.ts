import type { Request, Response } from 'express';
import {
  QuizAttemptConflictError,
  QuizForbiddenError,
  QuizNotFoundError,
  QuizValidationError,
  getActiveTraineeProfileId,
  getQuizByCampaignItemId,
  getQuizResult,
  startQuizAttempt,
  submitQuizAttempt,
} from '../services/quiz.service.js';

import { CampaignEligibilityDenialError } from '../services/campaign-eligibility.service.js';

function handleError(res: Response, error: unknown) {
  if (error instanceof CampaignEligibilityDenialError) {
    return res.status(error.status).json({ error: error.error, message: error.message });
  }
  if (error instanceof QuizNotFoundError) {
    return res.status(404).json({ error: 'NOT_FOUND', message: error.message });
  }
  if (error instanceof QuizForbiddenError) {
    return res.status(403).json({ error: 'FORBIDDEN', message: error.message });
  }
  if (error instanceof QuizAttemptConflictError) {
    return res.status(409).json({ error: 'CONFLICT', message: error.message });
  }
  if (error instanceof QuizValidationError) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: error.message });
  }
  throw error;
}

async function withTraineeProfile(
  req: Request,
  res: Response,
  fn: (traineeProfileId: string) => Promise<unknown>,
  successStatus = 200,
) {
  try {
    const traineeProfileId = await getActiveTraineeProfileId(req.auth?.userId);
    if (!traineeProfileId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'User is not a trainee' });
    }
    const response = await fn(traineeProfileId);
    return res.status(successStatus).json(response);
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getQuiz(req: Request, res: Response) {
  const campaignItemId = req.params.campaignItemId as string;
  return withTraineeProfile(req, res, (profileId) =>
    getQuizByCampaignItemId(campaignItemId, profileId),
  );
}

export async function startAttempt(req: Request, res: Response) {
  const campaignItemId = req.params.campaignItemId as string;
  return withTraineeProfile(
    req,
    res,
    (profileId) => startQuizAttempt(campaignItemId, profileId),
    201,
  );
}

export async function submitAttempt(req: Request, res: Response) {
  const attemptId = req.params.attemptId as string;
  const { answers } = req.body;
  return withTraineeProfile(req, res, (profileId) =>
    submitQuizAttempt(attemptId, profileId, answers),
  );
}

export async function getResult(req: Request, res: Response) {
  const attemptId = req.params.attemptId as string;
  return withTraineeProfile(req, res, (profileId) => getQuizResult(attemptId, profileId));
}
