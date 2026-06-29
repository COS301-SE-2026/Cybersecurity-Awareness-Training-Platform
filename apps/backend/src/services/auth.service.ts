import type {
  AuthLoginRequestDto,
  AuthLoginResponseDto,
  AuthMeResponseDto,
  AuthRegisterRequestDto,
  AuthRegisterResponseDto,
  AuthContextResponseDto,
} from '@insightful-phish/shared';
import type {
  AuthSessionRevokedReason,
} from '../generated/prisma/enums.js';
import { prisma } from '../lib/prisma.js';
import { toPublicUserDto } from '../mappers/user.mapper.js';
import * as UserRepository from '../repositories/user.repository.js';
import { issueActionToken } from './action-token.service.js';
import { requestAuthEmailSend } from './auth-email-hook.service.js';
import { generateAuthToken } from './auth-token.service.js';
import * as PasswordService from './password.service.js';
import {
  ensureUserCanAuthenticate,
} from './auth-status-guard.service.js';
import { resolveSessionPolicy } from './session-policy.service.js';
import { issueAuthSession, revokeSessionById, touchSession } from './auth-session.service.js';
import {
  issueRefreshToken,
  rotateRefreshToken,
  validateRefreshToken,
  revokeRefreshTokensForSession,
} from './refresh-token.service.js';
import { recordUserLogin, recordAuthSessionRevoked } from './auth-audit.service.js';
import { buildAuthContext } from './auth-context.service.js';

const EMAIL_VERIFICATION_TOKEN_TTL_HOURS = 24;

export class AuthConflictError extends Error {
  constructor(message = 'A user with the provided email already exists') {
    super(message);
    this.name = 'AuthConflictError';
  }
}

export class AuthUnauthorizedError extends Error {
  constructor(message = 'Invalid email or password') {
    super(message);
    this.name = 'AuthUnauthorizedError';
  }
}

export async function registerUser(
  input: AuthRegisterRequestDto,
): Promise<AuthRegisterResponseDto> {
  const existingUser = await UserRepository.findUserByEmail(input.email);

  if (existingUser) {
    throw new AuthConflictError();
  }

  const passwordHash = await PasswordService.hashPassword(input.password);

  const { newUser, verification } = await prisma.$transaction(async (tx) => {
    const createdUser = await UserRepository.createGeneralTraineeUser(
      {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash,
      },
      tx,
    );

    const verificationToken = await issueActionToken(
      {
        purpose: 'EMAIL_VERIFICATION',
        userId: createdUser.id,
        targetEmail: createdUser.email,
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000),
      },
      tx,
    );

    return {
      newUser: createdUser,
      verification: verificationToken,
    };
  });

  const emailResult = await requestAuthEmailSend({
    emailType: 'EMAIL_VERIFICATION',
    recipientEmail: newUser.email,
    userId: newUser.id,
    actionTokenId: verification.token.id,
    templateData: {
      actionToken: verification.rawToken,
    },
  });

  return {
    user: toPublicUserDto(newUser),
    verificationEmailQueued: emailResult.queued,
  };
}

export class AuthStatusGuardError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthStatusGuardError';
  }
}

export class AuthRefreshTokenReuseError extends Error {
  constructor(message = 'Refresh token reuse detected') {
    super(message);
    this.name = 'AuthRefreshTokenReuseError';
  }
}

export class AuthRefreshTokenInvalidError extends Error {
  constructor(message = 'Invalid or expired refresh token') {
    super(message);
    this.name = 'AuthRefreshTokenInvalidError';
  }
}

const PLATFORM_SESSION_POLICY = {
  regularSessionSeconds: 900,
  rememberedSessionSeconds: 604800,
  idleTimeoutMinutes: 30,
  allowRememberMe: true,
};

export async function loginUser(
  input: AuthLoginRequestDto & { ipAddress?: string | null; userAgent?: string | null },
): Promise<{ response: AuthLoginResponseDto; rawRefreshToken: string; sessionExpiresAt: Date }> {
  const user = await UserRepository.findUserByEmail(input.email.trim().toLowerCase());

  if (!user) {
    throw new AuthUnauthorizedError();
  }

  const passwordMatches = await PasswordService.verifyPassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AuthUnauthorizedError();
  }

  const subject = await UserRepository.findAuthSubjectByUserId(user.id);
  const guardResult = ensureUserCanAuthenticate(subject);
  if (!guardResult.allowed) {
    throw new AuthStatusGuardError(guardResult.code, guardResult.statusCode, guardResult.message);
  }

  const policy = resolveSessionPolicy({
    rememberMeRequested: !!input.rememberMe,
    platform: PLATFORM_SESSION_POLICY,
  });

  const session = await issueAuthSession({
    userId: user.id,
    rememberMe: policy.rememberMeApplied,
    expiresAt: new Date(Date.now() + policy.effectiveSessionSeconds * 1000),
    idleTimeoutMinutes: policy.idleTimeoutMinutes,
    userAgent: input.userAgent ?? null,
    ipAddress: input.ipAddress ?? null,
  });

  const refreshResult = await issueRefreshToken({
    authSessionId: session.id,
    expiresAt: session.expiresAt,
  });

  await recordUserLogin({
    userId: user.id,
    actorType: user.userType,
    authSessionId: session.id,
    metadata: {
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });

  const userWithAuthSubject = await UserRepository.findUserWithAuthSubjectById(user.id);
  const publicUser = toPublicUserDto(userWithAuthSubject || user);
  const authContext = buildAuthContext(subject);
  const accessToken = generateAuthToken(user.id, session.id).token;

  return {
    response: {
      accessToken,
      user: publicUser,
      context: authContext,
      permissions: authContext.permissions,
      redirectTo: authContext.redirectTo,
    },
    rawRefreshToken: refreshResult.rawToken,
    sessionExpiresAt: session.expiresAt,
  };
}

export async function getCurrentUser(userId: string): Promise<AuthMeResponseDto> {
  const userWithAuthSubject = await UserRepository.findUserWithAuthSubjectById(userId);

  if (!userWithAuthSubject) {
    throw new AuthUnauthorizedError('User account was not found');
  }

  const subject = UserRepository.toGuardAuthSubject(userWithAuthSubject);

  const guardResult = ensureUserCanAuthenticate(subject);
  if (!guardResult.allowed) {
    throw new AuthStatusGuardError(guardResult.code, guardResult.statusCode, guardResult.message);
  }

  const publicUser = toPublicUserDto(userWithAuthSubject);
  const authContext = buildAuthContext(subject);

  return {
    user: publicUser,
    context: authContext,
    permissions: authContext.permissions,
    redirectTo: authContext.redirectTo,
  };
}

export async function refreshUserToken(
  rawToken: string,
  ipAddress?: string | null,
  userAgent?: string | null,
): Promise<{ response: AuthContextResponseDto; rawRefreshToken: string; sessionExpiresAt: Date }> {
  if (!rawToken) {
    throw new AuthRefreshTokenInvalidError('Refresh token is required');
  }

  const valid = await validateRefreshToken({ rawToken, ipAddress, userAgent });
  if (valid.state === 'REUSE_DETECTED') {
    throw new AuthRefreshTokenReuseError();
  }
  if (valid.state !== 'VALID' || !valid.token) {
    throw new AuthRefreshTokenInvalidError();
  }

  const token = valid.token;

  const subject = await UserRepository.findAuthSubjectByUserId(token.authSession.userId);
  const guardResult = ensureUserCanAuthenticate(subject);
  if (!guardResult.allowed) {
    let sessionReason: AuthSessionRevokedReason = 'OTHER';

    if (guardResult.code === 'USER_DISABLED') {
      sessionReason = 'ADMIN_DISABLED';
    } else if (guardResult.code === 'ORGANISATION_SUSPENDED') {
      sessionReason = 'ORGANISATION_SUSPENDED';
    }

    await revokeSessionById({ sessionId: token.authSessionId, reason: sessionReason });
    await revokeRefreshTokensForSession({
      authSessionId: token.authSessionId,
      reason: 'OTHER',
    });
    throw new AuthStatusGuardError(guardResult.code, guardResult.statusCode, guardResult.message);
  }

  await touchSession(token.authSessionId);

  const rotationResult = await rotateRefreshToken({
    rawToken,
    nextExpiresAt: token.authSession.expiresAt,
    ipAddress,
    userAgent,
  });

  if (rotationResult.state === 'REUSE_DETECTED') {
    throw new AuthRefreshTokenReuseError();
  }
  if (rotationResult.state !== 'ROTATED' || !rotationResult.rawToken) {
    throw new AuthRefreshTokenInvalidError();
  }

  const accessToken = generateAuthToken(token.authSession.userId, token.authSessionId).token;
  const publicUser = toPublicUserDto(token.authSession.user);
  const authContext = buildAuthContext(subject);

  return {
    response: {
      accessToken,
      user: publicUser,
      context: authContext,
      permissions: authContext.permissions,
      redirectTo: authContext.redirectTo,
    },
    rawRefreshToken: rotationResult.rawToken,
    sessionExpiresAt: token.authSession.expiresAt,
  };
}

export async function logoutUser(
  rawToken: string,
  ipAddress?: string | null,
  userAgent?: string | null,
): Promise<void> {
  if (!rawToken) {
    return;
  }

  const valid = await validateRefreshToken({ rawToken });
  if (valid.state === 'VALID' && valid.token) {
    const token = valid.token;
    await revokeSessionById({ sessionId: token.authSessionId, reason: 'LOGOUT' });
    await revokeRefreshTokensForSession({ authSessionId: token.authSessionId, reason: 'LOGOUT' });

    await recordAuthSessionRevoked({
      actorUserId: token.authSession.userId,
      actorType: token.authSession.user.userType,
      authSessionId: token.authSessionId,
      reason: 'LOGOUT',
      metadata: { ipAddress, userAgent },
    });
  }
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await UserRepository.findUserByEmail(normalizedEmail);

  if (user?.authStatus !== 'PENDING_EMAIL_VERIFICATION') {
    return;
  }

  const { verification } = await prisma.$transaction(async (tx) => {
    const verificationToken = await issueActionToken(
      {
        purpose: 'EMAIL_VERIFICATION',
        userId: user.id,
        targetEmail: user.email,
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000),
      },
      tx,
    );

    return { verification: verificationToken };
  });

  await requestAuthEmailSend({
    emailType: 'EMAIL_VERIFICATION',
    recipientEmail: user.email,
    userId: user.id,
    actionTokenId: verification.token.id,
    templateData: {
      actionToken: verification.rawToken,
    },
  });
}
