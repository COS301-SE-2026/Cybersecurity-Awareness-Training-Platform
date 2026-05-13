import type { Request, Response } from 'express';
import {
  getAssignedTraining,
  getTrainingDocument,
  recordTrainingProgress,
  TrainingDocumentNotFoundError,
} from '../services/training.service.js';

function getAuthenticatedUserId(req: Request, res: Response) {
  if (!req.auth) {
    res.status(401).json({
      error: 'AUTH_REQUIRED',
      message: 'Authentication credentials are required',
    });

    return null;
  }

  return req.auth.userId;
}

export async function getAssignedTrainingDocuments(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(req, res);

  if (!userId) {
    return;
  }

  const response = await getAssignedTraining(userId);
  res.status(200).json(response);
}

export async function getTrainingDocumentDetail(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(req, res);

  if (!userId) {
    return;
  }

  try {
    const response = await getTrainingDocument(userId, String(req.params.trainingId));
    return res.status(200).json(response);
  } catch (error) {
    if (error instanceof TrainingDocumentNotFoundError) {
      return res.status(404).json({
        error: 'TRAINING_DOCUMENT_NOT_FOUND',
        message: error.message,
      });
    }

    throw error;
  }
}

export async function postTrainingProgress(req: Request, res: Response) {
  const userId = getAuthenticatedUserId(req, res);

  if (!userId) {
    return;
  }

  try {
    const response = await recordTrainingProgress(userId, String(req.params.trainingId), req.body);
    return res.status(200).json(response);
  } catch (error) {
    if (error instanceof TrainingDocumentNotFoundError) {
      return res.status(404).json({
        error: 'TRAINING_DOCUMENT_NOT_FOUND',
        message: error.message,
      });
    }

    throw error;
  }
}
