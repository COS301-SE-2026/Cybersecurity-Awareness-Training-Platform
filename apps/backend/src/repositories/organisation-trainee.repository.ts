import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { ACTIVE_INVITATION_STATUSES } from '@insightful-phish/shared';
import { prisma } from '../lib/prisma.js';
import { findInvitationById } from './invitation.repository.js';
import { revokeUserAuthSessions } from './auth-session.repository.js';
import { createAuditLogEntry, type CreateAuditLogEntryInput } from './audit-log.repository.js';
import {
  enqueueEmailDelivery,
  type EnqueueEmailDeliveryInput,
} from './email-delivery.repository.js';
import { createActionToken } from './action-token.repository.js';

type OrganisationTraineeClient = PrismaClient | Prisma.TransactionClient;

const RESENDABLE_TRAINEE_INVITATION_STATUSES = [
  'PENDING',
  'SENT',
  'FAILED_TO_SEND',
  'EXPIRED',
  'REJECTED',
] as const;

export class OrganisationTraineeRepositoryError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorKey: string,
    message: string,
  ) {
    super(message);
    this.name = 'OrganisationTraineeRepositoryError';
  }

  get error(): string {
    return this.errorKey;
  }
}

export function findOrganisationTrainees(
  organisationId: string,
  client: OrganisationTraineeClient = prisma,
) {
  return client.organisationTraineeProfile.findMany({
    where: {
      organisationId,
      membershipStatus: {
        in: ['ACTIVE', 'DISABLED'],
      },
    },
    include: {
      traineeProfile: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export function findOrganisationTraineeInvitations(
  organisationId: string,
  client: OrganisationTraineeClient = prisma,
) {
  return client.invitation.findMany({
    where: {
      organisationId,
      purpose: 'ORGANISATION_TRAINEE_INVITE',
    },
    include: {
      emailDeliveryLogs: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export function findOrganisationTraineeByEmail(
  organisationId: string,
  email: string,
  client: OrganisationTraineeClient = prisma,
) {
  return client.organisationTraineeProfile.findFirst({
    where: {
      organisationId,
      traineeProfile: {
        user: {
          email: email.trim().toLowerCase(),
        },
      },
    },
    include: {
      traineeProfile: {
        include: {
          user: true,
        },
      },
    },
  });
}

export function findPendingTraineeInvitationByEmail(
  organisationId: string,
  email: string,
  client: OrganisationTraineeClient = prisma,
) {
  return client.invitation.findFirst({
    where: {
      organisationId,
      purpose: 'ORGANISATION_TRAINEE_INVITE',
      recipientEmail: email.trim().toLowerCase(),
      status: {
        in: ['PENDING', 'SENT', 'FAILED_TO_SEND'],
      },
    },
  });
}

export function findOrganisationTraineeById(
  organisationId: string,
  traineeId: string,
  client: OrganisationTraineeClient = prisma,
) {
  return client.organisationTraineeProfile.findFirst({
    where: {
      organisationId,
      OR: [
        { id: traineeId },
        { traineeProfileId: traineeId },
        { traineeProfile: { userId: traineeId } },
      ],
    },
    include: {
      traineeProfile: {
        include: {
          user: true,
        },
      },
    },
  });
}

export function disableOrganisationTraineeProfile(
  id: string,
  disabledReason = 'Disabled by organisation admin',
  client: OrganisationTraineeClient = prisma,
) {
  return client.organisationTraineeProfile.update({
    where: { id },
    data: {
      membershipStatus: 'DISABLED',
      disabledAt: new Date(),
      disabledReason,
    },
  });
}

export function findAuthoritativeInvitationById(
  invitationId: string,
  client: OrganisationTraineeClient = prisma,
) {
  return client.invitation.findUnique({
    where: { id: invitationId },
  });
}

export function findAuthoritativeResentInvitation(
  invitationId: string,
  actionTokenId: string,
  client: OrganisationTraineeClient = prisma,
) {
  return client.invitation.findUnique({
    where: { id: invitationId },
    include: {
      actionTokens: {
        where: { id: actionTokenId },
      },
    },
  });
}

export type CreateOrganisationTraineeInvitationTxInput = {
  organisationId: string;
  recipientEmail: string;
  recipientFirstName: string | null;
  recipientLastName: string | null;
  expiresAt: Date;
  tokenHash: string;
  auditLogData: CreateAuditLogEntryInput;
  emailDeliveryData: Omit<EnqueueEmailDeliveryInput, 'relatedEntity'>;
};

export async function createOrganisationTraineeInvitationTx(
  input: CreateOrganisationTraineeInvitationTxInput,
  client: PrismaClient = prisma,
) {
  return client.$transaction(async (tx) => {
    const lockKey = Array.from(`${input.organisationId}:${input.recipientEmail}`).reduce(
      (acc, char) => (acc * 31 + char.charCodeAt(0)) | 0,
      0,
    );
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

    const txTrainee = await tx.organisationTraineeProfile.findFirst({
      where: {
        organisationId: input.organisationId,
        traineeProfile: {
          user: {
            email: input.recipientEmail,
          },
        },
      },
    });

    if (txTrainee && txTrainee.membershipStatus !== 'DISABLED' && !txTrainee.disabledAt) {
      throw new OrganisationTraineeRepositoryError(
        409,
        'CANNOT_INVITE_USER',
        'User is already a trainee in this organisation.',
      );
    }

    const txInvite = await tx.invitation.findFirst({
      where: {
        organisationId: input.organisationId,
        purpose: 'ORGANISATION_TRAINEE_INVITE',
        recipientEmail: input.recipientEmail,
        status: {
          in: ['PENDING', 'SENT', 'FAILED_TO_SEND'],
        },
      },
    });

    if (txInvite) {
      throw new OrganisationTraineeRepositoryError(
        409,
        'CANNOT_INVITE_USER',
        'A pending invitation already exists for this email address.',
      );
    }

    const invitation = await tx.invitation.create({
      data: {
        organisationId: input.organisationId,
        recipientEmail: input.recipientEmail,
        recipientFirstName: input.recipientFirstName,
        recipientLastName: input.recipientLastName,
        purpose: 'ORGANISATION_TRAINEE_INVITE',
        status: 'PENDING',
        expiresAt: input.expiresAt,
      },
    });

    const actionToken = await createActionToken(
      {
        tokenHash: input.tokenHash,
        purpose: 'ORGANISATION_TRAINEE_INVITE',
        invitationId: invitation.id,
        expiresAt: input.expiresAt,
      },
      tx,
    );

    await createAuditLogEntry(
      {
        ...input.auditLogData,
        targetId: invitation.id,
        newValues: {
          recipientEmail: input.recipientEmail,
          purpose: 'ORGANISATION_TRAINEE_INVITE',
          ...(input.auditLogData.newValues as Record<string, unknown> | undefined),
        },
      },
      tx,
    );

    let pendingDelivery: Awaited<ReturnType<typeof enqueueEmailDelivery>>;
    try {
      pendingDelivery = await enqueueEmailDelivery(
        {
          ...input.emailDeliveryData,
          relatedEntity: {
            invitationId: invitation.id,
            actionTokenId: actionToken.id,
            organisationId: input.organisationId,
          },
        },
        tx,
      );
    } catch {
      throw new OrganisationTraineeRepositoryError(
        503,
        'EMAIL_QUEUE_FAILED',
        'Invitation email could not be queued for delivery.',
      );
    }

    return {
      invitation,
      actionToken,
      pendingDelivery,
    };
  });
}

export type ResendOrganisationTraineeInvitationTxInput = {
  invitationId: string;
  organisationId: string;
  observedUpdatedAt: Date;
  expiresAt: Date;
  tokenHash: string;
  auditLogData: CreateAuditLogEntryInput;
  emailDeliveryData: Omit<EnqueueEmailDeliveryInput, 'relatedEntity'>;
};

export async function resendOrganisationTraineeInvitationTx(
  input: ResendOrganisationTraineeInvitationTxInput,
  client: PrismaClient = prisma,
) {
  return client.$transaction(async (tx) => {
    const claimedAt = new Date();
    const updateResult = await tx.invitation.updateMany({
      where: {
        id: input.invitationId,
        status: { in: [...RESENDABLE_TRAINEE_INVITATION_STATUSES] },
        updatedAt: input.observedUpdatedAt,
      },
      data: {
        status: 'PENDING',
        expiresAt: input.expiresAt,
        updatedAt: claimedAt,
      },
    });

    if (updateResult.count === 0) {
      throw new OrganisationTraineeRepositoryError(
        409,
        'INVITATION_NOT_RESENDABLE',
        'Invitation was modified concurrently or is no longer in a resendable state.',
      );
    }

    await tx.actionToken.updateMany({
      where: {
        invitationId: input.invitationId,
        revokedAt: null,
        usedAt: null,
      },
      data: {
        revokedAt: claimedAt,
      },
    });

    const actionToken = await createActionToken(
      {
        tokenHash: input.tokenHash,
        purpose: 'ORGANISATION_TRAINEE_INVITE',
        invitationId: input.invitationId,
        expiresAt: input.expiresAt,
      },
      tx,
    );

    await createAuditLogEntry(
      {
        ...input.auditLogData,
        targetId: input.invitationId,
        newValues: {
          expiresAt: input.expiresAt.toISOString(),
          ...(input.auditLogData.newValues as Record<string, unknown> | undefined),
        },
      },
      tx,
    );

    let pendingDelivery: Awaited<ReturnType<typeof enqueueEmailDelivery>>;
    try {
      pendingDelivery = await enqueueEmailDelivery(
        {
          ...input.emailDeliveryData,
          relatedEntity: {
            invitationId: input.invitationId,
            actionTokenId: actionToken.id,
            organisationId: input.organisationId,
            invitationStateVersion: claimedAt.toISOString(),
          },
        },
        tx,
      );
    } catch {
      throw new OrganisationTraineeRepositoryError(
        503,
        'EMAIL_QUEUE_FAILED',
        'Invitation email could not be queued for delivery.',
      );
    }

    return {
      actionToken,
      claimedAt,
      pendingDelivery,
    };
  });
}

export type RevokeOrganisationTraineeInvitationTxInput = {
  actorUserId: string;
  organisationId: string;
  invitationId: string;
  auditLogData: CreateAuditLogEntryInput;
};

export async function revokeOrganisationTraineeInvitationTx(
  input: RevokeOrganisationTraineeInvitationTxInput,
  client: PrismaClient = prisma,
) {
  return client.$transaction(async (tx) => {
    const updateResult = await tx.invitation.updateMany({
      where: {
        id: input.invitationId,
        status: { in: [...ACTIVE_INVITATION_STATUSES] },
      },
      data: {
        status: 'REVOKED',
      },
    });

    if (updateResult.count === 0) {
      const freshInvite = await findInvitationById(input.invitationId, tx);
      if (freshInvite?.status === 'REVOKED') {
        return {
          alreadyRevoked: true,
          invitationId: input.invitationId,
          revokedAt: freshInvite.updatedAt.toISOString(),
        };
      }
      throw new OrganisationTraineeRepositoryError(
        409,
        'INVITATION_ALREADY_ACCEPTED',
        'Cannot revoke an invitation that has already been accepted or mutated concurrently.',
      );
    }

    const now = new Date();
    await tx.actionToken.updateMany({
      where: {
        invitationId: input.invitationId,
        revokedAt: null,
        usedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });

    await createAuditLogEntry(
      {
        ...input.auditLogData,
        targetId: input.invitationId,
        newValues: {
          status: 'REVOKED',
          ...(input.auditLogData.newValues as Record<string, unknown> | undefined),
        },
      },
      tx,
    );

    return {
      alreadyRevoked: false,
      invitationId: input.invitationId,
      revokedAt: now.toISOString(),
    };
  });
}

export type DisableOrganisationTraineeTxInput = {
  actorUserId: string;
  organisationId: string;
  traineeId: string;
  disabledReason: string;
  auditLogData: CreateAuditLogEntryInput;
};

export async function disableOrganisationTraineeTx(
  input: DisableOrganisationTraineeTxInput,
  client: PrismaClient = prisma,
) {
  return client.$transaction(async (tx) => {
    const txTrainee = await tx.organisationTraineeProfile.findFirst({
      where: {
        organisationId: input.organisationId,
        OR: [
          { id: input.traineeId },
          { traineeProfileId: input.traineeId },
          { traineeProfile: { userId: input.traineeId } },
        ],
      },
      include: {
        traineeProfile: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!txTrainee) {
      throw new OrganisationTraineeRepositoryError(
        404,
        'TRAINEE_NOT_FOUND',
        'Organisation trainee profile not found.',
      );
    }

    if (txTrainee.membershipStatus === 'DISABLED' || txTrainee.disabledAt !== null) {
      throw new OrganisationTraineeRepositoryError(
        409,
        'TRAINEE_ALREADY_DISABLED',
        'Trainee profile is already disabled.',
      );
    }

    await tx.organisationTraineeProfile.update({
      where: { id: txTrainee.id },
      data: {
        membershipStatus: 'DISABLED',
        disabledAt: new Date(),
        disabledReason: input.disabledReason,
      },
    });

    await revokeUserAuthSessions(
      {
        userId: txTrainee.traineeProfile.userId,
        revokedReason: 'ADMIN_DISABLED',
      },
      tx,
    );

    await createAuditLogEntry(
      {
        ...input.auditLogData,
        targetId: txTrainee.traineeProfile.userId,
        metadata: {
          organisationTraineeProfileId: txTrainee.id,
          traineeProfileId: txTrainee.traineeProfileId,
          disabledReason: input.disabledReason,
          ...(input.auditLogData.metadata as Record<string, unknown> | undefined),
        },
      },
      tx,
    );

    return {
      txTrainee,
      disabledReason: input.disabledReason,
    };
  });
}
