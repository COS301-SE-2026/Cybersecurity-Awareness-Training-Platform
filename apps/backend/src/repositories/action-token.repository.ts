import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import type { ActionTokenPurpose } from '../generated/prisma/client.js';
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

export function markActionTokenUsed(id: string, client: ActionTokenClient = prisma) {
  return client.actionToken.update({
    data: { usedAt: new Date() },
    where: { id },
  });
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
