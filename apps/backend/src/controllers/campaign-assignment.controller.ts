import type { Request, Response } from 'express';
import type { CampaignAssignmentOptionsQueryDto } from '@insightful-phish/shared';
import {
  CampaignAssignmentServiceError,
  getAssignableCampaigns,
  getAssignmentCandidates,
} from '../services/campaign-assignment.service.js';

function requireActorUserId(req: Request, res: Response): string | null {
  if (!req.auth?.userId) {
    res.status(401).json({
      error: 'UNAUTHENTICATED',
      message: 'Authentication credentials are required',
    });
    return null;
  }

  return req.auth.userId;
}

function requiredParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string') {
    throw new CampaignAssignmentServiceError(
      404,
      'ROUTE_PARAM_MISSING',
      'Route parameter is missing',
    );
  }

  return value;
}

function handleCampaignAssignmentError(error: unknown, res: Response) {
  if (error instanceof CampaignAssignmentServiceError) {
    return res.status(error.statusCode).json({
      error: error.error,
      message: error.message,
    });
  }

  throw error;
}

export async function getAssignableCampaignsController(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) {
    return;
  }

  try {
    const organisationId = requiredParam(req, 'organisationId');
    const query = req.query as unknown as CampaignAssignmentOptionsQueryDto;

    const result = await getAssignableCampaigns(actorUserId, organisationId, query);
    return res.status(200).json(result);
  } catch (error) {
    return handleCampaignAssignmentError(error, res);
  }
}

export async function getAssignmentCandidatesController(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) {
    return;
  }

  try {
    const organisationId = requiredParam(req, 'organisationId');
    const query = req.query as unknown as CampaignAssignmentOptionsQueryDto;

    const result = await getAssignmentCandidates(actorUserId, organisationId, query);
    return res.status(200).json(result);
  } catch (error) {
    return handleCampaignAssignmentError(error, res);
  }
}
