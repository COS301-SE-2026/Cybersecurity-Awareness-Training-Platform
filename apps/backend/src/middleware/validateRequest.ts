import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';

type ValidationOptions = {
  statusCode?: 400 | 422;
};

export function validateBody<T>(schema: ZodSchema<T>, options: ValidationOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(options.statusCode ?? 400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    // Attach the validated data to the request object for downstream handlers
    req.body = result.data;
    next();
  };
}

// Helper function to check if an error is a ZodError.. if it is we can handle it in a centralized error handler
export function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        details: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    req.params = result.data as Request['params'];
    return next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid request query parameters',
        details: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    req.query = result.data as Request['query'];
    return next();
  };
}
