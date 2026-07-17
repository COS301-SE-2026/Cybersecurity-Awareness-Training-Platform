import type {
  InvitationAcceptRequestDto,
  InvitationAcceptResponseDto,
  InvitationContextResponseDto,
  InvitationRejectRequestDto,
  InvitationRejectResponseDto,
  InvitationRoleGrantedDto,
  InvitationTypeDto,
} from '@insightful-phish/shared';
import type { Prisma } from '../generated/prisma/client.js';
import type { ActionTokenPurpose, AuditActorType, UserType } from '../generated/prisma/enums.js';
import { prisma } from '../lib/prisma.js';
import { recordAuditLog } from './audit-log.service.js';
import { hashOpaqueToken } from './token-hash.service.js';
import {
  findInvitationTokenByHash,
  findUserByEmailWithProfiles,
  claimInvitationAccept,
  claimInvitationReject,
  claimInvitationToken,
  insertInvitationPermissionGrantsToAdmin,
  updateUserRoleAndProfilesFromInvitation,
  InvitationRepositoryConflictError,
} from '../repositories/invitation.repository.js';
import { isActiveInvitationStatus } from './invitation-state-policy.js';

type TxClient = {
  actionToken: typeof prisma.actionToken;
  invitation: typeof prisma.invitation;
  user: typeof prisma.user;
  authSession: typeof prisma.authSession;
};

function getTxClient(tx: Prisma.TransactionClient): TxClient {
  const t = tx as unknown as Partial<TxClient>;
  return {
    actionToken: t.actionToken ?? prisma.actionToken,
    invitation: t.invitation ?? prisma.invitation,
    user: t.user ?? prisma.user,
    authSession: t.authSession ?? prisma.authSession,
  };
}

export const INVITATION_ACCEPTANCE_PURPOSES = [
  'ORGANISATION_ADMIN_PROMOTION',
  'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
] as const satisfies readonly ActionTokenPurpose[];

export const INVITATION_CONTEXT_PURPOSES = [
  ...INVITATION_ACCEPTANCE_PURPOSES,
  'INITIAL_ORGANISATION_ADMIN_SETUP',
  'ORGANISATION_TRAINEE_INVITE',
  'PLATFORM_ADMIN_INVITE',
] as const satisfies readonly ActionTokenPurpose[];

export type InvitationTokenPurpose = (typeof INVITATION_CONTEXT_PURPOSES)[number];

function isInvitationTokenPurpose(purpose: string): purpose is InvitationTokenPurpose {
  return (INVITATION_CONTEXT_PURPOSES as readonly string[]).includes(purpose);
}

function isInvitationAcceptancePurpose(
  purpose: string,
): purpose is (typeof INVITATION_ACCEPTANCE_PURPOSES)[number] {
  return (INVITATION_ACCEPTANCE_PURPOSES as readonly string[]).includes(purpose);
}

export class InvitationFlowError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorKey: string,
    message: string,
  ) {
    super(message);
    this.name = 'InvitationFlowError';
  }
}

function mapPurposeToInvitationType(purpose: ActionTokenPurpose): InvitationTypeDto {
  switch (purpose) {
    case 'INITIAL_ORGANISATION_ADMIN_SETUP':
      return 'INITIAL_ORGANISATION_ADMIN_SETUP';
    case 'ORGANISATION_TRAINEE_INVITE':
      return 'ORGANISATION_TRAINEE';
    case 'ORGANISATION_ADMIN_PROMOTION':
      return 'ORGANISATION_ADMIN_PROMOTION';
    case 'PLATFORM_ADMIN_INVITE':
      return 'PLATFORM_ADMIN';
    case 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION':
      return 'PLATFORM_ADMIN';
    default:
      throw new InvitationFlowError(401, 'TOKEN_INVALID', 'Invitation token purpose is invalid.');
  }
}

function mapPurposeToRoleGranted(purpose: ActionTokenPurpose): InvitationRoleGrantedDto {
  switch (purpose) {
    case 'INITIAL_ORGANISATION_ADMIN_SETUP':
    case 'ORGANISATION_ADMIN_PROMOTION':
      return 'ORGANISATION_ADMIN';
    case 'ORGANISATION_TRAINEE_INVITE':
      return 'ORGANISATION_TRAINEE';
    case 'PLATFORM_ADMIN_INVITE':
    case 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION':
      return 'PLATFORM_ADMIN';
    default:
      throw new InvitationFlowError(401, 'TOKEN_INVALID', 'Invitation token purpose is invalid.');
  }
}

function userTypeToAuditActorType(userType: UserType): AuditActorType {
  switch (userType) {
    case 'IP_ADMIN':
      return 'IP_ADMIN';
    case 'ORGANISATION_ADMIN':
      return 'ORGANISATION_ADMIN';
    case 'ORGANISATION_TRAINEE':
      return 'ORGANISATION_TRAINEE';
    case 'GENERAL_TRAINEE':
      return 'GENERAL_TRAINEE';
  }
}

function getNormalizedAuthContext(authContext?: string | { userId?: string; email?: string }) {
  return typeof authContext === 'string' ? { userId: undefined, email: authContext } : authContext;
}

function requireInvitationTargetMatch(input: {
  normAuth: { userId?: string; email?: string } | undefined;
  targetUserId: string | undefined;
  targetEmail: string;
}) {
  const { normAuth, targetUserId, targetEmail } = input;

  if (
    (normAuth?.userId && targetUserId && normAuth.userId !== targetUserId) ||
    normAuth?.email?.trim().toLowerCase() !== targetEmail.trim().toLowerCase()
  ) {
    throw new InvitationFlowError(
      403,
      'AUTH_USER_MISMATCH',
      'You are currently logged in with a different account than the invitation target. Please log in as the invited user to accept.',
    );
  }
}

function assertInvitationAcceptanceTokenState(
  resolved: Awaited<ReturnType<typeof resolveTokenAndInvitation>>,
  now: Date,
) {
  const tokenTx = resolved.token;

  if (tokenTx.revokedAt || tokenTx.usedAt || tokenTx.expiresAt.getTime() <= now.getTime()) {
    throw new InvitationFlowError(
      409,
      'INVITATION_EXPIRED',
      'Invitation action token is no longer active.',
    );
  }

  if (!isInvitationAcceptancePurpose(tokenTx.purpose)) {
    throw new InvitationFlowError(
      409,
      'SETUP_REQUIRED',
      'This invitation requires account setup or must be completed via the setup flow.',
    );
  }
}

function assertInvitationAcceptanceEligibility(input: {
  resolved: Awaited<ReturnType<typeof resolveTokenAndInvitation>>;
  existingUser: NonNullable<Awaited<ReturnType<typeof findUserByEmailWithProfiles>>>;
  invitationRole: InvitationRoleGrantedDto;
}) {
  const { resolved, existingUser, invitationRole } = input;

  if (resolved.invitation) {
    if (!isActiveInvitationStatus(resolved.invitation.status)) {
      throw new InvitationFlowError(
        409,
        'INVITATION_ACCEPTED',
        'Invitation is no longer pending or valid.',
      );
    }

    if (
      resolved.invitation.organisation?.status === 'SUSPENDED' ||
      resolved.invitation.organisation?.status === 'DISABLED'
    ) {
      throw new InvitationFlowError(
        409,
        'ORGANISATION_SUSPENDED',
        'Organisation is currently suspended or inactive.',
      );
    }
  }

  if (
    existingUser.authStatus === 'DISABLED' ||
    existingUser.traineeProfile?.organisationTraineeProfile?.membershipStatus === 'DISABLED' ||
    existingUser.organisationAdminProfile?.adminStatus === 'DISABLED' ||
    existingUser.ipAdminProfile?.adminStatus === 'DISABLED'
  ) {
    throw new InvitationFlowError(409, 'ACCOUNT_DISABLED', 'Account or profile is disabled.');
  }

  const existingOrgId =
    existingUser.traineeProfile?.organisationTraineeProfile?.organisationId ??
    existingUser.organisationAdminProfile?.organisationId;
  if (
    resolved.invitation &&
    resolved.invitation.organisationId &&
    existingOrgId &&
    existingOrgId !== resolved.invitation.organisationId
  ) {
    throw new InvitationFlowError(
      409,
      'CROSS_ORGANISATION_CONFLICT',
      'Account already belongs to another organisation.',
    );
  }

  if (invitationRole === 'PLATFORM_ADMIN' || invitationRole === 'IP_ADMIN') {
    if (
      existingUser.userType === 'ORGANISATION_ADMIN' ||
      existingUser.organisationAdminProfile?.adminStatus === 'ACTIVE'
    ) {
      throw new InvitationFlowError(
        409,
        'ROLE_TRANSITION_CONFLICT',
        'An active organisation administrator cannot directly accept a platform administrator upgrade.',
      );
    }
  }
}

type AcceptanceTransactionInvitation = {
  id: string;
  status: string;
  organisationId: string;
  organisation?: { status: string } | null;
  permissionGrants?: Array<{ organisationPermissionId: string }> | null;
};

type AcceptanceTransactionUser = NonNullable<
  Awaited<ReturnType<typeof findUserByEmailWithProfiles>>
>;

function assertAcceptanceTransactionState(input: {
  tokenTx: {
    revokedAt: Date | null;
    usedAt: Date | null;
    expiresAt: Date;
  };
  invTx: AcceptanceTransactionInvitation | null;
  userTx: AcceptanceTransactionUser;
  invitationRole: InvitationRoleGrantedDto;
  now: Date;
}) {
  const { tokenTx, invTx, userTx, invitationRole, now } = input;

  if (tokenTx.revokedAt || tokenTx.usedAt || tokenTx.expiresAt.getTime() <= now.getTime()) {
    throw new InvitationFlowError(
      409,
      'INVITATION_EXPIRED',
      'Invitation action token is no longer active.',
    );
  }

  if (invTx) {
    if (!isActiveInvitationStatus(invTx.status)) {
      throw new InvitationFlowError(
        409,
        'INVITATION_ACCEPTED',
        'Invitation is no longer pending or valid.',
      );
    }

    if (invTx.organisation?.status === 'SUSPENDED' || invTx.organisation?.status === 'DISABLED') {
      throw new InvitationFlowError(
        409,
        'ORGANISATION_SUSPENDED',
        'Organisation is currently suspended or inactive.',
      );
    }
  }

  if (
    userTx.authStatus === 'DISABLED' ||
    userTx.traineeProfile?.organisationTraineeProfile?.membershipStatus === 'DISABLED' ||
    userTx.organisationAdminProfile?.adminStatus === 'DISABLED' ||
    userTx.ipAdminProfile?.adminStatus === 'DISABLED'
  ) {
    throw new InvitationFlowError(409, 'ACCOUNT_DISABLED', 'Account or profile is disabled.');
  }

  const existingOrgId =
    userTx.traineeProfile?.organisationTraineeProfile?.organisationId ??
    userTx.organisationAdminProfile?.organisationId;
  if (invTx && invTx.organisationId && existingOrgId && existingOrgId !== invTx.organisationId) {
    throw new InvitationFlowError(
      409,
      'CROSS_ORGANISATION_CONFLICT',
      'Account already belongs to another organisation.',
    );
  }

  if (invitationRole === 'PLATFORM_ADMIN' || invitationRole === 'IP_ADMIN') {
    if (
      userTx.userType === 'ORGANISATION_ADMIN' ||
      userTx.organisationAdminProfile?.adminStatus === 'ACTIVE'
    ) {
      throw new InvitationFlowError(
        409,
        'ROLE_TRANSITION_CONFLICT',
        'An active organisation administrator cannot directly accept a platform administrator upgrade.',
      );
    }
  }
}

async function completeInvitationAcceptanceTransaction(input: {
  resolved: Awaited<ReturnType<typeof resolveTokenAndInvitation>>;
  existingUser: NonNullable<Awaited<ReturnType<typeof findUserByEmailWithProfiles>>>;
  invitationRole: InvitationRoleGrantedDto;
  confirmRoleChange: boolean | undefined;
  now: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  const { resolved, existingUser, invitationRole, confirmRoleChange, now, ipAddress, userAgent } =
    input;

  const txResult = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const {
      actionToken: tokenClient,
      invitation: invClient,
      user: userClient,
      authSession: authSessionClient,
    } = getTxClient(tx);

    const tokenTx = await tokenClient.findUnique({ where: { id: resolved.token.id } });
    const invTx = resolved.invitation
      ? await invClient.findUnique({
          where: { id: resolved.invitation.id },
          include: { organisation: true, permissionGrants: true },
        })
      : null;
    const userTx = await userClient.findUnique({
      where: { id: existingUser.id },
      include: {
        traineeProfile: { include: { organisationTraineeProfile: true } },
        organisationAdminProfile: true,
        ipAdminProfile: true,
      },
    });

    if (!tokenTx || !userTx) {
      throw new InvitationFlowError(
        409,
        'INVITATION_EXPIRED',
        'Invitation action token is no longer active.',
      );
    }

    assertAcceptanceTransactionState({
      tokenTx,
      invTx,
      userTx,
      invitationRole,
      now,
    });

    if (invTx) {
      await claimInvitationAccept(invTx.id, tx);
    }
    await claimInvitationToken(tokenTx.id, tx);

    const roleUpdate = await updateUserRoleAndProfilesFromInvitation(
      {
        userId: userTx.id,
        newRole: invitationRole,
        organisationId: invTx?.organisationId ?? null,
        invitationId: invTx?.id ?? null,
      },
      tx,
    );

    const isPromotion = userTx.userType !== roleUpdate.userType;

    if (
      invitationRole === 'ORGANISATION_ADMIN' &&
      roleUpdate.adminProfileId &&
      invTx?.permissionGrants
    ) {
      await insertInvitationPermissionGrantsToAdmin(
        invTx.organisationId,
        roleUpdate.adminProfileId,
        invTx.permissionGrants,
        tx,
      );
    }

    if (invitationRole === 'PLATFORM_ADMIN') {
      await authSessionClient.updateMany({
        where: { userId: userTx.id, revokedAt: null },
        data: {
          revokedAt: now,
          revokedReason: 'OTHER',
        },
      });
    }

    await recordAuditLog(
      {
        actorUserId: userTx.id,
        actorType: userTypeToAuditActorType(roleUpdate.userType),
        organisationId: invTx?.organisationId ?? null,
        targetType: invTx ? 'INVITATION' : 'ACTION_TOKEN',
        targetId: invTx?.id ?? tokenTx.id,
        actionType: 'ACCEPTED',
        outcome: 'SUCCESS',
        oldValues: { userType: userTx.userType },
        newValues: { userType: roleUpdate.userType, role: invitationRole },
        metadata: {
          actionTokenId: tokenTx.id,
          isPromotion,
          confirmRoleChange: confirmRoleChange ?? false,
        },
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
      tx,
    );

    if (isPromotion && invitationRole === 'ORGANISATION_ADMIN') {
      await recordAuditLog(
        {
          actorUserId: userTx.id,
          actorType: userTypeToAuditActorType(roleUpdate.userType),
          organisationId: invTx?.organisationId ?? null,
          targetType: 'USER',
          targetId: userTx.id,
          actionType: 'PROMOTED',
          outcome: 'SUCCESS',
          oldValues: { userType: userTx.userType },
          newValues: { userType: roleUpdate.userType },
          metadata: { invitationId: invTx?.id ?? null },
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
        tx,
      );
    }

    return {
      sessionOutcome:
        invitationRole === 'PLATFORM_ADMIN'
          ? ('REAUTHENTICATE' as const)
          : ('REFRESH_AUTH_CONTEXT' as const),
    };
  });

  return txResult;
}

function assertRejectionTransactionState(input: {
  tokenTx: {
    revokedAt: Date | null;
    usedAt: Date | null;
    expiresAt: Date;
  };
  invTx: { status: string } | null;
  now: Date;
}) {
  const { tokenTx, invTx, now } = input;

  if (
    tokenTx.revokedAt ||
    tokenTx.usedAt ||
    tokenTx.expiresAt.getTime() <= now.getTime() ||
    (invTx && !isActiveInvitationStatus(invTx.status))
  ) {
    throw new InvitationFlowError(
      409,
      'INVITATION_EXPIRED',
      'Invitation action token is no longer active.',
    );
  }
}

async function completeInvitationRejectionTransaction(input: {
  resolved: Awaited<ReturnType<typeof resolveTokenAndInvitation>>;
  normAuth: { userId?: string; email?: string } | undefined;
  existingUser: Awaited<ReturnType<typeof findUserByEmailWithProfiles>>;
  rejectionReason: string | undefined;
  ipAddress?: string | null;
  userAgent?: string | null;
  now: Date;
}) {
  const { resolved, normAuth, existingUser, rejectionReason, ipAddress, userAgent, now } = input;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const { actionToken: tokenClient, invitation: invClient } = getTxClient(tx);

    const tokenTx = await tokenClient.findUnique({ where: { id: resolved.token.id } });
    const invTx = resolved.invitation
      ? await invClient.findUnique({ where: { id: resolved.invitation.id } })
      : null;

    if (!tokenTx) {
      throw new InvitationFlowError(
        409,
        'INVITATION_EXPIRED',
        'Invitation action token is no longer active.',
      );
    }

    assertRejectionTransactionState({ tokenTx, invTx, now });

    if (resolved.invitation) {
      await claimInvitationReject(resolved.invitation.id, tx);
    }
    await claimInvitationToken(resolved.token.id, tx);

    const actorType = resolveRejectActorType(normAuth, existingUser);
    const actorUserId =
      actorType === 'SYSTEM' ? null : (normAuth?.userId ?? existingUser?.id ?? null);

    await recordAuditLog(
      {
        actorUserId,
        actorType,
        organisationId: resolved.invitation?.organisationId ?? null,
        targetType: resolved.invitation ? 'INVITATION' : 'ACTION_TOKEN',
        targetId: resolved.invitation?.id ?? resolved.token.id,
        actionType: 'REJECTED',
        outcome: 'SUCCESS',
        metadata: {
          actionTokenId: resolved.token.id,
          rejectionReason: rejectionReason ?? null,
          isUnauthenticated: !normAuth,
        },
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
      tx,
    );
  });
}

async function resolveTokenAndInvitation(rawToken: string, now = new Date()) {
  const tokenHash = hashOpaqueToken(rawToken);
  const token = await findInvitationTokenByHash(tokenHash);

  if (!token || !isInvitationTokenPurpose(token.purpose)) {
    throw new InvitationFlowError(401, 'TOKEN_INVALID', 'Invitation link is invalid or not found.');
  }

  const invitation = token.invitation;
  if (
    !invitation &&
    token.purpose !== 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION' &&
    token.purpose !== 'PLATFORM_ADMIN_INVITE'
  ) {
    throw new InvitationFlowError(
      401,
      'TOKEN_INVALID',
      'Invitation link is missing its associated invitation record.',
    );
  }

  if (invitation?.organisation?.status === 'SUSPENDED') {
    throw new InvitationFlowError(
      409,
      'ORGANISATION_SUSPENDED',
      'Organisation is currently suspended or inactive.',
    );
  }

  const targetEmail = (token.targetEmail ?? invitation?.recipientEmail ?? token.user?.email ?? '')
    .trim()
    .toLowerCase();

  if (!targetEmail) {
    throw new InvitationFlowError(
      409,
      'TARGET_EMAIL_MISSING',
      'Target email could not be resolved from invitation link.',
    );
  }

  let status: InvitationContextResponseDto['status'] = 'PENDING';

  if (token.revokedAt || invitation?.status === 'REVOKED') {
    status = 'REVOKED';
  } else if (token.usedAt) {
    status = 'USED';
  } else if (invitation?.status === 'ACCEPTED' || invitation?.status === 'COMPLETED') {
    status = 'ACCEPTED';
  } else if (invitation?.status === 'REJECTED') {
    status = 'REJECTED';
  } else if (token.expiresAt.getTime() <= now.getTime() || invitation?.status === 'EXPIRED') {
    status = 'EXPIRED';
  } else if (
    invitation?.status === 'PENDING' ||
    invitation?.status === 'SENT' ||
    invitation?.status === 'FAILED_TO_SEND'
  ) {
    status = invitation.status;
  }

  return { token, invitation, targetEmail, status };
}

function assertActiveTokenForMutation(
  resolved: Awaited<ReturnType<typeof resolveTokenAndInvitation>>,
) {
  if (resolved.status === 'REVOKED') {
    throw new InvitationFlowError(
      409,
      'INVITATION_REVOKED',
      'Invitation action token has been revoked.',
    );
  }
  if (resolved.status === 'USED') {
    throw new InvitationFlowError(
      409,
      'TOKEN_USED',
      'Invitation action token has already been used.',
    );
  }
  if (resolved.status === 'ACCEPTED') {
    throw new InvitationFlowError(
      409,
      'INVITATION_ACCEPTED',
      'Invitation has already been accepted.',
    );
  }
  if (resolved.status === 'REJECTED') {
    throw new InvitationFlowError(
      409,
      'INVITATION_REJECTED',
      'Invitation has already been rejected.',
    );
  }
  if (resolved.status === 'EXPIRED') {
    throw new InvitationFlowError(409, 'INVITATION_EXPIRED', 'Invitation has expired.');
  }
}

function assertRoleConflictMatrix(
  existingUser: NonNullable<Awaited<ReturnType<typeof findUserByEmailWithProfiles>>>,
  invitationRole: InvitationRoleGrantedDto,
  confirmRoleChange?: boolean,
) {
  const currentUserType = existingUser.userType;

  if (currentUserType === 'IP_ADMIN' && invitationRole === 'ORGANISATION_TRAINEE') {
    throw new InvitationFlowError(
      409,
      'ROLE_CONFLICT',
      'Platform administrators cannot accept organisation trainee invitations.',
    );
  }

  if (currentUserType === 'ORGANISATION_TRAINEE' && invitationRole === 'PLATFORM_ADMIN') {
    throw new InvitationFlowError(
      409,
      'ROLE_CONFLICT',
      'Organisation trainees cannot accept platform administrator invitations.',
    );
  }

  if (currentUserType === 'IP_ADMIN' && invitationRole === 'ORGANISATION_ADMIN') {
    throw new InvitationFlowError(
      409,
      'ROLE_CONFLICT',
      'Platform administrators cannot accept organisation admin invitations.',
    );
  }

  if (currentUserType === 'ORGANISATION_ADMIN' && invitationRole === 'ORGANISATION_TRAINEE') {
    throw new InvitationFlowError(
      409,
      'ROLE_CONFLICT',
      'Organisation administrators cannot accept organisation trainee invitations.',
    );
  }

  if (currentUserType === 'ORGANISATION_TRAINEE' && invitationRole === 'ORGANISATION_ADMIN') {
    if (confirmRoleChange !== true) {
      throw new InvitationFlowError(
        409,
        'ROLE_CHANGE_CONFIRMATION_REQUIRED',
        'Accepting this invitation will promote your account from Organisation Trainee to Organisation Admin. Please confirm role change by providing confirmRoleChange: true.',
      );
    }
  }

  if (currentUserType === 'ORGANISATION_ADMIN' && invitationRole === 'PLATFORM_ADMIN') {
    throw new InvitationFlowError(
      409,
      'ROLE_TRANSITION_CONFLICT',
      'An active organisation administrator cannot directly accept a platform administrator upgrade.',
    );
  }
}

function determineRequiredAction(
  isTokenAvailable: boolean,
  authEmail: string | undefined,
  isTargetUserMatch: boolean,
  purpose: ActionTokenPurpose,
  accountExists: boolean,
):
  | 'CONTINUE_SETUP'
  | 'LOGIN_REQUIRED'
  | 'SWITCH_ACCOUNT'
  | 'CONFIRM_ROLE_CHANGE'
  | 'TOKEN_UNAVAILABLE' {
  if (!isTokenAvailable) {
    return 'TOKEN_UNAVAILABLE';
  }
  if (authEmail && !isTargetUserMatch) {
    return 'SWITCH_ACCOUNT';
  }
  if (
    purpose === 'INITIAL_ORGANISATION_ADMIN_SETUP' ||
    purpose === 'PLATFORM_ADMIN_INVITE' ||
    purpose === 'ORGANISATION_TRAINEE_INVITE' ||
    !accountExists
  ) {
    return 'CONTINUE_SETUP';
  }
  if (!authEmail) {
    return 'LOGIN_REQUIRED';
  }
  return 'CONFIRM_ROLE_CHANGE';
}

function buildConfirmRoleChangeResponse(
  resolved: Awaited<ReturnType<typeof resolveTokenAndInvitation>>,
  rejectAllowed: boolean,
  invitationType: InvitationTypeDto,
  roleGranted: InvitationRoleGrantedDto,
  isOrgScoped: boolean,
): InvitationContextResponseDto {
  return {
    requiredAction: 'CONFIRM_ROLE_CHANGE',
    status: resolved.status,
    expiresAt: resolved.token.expiresAt.toISOString(),
    rejectAllowed,
    invitationType,
    roleGranted,
    organisationId: isOrgScoped ? (resolved.invitation?.organisationId ?? undefined) : undefined,
    organisationName: isOrgScoped
      ? (resolved.invitation?.organisation?.name ?? 'Unknown Organisation')
      : undefined,
    permissions:
      roleGranted === 'ORGANISATION_ADMIN' && resolved.invitation?.permissionGrants
        ? resolved.invitation.permissionGrants.map(
            (g: { organisationPermissionId: string }) => g.organisationPermissionId,
          )
        : undefined,
  };
}

export async function getInvitationTokenContext(
  rawToken: string,
  authContext?: string | { userId?: string; email?: string },
  now = new Date(),
): Promise<InvitationContextResponseDto> {
  const normAuth =
    typeof authContext === 'string' ? { userId: undefined, email: authContext } : authContext;

  const resolved = await resolveTokenAndInvitation(rawToken, now);
  const existingUser = resolved.targetEmail
    ? await findUserByEmailWithProfiles(resolved.targetEmail)
    : null;
  const accountExists = Boolean(existingUser);
  const invitationRole = mapPurposeToRoleGranted(resolved.token.purpose);
  const invitationType = mapPurposeToInvitationType(resolved.token.purpose);

  const isOrgScoped = [
    'ORGANISATION_ADMIN',
    'ORGANISATION_TRAINEE',
    'INITIAL_ORGANISATION_ADMIN_SETUP',
    'ORGANISATION_ADMIN_PROMOTION',
  ].includes(invitationType);

  const isTokenAvailable = isActiveInvitationStatus(resolved.status);
  const rejectAllowed = isTokenAvailable && invitationType !== 'PLATFORM_ADMIN';

  const targetUserId = resolved.token.userId ?? resolved.token.user?.id ?? existingUser?.id;
  const authEmail = normAuth?.email;
  const isTargetUserMatch = Boolean(
    authEmail &&
    (!targetUserId || !normAuth?.userId || normAuth.userId === targetUserId) &&
    authEmail.trim().toLowerCase() === resolved.targetEmail.trim().toLowerCase(),
  );

  const requiredAction = determineRequiredAction(
    isTokenAvailable,
    authEmail,
    isTargetUserMatch,
    resolved.token.purpose,
    accountExists,
  );

  if (requiredAction !== 'CONFIRM_ROLE_CHANGE') {
    return {
      requiredAction,
      status: resolved.status,
      expiresAt: resolved.token.expiresAt.toISOString(),
      rejectAllowed,
    };
  }

  return buildConfirmRoleChangeResponse(
    resolved,
    rejectAllowed,
    invitationType,
    invitationRole,
    isOrgScoped,
  );
}

export async function acceptInvitationWithToken(
  rawToken: string,
  input: InvitationAcceptRequestDto,
  authContext?: string | { userId?: string; email?: string },
  ipAddress?: string | null,
  userAgent?: string | null,
  now = new Date(),
): Promise<InvitationAcceptResponseDto> {
  const normAuth =
    typeof authContext === 'string' ? { userId: undefined, email: authContext } : authContext;

  const resolved = await resolveTokenAndInvitation(rawToken, now);
  assertActiveTokenForMutation(resolved);

  if (!normAuth?.email) {
    throw new InvitationFlowError(401, 'AUTH_REQUIRED', 'Authentication credentials are required.');
  }

  const existingUser = await findUserByEmailWithProfiles(resolved.targetEmail);

  if (!existingUser) {
    throw new InvitationFlowError(
      409,
      'SETUP_REQUIRED',
      'Account setup is required before accepting this invitation. Please complete setup via the setup flow.',
    );
  }

  const targetUserId = resolved.token.userId ?? resolved.token.user?.id ?? existingUser.id;
  if (
    (normAuth.userId && targetUserId && normAuth.userId !== targetUserId) ||
    normAuth.email.trim().toLowerCase() !== resolved.targetEmail.trim().toLowerCase()
  ) {
    throw new InvitationFlowError(
      403,
      'AUTH_USER_MISMATCH',
      'You are currently logged in with a different account than the invitation target. Please log in as the invited user to accept.',
    );
  }

  const invitationRole = mapPurposeToRoleGranted(resolved.token.purpose);
  assertRoleConflictMatrix(existingUser, invitationRole, input.confirmRoleChange);

  if (!isInvitationAcceptancePurpose(resolved.token.purpose)) {
    throw new InvitationFlowError(
      409,
      'SETUP_REQUIRED',
      'This invitation requires account setup or must be completed via the setup flow.',
    );
  }

  try {
    const txResult = await completeInvitationAcceptanceTransaction({
      resolved,
      existingUser,
      invitationRole,
      confirmRoleChange: input.confirmRoleChange,
      now,
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'Invitation accepted successfully.',
      roleGranted: invitationRole,
      organisationId: resolved.invitation?.organisationId ?? undefined,
      sessionOutcome: txResult.sessionOutcome,
    };
  } catch (error) {
    if (error instanceof InvitationRepositoryConflictError) {
      throw new InvitationFlowError(409, error.errorKey, error.message);
    }
    throw error;
  }
}

function resolveRejectActorType(
  normAuth: { userId?: string; email?: string } | undefined,
  existingUser: { userType: UserType } | null,
): AuditActorType | 'SYSTEM' {
  if (!normAuth) {
    return 'SYSTEM';
  }
  if (existingUser) {
    return userTypeToAuditActorType(existingUser.userType);
  }
  return 'GENERAL_TRAINEE';
}

export async function rejectInvitationWithToken(
  rawToken: string,
  input: InvitationRejectRequestDto,
  authContext?: string | { userId?: string; email?: string },
  ipAddress?: string | null,
  userAgent?: string | null,
  now = new Date(),
): Promise<InvitationRejectResponseDto> {
  const normAuth =
    typeof authContext === 'string' ? { userId: undefined, email: authContext } : authContext;

  const resolved = await resolveTokenAndInvitation(rawToken, now);
  assertActiveTokenForMutation(resolved);

  const invitationType = mapPurposeToInvitationType(resolved.token.purpose);
  if (invitationType === 'PLATFORM_ADMIN') {
    throw new InvitationFlowError(
      409,
      'INVITATION_NOT_REJECTABLE',
      'Platform administrator invitations cannot be rejected via this link.',
    );
  }

  const existingUser = await findUserByEmailWithProfiles(resolved.targetEmail);
  const targetUserId = resolved.token.userId ?? resolved.token.user?.id ?? existingUser?.id;

  if (normAuth?.email) {
    if (
      (normAuth.userId && targetUserId && normAuth.userId !== targetUserId) ||
      normAuth.email.trim().toLowerCase() !== resolved.targetEmail.trim().toLowerCase()
    ) {
      throw new InvitationFlowError(
        403,
        'AUTH_USER_MISMATCH',
        'You are currently logged in with a different account than the invitation target.',
      );
    }
  }

  try {
    await completeInvitationRejectionTransaction({
      resolved,
      normAuth,
      existingUser,
      rejectionReason: input.rejectionReason,
      ipAddress,
      userAgent,
      now,
    });

    return {
      success: true,
      message: 'Invitation rejected successfully.',
    };
  } catch (error) {
    if (error instanceof InvitationRepositoryConflictError) {
      throw new InvitationFlowError(409, error.errorKey, error.message);
    }
    throw error;
  }
}
