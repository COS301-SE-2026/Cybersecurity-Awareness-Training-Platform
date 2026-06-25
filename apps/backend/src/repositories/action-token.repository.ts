import type { Prisma, PrismaClient, ActionTokenPurpose } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

type ActionTokenClient = PrismaClient | Prisma.TransactionClient;

export type CreateActionTokenInput = {
  tokenHash: string;
  purpose: ActionTokenPurpose;
  expiresAt: Date;
  userId?: string | null;
  invitationId?: string | null;
  emailChangeRequestId?: string | null;
  organisationRegistrationRequestId?: string | null;
  targetEmail?: string | null;
};

export function createActionToken(
  input: CreateActionTokenInput,
  client: ActionTokenClient = prisma,
) {
  return client.actionToken.create({
    data: {
      tokenHash: input.tokenHash,
      purpose: input.purpose,
      expiresAt: input.expiresAt,
      userId: input.userId ?? null,
      invitationId: input.invitationId ?? null,
      emailChangeRequestId: input.emailChangeRequestId ?? null,
      organisationRegistrationRequestId: input.organisationRegistrationRequestId ?? null,
      targetEmail: input.targetEmail ?? null,
    },
  });
}

export function findActionTokenByHash(tokenHash: string, client: ActionTokenClient = prisma) {
  return client.actionToken.findUnique({
    where: { tokenHash },
  });
}

export async function markActionTokenUsed(id: string, client: ActionTokenClient = prisma) {
  const result = await client.actionToken.updateMany({
    where: {
      id,
      usedAt: null,
      revokedAt: null,
    },
    data: { usedAt: new Date() },
  });

  return result.count === 1;
}

export function revokeActionToken(
  input: { id: string; revokedReason: string },
  client: ActionTokenClient = prisma,
) {
  return client.actionToken.update({
    where: { id: input.id },
    data: { revokedAt: new Date(), revokedReason: input.revokedReason },
  });
}

export function withClaimedActionToken<T>(
  input: { tokenId: string },
  action: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return prisma.$transaction(async (tx) => {
    const claim = await tx.actionToken.updateMany({
      where: { id: input.tokenId, usedAt: null, revokedAt: null },
      data: { usedAt: new Date() },
    });

    if (claim.count !== 1) {
      return {
        claimed: false as const,
        result: null,
      };
    }

    const result = await action(tx);

    return { claimed: true as const, result };
  });
}
