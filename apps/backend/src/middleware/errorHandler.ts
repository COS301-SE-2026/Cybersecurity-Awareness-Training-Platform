import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  // If response headers have already been sent, delegate to Express default error handler
  if (res.headersSent) {
    return next(err);
  }

  const errObj = typeof err === 'object' && err !== null ? (err as Record<string, unknown>) : {};
  const status =
    typeof errObj.status === 'number'
      ? errObj.status
      : typeof errObj.statusCode === 'number'
        ? errObj.statusCode
        : 500;
  const errorKey = typeof errObj.error === 'string' ? errObj.error : 'INTERNAL_SERVER_ERROR';

  const isInternalError = status >= 500;
  const message = isInternalError
    ? 'An unexpected error occurred'
    : typeof errObj.message === 'string' && errObj.message
      ? errObj.message
      : 'An unexpected error occurred';

  // Log unexpected internal errors (500s) for observability
  if (status >= 500) {
    console.error(`[Unhandled Error] ${status} - ${errorKey}:`, err);
  }

  return res.status(status).json({
    error: errorKey,
    message,
  });
}
