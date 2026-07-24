import type { Request, Response } from 'express';
import {
  getAccount,
  AccountServiceError,
  patchAccountProfile,
  patchAccountSecurityPreferences,
  requestAccountEmailChange,
} from '../services/account.service.js';
import { verifyEmailChange, EmailChangeConflictError } from '../services/auth.service.js';

function requireAccountUserId(req: Request, res: Response): string | null {
  if (!req.auth?.userId) {
    res.status(401).json({
      error: 'AUTH_REQUIRED',
      message: 'Authentication credentials are required',
    });
    return null;
  }

  return req.auth.userId;
}

function handleAccountError(error: unknown, res: Response) {
  if (error instanceof AccountServiceError) {
    return res.status(error.statusCode).json({
      error: error.error,
      message: error.message,
      ...(error.fieldErrors.length > 0 ? { details: error.fieldErrors } : {}),
    });
  }

  throw error;
}

export async function getAccountController(req: Request, res: Response) {
  const userId = requireAccountUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const result = await getAccount(userId);
    return res.status(200).json(result);
  } catch (error) {
    return handleAccountError(error, res);
  }
}

export async function updateAccountProfileController(req: Request, res: Response) {
  const userId = requireAccountUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const result = await patchAccountProfile(userId, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return handleAccountError(error, res);
  }
}

export async function requestEmailChangeController(req: Request, res: Response) {
  const userId = requireAccountUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const result = await requestAccountEmailChange(userId, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return handleAccountError(error, res);
  }
}

export async function updateAccountSecurityPreferencesController(req: Request, res: Response) {
  const userId = requireAccountUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const result = await patchAccountSecurityPreferences(userId, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return handleAccountError(error, res);
  }
}

export async function verifyChange(req: Request, res: Response) {
  try {
    const result = await verifyEmailChange(req.body.token);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof EmailChangeConflictError) {
      return res.status(409).json({
        error: 'AUTH_EMAIL_EXISTS',
        message: error.message,
      });
    }
    throw error;
  }
}
