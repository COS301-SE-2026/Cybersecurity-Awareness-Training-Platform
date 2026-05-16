import type { Request, Response } from 'express';
import {
  AuthConflictError,
  AuthUnauthorizedError,
  loginUser,
  registerUser,
} from '../services/auth.service.js';

export async function register(req: Request, res: Response) {
  try {
    const response = await registerUser(req.body);
    return res.status(201).json(response);
  } catch (error) {
    if (error instanceof AuthConflictError) {
      return res.status(409).json({
        error: 'AUTH_EMAIL_EXISTS',
        message: error.message,
      });
    }

    throw error; // Let the centralized error handler deal with unexpected errors
  }
}

export async function login(req: Request, res: Response) {
  try {
    const response = await loginUser(req.body);
    return res.status(200).json(response);
  } catch (error) {
    if (error instanceof AuthUnauthorizedError) {
      return res.status(401).json({
        error: 'AUTH_INVALID',
        message: error.message,
      });
    }

    throw error;
  }
}

export async function getMe(req: Request, res: Response) {
  if (!req.auth) {
    return res.status(401).json({
      error: 'AUTH_REQUIRED',
      message: 'Authentication credentials are required',
    });
  }

  return res.status(200).json({
    user: req.auth.user,
  });
}
