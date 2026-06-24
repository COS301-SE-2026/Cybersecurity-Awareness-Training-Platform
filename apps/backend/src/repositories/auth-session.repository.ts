import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import type { AuthSessionRevokedReason } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

type AuthSessionClient = PrismaClient | Prisma.TransactionClient;

export type CreateAuthSessionInput = {
  userId: string;
  rememberMe: boolean;
  expiresAt: Date;
  idleTimeoutMinutes?: number | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  deviceSummary?: string | null;
  locationSummary?: string | null;
};

export function createAuthSession(
  input: CreateAuthSessionInput,
  client: AuthSessionClient = prisma,
) {
  return client.authSession.create({
    data: {
      userId: input.userId,
      rememberMe: input.rememberMe,
      idleTimeoutMinutes: input.idleTimeoutMinutes ?? null,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      deviceSummary: input.deviceSummary ?? null,
      locationSummary: input.locationSummary ?? null,
      expiresAt: input.expiresAt,
    },
  });
}

export function findAuthSessionById(id: string, client: AuthSessionClient = prisma) {
  return client.authSession.findUnique({
    where: { id },
  });
}
export function touchAuthSession(id: string, client: AuthSessionClient = prisma) {
  return client.authSession.update({
    data: { lastActiveAt: new Date() },
    where: { id },
  });
}

export function revokeAuthSession(
  input: { id: string; revokedReason: AuthSessionRevokedReason },
  client: AuthSessionClient = prisma,
) {
  return client.authSession.update({
    data: {
      revokedAt: new Date(),
      revokedReason: input.revokedReason,
    },
    where: { id: input.id },
  });
}

export function revokeUserAuthSessions(
  input: {
    userId: string;
    revokedReason: AuthSessionRevokedReason;
    exceptSessionId?: string | null;
  },
  client: AuthSessionClient = prisma,
) {
  return client.authSession.updateMany({
    where: {
      userId: input.userId,
      revokedAt: null,
      ...(input.exceptSessionId ? { id: { not: input.exceptSessionId } } : {}),
    },
    data: {
      revokedAt: new Date(),
      revokedReason: input.revokedReason,
    },
  });
}
