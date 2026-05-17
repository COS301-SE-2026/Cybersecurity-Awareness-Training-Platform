import type { Request, Response } from 'express';
import {
  QuizAttemptConflictError,
  QuizForbiddenError,
  QuizNotFoundError,
  QuizValidationError,
  getQuizByCampaignItemId,
  getQuizResult,
  startQuizAttempt,
  submitQuizAttempt,
} from '../services/quiz.service.js';

function handleError(res: Response, error: unknown) {
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

export async function getQuiz(req: Request, res: Response) {
  try {
    const traineeProfileId = req.auth?.user?.traineeProfile?.id;
    if (!traineeProfileId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'User is not a trainee' });
    }

    const campaignItemId = req.params.campaignItemId as string;
    const response = await getQuizByCampaignItemId(campaignItemId, traineeProfileId);
    return res.status(200).json(response);
  } catch (error) {
    return handleError(res, error);
  }
}

export async function startAttempt(req: Request, res: Response) {
  try {
    const traineeProfileId = req.auth?.user?.traineeProfile?.id;
    if (!traineeProfileId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'User is not a trainee' });
    }

    const campaignItemId = req.params.campaignItemId as string;
    const response = await startQuizAttempt(campaignItemId, traineeProfileId);
    return res.status(201).json(response);
  } catch (error) {
    return handleError(res, error);
  }
}

export async function submitAttempt(req: Request, res: Response) {
  try {
    const traineeProfileId = req.auth?.user?.traineeProfile?.id;
    if (!traineeProfileId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'User is not a trainee' });
    }

    const attemptId = req.params.attemptId as string;
    const { answers } = req.body;
    const response = await submitQuizAttempt(attemptId, traineeProfileId, answers);
    return res.status(200).json(response);
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getResult(req: Request, res: Response) {
  try {
    const traineeProfileId = req.auth?.user?.traineeProfile?.id;
    if (!traineeProfileId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'User is not a trainee' });
    }

    const attemptId = req.params.attemptId as string;
    const response = await getQuizResult(attemptId, traineeProfileId);
    return res.status(200).json(response);
  } catch (error) {
    return handleError(res, error);
  }
}
