import type {
  CreateEmailProviderProfileRequestDto,
  UpdateEmailProviderProfileRequestDto,
} from '@insightful-phish/shared';
import type { Request, Response } from 'express';
import {
  EmailProviderProfileServiceError,
  OrganisationScopeServiceError,
  checkEmailProviderProfileConnection,
  createEmailProviderProfile,
  getEmailProviderProfile,
  listEmailProviderProfiles,
  removeEmailProviderProfile,
  updateEmailProviderProfile,
} from '../services/email-provider-profile.service.js';

function requireActorUserId(req: Request, res: Response): string | null {
  if (req.auth?.userId === undefined) {
    res
      .status(401)
      .json({ error: 'AUTH_REQUIRED', message: 'Authentication credentials are required' });
    return null;
  }
  return req.auth.userId;
}
function requiredParam(req: Request, name: string): string {
  const value = req.params[name];

  if (typeof value !== 'string') {
    throw new EmailProviderProfileServiceError(
      404,
      'ROUTE_PARAM_MISSING',
      'Route parameter is missing',
    );
  }
  return value;
}
function handleEmailProviderProfileError(error: unknown, res: Response) {
  if (error instanceof EmailProviderProfileServiceError) {
    return res.status(error.statusCode).json({ error: error.error, message: error.message });
  }

  if (error instanceof OrganisationScopeServiceError) {
    return res.status(error.statusCode).json({ error: error.error, message: error.message });
  }
  throw error;
}
export async function listEmailProviderProfilesController(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (actorUserId === null) {
    return;
  }

  try {
    const result = await listEmailProviderProfiles(
      actorUserId,
      requiredParam(req, 'organisationId'),
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleEmailProviderProfileError(error, res);
  }
}
export async function createEmailProviderProfileController(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (actorUserId === null) {
    return;
  }

  try {
    const result = await createEmailProviderProfile(
      actorUserId,
      requiredParam(req, 'organisationId'),
      req.body as CreateEmailProviderProfileRequestDto,
    );
    return res.status(201).json(result);
  } catch (error) {
    return handleEmailProviderProfileError(error, res);
  }
}
export async function getEmailProviderProfileController(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (actorUserId === null) {
    return;
  }

  try {
    const result = await getEmailProviderProfile(
      actorUserId,
      requiredParam(req, 'organisationId'),
      requiredParam(req, 'profileId'),
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleEmailProviderProfileError(error, res);
  }
}
export async function updateEmailProviderProfileController(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (actorUserId === null) {
    return;
  }

  try {
    const result = await updateEmailProviderProfile(
      actorUserId,
      requiredParam(req, 'organisationId'),
      requiredParam(req, 'profileId'),
      req.body as UpdateEmailProviderProfileRequestDto,
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleEmailProviderProfileError(error, res);
  }
}
export async function checkEmailProviderProfileConnectionController(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (actorUserId === null) {
    return;
  }

  try {
    const result = await checkEmailProviderProfileConnection(
      actorUserId,
      requiredParam(req, 'organisationId'),
      requiredParam(req, 'profileId'),
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleEmailProviderProfileError(error, res);
  }
}
export async function removeEmailProviderProfileController(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (actorUserId === null) {
    return;
  }

  try {
    await removeEmailProviderProfile(
      actorUserId,
      requiredParam(req, 'organisationId'),
      requiredParam(req, 'profileId'),
    );
    return res.status(204).send();
  } catch (error) {
    return handleEmailProviderProfileError(error, res);
  }
}
