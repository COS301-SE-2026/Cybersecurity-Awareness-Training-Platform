import type { NextFunction, Request, Response } from 'express';
import { getCurrentUser } from '../services/auth.service.js';
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
 * If missing or invalid, proceeds without setting `req.auth` so invitation context checks can run publicly or enforce rules conditionally.
 */
export async function extractInvitationAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req.header('authorization'));

  if (!token) {
    req.auth = undefined;
    return next();
  }

  const payload = verifyAuthToken(token);

  if (!payload) {
    req.auth = undefined;
    return next();
  }

  try {
    const sessionResult = await validateAuthSession({ sessionId: payload.authSessionId });

    if (sessionResult.state !== 'ACTIVE' || sessionResult.session?.userId !== payload.userId) {
      req.auth = undefined;
      return next();
    }

    const currentUser = await getCurrentUser(payload.userId);

    req.auth = {
      userId: payload.userId,
      user: currentUser.user,
    };

    return next();
  } catch {
    req.auth = undefined;
    return next();
  }
}
