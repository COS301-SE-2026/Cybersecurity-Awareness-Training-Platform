import type { Request, Response } from 'express';
import {
  getTraineeCampaignDetail,
  getTraineeCampaigns,
  TraineeCampaignNotFoundError,
} from '../services/trainee-campaign.service.js';

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

function handleTraineeCampaignError(error: unknown, res: Response) {
  if (error instanceof TraineeCampaignNotFoundError) {
    return res.status(404).json({
      error: 'CAMPAIGN_NOT_FOUND',
      message: 'Campaign was not found',
    });
  }

  return res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  });
}

function getCampaignId(req: Request) {
  const { campaignId } = req.params;

  return Array.isArray(campaignId) ? (campaignId[0] ?? '') : campaignId;
}

export async function listTraineeCampaigns(req: Request, res: Response) {
  const userId = requireAuthenticatedUserId(req, res);

  if (!userId) {
    return undefined;
  }

  try {
    const response = await getTraineeCampaigns(userId);
    return res.status(200).json(response);
  } catch (error) {
    return handleTraineeCampaignError(error, res);
  }
}

export async function getTraineeCampaign(req: Request, res: Response) {
  const userId = requireAuthenticatedUserId(req, res);

  if (!userId) {
    return undefined;
  }

  try {
    const response = await getTraineeCampaignDetail(userId, getCampaignId(req));
    return res.status(200).json(response);
  } catch (error) {
    return handleTraineeCampaignError(error, res);
  }
}
