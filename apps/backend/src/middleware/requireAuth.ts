import type { NextFunction, Request, Response } from 'express';
import { getCurrentUser } from '../services/auth.service.js';
import { verifyAuthToken } from '../services/auth-token.service.js';

function extractBearerToken(authorizationHeader: string | undefined) {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req.header('authorization'));

  if (!token) {
    return res.status(401).json({
      error: 'AUTH_REQUIRED',
      message: 'Authentication credentials are required',
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
    const currentUser = await getCurrentUser(payload.userId);

    req.auth = {
      userId: payload.userId,
      user: currentUser.user,
    };

    return next();
  } catch {
    return res.status(401).json({
      error: 'AUTH_INVALID',
      message: 'Invalid authentication credentials',
    });
  }
}
