import type { NextFunction, Request, Response } from 'express';
import { getCurrentUser, AuthStatusGuardError } from '../services/auth.service.js';
import { verifyAuthToken } from '../services/auth-token.service.js';
import { validateAuthSession } from '../services/auth-session.service.js';

function extractBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

/**
 * Middleware that extracts optional authentication context from Bearer token.
 * If present and valid, attaches `req.auth`.
 * If missing entirely, proceeds without setting `req.auth` so invitation context checks can run publicly.
 * If an Authorization header is supplied but invalid, returns standard authentication errors.
 */
export async function extractInvitationAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header('authorization');

  if (!authHeader) {
    req.auth = undefined;
    return next();
  }

  const token = extractBearerToken(authHeader);

  if (!token) {
    return res.status(401).json({
      error: 'AUTH_INVALID',
      message: 'Invalid authentication credentials',
    });
  }

  const payload = verifyAuthToken(token);

  if (!payload) {
    return res.status(401).json({
      error: 'AUTH_INVALID',
      message: 'Invalid authentication credentials',
    });
  }

  try {
    const sessionResult = await validateAuthSession({ sessionId: payload.authSessionId });

    if (sessionResult.state !== 'ACTIVE' || sessionResult.session?.userId !== payload.userId) {
      return res.status(401).json({
        error: 'AUTH_INVALID',
        message: 'Invalid authentication credentials',
      });
    }

    const currentUser = await getCurrentUser(payload.userId);

    req.auth = {
      userId: payload.userId,
      user: currentUser.user,
    };

    return next();
  } catch (error) {
    if (error instanceof AuthStatusGuardError) {
      return res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
      });
    }

    return res.status(401).json({
      error: 'AUTH_INVALID',
      message: 'Invalid authentication credentials',
    });
  }
}
