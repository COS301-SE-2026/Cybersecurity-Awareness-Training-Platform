import type { Request, Response } from 'express';
import {
  completeSetupWithToken,
  getSetupTokenContext,
  SetupFlowError,
} from '../services/setup.service.js';

export async function getSetupContext(req: Request, res: Response) {
  try {
    const response = await getSetupTokenContext(req.params.token);
    return res.status(200).json(response);
  } catch (error) {
    if (error instanceof SetupFlowError) {
      return res.status(error.statusCode).json()({
        error: error.error,
        message: error.message,
      });
    }
    throw error;
  }
}

export async function completeSetup(req: Request, res: Response) {
  try {
    const response = await completeSetupWithToken(req.params.token, req.body);
    return res.status(201).json(response);
  } catch (error) {
    if (error instanceof SetupFlowError) {
      return res.status(error.statusCode).json({
        error: error.error,
        message: error.message,
      });
    }
    throw error;
  }
}
