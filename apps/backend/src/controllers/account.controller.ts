import type { Request, Response } from 'express';
import {
  changeAccountPassword,
  getAccount,
  listAccountSessionSummaries,
  AccountServiceError,
  patchAccountProfile,
  patchAccountSecurityPreferences,
  requestAccountEmailChange,
  logoutOtherAccountSessions,
  revokeAccountSession,
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

function requireCurrentSessionId(req: Request, res: Response): string | null {
  if (!req.auth?.authSessionId) {
    res.status(401).json({
      error: 'AUTH_REQUIRED',
      message: 'Authentication credentials are required',
    });
    return null;
  }

  return req.auth.authSessionId;
}

function requireSessionParam(req: Request, res: Response): string | null {
  const sessionId = req.params.sessionId;
  if (typeof sessionId !== 'string') {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request parameters',
      details: [
        {
          field: 'sessionId',
          message: 'Invalid session id.',
        },
      ],
    });
    return null;
  }

  return sessionId;
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

export async function changePasswordController(req: Request, res: Response) {
  const userId = requireAccountUserId(req, res);
  if (!userId) {
    return;
  }

  try {
    const result = await changeAccountPassword(userId, req.body);
    return res.status(200).json(result);
  } catch (error) {
    return handleAccountError(error, res);
  }
}

export async function listSessionsController(req: Request, res: Response) {
  const userId = requireAccountUserId(req, res);
  const currentSessionId = requireCurrentSessionId(req, res);
  if (!userId || !currentSessionId) {
    return;
  }

  try {
    const result = await listAccountSessionSummaries(userId, currentSessionId);
    return res.status(200).json(result);
  } catch (error) {
    return handleAccountError(error, res);
  }
}

export async function revokeSessionController(req: Request, res: Response) {
  const userId = requireAccountUserId(req, res);
  const sessionId = requireSessionParam(req, res);
  if (!userId || !sessionId) {
    return;
  }

  try {
    const result = await revokeAccountSession(userId, sessionId);
    return res.status(200).json(result);
  } catch (error) {
    return handleAccountError(error, res);
  }
}

export async function logoutOtherSessionsController(req: Request, res: Response) {
  const userId = requireAccountUserId(req, res);
  const currentSessionId = requireCurrentSessionId(req, res);
  if (!userId || !currentSessionId) {
    return;
  }

  try {
    const result = await logoutOtherAccountSessions(userId, currentSessionId);
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
