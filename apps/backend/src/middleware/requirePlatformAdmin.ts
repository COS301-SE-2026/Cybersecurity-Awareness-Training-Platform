import type { NextFunction, Request, Response } from 'express';

export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    return res.status(401).json({
      error: 'AUTH_REQUIRED',
      message: 'Authentication credentials are required',
    });
  }

  if (req.auth.user.userType !== 'IP_ADMIN') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Platform admin access is required',
    });
  }

  next();
}
