import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { issueActionToken } from '../services/action-token.service.js';
import { recordAuditLog } from '../services/audit-log.service.js';
import { PlatformAdminServiceError } from '../errors/platform-admin.error.js';

type PlatformAdminClient = PrismaClient | Prisma.TransactionClient;

export function findPlatformAdminActor(userId: string, client: PlatformAdminClient = prisma) {
  return client.user.findUnique({
    where: { id: userId },
    include: { ipAdminProfile: true },
  });
}

export function findPendingOrgInviteByEmail(email: string, client: PlatformAdminClient = prisma) {
  return client.invitation.findFirst({
    where: {
      recipientEmail: email,
      status: { in: ['PENDING', 'SENT'] },
    },
  });
}

export function findPendingRegistrationRequestByEmail(
  email: string,
  client: PlatformAdminClient = prisma,
) {
  return client.organisationRegistrationRequest.findFirst({
    where: {
      representativeEmail: email,
      status: { in: ['PENDING_REVIEW', 'CONTACTED'] },
    },
  });
}

export function findFullUserByEmail(email: string, client: PlatformAdminClient = prisma) {
  return client.user.findUnique({
    where: { email },
    include: {
      ipAdminProfile: true,
      organisationAdminProfile: true,
      traineeProfile: {
        include: {
          organisationTraineeProfile: true,
        },
      },
    },
  });
}

export async function listPlatformAdminsData(client: PlatformAdminClient = prisma) {
  const ipAdmins = await client.user.findMany({
    where: {
      userType: 'IP_ADMIN',
    },
    include: {
      ipAdminProfile: true,
      actionTokens: {
        where: {
          purpose: 'PLATFORM_ADMIN_INVITE',
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  const upgradeTokens = await client.actionToken.findMany({
    where: {
      purpose: 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
    },
    include: {
      user: {
        include: {
          ipAdminProfile: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return { ipAdmins, upgradeTokens };
}

export async function createPlatformAdminAccountAndInviteTx(params: {
  actorUserId: string;
  targetEmail: string;
  firstName: string;
  lastName: string;
  expiresAt: Date;
}) {
  return prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: params.targetEmail,
        firstName: params.firstName,
        lastName: params.lastName,
        passwordHash: '',
        userType: 'IP_ADMIN',
        authStatus: 'PENDING_INVITE_SETUP',
        ipAdminProfile: {
          create: {
            adminStatus: 'ACTIVE',
            platformAdminRole: 'NORMAL_ADMIN',
          },
        },
      },
    });

    const tokenRes = await issueActionToken(
      {
        purpose: 'PLATFORM_ADMIN_INVITE',
        userId: createdUser.id,
        expiresAt: params.expiresAt,
      },
      tx,
    );

    await recordAuditLog(
      {
        actorUserId: params.actorUserId,
        actorType: 'IP_ADMIN',
        targetType: 'USER',
        targetId: createdUser.id,
        actionType: 'INVITED',
        outcome: 'SUCCESS',
        metadata: {
          actionTokenId: tokenRes.token.id,
          type: 'PLATFORM_ADMIN_INVITE',
        },
      },
      tx,
    );

    return { user: createdUser, token: tokenRes.token, rawToken: tokenRes.rawToken };
  });
}

export async function createPlatformAdminUpgradeInviteTx(params: {
  actorUserId: string;
  targetUserId: string;
  expiresAt: Date;
}) {
  return prisma.$transaction(async (tx) => {
    // Lock target user row to serialize concurrent initial upgrade requests
    await tx.$queryRaw`
      SELECT id FROM "User"
      WHERE id = ${params.targetUserId}
      FOR UPDATE
    `;

    // Reload complete user and profile state post-lock to re-verify eligibility under committed state
    const freshTarget = await tx.user.findUnique({
      where: { id: params.targetUserId },
      include: {
        ipAdminProfile: true,
        organisationAdminProfile: true,
        traineeProfile: {
          include: {
            organisationTraineeProfile: true,
          },
        },
      },
    });

    if (freshTarget?.userType === 'IP_ADMIN') {
      if (freshTarget.authStatus === 'PENDING_INVITE_SETUP') {
        throw new PlatformAdminServiceError(
          409,
          'PENDING_PLATFORM_ADMIN_INVITE',
          'There is already a pending platform admin invite for this email',
        );
      }
      throw new PlatformAdminServiceError(
        409,
        'EXISTING_PLATFORM_ADMIN',
        'User is already a platform administrator',
      );
    }

    if (freshTarget?.userType === 'ORGANISATION_ADMIN' || freshTarget?.organisationAdminProfile) {
      throw new PlatformAdminServiceError(
        409,
        'ORGANISATION_ADMIN_CONFLICT',
        'An organisation administrator cannot be invited as a platform administrator',
      );
    }

    if (
      freshTarget?.userType === 'ORGANISATION_TRAINEE' ||
      freshTarget?.traineeProfile?.organisationTraineeProfile
    ) {
      throw new PlatformAdminServiceError(
        409,
        'ROLE_CONFLICT',
        'Organisation trainees cannot be invited as platform administrators',
      );
    }

    if (freshTarget?.authStatus !== 'ACTIVE') {
      throw new PlatformAdminServiceError(
        409,
        'ROLE_CONFLICT',
        'User account status is not active and cannot be upgraded to platform administrator',
      );
    }

    // Re-verify inside transaction if an active upgrade token already exists
    const activeUpgrade = await tx.actionToken.findFirst({
      where: {
        purpose: 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
        userId: params.targetUserId,
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (activeUpgrade) {
      throw new PlatformAdminServiceError(
        409,
        'PENDING_PLATFORM_ADMIN_INVITE',
        'There is already a pending platform admin upgrade invite for this user',
      );
    }

    // Issue action token WITHOUT revoking sibling tokens (sibling replacement is resend only)
    const tokenRes = await issueActionToken(
      {
        purpose: 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
        userId: params.targetUserId,
        expiresAt: params.expiresAt,
      },
      tx,
    );

    await recordAuditLog(
      {
        actorUserId: params.actorUserId,
        actorType: 'IP_ADMIN',
        targetType: 'USER',
        targetId: params.targetUserId,
        actionType: 'INVITED',
        outcome: 'SUCCESS',
        metadata: {
          actionTokenId: tokenRes.token.id,
          type: 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
        },
      },
      tx,
    );

    return { token: tokenRes.token, rawToken: tokenRes.rawToken };
  });
}

export async function resendPlatformAdminInviteTx(params: {
  actorUserId: string;
  inviteTokenId: string;
  expiresAt: Date;
}) {
  return prisma.$transaction(async (tx) => {
    // Acquire pessimistic lock on the action token row to serialise concurrent resends
    await tx.$queryRaw`
      SELECT id FROM "ActionToken"
      WHERE id = ${params.inviteTokenId}
      FOR UPDATE
    `;

    const oldToken = await tx.actionToken.findUnique({
      where: { id: params.inviteTokenId },
      include: { user: true },
    });

    if (
      !oldToken ||
      (oldToken.purpose !== 'PLATFORM_ADMIN_INVITE' &&
        oldToken.purpose !== 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION')
    ) {
      throw new PlatformAdminServiceError(
        404,
        'INVITATION_NOT_FOUND',
        'Invitation token not found',
      );
    }

    if (oldToken.usedAt) {
      throw new PlatformAdminServiceError(
        409,
        'INVITATION_ALREADY_USED',
        'Invitation has already been used',
      );
    }

    if (oldToken.revokedAt && oldToken.revokedReason !== 'DELIVERY_FAILED') {
      throw new PlatformAdminServiceError(
        409,
        'INVITATION_ALREADY_USED',
        'Invitation has already been revoked',
      );
    }

    // Conditionally revoke the old token using updateMany with a predicate
    const updated = await tx.actionToken.updateMany({
      where: {
        id: params.inviteTokenId,
        usedAt: null,
        OR: [{ revokedAt: null }, { revokedReason: 'DELIVERY_FAILED' }],
      },
      data: {
        revokedAt: new Date(),
        revokedReason: 'RESENT',
      },
    });

    if (updated?.count === 0) {
      throw new PlatformAdminServiceError(
        409,
        'INVITATION_ALREADY_USED',
        'Invitation has already been used or revoked',
      );
    }

    // Invalidate any applicable active sibling tokens for the same user and purpose
    await tx.actionToken.updateMany({
      where: {
        userId: oldToken.userId,
        purpose: oldToken.purpose,
        usedAt: null,
        revokedAt: null,
        id: { not: params.inviteTokenId },
      },
      data: {
        revokedAt: new Date(),
        revokedReason: 'RESENT',
      },
    });

    const email = oldToken.user?.email;
    if (!email) {
      throw new PlatformAdminServiceError(
        400,
        'BAD_REQUEST',
        'No email associated with invitation',
      );
    }

    const issuedToken = await issueActionToken(
      {
        purpose: oldToken.purpose,
        userId: oldToken.userId!,
        expiresAt: params.expiresAt,
      },
      tx,
    );

    await recordAuditLog(
      {
        actorUserId: params.actorUserId,
        actorType: 'IP_ADMIN',
        targetType: 'USER',
        targetId: oldToken.userId!,
        actionType: 'INVITED',
        outcome: 'SUCCESS',
        metadata: {
          actionTokenId: issuedToken.token.id,
          type: oldToken.purpose,
          resentFromTokenId: oldToken.id,
        },
      },
      tx,
    );

    return {
      tokenRes: issuedToken,
      targetEmail: email,
      targetFirstName: oldToken.user?.firstName ?? '',
      oldTokenPurpose: oldToken.purpose,
    };
  });
}

export async function transferSuperAdminTx(params: { actorUserId: string; targetUserId: string }) {
  return prisma.$transaction(async (tx) => {
    // Lock both User and IpAdminProfile rows
    await tx.$queryRaw`
      SELECT id FROM "User"
      WHERE id IN (${params.actorUserId}, ${params.targetUserId})
      FOR UPDATE
    `;
    await tx.$queryRaw`
      SELECT id FROM "IpAdminProfile"
      WHERE "userId" IN (${params.actorUserId}, ${params.targetUserId})
      FOR UPDATE
    `;

    const freshActorProfile = await tx.ipAdminProfile.findUnique({
      where: { userId: params.actorUserId },
    });
    if (
      freshActorProfile?.platformAdminRole !== 'SUPER_ADMIN' ||
      freshActorProfile?.adminStatus !== 'ACTIVE'
    ) {
      throw new PlatformAdminServiceError(
        409,
        'STALE_SUPER_ADMIN_TRANSFER',
        'Stale request: Current actor is no longer active super admin',
      );
    }

    const freshTarget = await tx.user.findUnique({
      where: { id: params.targetUserId },
      include: { ipAdminProfile: true },
    });
    if (
      freshTarget?.userType !== 'IP_ADMIN' ||
      freshTarget?.authStatus !== 'ACTIVE' ||
      freshTarget?.ipAdminProfile?.platformAdminRole !== 'NORMAL_ADMIN' ||
      freshTarget?.ipAdminProfile?.adminStatus !== 'ACTIVE'
    ) {
      throw new PlatformAdminServiceError(
        409,
        'STALE_SUPER_ADMIN_TRANSFER',
        'Stale request: Target state has changed',
      );
    }

    // Role promotion/demotion swap
    await tx.ipAdminProfile.update({
      where: { userId: params.targetUserId },
      data: { platformAdminRole: 'SUPER_ADMIN' },
    });

    await tx.ipAdminProfile.update({
      where: { userId: params.actorUserId },
      data: { platformAdminRole: 'NORMAL_ADMIN' },
    });

    // Enforce exactly one active super admin invariant
    const count = await tx.ipAdminProfile.count({
      where: { platformAdminRole: 'SUPER_ADMIN', adminStatus: 'ACTIVE' },
    });
    if (count !== 1) {
      throw new PlatformAdminServiceError(
        409,
        'STALE_SUPER_ADMIN_TRANSFER',
        'Single super admin invariant validation failed',
      );
    }

    // Record audits
    await recordAuditLog(
      {
        actorUserId: params.actorUserId,
        actorType: 'IP_ADMIN',
        targetType: 'PLATFORM_ADMIN_ROLE',
        targetId: params.targetUserId,
        actionType: 'PROMOTED',
        outcome: 'SUCCESS',
        oldValues: { role: 'NORMAL_ADMIN' },
        newValues: { role: 'SUPER_ADMIN' },
      },
      tx,
    );

    await recordAuditLog(
      {
        actorUserId: params.actorUserId,
        actorType: 'IP_ADMIN',
        targetType: 'PLATFORM_ADMIN_ROLE',
        targetId: params.actorUserId,
        actionType: 'DEMOTED',
        outcome: 'SUCCESS',
        oldValues: { role: 'SUPER_ADMIN' },
        newValues: { role: 'NORMAL_ADMIN' },
      },
      tx,
    );
  });
}

export async function demotePlatformAdminTx(params: { actorUserId: string; targetUserId: string }) {
  return prisma.$transaction(async (tx) => {
    // Lock both User and IpAdminProfile rows
    await tx.$queryRaw`
      SELECT id FROM "User"
      WHERE id IN (${params.actorUserId}, ${params.targetUserId})
      FOR UPDATE
    `;
    await tx.$queryRaw`
      SELECT id FROM "IpAdminProfile"
      WHERE "userId" IN (${params.actorUserId}, ${params.targetUserId})
      FOR UPDATE
    `;

    const freshActorProfile = await tx.ipAdminProfile.findUnique({
      where: { userId: params.actorUserId },
    });
    if (
      freshActorProfile?.platformAdminRole !== 'SUPER_ADMIN' ||
      freshActorProfile?.adminStatus !== 'ACTIVE'
    ) {
      throw new PlatformAdminServiceError(
        409,
        'SELF_DEMOTION_CONFLICT',
        'Stale request: Current actor is no longer active super admin',
      );
    }

    const freshTargetProfile = await tx.ipAdminProfile.findUnique({
      where: { userId: params.targetUserId },
    });
    if (
      freshTargetProfile?.adminStatus !== 'ACTIVE' ||
      freshTargetProfile?.platformAdminRole === 'SUPER_ADMIN'
    ) {
      throw new PlatformAdminServiceError(
        409,
        'PLATFORM_ADMIN_ALREADY_DEMOTED',
        'Stale request: Target state has changed',
      );
    }

    // Set platform admin profile to disabled
    await tx.ipAdminProfile.update({
      where: { userId: params.targetUserId },
      data: {
        adminStatus: 'DISABLED',
        revokedAt: new Date(),
        revokedReason: 'DEMOTED',
      },
    });

    // Invert userType to GENERAL_TRAINEE
    await tx.user.update({
      where: { id: params.targetUserId },
      data: {
        userType: 'GENERAL_TRAINEE',
      },
    });

    // Ensure TraineeProfile exists
    const traineeProfile = await tx.traineeProfile.findUnique({
      where: { userId: params.targetUserId },
    });
    let traineeProfileId: string = params.targetUserId;
    if (!traineeProfile) {
      const createdTrainee = await tx.traineeProfile.create({
        data: {
          userId: params.targetUserId,
          traineeStatus: 'ACTIVE',
        },
      });
      if (createdTrainee?.id) {
        traineeProfileId = createdTrainee.id;
      }
    } else {
      await tx.traineeProfile.update({
        where: { id: traineeProfile.id },
        data: { traineeStatus: 'ACTIVE' },
      });
      traineeProfileId = traineeProfile.id;
    }

    // Ensure GeneralTraineeProfile exists
    const generalTrainee = await tx.generalTraineeProfile.findUnique({
      where: { traineeProfileId: traineeProfileId },
    });
    if (!generalTrainee) {
      await tx.generalTraineeProfile.create({
        data: {
          traineeProfileId: traineeProfileId,
          accessSource: 'ADMIN_CREATED',
        },
      });
    }

    // Revoke all active auth sessions
    await tx.authSession.updateMany({
      where: { userId: params.targetUserId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokedReason: 'ADMIN_DISABLED',
      },
    });

    // Revoke all refresh tokens
    await tx.refreshToken.updateMany({
      where: { authSession: { userId: params.targetUserId }, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokedReason: 'OTHER',
      },
    });

    // Record audit log
    await recordAuditLog(
      {
        actorUserId: params.actorUserId,
        actorType: 'IP_ADMIN',
        targetType: 'USER',
        targetId: params.targetUserId,
        actionType: 'DEMOTED',
        outcome: 'SUCCESS',
        metadata: {
          reason: 'DEMOTED',
        },
      },
      tx,
    );
  });
}

export function markActionTokenDeliveryFailed(
  tokenId: string,
  client: PlatformAdminClient = prisma,
) {
  return client.actionToken
    .update({
      where: { id: tokenId },
      data: {
        revokedAt: new Date(),
        revokedReason: 'DELIVERY_FAILED',
      },
    })
    .catch(() => {});
}
