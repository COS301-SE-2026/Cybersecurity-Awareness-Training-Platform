import type { Request, Response } from 'express';
import {
  changeAdminPermissions,
  createAdminPromotion,
  getOrganisationAdmins,
  getOrganisationInformation as getOrganisationInformationService,
  OrganisationAdminServiceError,
  removeAdmin,
} from '../services/organisation-admin.service.js';
import { OrganisationScopeServiceError } from '../services/organisation-scope.service.js';

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

function handleOrganisationAdminError(error: unknown, res: Response) {
  if (error instanceof OrganisationAdminServiceError) {
    return res.status(error.statusCode).json({
      error: error.error,
      message: error.message,
    });
  }

  if (error instanceof OrganisationScopeServiceError) {
    return res.status(error.statusCode).json({
      error: error.error,
      message: error.message,
    });
  }

  throw error;
}

function requiredParam(req: Request, name: string) {
  const value = req.params[name];
  if (typeof value !== 'string') {
    throw new OrganisationAdminServiceError(
      404,
      'ROUTE_PARAM_MISSING',
      'Route parameter is missing',
    );
  }

  return value;
}

export async function getOrganisationInformation(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) {
    return;
  }

  try {
    const result = await getOrganisationInformationService(
      actorUserId,
      requiredParam(req, 'organisationId'),
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleOrganisationAdminError(error, res);
  }
}

export async function listOrganisationAdmins(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) {
    return;
  }

  try {
    const result = await getOrganisationAdmins(actorUserId, requiredParam(req, 'organisationId'));
    return res.status(200).json(result);
  } catch (error) {
    return handleOrganisationAdminError(error, res);
  }
}

export async function promoteOrganisationAdmin(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) {
    return;
  }

  try {
    const result = await createAdminPromotion(
      actorUserId,
      requiredParam(req, 'organisationId'),
      req.body,
    );
    return res.status(201).json(result);
  } catch (error) {
    return handleOrganisationAdminError(error, res);
  }
}

export async function updateOrganisationAdminPermissions(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) {
    return;
  }

  try {
    const result = await changeAdminPermissions(
      actorUserId,
      requiredParam(req, 'organisationId'),
      requiredParam(req, 'adminId'),
      req.body,
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleOrganisationAdminError(error, res);
  }
}

export async function removeOrganisationAdmin(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) {
    return;
  }

  try {
    const result = await removeAdmin(
      actorUserId,
      requiredParam(req, 'organisationId'),
      requiredParam(req, 'adminId'),
      req.body,
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleOrganisationAdminError(error, res);
  }
}
