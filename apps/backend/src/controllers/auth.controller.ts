import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import {
  AuthUnauthorizedError,
  AuthStatusGuardError,
  AuthRefreshTokenReuseError,
  AuthRefreshTokenInvalidError,
  AuthResetPasswordError,
  loginUser,
  registerUser,
  getCurrentUser,
  refreshUserToken,
  logoutUser,
  resendVerificationEmail,
  verifyEmail,
  AuthResendCooldownError,
  requestPasswordReset,
  resetUserPassword,
} from '../services/auth.service.js';
import {
  getTokenContext,
  resendActionToken,
  TokenResendError,
} from '../services/action-token.service.js';

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
  const response = await registerUser(req.body);
  return res.status(201).json(response);
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
      secure: env.AUTH_COOKIE_SECURE,
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
    secure: env.AUTH_COOKIE_SECURE,
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
      secure: env.AUTH_COOKIE_SECURE,
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
      secure: env.AUTH_COOKIE_SECURE,
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
  try {
    await resendVerificationEmail(req.body.email);
    return res.status(200).json({
      message:
        'If the email is registered and unverified, a verification link has been queued for delivery.',
    });
  } catch (error) {
    if (error instanceof AuthResendCooldownError) {
      return res.status(429).json({
        error: 'AUTH_RATE_LIMITED',
        message: error.message,
      });
    }
    throw error;
  }
}

export async function verify(req: Request, res: Response) {
  const result = await verifyEmail(req.body.token);
  return res.status(200).json(result);
}

export async function forgotPassword(req: Request, res: Response) {
  await requestPasswordReset(req.body.email);
  return res.status(200).json({
    message: 'If the email is registered, a password reset link has been queued for delivery.',
  });
}

export async function resetPassword(req: Request, res: Response) {
  try {
    await resetUserPassword(
      req.body.token,
      req.body.newPassword,
      req.ip,
      req.headers['user-agent'],
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof AuthResetPasswordError) {
      return res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
      });
    }
    throw error;
  }
}

export async function validateTokenContext(req: Request, res: Response) {
  const token = req.params.token;
  if (Array.isArray(token)) {
    return res
      .status(400)
      .json({ error: 'VALIDATION_ERROR', message: 'Invalid request parameters' });
  }
  const result = await getTokenContext(token);
  return res.status(200).json(result);
}

export async function resendTokenLink(req: Request, res: Response) {
  const token = req.params.token;
  if (Array.isArray(token)) {
    return res
      .status(400)
      .json({ error: 'VALIDATION_ERROR', message: 'Invalid request parameters' });
  }

  try {
    await resendActionToken(token);
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof TokenResendError) {
      if (error.statusCode === 429) {
        return res.status(429).json({
          error: error.code,
          message: error.message,
          cooldownSeconds: error.cooldownSeconds,
        });
      }
      return res.status(error.statusCode).json({
        error: error.code,
        message: error.message,
      });
    }
    throw error;
  }
}
