import type { Request, Response } from 'express';
import {
  acceptInvitationWithToken,
  getInvitationTokenContext,
  rejectInvitationWithToken,
  InvitationFlowError,
} from '../services/invitation.service.js';

function extractTokenParam(req: Request): string {
  const token = req.params.token;
  if (typeof token === 'string' && token.trim().length > 0) {
    return token;
  }
  throw new InvitationFlowError(400, 'TOKEN_INVALID', 'Invitation token parameter is required.');
}

export async function getInvitationContext(req: Request, res: Response) {
  try {
    const token = extractTokenParam(req);
    const authEmail = req.auth?.user.email;
    const response = await getInvitationTokenContext(token, authEmail);
    return res.status(200).json(response);
  } catch (error) {
    if (error instanceof InvitationFlowError) {
      return res.status(error.statusCode).json({
        error: error.errorKey,
        message: error.message,
      });
    }
    throw error;
  }
}

export async function acceptInvitation(req: Request, res: Response) {
  try {
    const token = extractTokenParam(req);
    const authEmail = req.auth?.user.email;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.header('user-agent');
    const response = await acceptInvitationWithToken(
      token,
      req.body,
      authEmail,
      ipAddress,
      userAgent,
    );
    return res.status(200).json(response);
  } catch (error) {
    if (error instanceof InvitationFlowError) {
      return res.status(error.statusCode).json({
        error: error.errorKey,
        message: error.message,
      });
    }
    throw error;
  }
}

export async function rejectInvitation(req: Request, res: Response) {
  try {
    const token = extractTokenParam(req);
    const authEmail = req.auth?.user.email;
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.header('user-agent');
    const response = await rejectInvitationWithToken(
      token,
      req.body,
      authEmail,
      ipAddress,
      userAgent,
    );
    return res.status(200).json(response);
  } catch (error) {
    if (error instanceof InvitationFlowError) {
      return res.status(error.statusCode).json({
        error: error.errorKey,
        message: error.message,
      });
    }
    throw error;
  }
}
