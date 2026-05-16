import type { Request, Response } from 'express';
import {
  getTrainingDocumentForCampaignItem,
  recordTrainingInteraction,
  TrainingDocumentAccessNotFoundError,
} from '../services/trainee-training.service.js';

function requireAuthenticatedUserId(req: Request, res: Response) {
  if (!req.auth) {
    res.status(401).json({
      error: 'AUTH_REQUIRED',
      message: 'Authentication credentials are required',
    });
    return null;
  }

  return req.auth.userId;
}

function handleTrainingError(error: unknown, res: Response) {
  if (error instanceof TrainingDocumentAccessNotFoundError) {
    return res.status(404).json({
      error: 'TRAINING_DOCUMENT_NOT_FOUND',
      message: 'Training document was not found',
    });
  }

  return res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
}

function getCampaignItemId(req: Request) {
  const { campaignItemId } = req.params;

  return Array.isArray(campaignItemId) ? (campaignItemId[0] ?? '') : campaignItemId;
}

export async function getTrainingDocument(req: Request, res: Response) {
  const userId = requireAuthenticatedUserId(req, res);

  if (!userId) {
    return undefined;
  }

  try {
    const response = await getTrainingDocumentForCampaignItem(userId, getCampaignItemId(req));
    return res.status(200).json(response);
  } catch (error) {
    return handleTrainingError(error, res);
  }
}

export async function recordTrainingViewed(req: Request, res: Response) {
  const userId = requireAuthenticatedUserId(req, res);

  if (!userId) {
    return undefined;
  }

  try {
    const response = await recordTrainingInteraction({
      userId,
      campaignItemId: getCampaignItemId(req),
      eventType: 'TRAINING_VIEWED',
    });

    return res.status(201).json(response);
  } catch (error) {
    return handleTrainingError(error, res);
  }
}

export async function recordTrainingCompleted(req: Request, res: Response) {
  const userId = requireAuthenticatedUserId(req, res);

  if (!userId) {
    return undefined;
  }

  try {
    const response = await recordTrainingInteraction({
      userId,
      campaignItemId: getCampaignItemId(req),
      eventType: 'TRAINING_COMPLETED',
    });

    return res.status(201).json(response);
  } catch (error) {
    return handleTrainingError(error, res);
  }
}
