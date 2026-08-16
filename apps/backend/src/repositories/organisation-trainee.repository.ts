import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { ACTIVE_INVITATION_STATUSES } from '../services/invitation-state-policy.js';
import { recordAuditLog } from '../services/audit-log.service.js';
import { sendEmail } from '../services/email.service.js';
import { findInvitationById } from './invitation.repository.js';
import { revokeUserAuthSessions } from './auth-session.repository.js';

export type OrganisationTraineeClient = PrismaClient | Prisma.TransactionClient;

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
        orderBy: { createdAt: 'desc' },
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
  const normalisedEmail = email.trim().toLowerCase();
  return client.organisationTraineeProfile.findFirst({
    where: {
      organisationId,
      traineeProfile: {
        user: {
          email: normalisedEmail,
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
  const normalisedEmail = email.trim().toLowerCase();
  return client.invitation.findFirst({
    where: {
      organisationId,
      purpose: 'ORGANISATION_TRAINEE_INVITE',
      recipientEmail: normalisedEmail,
      status: {
        in: [...ACTIVE_INVITATION_STATUSES],
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
  disabledReason?: string | null,
  client: OrganisationTraineeClient = prisma,
) {
  return client.organisationTraineeProfile.update({
    where: { id },
    data: {
      membershipStatus: 'DISABLED',
      disabledAt: new Date(),
      disabledReason: disabledReason ?? 'Disabled by organisation admin',
    },
  });
}

export function findAuthoritativeInvitationById(
  id: string,
  client: OrganisationTraineeClient = prisma,
) {
  return client.invitation.findUnique({
    where: { id },
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
  actorUserId: string;
  organisationId: string;
  recipientEmail: string;
  recipientFirstName?: string | null;
  recipientLastName?: string | null;
  organisationName: string;
  requiresAccountConflictResolution: boolean;
  expiresAt: Date;
  rawToken: string;
  tokenHash: string;
};

export async function createOrganisationTraineeInvitationTx(
  input: CreateOrganisationTraineeInvitationTxInput,
  client: PrismaClient = prisma,
) {
  return client.$transaction(async (tx) => {
    if (typeof tx.$executeRaw === 'function') {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.organisationId + ':' + input.recipientEmail}))`;
    }

    const [txTrainee, txInvite] = await Promise.all([
      findOrganisationTraineeByEmail(input.organisationId, input.recipientEmail, tx),
      findPendingTraineeInvitationByEmail(input.organisationId, input.recipientEmail, tx),
    ]);

    if (txTrainee && txTrainee.membershipStatus !== 'DISABLED' && !txTrainee.disabledAt) {
      throw new OrganisationTraineeRepositoryError(
        409,
        'CANNOT_INVITE_USER',
        'User is already a trainee in this organisation.',
      );
    }

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
        recipientFirstName: input.recipientFirstName ?? null,
        recipientLastName: input.recipientLastName ?? null,
        purpose: 'ORGANISATION_TRAINEE_INVITE',
        status: 'PENDING',
        expiresAt: input.expiresAt,
      },
    });

    const actionToken = await tx.actionToken.create({
      data: {
        tokenHash: input.tokenHash,
        purpose: 'ORGANISATION_TRAINEE_INVITE',
        invitationId: invitation.id,
        expiresAt: input.expiresAt,
      },
    });

    await recordAuditLog(
      {
        actorUserId: input.actorUserId,
        actorType: 'ORGANISATION_ADMIN',
        organisationId: input.organisationId,
        targetType: 'INVITATION',
        targetId: invitation.id,
        actionType: 'INVITED',
        newValues: {
          recipientEmail: input.recipientEmail,
          purpose: 'ORGANISATION_TRAINEE_INVITE',
        },
      },
      tx,
    );

    const emailResult = await sendEmail(
      {
        emailType: 'ORGANISATION_TRAINEE_INVITE',
        recipientEmail: input.recipientEmail,
        relatedEntity: {
          organisationId: input.organisationId,
          invitationId: invitation.id,
          actionTokenId: actionToken.id,
        },
        templateData: {
          firstName: input.recipientFirstName ?? undefined,
          organisationName: input.organisationName,
          actionToken: input.rawToken,
          actionTokenExpiresAt: input.expiresAt,
          requiresAccountConflictResolution: input.requiresAccountConflictResolution,
        },
      },
      tx,
    );

    if (emailResult.status === 'NOT_QUEUED') {
      throw new OrganisationTraineeRepositoryError(
        503,
        'EMAIL_QUEUE_FAILED',
        'Invitation email could not be queued for delivery.',
      );
    }

    return { invitation, actionToken, emailResult };
  });
}

export type ResendOrganisationTraineeInvitationTxInput = {
  actorUserId: string;
  invitationId: string;
  organisationId: string;
  recipientEmail: string;
  recipientFirstName?: string | null;
  organisationName: string;
  observedUpdatedAt: Date;
  requiresAccountConflictResolution: boolean;
  expiresAt: Date;
  rawToken: string;
  tokenHash: string;
};

export async function resendOrganisationTraineeInvitationTx(
  input: ResendOrganisationTraineeInvitationTxInput,
  client: PrismaClient = prisma,
) {
  return client.$transaction(async (tx) => {
    const claimedAt = new Date();
    const claimedInv = await tx.invitation.updateMany({
      where: {
        id: input.invitationId,
        status: { in: [...ACTIVE_INVITATION_STATUSES] },
        updatedAt: input.observedUpdatedAt,
      },
      data: {
        status: 'PENDING',
        expiresAt: input.expiresAt,
        updatedAt: claimedAt,
      },
    });

    if (claimedInv.count === 0) {
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
        revokedAt: new Date(),
      },
    });

    const actionToken = await tx.actionToken.create({
      data: {
        tokenHash: input.tokenHash,
        purpose: 'ORGANISATION_TRAINEE_INVITE',
        invitationId: input.invitationId,
        expiresAt: input.expiresAt,
      },
    });

    await recordAuditLog(
      {
        actorUserId: input.actorUserId,
        actorType: 'ORGANISATION_ADMIN',
        organisationId: input.organisationId,
        targetType: 'INVITATION',
        targetId: input.invitationId,
        actionType: 'RESENT',
        newValues: {
          expiresAt: input.expiresAt.toISOString(),
        },
      },
      tx,
    );

    const emailResult = await sendEmail(
      {
        emailType: 'ORGANISATION_TRAINEE_INVITE',
        recipientEmail: input.recipientEmail,
        relatedEntity: {
          organisationId: input.organisationId,
          invitationId: input.invitationId,
          actionTokenId: actionToken.id,
          invitationStateVersion: claimedAt.toISOString(),
        },
        templateData: {
          firstName: input.recipientFirstName ?? undefined,
          organisationName: input.organisationName,
          actionToken: input.rawToken,
          actionTokenExpiresAt: input.expiresAt,
          requiresAccountConflictResolution: input.requiresAccountConflictResolution,
        },
      },
      tx,
    );

    if (emailResult.status === 'NOT_QUEUED') {
      throw new OrganisationTraineeRepositoryError(
        503,
        'EMAIL_QUEUE_FAILED',
        'Invitation email could not be queued for delivery.',
      );
    }

    return { actionToken, claimedAt, emailResult };
  });
}

export type RevokeOrganisationTraineeInvitationTxInput = {
  actorUserId: string;
  organisationId: string;
  invitationId: string;
};

export type RevokeOrganisationTraineeInvitationTxResult =
  | {
      alreadyRevoked: true;
      invitationId: string;
      revokedAt: string;
    }
  | {
      alreadyRevoked: false;
      invitationId: string;
      revokedAt: string;
    };

export async function revokeOrganisationTraineeInvitationTx(
  input: RevokeOrganisationTraineeInvitationTxInput,
  client: PrismaClient = prisma,
): Promise<RevokeOrganisationTraineeInvitationTxResult> {
  return client.$transaction(async (tx) => {
    const claimedInv = await tx.invitation.updateMany({
      where: {
        id: input.invitationId,
        status: { in: [...ACTIVE_INVITATION_STATUSES] },
      },
      data: {
        status: 'REVOKED',
      },
    });

    if (claimedInv.count === 0) {
      const txInv = await findInvitationById(input.invitationId, tx);
      if (txInv?.status === 'REVOKED') {
        return {
          alreadyRevoked: true,
          invitationId: txInv.id,
          revokedAt: txInv.updatedAt.toISOString(),
        };
      }
      throw new OrganisationTraineeRepositoryError(
        409,
        'INVITATION_ALREADY_ACCEPTED',
        'Cannot revoke an invitation that has already been accepted or mutated concurrently.',
      );
    }

    await tx.actionToken.updateMany({
      where: {
        invitationId: input.invitationId,
        revokedAt: null,
        usedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    await recordAuditLog(
      {
        actorUserId: input.actorUserId,
        actorType: 'ORGANISATION_ADMIN',
        organisationId: input.organisationId,
        targetType: 'INVITATION',
        targetId: input.invitationId,
        actionType: 'REVOKED',
        newValues: {
          status: 'REVOKED',
        },
      },
      tx,
    );

    return {
      alreadyRevoked: false,
      invitationId: input.invitationId,
      revokedAt: new Date().toISOString(),
    };
  });
}

export type DisableOrganisationTraineeTxInput = {
  actorUserId: string;
  organisationId: string;
  traineeId: string;
  disabledReason: string;
};

export async function disableOrganisationTraineeTx(
  input: DisableOrganisationTraineeTxInput,
  client: PrismaClient = prisma,
) {
  return client.$transaction(async (tx) => {
    const txTrainee = await findOrganisationTraineeById(input.organisationId, input.traineeId, tx);
    if (!txTrainee) {
      throw new OrganisationTraineeRepositoryError(
        404,
        'TRAINEE_NOT_FOUND',
        'Organisation trainee profile not found.',
      );
    }
    if (txTrainee.membershipStatus === 'DISABLED' || txTrainee.disabledAt) {
      throw new OrganisationTraineeRepositoryError(
        409,
        'TRAINEE_ALREADY_DISABLED',
        'Trainee profile is already disabled.',
      );
    }

    await disableOrganisationTraineeProfile(txTrainee.id, input.disabledReason, tx);

    await revokeUserAuthSessions(
      {
        userId: txTrainee.traineeProfile.userId,
        revokedReason: 'ADMIN_DISABLED',
      },
      tx,
    );

    await recordAuditLog(
      {
        actorUserId: input.actorUserId,
        actorType: 'ORGANISATION_ADMIN',
        organisationId: input.organisationId,
        targetType: 'USER',
        targetId: txTrainee.traineeProfile.userId,
        actionType: 'DISABLED',
        outcome: 'SUCCESS',
        metadata: {
          organisationTraineeProfileId: txTrainee.id,
          traineeProfileId: txTrainee.traineeProfileId,
          disabledReason: input.disabledReason,
        },
      },
      tx,
    );

    return { txTrainee, disabledReason: input.disabledReason };
  });
}
