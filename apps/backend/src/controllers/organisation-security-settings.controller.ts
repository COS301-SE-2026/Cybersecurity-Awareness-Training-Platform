import type { Request, Response } from 'express';
import {
  getOrganisationSecuritySettings,
  OrganisationSecuritySettingsServiceError,
  patchOrganisationSecuritySettings,
} from '../services/organisation-security-settings.service.js';

function requireActorUserId(req: Request, res: Response): string | null {
  if (!req.auth?.userId) {
    res.status(401).json({
      error: 'AUTH_REQUIRED',
      message: 'Authentication credentials are required',
    });
    return null;
  }

  return req.auth.userId;
}

function requiredParam(req: Request, name: string) {
  const value = req.params[name];
  if (typeof value !== 'string') {
    throw new OrganisationSecuritySettingsServiceError(
      404,
      'ROUTE_PARAM_MISSING',
      'Route parameter is missing',
    );
  }

  return value;
}

function handleOrganisationSecuritySettingsError(error: unknown, res: Response) {
  if (error instanceof OrganisationSecuritySettingsServiceError) {
    return res.status(error.statusCode).json({
      error: error.error,
      message: error.message,
      ...(error.fieldErrors.length > 0 ? { details: error.fieldErrors } : {}),
    });
  }

  throw error;
}

export async function getOrganisationSecuritySettingsController(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) {
    return;
  }

  try {
    const result = await getOrganisationSecuritySettings(
      actorUserId,
      requiredParam(req, 'organisationId'),
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleOrganisationSecuritySettingsError(error, res);
  }
}

export async function updateOrganisationSecuritySettingsController(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) {
    return;
  }

  try {
    const result = await patchOrganisationSecuritySettings(
      actorUserId,
      requiredParam(req, 'organisationId'),
      req.body,
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleOrganisationSecuritySettingsError(error, res);
  }
}
