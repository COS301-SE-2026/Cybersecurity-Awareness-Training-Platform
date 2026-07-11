import type { Request, Response } from 'express';
import { getInvitationTokenContext } from '../services/invitation-context.service.js';

export async function getInvitationContext(req: Request, res: Response) {
  const token = req.params.token;
  if (typeof token !== 'string') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request parameters',
    });
  }
  return res.status(200).json(await getInvitationTokenContext(token));
}
