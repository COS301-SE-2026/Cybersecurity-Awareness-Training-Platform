import { verifyPassword } from './password.service.js';
import { sendEmail } from './email.service.js';
import { getCurrentUser } from './auth.service.js';
import {
  findPlatformAdminActor,
  findPendingOrgInviteByEmail,
  findPendingRegistrationRequestByEmail,
  findFullUserByEmail,
  listPlatformAdminsData,
  createPlatformAdminAccountAndInviteTx,
  createPlatformAdminUpgradeInviteTx,
  resendPlatformAdminInviteTx,
  transferSuperAdminTx,
  demotePlatformAdminTx,
  markActionTokenDeliveryFailed,
} from '../repositories/platform-admin.repository.js';
import type {
  InvitePlatformAdminRequestDto,
  TransferSuperAdminRequestDto,
  DemotePlatformAdminRequestDto,
} from '@insightful-phish/shared';

import { PlatformAdminServiceError } from '../errors/platform-admin.error.js';
export { PlatformAdminServiceError };

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
  const actor = await findPlatformAdminActor(actorUserId);

  if (actor?.userType !== 'IP_ADMIN' || actor?.ipAdminProfile?.adminStatus !== 'ACTIVE') {
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

interface AdminWithProfileAndTokens {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  authStatus: string;
  ipAdminProfile: {
    platformAdminRole: 'SUPER_ADMIN' | 'NORMAL_ADMIN';
    adminStatus: 'ACTIVE' | 'DISABLED';
  } | null;
  actionTokens: Array<{
    id: string;
    usedAt: Date | null;
    revokedAt: Date | null;
    revokedReason: string | null;
    expiresAt: Date;
  }>;
}

interface UpgradeTokenWithUser {
  id: string;
  userId: string | null;
  usedAt: Date | null;
  revokedAt: Date | null;
  revokedReason: string | null;
  expiresAt: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    authStatus: string;
    ipAdminProfile: {
      platformAdminRole: 'SUPER_ADMIN' | 'NORMAL_ADMIN';
      adminStatus: 'ACTIVE' | 'DISABLED';
    } | null;
  } | null;
}

// Helper to map active/invited platform admin record to response DTO row
function mapAdminToRow(
  admin: AdminWithProfileAndTokens,
  isActorSuper: boolean,
  actorUserId: string,
) {
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
}

// Helper to map upgrade action token to response DTO row
function mapUpgradeTokenToRow(token: UpgradeTokenWithUser, isActorSuper: boolean) {
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
}

// List platform admins and pending invitations
export async function listPlatformAdmins(actorUserId: string) {
  const actor = await findPlatformAdminActor(actorUserId);
  if (actor?.userType !== 'IP_ADMIN' || actor?.ipAdminProfile?.adminStatus !== 'ACTIVE') {
    throw new PlatformAdminServiceError(403, 'FORBIDDEN', 'Platform admin access is required');
  }
  const actorProfile = actor.ipAdminProfile;

  const { ipAdmins, upgradeTokens } = await listPlatformAdminsData();

  const isActorSuper = actorProfile.platformAdminRole === 'SUPER_ADMIN';

  const mappedAdmins = ipAdmins.map((admin) => mapAdminToRow(admin, isActorSuper, actorUserId));

  const uniqueUpgradeTokensMap = new Map<string, UpgradeTokenWithUser>();
  for (const token of upgradeTokens) {
    if (token.user && !uniqueUpgradeTokensMap.has(token.userId!)) {
      uniqueUpgradeTokensMap.set(token.userId!, token);
    }
  }
  const uniqueUpgradeTokens = Array.from(uniqueUpgradeTokensMap.values());

  const mappedUpgrades = uniqueUpgradeTokens
    .filter((token) => token.user && !mappedAdmins.some((ma) => ma.id === token.user?.id))
    .map((token) => mapUpgradeTokenToRow(token, isActorSuper));

  return {
    admins: [...mappedAdmins, ...mappedUpgrades],
    allowedToInvite: isActorSuper,
    allowedToTransfer: isActorSuper,
    allowedToDemote: isActorSuper,
    allowedToResendInvites: isActorSuper,
  };
}

// Helper to handle invitation workflow for an existing user account
async function handleExistingUserInvite(
  actorUserId: string,
  existingUser: NonNullable<Awaited<ReturnType<typeof findFullUserByEmail>>>,
  input: InvitePlatformAdminRequestDto,
  targetEmail: string,
) {
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

  if (existingUser.userType === 'ORGANISATION_ADMIN' || existingUser.organisationAdminProfile) {
    throw new PlatformAdminServiceError(
      409,
      'ORGANISATION_ADMIN_CONFLICT',
      'An organisation administrator cannot be invited as a platform administrator',
    );
  }

  if (
    existingUser.userType === 'ORGANISATION_TRAINEE' ||
    existingUser.traineeProfile?.organisationTraineeProfile
  ) {
    throw new PlatformAdminServiceError(
      409,
      'ROLE_CONFLICT',
      'Organisation trainees cannot be invited as platform administrators',
    );
  }

  if (existingUser.authStatus !== 'ACTIVE') {
    throw new PlatformAdminServiceError(
      409,
      'ROLE_CONFLICT',
      'User account status is not active and cannot be upgraded to platform administrator',
    );
  }

  if (existingUser.userType === 'GENERAL_TRAINEE' && !input.confirmUpgrade) {
    throw new PlatformAdminServiceError(
      409,
      'UPGRADE_CONFIRMATION_REQUIRED',
      'User already has a trainee account. Explicit confirmation is required to upgrade this user to a platform administrator.',
    );
  }

  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const { token, rawToken } = await createPlatformAdminUpgradeInviteTx({
    actorUserId,
    targetUserId: existingUser.id,
    expiresAt: expiry,
  });

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
    if (outcome?.status === 'NOT_QUEUED') {
      emailDeliveryFailed = true;
    }
  } catch (err) {
    console.error('Failed to send upgrade confirmation email:', err);
    emailDeliveryFailed = true;
  }

  if (emailDeliveryFailed) {
    await markActionTokenDeliveryFailed(token.id);
  }

  return {
    type: 'upgrade-confirmation' as const,
    userId: existingUser.id,
    email: targetEmail,
  };
}

// Helper to handle invitation workflow for a brand new user account
async function handleNewUserInvite(
  actorUserId: string,
  targetEmail: string,
  input: InvitePlatformAdminRequestDto,
) {
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const { user, token, rawToken } = await createPlatformAdminAccountAndInviteTx({
    actorUserId,
    targetEmail,
    firstName: input.firstName ?? '',
    lastName: input.lastName ?? '',
    expiresAt: expiry,
  });

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
    if (outcome?.status === 'NOT_QUEUED') {
      emailDeliveryFailed = true;
    }
  } catch (err) {
    console.error('Failed to send platform admin invite email:', err);
    emailDeliveryFailed = true;
  }

  if (emailDeliveryFailed) {
    await markActionTokenDeliveryFailed(token.id);
  }

  return {
    type: 'new-invite' as const,
    userId: user.id,
    email: targetEmail,
  };
}

// Send invite to a brand new platform admin account or upgrading trainee
export async function invitePlatformAdmin(
  actorUserId: string,
  input: InvitePlatformAdminRequestDto,
) {
  const actor = await findPlatformAdminActor(actorUserId);
  if (actor?.userType !== 'IP_ADMIN' || actor?.ipAdminProfile?.adminStatus !== 'ACTIVE') {
    throw new PlatformAdminServiceError(403, 'FORBIDDEN', 'Platform admin access is required');
  }
  requireSuperAdmin(actor.ipAdminProfile.platformAdminRole);

  const targetEmail = input.email.trim().toLowerCase();

  const pendingOrgInvite = await findPendingOrgInviteByEmail(targetEmail);
  if (pendingOrgInvite) {
    throw new PlatformAdminServiceError(
      409,
      'ORGANISATION_ADMIN_CONFLICT',
      'User has a pending organisation invitation and cannot be invited as a platform administrator',
    );
  }

  const pendingRep = await findPendingRegistrationRequestByEmail(targetEmail);
  if (pendingRep) {
    throw new PlatformAdminServiceError(
      409,
      'PENDING_ORGANISATION_REPRESENTATIVE_CONFLICT',
      'The email belongs to a pending organisation representative',
    );
  }

  const existingUser = await findFullUserByEmail(targetEmail);
  if (existingUser) {
    return handleExistingUserInvite(actorUserId, existingUser, input, targetEmail);
  }

  return handleNewUserInvite(actorUserId, targetEmail, input);
}

// Resend platform admin invitation or upgrade request
export async function resendPlatformAdminInvite(actorUserId: string, actionTokenId: string) {
  const actor = await findPlatformAdminActor(actorUserId);
  if (actor?.userType !== 'IP_ADMIN' || actor?.ipAdminProfile?.adminStatus !== 'ACTIVE') {
    throw new PlatformAdminServiceError(403, 'FORBIDDEN', 'Platform admin access is required');
  }
  requireSuperAdmin(actor.ipAdminProfile.platformAdminRole);

  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const { tokenRes, targetEmail, targetFirstName, oldTokenPurpose } =
    await resendPlatformAdminInviteTx({
      actorUserId,
      inviteTokenId: actionTokenId,
      expiresAt: expiry,
    });

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
    if (outcome?.status === 'NOT_QUEUED') {
      emailDeliveryFailed = true;
    }
  } catch (err) {
    console.error('Failed to send resend email:', err);
    emailDeliveryFailed = true;
  }

  if (emailDeliveryFailed) {
    await markActionTokenDeliveryFailed(tokenRes.token.id);
  }

  return { success: true, emailQueued: !emailDeliveryFailed };
}

// Transfer super admin status transactionally with concurrency locks
export async function transferSuperAdmin(actorUserId: string, input: TransferSuperAdminRequestDto) {
  const actor = await verifyActiveSuperAdminActor(actorUserId, input.password);
  const targetUserId = input.targetUserId;

  const target = await findPlatformAdminActor(targetUserId);

  if (
    target?.userType !== 'IP_ADMIN' ||
    target?.authStatus !== 'ACTIVE' ||
    target?.ipAdminProfile?.adminStatus !== 'ACTIVE' ||
    target?.ipAdminProfile?.platformAdminRole !== 'NORMAL_ADMIN'
  ) {
    throw new PlatformAdminServiceError(
      409,
      'STALE_SUPER_ADMIN_TRANSFER',
      'Stale request: Target is no longer an active normal platform admin',
    );
  }

  await transferSuperAdminTx({
    actorUserId,
    targetUserId,
  });

  // Notify target user (best-effort)
  if (target) {
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

  const target = await findPlatformAdminActor(targetUserId);
  if (target?.userType !== 'IP_ADMIN' || !target?.ipAdminProfile) {
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

  await demotePlatformAdminTx({
    actorUserId,
    targetUserId,
  });

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
