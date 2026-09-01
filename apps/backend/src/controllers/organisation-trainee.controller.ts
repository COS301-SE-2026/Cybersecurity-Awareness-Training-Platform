import type { Request, Response } from 'express';
import { OrganisationAdminServiceError } from '../services/organisation-admin.service.js';
import {
  createOrganisationTraineeInvitation,
  disableOrganisationTrainee,
  listOrganisationTrainees,
  OrganisationTraineeServiceError,
  reenableOrganisationTrainee,
  resendTraineeInvitation,
  revokeTraineeInvitation,
} from '../services/organisation-trainee.service.js';

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

function handleOrganisationTraineeError(error: unknown, res: Response) {
  if (
    error instanceof OrganisationTraineeServiceError ||
    error instanceof OrganisationAdminServiceError
  ) {
    return res.status(error.statusCode).json({
      error: error.error,
      message: error.message,
    });
  }

  throw error;
}

function requiredParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string') {
    throw new OrganisationTraineeServiceError(
      404,
      'ROUTE_PARAM_MISSING',
      'Route parameter is missing',
    );
  }

  return value;
}

export async function getOrganisationTrainees(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) {
    return;
  }

  try {
    const result = await listOrganisationTrainees(
      actorUserId,
      requiredParam(req, 'organisationId'),
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleOrganisationTraineeError(error, res);
  }
}

export async function createTraineeInvitation(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) {
    return;
  }

  try {
    const result = await createOrganisationTraineeInvitation(
      actorUserId,
      requiredParam(req, 'organisationId'),
      req.body,
    );
    return res.status(201).json(result);
  } catch (error) {
    return handleOrganisationTraineeError(error, res);
  }
}

export async function resendInvitation(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) {
    return;
  }

  try {
    const result = await resendTraineeInvitation(
      actorUserId,
      requiredParam(req, 'organisationId'),
      requiredParam(req, 'invitationId'),
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleOrganisationTraineeError(error, res);
  }
}

export async function revokeInvitation(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) {
    return;
  }

  try {
    const result = await revokeTraineeInvitation(
      actorUserId,
      requiredParam(req, 'organisationId'),
      requiredParam(req, 'invitationId'),
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleOrganisationTraineeError(error, res);
  }
}

export async function disableTrainee(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) {
    return;
  }

  try {
    const result = await disableOrganisationTrainee(
      actorUserId,
      requiredParam(req, 'organisationId'),
      requiredParam(req, 'traineeId'),
      req.body,
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleOrganisationTraineeError(error, res);
  }
}

export async function reenableTrainee(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) {
    return;
  }

  try {
    const result = await reenableOrganisationTrainee(
      actorUserId,
      requiredParam(req, 'organisationId'),
      requiredParam(req, 'traineeId'),
      req.body,
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleOrganisationTraineeError(error, res);
  }
}
