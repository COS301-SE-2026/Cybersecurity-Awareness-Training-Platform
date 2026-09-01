import type { AuthSessionRevokedReason } from '../generated/prisma/enums.js';
import type { AuthSessionModel } from '../generated/prisma/models.js';
import {
  createAuthSession,
  findAuthSessionById,
  revokeAuthSession,
  revokeUserAuthSessions,
  touchAuthSession,
  updateAuthSessionPolicy,
  type CreateAuthSessionInput,
} from '../repositories/auth-session.repository.js';

export type AuthSessionInput = CreateAuthSessionInput;

export type AuthSessionState = 'ACTIVE' | 'MISSING' | 'EXPIRED' | 'REVOKED';

export type ValidateAuthSessionResult =
  | { state: 'ACTIVE'; session: AuthSessionModel }
  | { state: Exclude<AuthSessionState, 'ACTIVE'>; session?: AuthSessionModel };

export function calculateSessionExpiresAt(input: {
  now?: Date;
  rememberMe: boolean;
  regularSessionSeconds: number;
  rememberedSessionSeconds: number;
}) {
  const now = input.now ?? new Date();
  const seconds = input.rememberMe ? input.rememberedSessionSeconds : input.regularSessionSeconds;
  return new Date(now.getTime() + seconds * 1000);
}

export async function issueAuthSession(input: AuthSessionInput): Promise<AuthSessionModel> {
  return createAuthSession(input);
}

export async function validateAuthSession(input: {
  sessionId: string;
  now?: Date;
  touch?: boolean;
}): Promise<ValidateAuthSessionResult> {
  const session = await findAuthSessionById(input.sessionId);
  if (!session) {
    return { state: 'MISSING' };
  }
  if (session.revokedAt) {
    return { state: 'REVOKED', session };
  }

  const now = input.now ?? new Date();
  if (session.expiresAt.getTime() <= now.getTime()) {
    return { state: 'EXPIRED', session };
  }

  if (input.touch ?? true) {
    await touchAuthSession(session.id);
  }

  return {
    state: 'ACTIVE',
    session,
  };
}

export async function revokeSessionById(input: {
  sessionId: string;
  reason: AuthSessionRevokedReason;
}) {
  return revokeAuthSession({
    id: input.sessionId,
    revokedReason: input.reason,
  });
}

export async function revokeSessionsForUser(input: {
  userId: string;
  reason: AuthSessionRevokedReason;
  exceptSessionId?: string | null;
}) {
  return revokeUserAuthSessions({
    userId: input.userId,
    revokedReason: input.reason,
    exceptSessionId: input.exceptSessionId ?? null,
  });
}

export async function touchSession(id: string) {
  return touchAuthSession(id);
}

export async function updateSessionPolicy(input: {
  sessionId: string;
  expiresAt: Date;
  idleTimeoutMinutes?: number | null;
}) {
  return updateAuthSessionPolicy({
    id: input.sessionId,
    expiresAt: input.expiresAt,
    idleTimeoutMinutes: input.idleTimeoutMinutes ?? null,
  });
}
