import type { Request, Response, NextFunction } from 'express';

function resolveErrorStatus(errObj: Record<string, unknown>): number {
  if (typeof errObj.status === 'number') {
    return errObj.status;
  }
  if (typeof errObj.statusCode === 'number') {
    return errObj.statusCode;
  }
  return 500;
}

function resolveErrorMessage(errObj: Record<string, unknown>, isInternalError: boolean): string {
  if (isInternalError) {
    return 'An unexpected error occurred';
  }
  if (typeof errObj.message === 'string' && errObj.message) {
    return errObj.message;
  }
  return 'An unexpected error occurred';
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  // If response headers have already been sent, delegate to Express default error handler
  if (res.headersSent) {
    return next(err);
  }

  const errObj = typeof err === 'object' && err !== null ? (err as Record<string, unknown>) : {};
  const status = resolveErrorStatus(errObj);
  const errorKey = typeof errObj.error === 'string' ? errObj.error : 'INTERNAL_SERVER_ERROR';

  const isInternalError = status >= 500;
  const message = resolveErrorMessage(errObj, isInternalError);

  // Log unexpected internal errors (500s) for observability
  if (status >= 500) {
    console.error(`[Unhandled Error] ${status} - ${errorKey}:`, err);
  }

  return res.status(status).json({
    error: errorKey,
    message,
  });
}
