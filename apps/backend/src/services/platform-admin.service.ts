import { prisma } from '../lib/prisma.js';
import type { Prisma } from '../generated/prisma/client.js';
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

type ActionTokenMin = {
  usedAt?: Date | null;
  revokedAt?: Date | null;
  revokedReason?: string | null;
  expiresAt?: Date | null;
};

// Helper to derive invitation lifecycle status from token state
function deriveInvitationStatus(
  token: ActionTokenMin | null | undefined,
  activeStatus: 'SENT' | 'PENDING_UPGRADE' = 'SENT',
):
  | 'PENDING'
  | 'SENT'
  | 'FAILED_TO_SEND'
  | 'ACCEPTED'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'REJECTED'
  | 'PENDING_UPGRADE'
  | null {
  if (!token) {
    return 'PENDING';
  }
  if (token.usedAt) {
    return 'COMPLETED';
  }
  if (token.revokedAt) {
    return token.revokedReason === 'DELIVERY_FAILED' ? 'FAILED_TO_SEND' : 'REVOKED';
  }
  if (token.expiresAt && token.expiresAt.getTime() <= Date.now()) {
    return 'EXPIRED';
  }
  return activeStatus;
}
// Helper to verify the actor is an active super admin and their password matches
async function verifyActiveSuperAdminActor(actorUserId: string, passwordPlain: string) {
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    include: { ipAdminProfile: true },
  });

  if (!actor || actor.userType !== 'IP_ADMIN' || actor.ipAdminProfile?.adminStatus !== 'ACTIVE') {
    throw new PlatformAdminServiceError(403, 'FORBIDDEN', 'Platform admin access is required');
  }
  requireSuperAdmin(actor.ipAdminProfile.platformAdminRole);

  const passwordMatches = await verifyPassword(passwordPlain, actor.passwordHash);
  if (!passwordMatches) {
    throw new PlatformAdminServiceError(
      403,
      'PLATFORM_ADMIN_PASSWORD_INVALID',
      'Password confirmation failed',
    );
  }
  return actor;
}

// Helper to lock target profiles and re-verify actor super admin state inside a transaction
async function lockAndVerifySuperActor(
  tx: Prisma.TransactionClient,
  actorUserId: string,
  targetUserId: string,
  staleErrorCode: string,
  staleErrorMessage: string,
) {
  await tx.$queryRaw`
    SELECT id FROM "IpAdminProfile"
    WHERE "userId" IN (${actorUserId}, ${targetUserId})
    FOR UPDATE
  `;

  const freshActorProfile = await tx.ipAdminProfile.findUnique({
    where: { userId: actorUserId },
  });
  if (
    freshActorProfile?.platformAdminRole !== 'SUPER_ADMIN' ||
    freshActorProfile.adminStatus !== 'ACTIVE'
  ) {
    throw new PlatformAdminServiceError(409, staleErrorCode, staleErrorMessage);
  }
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

  const isActorSuper = actorProfile.platformAdminRole === 'SUPER_ADMIN';

  // Map user records to frontend rows
  const mappedAdmins = ipAdmins.map((admin) => {
    const activeToken = admin.actionTokens[0];
    const role = admin.ipAdminProfile?.platformAdminRole ?? 'NORMAL_ADMIN';
    const status = admin.ipAdminProfile?.adminStatus ?? 'ACTIVE';

    let invitationStatus:
      | 'PENDING'
      | 'SENT'
      | 'FAILED_TO_SEND'
      | 'ACCEPTED'
      | 'COMPLETED'
      | 'EXPIRED'
      | 'REVOKED'
      | 'REJECTED'
      | 'PENDING_UPGRADE'
      | null = null;

    if (admin.authStatus === 'PENDING_INVITE_SETUP') {
      invitationStatus = deriveInvitationStatus(activeToken, 'SENT');
    }

    return {
      id: admin.id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      platformAdminRole: role,
      adminStatus: status,
      authStatus: admin.authStatus,
      invitationStatus,
      inviteId: activeToken?.id ?? null,
      allowedActions: {
        canTransferSuperAdmin:
          isActorSuper &&
          role === 'NORMAL_ADMIN' &&
          admin.authStatus === 'ACTIVE' &&
          admin.id !== actorUserId,
        canDemote: isActorSuper && role === 'NORMAL_ADMIN' && admin.id !== actorUserId,
        canResendInvite:
          isActorSuper &&
          admin.authStatus === 'PENDING_INVITE_SETUP' &&
          !!activeToken &&
          !activeToken.usedAt &&
          (!activeToken.revokedAt || activeToken.revokedReason === 'DELIVERY_FAILED'),
      },
    };
  });

  // Deduplicate upgrade tokens by user ID to list only the latest attempt
  const uniqueUpgradeTokensMap = new Map<string, (typeof upgradeTokens)[0]>();
  for (const token of upgradeTokens) {
    if (token.user && !uniqueUpgradeTokensMap.has(token.userId!)) {
      uniqueUpgradeTokensMap.set(token.userId!, token);
    }
  }
  const uniqueUpgradeTokens = Array.from(uniqueUpgradeTokensMap.values());

  // Map upgrade tokens to pending rows
  const mappedUpgrades = uniqueUpgradeTokens
    .filter((token) => token.user && !mappedAdmins.some((ma) => ma.id === token.user?.id))
    .map((token) => {
      const user = token.user!;
      const invitationStatus = deriveInvitationStatus(token, 'PENDING_UPGRADE');

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        platformAdminRole: 'NORMAL_ADMIN' as const,
        adminStatus: 'ACTIVE' as const,
        authStatus: user.authStatus,
        invitationStatus,
        inviteId: token.id,
        allowedActions: {
          canTransferSuperAdmin: false,
          canDemote: false,
          canResendInvite:
            isActorSuper &&
            !token.usedAt &&
            (!token.revokedAt || token.revokedReason === 'DELIVERY_FAILED'),
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

  // Block platform admin invite if target has a pending organisation invitation
  const pendingOrgInvite = await prisma.invitation.findFirst({
    where: {
      recipientEmail: targetEmail,
      status: { in: ['PENDING', 'SENT'] },
    },
  });

  if (pendingOrgInvite) {
    throw new PlatformAdminServiceError(
      409,
      'ORGANISATION_ADMIN_CONFLICT',
      'User has a pending organisation invitation and cannot be invited as a platform administrator',
    );
  }

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

    if (existingUser.userType === 'ORGANISATION_TRAINEE') {
      throw new PlatformAdminServiceError(
        409,
        'ROLE_CONFLICT',
        'Organisation trainees cannot be invited as platform administrators',
      );
    }

    if (existingUser.userType === 'GENERAL_TRAINEE') {
      if (!input.confirmUpgrade) {
        throw new PlatformAdminServiceError(
          409,
          'UPGRADE_CONFIRMATION_REQUIRED',
          'User already has a trainee account. Explicit confirmation is required to upgrade this user to a platform administrator.',
        );
      }
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

    // Upgrade flow - Atomic token and audit creation
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const { token, rawToken } = await prisma.$transaction(async (tx) => {
      // Invalidate active sibling tokens for the same user and purpose
      await tx.actionToken.updateMany({
        where: {
          userId: existingUser.id,
          purpose: 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
          usedAt: null,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokedReason: 'RESENT',
        },
      });

      const tokenRes = await issueActionToken(
        {
          purpose: 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
          userId: existingUser.id,
          expiresAt: expiry,
        },
        tx,
      );

      await recordAuditLog(
        {
          actorUserId,
          actorType: 'IP_ADMIN',
          targetType: 'USER',
          targetId: existingUser.id,
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

    // Send email post-commit using the raw token value (best-effort / recoverable)
    let emailDeliveryFailed = false;
    try {
      const outcome = await sendEmail({
        emailType: 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
        recipientEmail: targetEmail,
        relatedEntity: {
          userId: existingUser.id,
          actionTokenId: token.id,
        },
        templateData: {
          firstName: existingUser.firstName ?? '',
          actionToken: rawToken,
          actionTokenExpiresAt: expiry,
        },
      });
      if (outcome && outcome.status === 'NOT_ACCEPTED') {
        emailDeliveryFailed = true;
      }
    } catch (err) {
      console.error('Failed to send upgrade confirmation email:', err);
      emailDeliveryFailed = true;
    }

    if (emailDeliveryFailed) {
      await prisma.actionToken
        .update({
          where: { id: token.id },
          data: {
            revokedAt: new Date(),
            revokedReason: 'DELIVERY_FAILED',
          },
        })
        .catch(() => {});
    }

    return {
      type: 'upgrade-confirmation' as const,
      userId: existingUser.id,
      email: targetEmail,
    };
  }

  // Atomic new platform admin account and token creation
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const { user, token, rawToken } = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
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

    const tokenRes = await issueActionToken(
      {
        purpose: 'PLATFORM_ADMIN_INVITE',
        userId: createdUser.id,
        expiresAt: expiry,
      },
      tx,
    );

    await recordAuditLog(
      {
        actorUserId,
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

  // Send email post-commit using the raw token value (best-effort / recoverable)
  let emailDeliveryFailed = false;
  try {
    const outcome = await sendEmail({
      emailType: 'PLATFORM_ADMIN_INVITE',
      recipientEmail: targetEmail,
      relatedEntity: {
        userId: user.id,
        actionTokenId: token.id,
      },
      templateData: {
        firstName: user.firstName ?? '',
        actionToken: rawToken,
        actionTokenExpiresAt: expiry,
      },
    });
    if (outcome && outcome.status === 'NOT_ACCEPTED') {
      emailDeliveryFailed = true;
    }
  } catch (err) {
    console.error('Failed to send platform admin invite email:', err);
    emailDeliveryFailed = true;
  }

  if (emailDeliveryFailed) {
    await prisma.actionToken
      .update({
        where: { id: token.id },
        data: {
          revokedAt: new Date(),
          revokedReason: 'DELIVERY_FAILED',
        },
      })
      .catch(() => {});
  }

  return {
    type: 'new-invite' as const,
    userId: user.id,
    email: targetEmail,
  };
}

// Resend an invitation token after revoking the older one with attempt-specific protection
export async function resendPlatformAdminInvite(actorUserId: string, inviteTokenId: string) {
  const actorProfile = await requirePlatformAdminUser(actorUserId);
  requireSuperAdmin(actorProfile.platformAdminRole);

  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const { tokenRes, targetEmail, targetFirstName, oldTokenPurpose } = await prisma.$transaction(
    async (tx) => {
      // Acquire pessimistic lock on the action token row to serialise concurrent resends
      await tx.$queryRaw`
      SELECT id FROM "ActionToken"
      WHERE id = ${inviteTokenId}
      FOR UPDATE
    `;

      const oldToken = await tx.actionToken.findUnique({
        where: { id: inviteTokenId },
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
          id: inviteTokenId,
          usedAt: null,
          OR: [{ revokedAt: null }, { revokedReason: 'DELIVERY_FAILED' }],
        },
        data: {
          revokedAt: new Date(),
          revokedReason: 'RESENT',
        },
      });

      if (updated && updated.count === 0) {
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
          id: { not: inviteTokenId },
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
          expiresAt: expiry,
        },
        tx,
      );

      await recordAuditLog(
        {
          actorUserId,
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
    },
  );

  // Send email post-commit using the raw token value (best-effort / recoverable)
  let emailDeliveryFailed = false;
  try {
    const outcome = await sendEmail({
      emailType: oldTokenPurpose,
      recipientEmail: targetEmail,
      relatedEntity: {
        userId: tokenRes.token.userId!,
        actionTokenId: tokenRes.token.id,
      },
      templateData: {
        firstName: targetFirstName,
        actionToken: tokenRes.rawToken,
        actionTokenExpiresAt: expiry,
      },
    });
    if (outcome && outcome.status === 'NOT_ACCEPTED') {
      emailDeliveryFailed = true;
    }
  } catch (err) {
    console.error('Failed to send resend email:', err);
    emailDeliveryFailed = true;
  }

  if (emailDeliveryFailed) {
    await prisma.actionToken
      .update({
        where: { id: tokenRes.token.id },
        data: {
          revokedAt: new Date(),
          revokedReason: 'DELIVERY_FAILED',
        },
      })
      .catch(() => {});
  }

  return { success: true, emailQueued: !emailDeliveryFailed };
}

// Transfer super admin status transactionaly with concurrency locks
export async function transferSuperAdmin(actorUserId: string, input: TransferSuperAdminRequestDto) {
  const actor = await verifyActiveSuperAdminActor(actorUserId, input.password);
  const targetUserId = input.targetUserId;

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: { ipAdminProfile: true },
  });

  if (
    !target ||
    target.userType !== 'IP_ADMIN' ||
    target.authStatus !== 'ACTIVE' ||
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
    // Lock both User and IpAdminProfile rows
    await tx.$queryRaw`
      SELECT id FROM "User"
      WHERE id IN (${actorUserId}, ${targetUserId})
      FOR UPDATE
    `;
    await tx.$queryRaw`
      SELECT id FROM "IpAdminProfile"
      WHERE "userId" IN (${actorUserId}, ${targetUserId})
      FOR UPDATE
    `;

    // Re-verify stale state inside txn
    const freshActorProfile = await tx.ipAdminProfile.findUnique({
      where: { userId: actorUserId },
    });
    if (
      freshActorProfile?.platformAdminRole !== 'SUPER_ADMIN' ||
      freshActorProfile.adminStatus !== 'ACTIVE'
    ) {
      throw new PlatformAdminServiceError(
        409,
        'STALE_SUPER_ADMIN_TRANSFER',
        'Stale request: Current actor is no longer active super admin',
      );
    }

    const freshTarget = await tx.user.findUnique({
      where: { id: targetUserId },
      include: { ipAdminProfile: true },
    });
    if (
      !freshTarget ||
      freshTarget.userType !== 'IP_ADMIN' ||
      freshTarget.authStatus !== 'ACTIVE' ||
      freshTarget.ipAdminProfile?.platformAdminRole !== 'NORMAL_ADMIN' ||
      freshTarget.ipAdminProfile.adminStatus !== 'ACTIVE'
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

  // Notify target user (best-effort)
  try {
    await sendEmail({
      emailType: 'ROLE_CHANGED_NOTIFICATION',
      recipientEmail: target.email,
      relatedEntity: { userId: target.id },
      templateData: {
        firstName: target.firstName,
        roleName: 'Super Administrator',
      },
    });
  } catch (err) {
    console.error('Best-effort email notification failed for target:', err);
  }

  // Notify actor user (best-effort)
  try {
    await sendEmail({
      emailType: 'ROLE_CHANGED_NOTIFICATION',
      recipientEmail: actor.email,
      relatedEntity: { userId: actor.id },
      templateData: {
        firstName: actor.firstName,
        roleName: 'Platform Administrator',
      },
    });
  } catch (err) {
    console.error('Best-effort email notification failed for actor:', err);
  }

  // Return refreshed current user auth context
  return getCurrentUser(actorUserId);
}

// Demote normal platform admin, transition to GENERAL_TRAINEE role, and revoke sessions
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

  await verifyActiveSuperAdminActor(actorUserId, input.password);

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
    await lockAndVerifySuperActor(
      tx,
      actorUserId,
      targetUserId,
      'SELF_DEMOTION_CONFLICT',
      'Stale request: Current actor is no longer active super admin',
    );

    const freshTargetProfile = await tx.ipAdminProfile.findUnique({
      where: { userId: targetUserId },
    });
    if (
      !freshTargetProfile ||
      freshTargetProfile.adminStatus !== 'ACTIVE' ||
      freshTargetProfile.platformAdminRole === 'SUPER_ADMIN'
    ) {
      throw new PlatformAdminServiceError(
        409,
        'PLATFORM_ADMIN_ALREADY_DEMOTED',
        'Stale request: Target state has changed',
      );
    }

    // Set platform admin profile to disabled
    await tx.ipAdminProfile.update({
      where: { userId: targetUserId },
      data: {
        adminStatus: 'DISABLED',
        revokedAt: new Date(),
        revokedReason: 'DEMOTED',
      },
    });

    // Invert userType to GENERAL_TRAINEE
    await tx.user.update({
      where: { id: targetUserId },
      data: {
        userType: 'GENERAL_TRAINEE',
      },
    });

    // Ensure TraineeProfile exists
    const traineeProfile = await tx.traineeProfile.findUnique({
      where: { userId: targetUserId },
    });
    let traineeProfileId: string = targetUserId;
    if (!traineeProfile) {
      const createdTrainee = await tx.traineeProfile.create({
        data: {
          userId: targetUserId,
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

    // Record audit log
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

  // Notify target user (best-effort)
  try {
    await sendEmail({
      emailType: 'ROLE_CHANGED_NOTIFICATION',
      recipientEmail: target.email,
      relatedEntity: { userId: target.id },
      templateData: {
        firstName: target.firstName,
        roleName: 'Disabled Platform Administrator',
      },
    });
  } catch (err) {
    console.error('Best-effort email notification failed for demoted target:', err);
  }

  return {
    userId: target.id,
    email: target.email,
    adminStatus: 'DISABLED' as const,
    authStatus: target.authStatus,
  };
}
