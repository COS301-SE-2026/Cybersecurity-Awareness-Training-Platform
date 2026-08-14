import type { Request, Response } from 'express';
import {
  campaignCatalogueQuerySchema,
  campaignListQuerySchema,
  campaignMutationPreconditionSchema,
  createCampaignDraftRequestSchema,
  updateCampaignDraftRequestSchema,
} from '@insightful-phish/shared';
import * as CampaignManagementService from '../services/campaign-management.service.js';
import { OrganisationScopeServiceError } from '../services/organisation-scope.service.js';

function extractActor(req: Request): CampaignManagementService.UserActorContext {
  const userId = req.auth?.userId;
  if (!userId) {
    throw new CampaignManagementService.CampaignManagementServiceError(
      401,
      'UNAUTHORIZED',
      'Authentication is required',
    );
  }
  return {
    userId,
    userType: (req.auth as { userType?: string })?.userType ?? 'ORGANISATION_ADMIN',
  };
}

function handleControllerError(res: Response, err: unknown) {
  if (err instanceof CampaignManagementService.CampaignManagementServiceError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.error,
      message: err.message,
    });
  }

  if (err instanceof OrganisationScopeServiceError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.error,
      message: err.message,
    });
  }

  const message = err instanceof Error ? err.message : String(err);
  return res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message,
  });
}

export async function getOrganisationCampaignCatalogueHandler(req: Request, res: Response) {
  try {
    const actor = extractActor(req);
    const organisationId = String(req.params.organisationId);

    const parseResult = campaignCatalogueQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid pagination or filter parameters',
        details: parseResult.error.flatten(),
      });
    }

    const result = await CampaignManagementService.getOrganisationCampaignCatalogue(
      actor,
      organisationId,
      parseResult.data,
    );
    return res.status(200).json(result);
  } catch (err) {
    return handleControllerError(res, err);
  }
}

export async function getPlatformCampaignCatalogueHandler(req: Request, res: Response) {
  try {
    const actor = extractActor(req);

    const parseResult = campaignCatalogueQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid pagination or filter parameters',
        details: parseResult.error.flatten(),
      });
    }

    const result = await CampaignManagementService.getPlatformCampaignCatalogue(
      actor,
      parseResult.data,
    );
    return res.status(200).json(result);
  } catch (err) {
    return handleControllerError(res, err);
  }
}

export async function getOrganisationCampaignsHandler(req: Request, res: Response) {
  try {
    const actor = extractActor(req);
    const organisationId = String(req.params.organisationId);

    const parseResult = campaignListQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid search or filter parameters',
        details: parseResult.error.flatten(),
      });
    }

    const result = await CampaignManagementService.getOrganisationCampaigns(
      actor,
      organisationId,
      parseResult.data,
    );
    return res.status(200).json(result);
  } catch (err) {
    return handleControllerError(res, err);
  }
}

export async function getPlatformCampaignsHandler(req: Request, res: Response) {
  try {
    const actor = extractActor(req);

    const parseResult = campaignListQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid search or filter parameters',
        details: parseResult.error.flatten(),
      });
    }

    const result = await CampaignManagementService.getPlatformCampaigns(actor, parseResult.data);
    return res.status(200).json(result);
  } catch (err) {
    return handleControllerError(res, err);
  }
}

export async function getOrganisationCampaignDetailHandler(req: Request, res: Response) {
  try {
    const actor = extractActor(req);
    const organisationId = String(req.params.organisationId);
    const campaignId = String(req.params.campaignId);

    const result = await CampaignManagementService.getOrganisationCampaignDetail(
      actor,
      organisationId,
      campaignId,
    );
    return res.status(200).json(result);
  } catch (err) {
    return handleControllerError(res, err);
  }
}

export async function getPlatformCampaignDetailHandler(req: Request, res: Response) {
  try {
    const actor = extractActor(req);
    const campaignId = String(req.params.campaignId);

    const result = await CampaignManagementService.getPlatformCampaignDetail(actor, campaignId);
    return res.status(200).json(result);
  } catch (err) {
    return handleControllerError(res, err);
  }
}

export async function createOrganisationCampaignDraftHandler(req: Request, res: Response) {
  try {
    const actor = extractActor(req);
    const organisationId = String(req.params.organisationId);

    const parseResult = createCampaignDraftRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid campaign draft input',
        details: parseResult.error.flatten(),
      });
    }

    const result = await CampaignManagementService.createOrganisationCampaignDraft(
      actor,
      organisationId,
      parseResult.data,
    );
    return res.status(201).json(result);
  } catch (err) {
    return handleControllerError(res, err);
  }
}

export async function createPlatformCampaignDraftHandler(req: Request, res: Response) {
  try {
    const actor = extractActor(req);

    const parseResult = createCampaignDraftRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid platform campaign draft input',
        details: parseResult.error.flatten(),
      });
    }

    const result = await CampaignManagementService.createPlatformCampaignDraft(
      actor,
      parseResult.data,
    );
    return res.status(201).json(result);
  } catch (err) {
    return handleControllerError(res, err);
  }
}

export async function updateOrganisationCampaignDraftHandler(req: Request, res: Response) {
  try {
    const actor = extractActor(req);
    const organisationId = String(req.params.organisationId);
    const campaignId = String(req.params.campaignId);

    const parseResult = updateCampaignDraftRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid campaign draft update input',
        details: parseResult.error.flatten(),
      });
    }

    const result = await CampaignManagementService.updateOrganisationCampaignDraft(
      actor,
      organisationId,
      campaignId,
      parseResult.data,
    );
    return res.status(200).json(result);
  } catch (err) {
    return handleControllerError(res, err);
  }
}

export async function updatePlatformCampaignDraftHandler(req: Request, res: Response) {
  try {
    const actor = extractActor(req);
    const campaignId = String(req.params.campaignId);

    const parseResult = updateCampaignDraftRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid platform campaign draft update input',
        details: parseResult.error.flatten(),
      });
    }

    const result = await CampaignManagementService.updatePlatformCampaignDraft(
      actor,
      campaignId,
      parseResult.data,
    );
    return res.status(200).json(result);
  } catch (err) {
    return handleControllerError(res, err);
  }
}

export async function activateOrganisationCampaignHandler(req: Request, res: Response) {
  try {
    const actor = extractActor(req);
    const organisationId = String(req.params.organisationId);
    const campaignId = String(req.params.campaignId);
    const precondition = campaignMutationPreconditionSchema.parse(req.body);

    const result = await CampaignManagementService.activateOrganisationCampaign(
      actor,
      organisationId,
      campaignId,
      precondition,
    );
    return res.status(200).json(result);
  } catch (err) {
    return handleControllerError(res, err);
  }
}

export async function activatePlatformCampaignHandler(req: Request, res: Response) {
  try {
    const actor = extractActor(req);
    const campaignId = String(req.params.campaignId);
    const precondition = campaignMutationPreconditionSchema.parse(req.body);

    const result = await CampaignManagementService.activatePlatformCampaign(
      actor,
      campaignId,
      precondition,
    );
    return res.status(200).json(result);
  } catch (err) {
    return handleControllerError(res, err);
  }
}

export async function archiveOrganisationCampaignHandler(req: Request, res: Response) {
  try {
    const actor = extractActor(req);
    const organisationId = String(req.params.organisationId);
    const campaignId = String(req.params.campaignId);
    const precondition = campaignMutationPreconditionSchema.parse(req.body);

    const result = await CampaignManagementService.archiveOrganisationCampaign(
      actor,
      organisationId,
      campaignId,
      precondition,
    );
    return res.status(200).json(result);
  } catch (err) {
    return handleControllerError(res, err);
  }
}

export async function archivePlatformCampaignHandler(req: Request, res: Response) {
  try {
    const actor = extractActor(req);
    const campaignId = String(req.params.campaignId);
    const precondition = campaignMutationPreconditionSchema.parse(req.body);

    const result = await CampaignManagementService.archivePlatformCampaign(
      actor,
      campaignId,
      precondition,
    );
    return res.status(200).json(result);
  } catch (err) {
    return handleControllerError(res, err);
  }
}

export async function reactivateOrganisationCampaignHandler(req: Request, res: Response) {
  try {
    const actor = extractActor(req);
    const organisationId = String(req.params.organisationId);
    const campaignId = String(req.params.campaignId);
    const precondition = campaignMutationPreconditionSchema.parse(req.body);

    const result = await CampaignManagementService.reactivateOrganisationCampaign(
      actor,
      organisationId,
      campaignId,
      precondition,
    );
    return res.status(200).json(result);
  } catch (err) {
    return handleControllerError(res, err);
  }
}

export async function reactivatePlatformCampaignHandler(req: Request, res: Response) {
  try {
    const actor = extractActor(req);
    const campaignId = String(req.params.campaignId);
    const precondition = campaignMutationPreconditionSchema.parse(req.body);

    const result = await CampaignManagementService.reactivatePlatformCampaign(
      actor,
      campaignId,
      precondition,
    );
    return res.status(200).json(result);
  } catch (err) {
    return handleControllerError(res, err);
  }
}
