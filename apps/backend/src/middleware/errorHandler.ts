import type { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) {
  // If response headers have already been sent, delegate to Express default error handler
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || err.statusCode || 500;
  const errorKey = err.error || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';

  // Log unexpected internal errors (500s) for observability
  if (status >= 500) {
    console.error(`[Unhandled Error] ${status} - ${errorKey}:`, err);
  }

  return res.status(status).json({
    error: errorKey,
    message,
  });
}
