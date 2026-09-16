import type { Request, Response } from 'express';
import type {
  ListOrganisationEmailsQuery,
  OrganisationEmailDraftInput,
} from '@insightful-phish/shared';
import {
  OrganisationEmailServiceError,
  OrganisationScopeServiceError,
  activateOrganisationEmail,
  copyOrganisationEmail,
  getOrganisationEmail,
  getOrganisationEmails,
  registerOrganisationEmail,
  updateOrganisationEmail,
} from '../services/organisation-email.service.js';

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

function requiredParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string') {
    throw new OrganisationEmailServiceError(
      404,
      'ROUTE_PARAM_MISSING',
      'Route parameter is missing',
    );
  }
  return value;
}

function handleOrganisationEmailError(error: unknown, res: Response) {
  if (error instanceof OrganisationEmailServiceError) {
    return res.status(error.statusCode).json({
      error: error.error,
      message: error.message,
      ...(error.issues.length > 0 ? { details: error.issues } : {}),
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

export async function listOrganisationEmailsController(req: Request, res: Response) {
  const userId = requireActorUserId(req, res);
  if (!userId) return;

  try {
    const result = await getOrganisationEmails(
      userId,
      requiredParam(req, 'organisationId'),
      req.query as unknown as ListOrganisationEmailsQuery,
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleOrganisationEmailError(error, res);
  }
}

export async function createOrganisationEmailController(req: Request, res: Response) {
  const userId = requireActorUserId(req, res);
  if (!userId) return;

  try {
    const result = await registerOrganisationEmail(
      userId,
      requiredParam(req, 'organisationId'),
      req.body as OrganisationEmailDraftInput,
    );
    return res.status(result.reused ? 200 : 201).json(result);
  } catch (error) {
    return handleOrganisationEmailError(error, res);
  }
}

export async function getOrganisationEmailController(req: Request, res: Response) {
  const userId = requireActorUserId(req, res);
  if (!userId) return;

  try {
    const result = await getOrganisationEmail(
      userId,
      requiredParam(req, 'organisationId'),
      requiredParam(req, 'emailId'),
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleOrganisationEmailError(error, res);
  }
}

export async function updateOrganisationEmailController(req: Request, res: Response) {
  const userId = requireActorUserId(req, res);
  if (!userId) return;

  try {
    const result = await updateOrganisationEmail(
      userId,
      requiredParam(req, 'organisationId'),
      requiredParam(req, 'emailId'),
      req.body as OrganisationEmailDraftInput,
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleOrganisationEmailError(error, res);
  }
}

export async function activateOrganisationEmailController(req: Request, res: Response) {
  const userId = requireActorUserId(req, res);
  if (!userId) return;

  try {
    const result = await activateOrganisationEmail(
      userId,
      requiredParam(req, 'organisationId'),
      requiredParam(req, 'emailId'),
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleOrganisationEmailError(error, res);
  }
}

export async function copyOrganisationEmailController(req: Request, res: Response) {
  const userId = requireActorUserId(req, res);
  if (!userId) return;

  try {
    const result = await copyOrganisationEmail(
      userId,
      requiredParam(req, 'organisationId'),
      requiredParam(req, 'emailId'),
    );
    return res.status(201).json(result);
  } catch (error) {
    return handleOrganisationEmailError(error, res);
  }
}
