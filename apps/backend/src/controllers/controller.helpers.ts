import type { Request, Response } from 'express';
import { OrganisationRegistrationRequestError } from '../services/organisation-registration-request.service.js';

export function requireActorUserId(req: Request, res: Response): string | null {
  if (!req.auth?.userId) {
    res.status(401).json({
      error: 'AUTH_REQUIRED',
      message: 'Authentication credentials are required',
    });
    return null;
  }
  return req.auth.userId;
}

export function handleControllerError(error: unknown, res: Response) {
  if (error instanceof OrganisationRegistrationRequestError) {
    return res.status(error.statusCode).json({
      error: error.error,
      message: error.message,
    });
  }
  throw error;
}

export function requiredParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string') {
    throw new OrganisationRegistrationRequestError(
      404,
      'ROUTE_PARAM_MISSING',
      'Route parameter is missing',
    );
  }
  return value;
}
