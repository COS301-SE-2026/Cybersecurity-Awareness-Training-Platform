import type {
  AuthLoginRequestDto,
  AuthLoginResponseDto,
  AuthMeResponseDto,
  AuthRegisterRequestDto,
  AuthRegisterResponseDto,
  AuthContextResponseDto,
  PublicUserDto,
} from '@insightful-phish/shared';
import type { AuthSessionRevokedReason } from '../generated/prisma/enums.js';
import { prisma } from '../lib/prisma.js';
import { toPublicUserDto } from '../mappers/user.mapper.js';
import * as UserRepository from '../repositories/user.repository.js';
import { issueActionToken, validateActionToken } from './action-token.service.js';
import { recordAuditLog } from './audit-log.service.js';
import { requestAuthEmailSend } from './auth-email-hook.service.js';
import { generateAuthToken } from './auth-token.service.js';
import * as PasswordService from './password.service.js';
import { ensureUserCanAuthenticate } from './auth-status-guard.service.js';
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

export class AuthResetPasswordError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AuthResetPasswordError';
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
      firstName: newUser.firstName,
      actionToken: verification.rawToken,
      actionTokenExpiresAt: verification.token.expiresAt,
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
): Promise<{
  response: AuthLoginResponseDto;
  accessTokenExpiresAt: string;
  rawRefreshToken: string;
  sessionExpiresAt: Date;
}> {
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
  const tokenResult = generateAuthToken(user.id, session.id);
  const accessToken = tokenResult.token;

  return {
    response: {
      accessToken,
      user: publicUser,
      context: authContext,
      permissions: authContext.permissions,
      redirectTo: authContext.redirectTo,
    },
    accessTokenExpiresAt: tokenResult.expiresAt,
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
): Promise<{
  response: AuthContextResponseDto;
  accessTokenExpiresAt: string;
  rawRefreshToken: string;
  sessionExpiresAt: Date;
}> {
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

  const tokenResult = generateAuthToken(token.authSession.userId, token.authSessionId);
  const accessToken = tokenResult.token;
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
    accessTokenExpiresAt: tokenResult.expiresAt,
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

export class AuthResendCooldownError extends Error {
  constructor(message = 'Please wait before requesting another verification email.') {
    super(message);
    this.name = 'AuthResendCooldownError';
  }
}

export class EmailChangeConflictError extends Error {
  constructor(message = 'The email is already in use by another account.') {
    super(message);
    this.name = 'EmailChangeConflictError';
  }
}

const resendCooldowns = new Map<string, number>();
const RESEND_COOLDOWN_MS = 60 * 1000;

export function clearResendCooldowns() {
  resendCooldowns.clear();
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const now = Date.now();
  const lastRequest = resendCooldowns.get(normalizedEmail);

  if (lastRequest && now - lastRequest < RESEND_COOLDOWN_MS) {
    throw new AuthResendCooldownError();
  }

  // Update map timestamp for enumeration safety even if user doesn't exist
  resendCooldowns.set(normalizedEmail, now);

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
      firstName: user.firstName,
      actionToken: verification.rawToken,
      firstName: user.firstName,
      actionTokenExpiresAt: verification.token.expiresAt,
    },
  });
}

export type VerifyEmailResult = {
  state: 'VALID' | 'INVALID' | 'EXPIRED' | 'USED' | 'REVOKED';
  user?: PublicUserDto;
};

export async function verifyEmail(rawToken: string): Promise<VerifyEmailResult> {
  const validation = await validateActionToken({
    rawToken,
    expectedPurpose: 'EMAIL_VERIFICATION',
  });

  if (validation.state !== 'VALID' || !validation.token) {
    return {
      state: validation.state === 'WRONG_PURPOSE' ? 'INVALID' : validation.state,
    };
  }

  const token = validation.token;
  if (!token.userId) {
    return { state: 'INVALID' };
  }

  const user = await UserRepository.findUserById(token.userId);
  if (!user) {
    return { state: 'INVALID' };
  }

  if (user.authStatus === 'DISABLED') {
    return { state: 'REVOKED' };
  }

  const updatedUser = await prisma.$transaction(async (tx) => {
    const consumed = await tx.actionToken.updateMany({
      where: { id: token.id, usedAt: null, revokedAt: null },
      data: { usedAt: new Date() },
    });

    if (consumed.count !== 1) {
      throw new Error('TOKEN_ALREADY_USED');
    }

    return tx.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        authStatus: 'ACTIVE',
      },
    });
  });

  return {
    state: 'VALID',
    user: toPublicUserDto(updatedUser),
  };
}

export type VerifyEmailChangeResult = {
  state: 'VALID' | 'INVALID' | 'EXPIRED' | 'USED' | 'REVOKED';
};

export async function verifyEmailChange(rawToken: string): Promise<VerifyEmailChangeResult> {
  const validation = await validateActionToken({
    rawToken,
    expectedPurpose: 'EMAIL_CHANGE_VERIFICATION',
  });

  if (validation.state !== 'VALID' || !validation.token) {
    return {
      state: validation.state === 'WRONG_PURPOSE' ? 'INVALID' : validation.state,
    };
  }

  const token = validation.token;
  if (!token.userId || !token.targetEmail || !token.emailChangeRequestId) {
    return { state: 'INVALID' };
  }

  const user = await UserRepository.findUserById(token.userId);
  if (!user) {
    return { state: 'INVALID' };
  }

  if (user.authStatus === 'DISABLED') {
    return { state: 'REVOKED' };
  }

  const targetEmail = token.targetEmail.trim().toLowerCase();

  const existingUser = await UserRepository.findUserByEmail(targetEmail);
  if (existingUser && existingUser.id !== user.id) {
    throw new EmailChangeConflictError();
  }

  const oldEmail = user.email;

  const resultState = await prisma.$transaction(async (tx) => {
    // 1. Load the EmailChangeRequest
    const changeRequest = await tx.emailChangeRequest.findUnique({
      where: { id: token.emailChangeRequestId! },
    });

    if (!changeRequest) {
      return 'INVALID';
    }

    // 2. Validate request properties
    if (
      changeRequest.userId !== token.userId ||
      changeRequest.RequestedEmail.trim().toLowerCase() !== targetEmail
    ) {
      return 'INVALID';
    }

    // 3. Check expiration
    if (changeRequest.expiresAt.getTime() <= Date.now() || changeRequest.status === 'EXPIRED') {
      if (changeRequest.status === 'PENDING') {
        await tx.emailChangeRequest.update({
          where: { id: changeRequest.id },
          data: { status: 'EXPIRED' },
        });
      }
      return 'EXPIRED';
    }

    // 4. Check status
    if (changeRequest.status !== 'PENDING') {
      if (changeRequest.status === 'CONFIRMED') {
        return 'USED';
      }
      if (changeRequest.status === 'CANCELED') {
        return 'REVOKED';
      }
      return 'INVALID';
    }

    // 5. Consume action token
    const consumed = await tx.actionToken.updateMany({
      where: { id: token.id, usedAt: null, revokedAt: null },
      data: { usedAt: new Date() },
    });

    if (consumed.count !== 1) {
      throw new Error('TOKEN_ALREADY_USED');
    }

    // 6. Update user email
    await tx.user.update({
      where: { id: user.id },
      data: {
        email: targetEmail,
      },
    });

    // 7. Update EmailChangeRequest status
    await tx.emailChangeRequest.update({
      where: { id: changeRequest.id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });

    // 8. Revoke all active sessions and refresh tokens
    const now = new Date();
    await tx.authSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: now, revokedReason: 'EMAIL_CHANGE' },
    });

    await tx.refreshToken.updateMany({
      where: { authSession: { userId: user.id }, revokedAt: null },
      data: { revokedAt: now, revokedReason: 'EMAIL_CHANGE' },
    });

    // 9. Write Security Audit Log
    await recordAuditLog(
      {
        actorUserId: user.id,
        actorType: user.userType,
        targetType: 'USER',
        targetId: user.id,
        actionType: 'SETTINGS_CHANGED',
        outcome: 'SUCCESS',
        metadata: {
          changeType: 'EMAIL_CHANGE',
          oldEmail,
          newEmail: targetEmail,
        },
      },
      tx,
    );
    return 'VALID';
  });
  return { state: resultState };
}

export async function requestPasswordReset(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await UserRepository.findUserByEmail(normalizedEmail);

  if (!user || user.authStatus === 'DISABLED' || user.authStatus === 'PENDING_INVITE_SETUP') {
    return;
  }

  const { verification } = await prisma.$transaction(async (tx) => {
    await tx.actionToken.updateMany({
      where: {
        userId: user.id,
        purpose: 'PASSWORD_RESET',
        revokedAt: null,
        usedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: 'REPLACED',
      },
    });

    const resetToken = await issueActionToken(
      {
        purpose: 'PASSWORD_RESET',
        userId: user.id,
        targetEmail: user.email,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      tx,
    );
    return { verification: resetToken };
  });

  await requestAuthEmailSend({
    emailType: 'PASSWORD_RESET',
    recipientEmail: user.email,
    userId: user.id,
    actionTokenId: verification.token.id,
    templateData: {
      actionToken: verification.rawToken,
      firstName: user.firstName,
      actionTokenExpiresAt: verification.token.expiresAt,
    },
  });
}

export async function resetUserPassword(
  rawToken: string,
  passwordInput: string,
  ipAddress?: string | null,
  userAgent?: string | null,
): Promise<void> {
  const validationResult = await validateActionToken({
    rawToken,
    expectedPurpose: 'PASSWORD_RESET',
  });

  if (validationResult.state !== 'VALID' || !validationResult.token) {
    const state = validationResult.state;
    if (state === 'INVALID') {
      throw new AuthResetPasswordError(401, 'RESET_TOKEN_INVALID', 'Reset token is invalid');
    }
    if (state === 'EXPIRED') {
      throw new AuthResetPasswordError(401, 'RESET_TOKEN_EXPIRED', 'Reset token has expired');
    }
    if (state === 'USED') {
      throw new AuthResetPasswordError(
        409,
        'RESET_TOKEN_USED',
        'Reset token has already been used',
      );
    }
    if (state === 'REVOKED') {
      throw new AuthResetPasswordError(401, 'RESET_TOKEN_REVOKED', 'Reset token has been revoked');
    }
    throw new AuthResetPasswordError(401, 'RESET_TOKEN_INVALID', 'Reset token is invalid');
  }

  const token = validationResult.token;
  if (!token.userId) {
    throw new AuthResetPasswordError(401, 'RESET_TOKEN_INVALID', 'Reset token is invalid');
  }

  const user = await UserRepository.findUserById(token.userId);
  if (!user || user.authStatus === 'DISABLED') {
    throw new AuthResetPasswordError(403, 'USER_DISABLED', 'User account is disabled');
  }

  const passwordHash = await PasswordService.hashPassword(passwordInput);

  await prisma.$transaction(async (tx) => {
    const claim = await tx.actionToken.updateMany({
      where: { id: token.id, usedAt: null, revokedAt: null },
      data: { usedAt: new Date() },
    });

    if (claim.count !== 1) {
      throw new AuthResetPasswordError(
        409,
        'RESET_TOKEN_USED',
        'Reset token has already been used',
      );
    }

    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await tx.authSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'PASSWORD_RESET' },
    });

    await tx.refreshToken.updateMany({
      where: {
        authSession: {
          userId: user.id,
        },
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: 'PASSWORD_RESET',
      },
    });
  });

  await recordAuditLog({
    actorUserId: user.id,
    actorType: user.userType,
    targetType: 'USER',
    targetId: user.id,
    actionType: 'UPDATED',
    outcome: 'SUCCESS',
    metadata: { reason: 'PASSWORD_RESET' },
    ipAddress,
    userAgent,
  });

  await requestAuthEmailSend({
    emailType: 'PASSWORD_CHANGED',
    recipientEmail: user.email,
    userId: user.id,
    templateData: {
      firstName: user.firstName,
    },
  });
}
