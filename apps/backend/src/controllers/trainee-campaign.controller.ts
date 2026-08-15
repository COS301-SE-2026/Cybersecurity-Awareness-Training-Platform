import type { Request, Response } from 'express';
import { CampaignEligibilityDenialError } from '../services/campaign-eligibility.service.js';
import {
  enrolPlatformCampaign,
  getTraineeCampaignDetail,
  getTraineeCampaigns,
  listPlatformCampaigns,
  TraineeCampaignForbiddenError,
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
  if (error instanceof TraineeCampaignForbiddenError) {
    return res.status(error.statusCode).json({
      error: error.errorCode,
      message: error.message,
    });
  }

  if (error instanceof TraineeCampaignNotFoundError) {
    return res.status(404).json({
      error: 'CAMPAIGN_NOT_FOUND',
      message: 'Campaign was not found',
    });
  }

  if (error instanceof CampaignEligibilityDenialError) {
    return res.status(error.statusCode).json({
      error: error.errorCode,
      message: error.message,
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

export async function listPlatformCampaignsController(req: Request, res: Response) {
  const userId = requireAuthenticatedUserId(req, res);

  if (!userId) {
    return undefined;
  }

  try {
    const query = {
      page: (req.query.page as unknown as number) ?? 1,
      limit: (req.query.limit as unknown as number) ?? 10,
      search: req.query.search as string | undefined,
    };
    const response = await listPlatformCampaigns(userId, query);
    return res.status(200).json(response);
  } catch (error) {
    return handleTraineeCampaignError(error, res);
  }
}

export async function enrolPlatformCampaignController(req: Request, res: Response) {
  const userId = requireAuthenticatedUserId(req, res);

  if (!userId) {
    return undefined;
  }

  try {
    const campaignId = getCampaignId(req);
    const response = await enrolPlatformCampaign(userId, campaignId);
    return res.status(200).json(response);
  } catch (error) {
    return handleTraineeCampaignError(error, res);
  }
}

