import type { Request, Response } from 'express';
import {
  AuthConflictError,
  AuthUnauthorizedError,
  AuthStatusGuardError,
  AuthRefreshTokenReuseError,
  AuthRefreshTokenInvalidError,
  loginUser,
  registerUser,
  getCurrentUser,
  refreshUserToken,
  logoutUser,
  resendVerificationEmail,
} from '../services/auth.service.js';

function getCookie(req: Request, name: string): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split('=').map((c) => c.trim());
    if (cookieName === name) {
      return cookieValue ? decodeURIComponent(cookieValue) : null;
    }
  }
  return null;
}

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

    throw error;
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { response, accessTokenExpiresAt, rawRefreshToken, sessionExpiresAt } = await loginUser({
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.cookie('refreshToken', rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: sessionExpiresAt,
    });

    return res.status(200).json({
      ...response,
      token: response.accessToken,
      tokenType: 'Bearer',
      expiresAt: accessTokenExpiresAt,
      sessionExpiresAt: sessionExpiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof AuthUnauthorizedError) {
      return res.status(401).json({
        error: 'AUTH_INVALID',
        message: error.message,
      });
    }
    if (error instanceof AuthStatusGuardError) {
      return res.status(error.statusCode).json({
        error: error.code,
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

  try {
    const result = await getCurrentUser(req.auth.userId);

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof AuthStatusGuardError) {
      return res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
      });
    }
    if (error instanceof AuthUnauthorizedError) {
      return res.status(401).json({
        error: 'AUTH_INVALID',
        message: error.message,
      });
    }

    throw error;
  }
}

export async function logout(req: Request, res: Response) {
  const refreshToken = getCookie(req, 'refreshToken');

  if (refreshToken) {
    await logoutUser(refreshToken, req.ip, req.headers['user-agent']);
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  return res.status(200).json({ success: true });
}

export async function refresh(req: Request, res: Response) {
  const refreshToken = getCookie(req, 'refreshToken');

  if (!refreshToken) {
    return res.status(401).json({
      error: 'AUTH_REQUIRED',
      message: 'Refresh token is missing',
    });
  }

  try {
    const { response, accessTokenExpiresAt, rawRefreshToken, sessionExpiresAt } =
      await refreshUserToken(refreshToken, req.ip, req.headers['user-agent']);

    res.cookie('refreshToken', rawRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: sessionExpiresAt,
    });

    return res.status(200).json({
      ...response,
      token: response.accessToken,
      tokenType: 'Bearer',
      expiresAt: accessTokenExpiresAt,
      sessionExpiresAt: sessionExpiresAt.toISOString(),
    });
  } catch (error) {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    if (error instanceof AuthRefreshTokenReuseError) {
      return res.status(401).json({
        error: 'TOKEN_REUSE_DETECTED',
        message: 'Refresh token reuse detected',
      });
    }

    if (error instanceof AuthRefreshTokenInvalidError) {
      return res.status(401).json({
        error: 'AUTH_INVALID',
        message: 'Invalid or expired refresh token',
      });
    }

    if (error instanceof AuthStatusGuardError) {
      return res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
      });
    }

    throw error;
  }
}

export async function resendVerification(req: Request, res: Response) {
  await resendVerificationEmail(req.body.email);
  return res.status(200).json({
    message: 'If the email is registered and unverified, a verification link has been sent.',
  });
}
