import { prisma } from '../lib/prisma.js';
import { requirePlatformAdminUser } from './organisation-registration-request.service.js';
import { issueActionToken } from './action-token.service.js';
import { sendEmail } from './email.service.js';
import { recordAuditLog } from './audit-log.service.js';
import { verifyPassword } from './password.service.js';
import { getCurrentUser } from './auth.service.js';
import type {
  InvitePlatformAdminRequestDto,
  TransferSuperAdminRequestDto,
  DemotePlatformAdminRequestDto,
} from '@insightful-phish/shared';

export class PlatformAdminServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly error: string,
    message: string,
  ) {
    super(message);
    this.name = 'PlatformAdminServiceError';
  }
}

// Helper to check super admin actor role
function requireSuperAdmin(actorRole: string) {
  if (actorRole !== 'SUPER_ADMIN') {
    throw new PlatformAdminServiceError(403, 'FORBIDDEN', 'Super admin access is required');
  }
}

// Helper to issue action token, audit log, and send invitation email
async function issueAndSendInvitation(params: {
  actorUserId: string;
  userId: string;
  email: string;
  firstName: string;
  purpose: 'PLATFORM_ADMIN_INVITE' | 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION';
  revocationTokenId?: string;
}) {
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24hr expiration

  const { rawToken, token } = await prisma.$transaction(async (tx) => {
    if (params.revocationTokenId) {
      await tx.actionToken.update({
        where: { id: params.revocationTokenId },
        data: {
          revokedAt: new Date(),
          revokedReason: 'RESENT',
        },
      });
    }

    const tokenRes = await issueActionToken(
      {
        purpose: params.purpose,
        userId: params.userId,
        expiresAt: expiry,
      },
      tx,
    );

    await recordAuditLog(
      {
        actorUserId: params.actorUserId,
        actorType: 'IP_ADMIN',
        targetType: 'USER',
        targetId: params.userId,
        actionType: 'INVITED',
        outcome: 'SUCCESS',
        metadata: {
          actionTokenId: tokenRes.token.id,
          type: params.purpose,
          ...(params.revocationTokenId ? { resentFromTokenId: params.revocationTokenId } : {}),
        },
      },
      tx,
    );

    return { rawToken: tokenRes.rawToken, token: tokenRes.token };
  });

  await sendEmail({
    emailType: params.purpose,
    recipientEmail: params.email,
    relatedEntity: {
      userId: params.userId,
      actionTokenId: token.id,
    },
    templateData: {
      firstName: params.firstName,
      actionToken: rawToken,
      actionTokenExpiresAt: expiry,
    },
  });

  return { token, rawToken };
}

// List platform admins and pendng invitations
export async function listPlatformAdmins(actorUserId: string) {
  const actorProfile = await requirePlatformAdminUser(actorUserId);

  // Retrieve active or invited platfrom admin records
  const ipAdmins = await prisma.user.findMany({
    where: {
      userType: 'IP_ADMIN',
    },
    include: {
      ipAdminProfile: true,
      actionTokens: {
        where: {
          purpose: 'PLATFORM_ADMIN_INVITE',
          usedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  // Retrieve pending platform admin upgrade requests for trainees
  const upgradeTokens = await prisma.actionToken.findMany({
    where: {
      purpose: 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
      usedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        include: {
          ipAdminProfile: true,
        },
      },
    },
  });

  const isActorSuper = actorProfile.platformAdminRole === 'SUPER_ADMIN';

  // Map user records to frontend rows
  const mappedAdmins = ipAdmins.map((admin) => {
    const isPending = admin.authStatus === 'PENDING_INVITE_SETUP';
    const activeToken = admin.actionTokens[0];
    const role = admin.ipAdminProfile?.platformAdminRole ?? 'NORMAL_ADMIN';
    const status = admin.ipAdminProfile?.adminStatus ?? 'ACTIVE';

    return {
      id: admin.id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      platformAdminRole: role,
      adminStatus: status,
      authStatus: admin.authStatus,
      invitationStatus: isPending ? ('PENDING_INVITE' as const) : null,
      inviteId: activeToken?.id ?? null,
      allowedActions: {
        canTransferSuperAdmin:
          isActorSuper &&
          role === 'NORMAL_ADMIN' &&
          admin.authStatus === 'ACTIVE' &&
          admin.id !== actorUserId,
        canDemote: isActorSuper && role === 'NORMAL_ADMIN' && admin.id !== actorUserId,
        canResendInvite: isActorSuper && isPending && !!activeToken,
      },
    };
  });

  // Map upgrade tokens to pending rows
  const mappedUpgrades = upgradeTokens
    .filter((token) => token.user && !mappedAdmins.some((ma) => ma.id === token.user?.id))
    .map((token) => {
      const user = token.user!;
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        platformAdminRole: 'NORMAL_ADMIN' as const,
        adminStatus: 'ACTIVE' as const,
        authStatus: user.authStatus,
        invitationStatus: 'PENDING_UPGRADE' as const,
        inviteId: token.id,
        allowedActions: {
          canTransferSuperAdmin: false,
          canDemote: false,
          canResendInvite: isActorSuper,
        },
      };
    });

  return {
    admins: [...mappedAdmins, ...mappedUpgrades],
    allowedToInvite: isActorSuper,
    allowedToTransfer: isActorSuper,
    allowedToDemote: isActorSuper,
    allowedToResendInvites: isActorSuper,
  };
}

// Send invite to a brand new platform admin account or upgrading trainee
export async function invitePlatformAdmin(
  actorUserId: string,
  input: InvitePlatformAdminRequestDto,
) {
  const actorProfile = await requirePlatformAdminUser(actorUserId);
  requireSuperAdmin(actorProfile.platformAdminRole);

  const targetEmail = input.email.trim().toLowerCase();

  // Block pending representatives from onboarding request flow
  const pendingRep = await prisma.organisationRegistrationRequest.findFirst({
    where: {
      representativeEmail: targetEmail,
      status: { in: ['PENDING_REVIEW', 'CONTACTED'] },
    },
  });

  if (pendingRep) {
    throw new PlatformAdminServiceError(
      409,
      'PENDING_ORGANISATION_REPRESENTATIVE_CONFLICT',
      'The email belongs to a pending organisation representative',
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: targetEmail },
    include: { ipAdminProfile: true },
  });

  if (existingUser) {
    if (existingUser.userType === 'IP_ADMIN') {
      if (existingUser.authStatus === 'PENDING_INVITE_SETUP') {
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

    if (existingUser.userType === 'ORGANISATION_ADMIN') {
      throw new PlatformAdminServiceError(
        409,
        'ORGANISATION_ADMIN_CONFLICT',
        'An organisation administrator cannot be invited as a platform administrator',
      );
    }

    // Trainee accounts: trigger PLATFORM_ADMIN_UPGRADE_CONFIRMATION flow
    const activeUpgrade = await prisma.actionToken.findFirst({
      where: {
        purpose: 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
        userId: existingUser.id,
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

    await issueAndSendInvitation({
      actorUserId,
      userId: existingUser.id,
      email: targetEmail,
      firstName: existingUser.firstName ?? '',
      purpose: 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
    });

    return {
      type: 'upgrade-confirmation' as const,
      userId: existingUser.id,
      email: targetEmail,
    };
  }

  // Create pending new-account platform admin invite
  const user = await prisma.$transaction(async (tx) => {
    return tx.user.create({
      data: {
        email: targetEmail,
        firstName: input.firstName ?? '',
        lastName: input.lastName ?? '',
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
  });

  await issueAndSendInvitation({
    actorUserId,
    userId: user.id,
    email: targetEmail,
    firstName: user.firstName ?? '',
    purpose: 'PLATFORM_ADMIN_INVITE',
  });

  return {
    type: 'new-invite' as const,
    userId: user.id,
    email: targetEmail,
  };
}

// Resend an invtation token after revoking the older one
export async function resendPlatformAdminInvite(actorUserId: string, inviteTokenId: string) {
  const actorProfile = await requirePlatformAdminUser(actorUserId);
  requireSuperAdmin(actorProfile.platformAdminRole);

  const oldToken = await prisma.actionToken.findUnique({
    where: { id: inviteTokenId },
    include: { user: true },
  });

  if (
    !oldToken ||
    (oldToken.purpose !== 'PLATFORM_ADMIN_INVITE' &&
      oldToken.purpose !== 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION')
  ) {
    throw new PlatformAdminServiceError(404, 'INVITATION_NOT_FOUND', 'Invitation token not found');
  }

  if (oldToken.usedAt) {
    throw new PlatformAdminServiceError(
      409,
      'INVITATION_ALREADY_USED',
      'Invitation has already been used',
    );
  }

  const targetEmail = (oldToken.targetEmail ?? oldToken.user?.email ?? '').trim().toLowerCase();
  if (!targetEmail) {
    throw new PlatformAdminServiceError(400, 'BAD_REQUEST', 'No email associated with invitation');
  }

  await issueAndSendInvitation({
    actorUserId,
    userId: oldToken.userId!,
    email: targetEmail,
    firstName: oldToken.user?.firstName ?? '',
    purpose: oldToken.purpose,
    revocationTokenId: oldToken.id,
  });

  return { success: true, emailQueued: true };
}

// Transfer super admin status transactionaly
export async function transferSuperAdmin(actorUserId: string, input: TransferSuperAdminRequestDto) {
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    include: { ipAdminProfile: true },
  });

  if (!actor || actor.userType !== 'IP_ADMIN' || actor.ipAdminProfile?.adminStatus !== 'ACTIVE') {
    throw new PlatformAdminServiceError(403, 'FORBIDDEN', 'Platform admin access is required');
  }
  requireSuperAdmin(actor.ipAdminProfile.platformAdminRole);

  const passwordMatches = await verifyPassword(input.password, actor.passwordHash);
  if (!passwordMatches) {
    throw new PlatformAdminServiceError(
      403,
      'PLATFORM_ADMIN_PASSWORD_INVALID',
      'Password confirmation failed',
    );
  }

  const targetUserId = input.targetUserId;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { ipAdminProfile: true },
  });

  if (
    !target ||
    target.userType !== 'IP_ADMIN' ||
    target.ipAdminProfile?.adminStatus !== 'ACTIVE' ||
    target.ipAdminProfile.platformAdminRole !== 'NORMAL_ADMIN'
  ) {
    throw new PlatformAdminServiceError(
      409,
      'STALE_SUPER_ADMIN_TRANSFER',
      'Stale request: Target is no longer an active normal platform admin',
    );
  }

  await prisma.$transaction(async (tx) => {
    // Re-verify stale state inside txn
    const freshActorProfile = await tx.ipAdminProfile.findUnique({
      where: { userId: actorUserId },
    });
    if (freshActorProfile?.platformAdminRole !== 'SUPER_ADMIN') {
      throw new PlatformAdminServiceError(
        409,
        'STALE_SUPER_ADMIN_TRANSFER',
        'Stale request: Current actor is no longer super admin',
      );
    }

    const freshTargetProfile = await tx.ipAdminProfile.findUnique({
      where: { userId: targetUserId },
    });
    if (
      freshTargetProfile?.platformAdminRole !== 'NORMAL_ADMIN' ||
      freshTargetProfile.adminStatus !== 'ACTIVE'
    ) {
      throw new PlatformAdminServiceError(
        409,
        'STALE_SUPER_ADMIN_TRANSFER',
        'Stale request: Target state has changed',
      );
    }

    // Role promotion/demotion swap
    await tx.ipAdminProfile.update({
      where: { userId: targetUserId },
      data: { platformAdminRole: 'SUPER_ADMIN' },
    });

    await tx.ipAdminProfile.update({
      where: { userId: actorUserId },
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
        actorUserId,
        actorType: 'IP_ADMIN',
        targetType: 'PLATFORM_ADMIN_ROLE',
        targetId: targetUserId,
        actionType: 'PROMOTED',
        outcome: 'SUCCESS',
        oldValues: { role: 'NORMAL_ADMIN' },
        newValues: { role: 'SUPER_ADMIN' },
      },
      tx,
    );

    await recordAuditLog(
      {
        actorUserId,
        actorType: 'IP_ADMIN',
        targetType: 'PLATFORM_ADMIN_ROLE',
        targetId: actorUserId,
        actionType: 'DEMOTED',
        outcome: 'SUCCESS',
        oldValues: { role: 'SUPER_ADMIN' },
        newValues: { role: 'NORMAL_ADMIN' },
      },
      tx,
    );
  });

  // Notify target user
  await sendEmail({
    emailType: 'ROLE_CHANGED_NOTIFICATION',
    recipientEmail: target.email,
    relatedEntity: { userId: target.id },
    templateData: {
      firstName: target.firstName,
      roleName: 'Super Administrator',
    },
  });

  // Notify actor user
  await sendEmail({
    emailType: 'ROLE_CHANGED_NOTIFICATION',
    recipientEmail: actor.email,
    relatedEntity: { userId: actor.id },
    templateData: {
      firstName: actor.firstName,
      roleName: 'Platform Administrator',
    },
  });

  // Return refreshed current user auth context
  return getCurrentUser(actorUserId);
}

// Demote normal platform admin and invalidate active sesions
export async function demotePlatformAdmin(
  actorUserId: string,
  targetUserId: string,
  input: DemotePlatformAdminRequestDto,
) {
  if (targetUserId === actorUserId) {
    throw new PlatformAdminServiceError(
      409,
      'SELF_DEMOTION_CONFLICT',
      'You cannot demote yourself',
    );
  }

  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    include: { ipAdminProfile: true },
  });

  if (!actor || actor.userType !== 'IP_ADMIN' || actor.ipAdminProfile?.adminStatus !== 'ACTIVE') {
    throw new PlatformAdminServiceError(403, 'FORBIDDEN', 'Platform admin access is required');
  }
  requireSuperAdmin(actor.ipAdminProfile.platformAdminRole);

  const passwordMatches = await verifyPassword(input.password, actor.passwordHash);
  if (!passwordMatches) {
    throw new PlatformAdminServiceError(
      403,
      'PLATFORM_ADMIN_PASSWORD_INVALID',
      'Password confirmation failed',
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { ipAdminProfile: true },
  });

  if (!target || target.userType !== 'IP_ADMIN' || !target.ipAdminProfile) {
    throw new PlatformAdminServiceError(
      404,
      'PLATFORM_ADMIN_NOT_FOUND',
      'Platform admin not found',
    );
  }

  if (target.ipAdminProfile.platformAdminRole === 'SUPER_ADMIN') {
    throw new PlatformAdminServiceError(
      409,
      'SUPER_ADMIN_DEMOTION_BLOCKED',
      'Super admin roles cannot be directly demoted without a transfer first',
    );
  }

  if (target.ipAdminProfile.adminStatus === 'DISABLED') {
    throw new PlatformAdminServiceError(
      409,
      'PLATFORM_ADMIN_ALREADY_DEMOTED',
      'Platform admin is already demoted',
    );
  }

  await prisma.$transaction(async (tx) => {
    // Set IpAdminProfile to disabled (demoted)
    await tx.ipAdminProfile.update({
      where: { userId: targetUserId },
      data: {
        adminStatus: 'DISABLED',
        revokedAt: new Date(),
        revokedReason: 'DEMOTED',
      },
    });

    // Revoke all auth sessions
    await tx.authSession.updateMany({
      where: { userId: targetUserId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokedReason: 'ADMIN_DISABLED',
      },
    });

    // Revoke all refresh tokens
    await tx.refreshToken.updateMany({
      where: { authSession: { userId: targetUserId }, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokedReason: 'OTHER',
      },
    });

    // Record audit
    await recordAuditLog(
      {
        actorUserId,
        actorType: 'IP_ADMIN',
        targetType: 'USER',
        targetId: targetUserId,
        actionType: 'DEMOTED',
        outcome: 'SUCCESS',
        metadata: {
          reason: 'DEMOTED',
        },
      },
      tx,
    );
  });

  // Notify target user
  await sendEmail({
    emailType: 'ROLE_CHANGED_NOTIFICATION',
    recipientEmail: target.email,
    relatedEntity: { userId: target.id },
    templateData: {
      firstName: target.firstName,
      roleName: 'Disabled Platform Administrator',
    },
  });

  return {
    userId: target.id,
    email: target.email,
    adminStatus: 'DISABLED' as const,
    authStatus: target.authStatus,
  };
}
