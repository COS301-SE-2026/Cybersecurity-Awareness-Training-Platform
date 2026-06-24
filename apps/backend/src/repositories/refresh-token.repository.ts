import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import type { RefreshTokenRevokedReason } from '../generated/prisma/enums.js';
import { prisma } from '../lib/prisma.js';
import { randomUUID } from 'node:crypto';

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

export function rotateRefreshTokenRecord(input: {
  previousTokenId: string;
  authSessionId: string;
  nextTokenHash: string;
  nextExpiresAt: Date;
}) {
  //transaction ensures atomic operation
  return prisma.$transaction(async (tx) => {
    const nextTokenId = randomUUID();
    const now = new Date();
    const claimedPreviousToken = await tx.refreshToken.updateMany({
      where: {
        id: input.previousTokenId,
        authSessionId: input.authSessionId,
        usedAt: null,
        revokedAt: null,
        replacedByTokenId: null,
      },
      data: {
        usedAt: now,
        revokedAt: now,
        revokedReason: 'ROTATED',
        replacedByTokenId: nextTokenId,
      },
    });

    if (claimedPreviousToken.count !== 1) {
      return null;
    }

    return tx.refreshToken.create({
      data: {
        id: nextTokenId,
        authSessionId: input.authSessionId,
        tokenHash: input.nextTokenHash,
        expiresAt: input.nextExpiresAt,
      },
    });
  });
}
