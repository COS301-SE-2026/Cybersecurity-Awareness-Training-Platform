import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import type { RefreshTokenRevokedReason } from '../generated/prisma/enums.js';
import { prisma } from '../lib/prisma.js';

type RefreshTokenClient = PrismaClient | Prisma.TransactionClient;

export type CreateRefreshTokenInput = {
  authSessionId: string;
  tokenHash: string;
  expiresAt: Date;
};

export function createRefreshToken(
  input: CreateRefreshTokenInput,
  client: RefreshTokenClient = prisma,
) {
  return client.refreshToken.create({
    data: {
      authSessionId: input.authSessionId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
    },
  });
}

export function findRefreshTokenByHash(tokenHash: string, client: RefreshTokenClient = prisma) {
  return client.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      authSession: {
        include: {
          user: true,
        },
      },
    },
  });
}

export function markRefreshTokenUsedAndRotated(
  input: { id: string; replacedByTokenId: string },
  client: RefreshTokenClient = prisma,
) {
  return client.refreshToken.update({
    where: { id: input.id },
    data: {
      usedAt: new Date(),
      revokedAt: new Date(),
      revokedReason: 'ROTATED',
      replacedByTokenId: input.replacedByTokenId,
    },
  });
}

export function revokeRefreshToken(
  input: { id: string; revokedReason: RefreshTokenRevokedReason },
  client: RefreshTokenClient = prisma,
) {
  return client.refreshToken.update({
    where: { id: input.id },
    data: { revokedAt: new Date(), revokedReason: input.revokedReason },
  });
}

export function revokeSessionRefreshTokens(
  input: { authSessionId: string; revokedReason: RefreshTokenRevokedReason },
  client: RefreshTokenClient = prisma,
) {
  return client.refreshToken.updateMany({
    where: {
      authSessionId: input.authSessionId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokedReason: input.revokedReason,
    },
  });
}
