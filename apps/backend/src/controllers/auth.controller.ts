import type { Request, Response } from 'express';
import { AuthConflictError, registerUser } from '../services/auth.service.js';

export async function register(req: Request, res: Response) {
  try {
    const response = await registerUser(req.body);
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof AuthConflictError) {
      return res.status(409).json({
        error: 'AUTH_CONFLICT',
        message: error.message,
      });
    }

    throw error; // Let the centralized error handler deal with unexpected errors
  }
}
