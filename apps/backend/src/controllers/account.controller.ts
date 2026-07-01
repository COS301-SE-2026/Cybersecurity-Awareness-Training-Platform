import type { Request, Response } from 'express';
import { verifyEmailChange, EmailChangeConflictError } from '../services/auth.service.js';

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
