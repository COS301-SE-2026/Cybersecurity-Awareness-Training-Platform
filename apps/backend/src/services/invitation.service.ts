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

export const INVITATION_ACCEPTANCE_PURPOSES = [
  'INITIAL_ORGANISATION_ADMIN_SETUP',
  'ORGANISATION_TRAINEE_INVITE',
  'ORGANISATION_ADMIN_PROMOTION',
  'PLATFORM_ADMIN_INVITE',
  'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
] as const satisfies readonly ActionTokenPurpose[];

export type InvitationTokenPurpose = (typeof INVITATION_ACCEPTANCE_PURPOSES)[number];

function isInvitationTokenPurpose(purpose: string): purpose is InvitationTokenPurpose {
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

async function resolveTokenAndInvitation(rawToken: string, now = new Date()) {
  const tokenHash = hashOpaqueToken(rawToken);
  const token = await findInvitationTokenByHash(tokenHash);

  if (!token || !isInvitationTokenPurpose(token.purpose)) {
    throw new InvitationFlowError(401, 'TOKEN_INVALID', 'Invitation link is invalid or not found.');
  }

  const invitation = token.invitation;
  if (!invitation) {
    throw new InvitationFlowError(
      401,
      'TOKEN_INVALID',
      'Invitation link is missing its associated invitation record.',
    );
  }

  if (invitation.organisation?.status === 'SUSPENDED') {
    throw new InvitationFlowError(
      409,
      'ORGANISATION_SUSPENDED',
      'Organisation is currently suspended or inactive.',
    );
  }

  const targetEmail = (token.targetEmail ?? invitation.recipientEmail ?? token.user?.email ?? '')
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

  if (token.revokedAt || invitation.status === 'REVOKED') {
    status = 'REVOKED';
  } else if (token.usedAt) {
    status = 'USED';
  } else if (invitation.status === 'ACCEPTED' || invitation.status === 'COMPLETED') {
    status = 'ACCEPTED';
  } else if (invitation.status === 'REJECTED') {
    status = 'REJECTED';
  } else if (token.expiresAt.getTime() <= now.getTime() || invitation.status === 'EXPIRED') {
    status = 'EXPIRED';
  } else if (invitation.status === 'SENT' || invitation.status === 'PENDING') {
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

function assertLoggedInUserMismatch(reqAuthEmail: string | undefined, targetEmail: string) {
  if (reqAuthEmail && reqAuthEmail.trim().toLowerCase() !== targetEmail.trim().toLowerCase()) {
    throw new InvitationFlowError(
      403,
      'AUTH_USER_MISMATCH',
      `You are currently logged in as ${reqAuthEmail}. Please log out to accept or interact with the invitation for ${targetEmail}.`,
    );
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
}

export async function getInvitationTokenContext(
  rawToken: string,
  authEmail?: string,
  now = new Date(),
): Promise<InvitationContextResponseDto> {
  const resolved = await resolveTokenAndInvitation(rawToken, now);
  assertLoggedInUserMismatch(authEmail, resolved.targetEmail);

  const existingUser = await findUserByEmailWithProfiles(resolved.targetEmail);
  const accountExists = Boolean(existingUser);
  const invitationRole = mapPurposeToRoleGranted(resolved.token.purpose);
  const invitationType = mapPurposeToInvitationType(resolved.token.purpose);

  const isOrgScoped = [
    'ORGANISATION_ADMIN',
    'ORGANISATION_TRAINEE',
    'INITIAL_ORGANISATION_ADMIN_SETUP',
    'ORGANISATION_ADMIN_PROMOTION',
  ].includes(invitationType);

  return {
    invitationType,
    targetEmail: resolved.targetEmail,
    organisationId: isOrgScoped ? resolved.invitation.organisationId : undefined,
    organisationName: isOrgScoped
      ? (resolved.invitation.organisation?.name ?? 'Unknown Organisation')
      : undefined,
    roleGranted: invitationRole,
    accountExists,
    requiresLogin: accountExists,
    requiresSetup: !accountExists,
    status: resolved.status,
    expiresAt: resolved.token.expiresAt.toISOString(),
  };
}

export async function acceptInvitationWithToken(
  rawToken: string,
  input: InvitationAcceptRequestDto,
  authEmail?: string,
  ipAddress?: string | null,
  userAgent?: string | null,
  now = new Date(),
): Promise<InvitationAcceptResponseDto> {
  const resolved = await resolveTokenAndInvitation(rawToken, now);
  assertActiveTokenForMutation(resolved);
  assertLoggedInUserMismatch(authEmail, resolved.targetEmail);

  const existingUser = await findUserByEmailWithProfiles(resolved.targetEmail);
  const invitationRole = mapPurposeToRoleGranted(resolved.token.purpose);

  if (!existingUser) {
    throw new InvitationFlowError(
      409,
      'SETUP_REQUIRED',
      'Account setup is required before accepting this invitation. Please complete setup via the setup flow.',
    );
  }

  assertRoleConflictMatrix(existingUser, invitationRole, input.confirmRoleChange);

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await claimInvitationAccept(resolved.invitation.id, tx);
      await claimInvitationToken(resolved.token.id, tx);

      const roleUpdate = await updateUserRoleAndProfilesFromInvitation(
        {
          userId: existingUser.id,
          newRole: invitationRole,
          organisationId: resolved.invitation.organisationId,
          invitationId: resolved.invitation.id,
        },
        tx,
      );

      const isPromotion = existingUser.userType !== roleUpdate.userType;

      if (invitationRole === 'ORGANISATION_ADMIN' && roleUpdate.adminProfileId) {
        await insertInvitationPermissionGrantsToAdmin(
          resolved.invitation.organisationId,
          roleUpdate.adminProfileId,
          resolved.invitation.permissionGrants,
          tx,
        );
      }

      await recordAuditLog(
        {
          actorUserId: existingUser.id,
          actorType: userTypeToAuditActorType(roleUpdate.userType),
          organisationId: resolved.invitation.organisationId ?? null,
          targetType: 'INVITATION',
          targetId: resolved.invitation.id,
          actionType: 'ACCEPTED',
          outcome: 'SUCCESS',
          oldValues: { userType: existingUser.userType },
          newValues: { userType: roleUpdate.userType, role: invitationRole },
          metadata: {
            actionTokenId: resolved.token.id,
            isPromotion,
            confirmRoleChange: input.confirmRoleChange ?? false,
          },
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
        tx,
      );

      if (isPromotion && invitationRole === 'ORGANISATION_ADMIN') {
        await recordAuditLog(
          {
            actorUserId: existingUser.id,
            actorType: userTypeToAuditActorType(roleUpdate.userType),
            organisationId: resolved.invitation.organisationId ?? null,
            targetType: 'USER',
            targetId: existingUser.id,
            actionType: 'PROMOTED',
            outcome: 'SUCCESS',
            oldValues: { userType: existingUser.userType },
            newValues: { userType: roleUpdate.userType },
            metadata: { invitationId: resolved.invitation.id },
            ipAddress: ipAddress ?? null,
            userAgent: userAgent ?? null,
          },
          tx,
        );
      }
    });

    return {
      success: true,
      message: 'Invitation accepted successfully.',
    };
  } catch (error) {
    if (error instanceof InvitationRepositoryConflictError) {
      throw new InvitationFlowError(409, error.errorKey, error.message);
    }
    throw error;
  }
}

export async function rejectInvitationWithToken(
  rawToken: string,
  input: InvitationRejectRequestDto,
  authEmail?: string,
  ipAddress?: string | null,
  userAgent?: string | null,
  now = new Date(),
): Promise<InvitationRejectResponseDto> {
  const resolved = await resolveTokenAndInvitation(rawToken, now);
  assertActiveTokenForMutation(resolved);
  assertLoggedInUserMismatch(authEmail, resolved.targetEmail);

  const existingUser = await findUserByEmailWithProfiles(resolved.targetEmail);

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await claimInvitationReject(resolved.invitation.id, tx);
      await claimInvitationToken(resolved.token.id, tx);

      await recordAuditLog(
        {
          actorUserId: existingUser?.id ?? null,
          actorType: existingUser ? userTypeToAuditActorType(existingUser.userType) : 'SYSTEM',
          organisationId: resolved.invitation.organisationId ?? null,
          targetType: 'INVITATION',
          targetId: resolved.invitation.id,
          actionType: 'REJECTED',
          outcome: 'SUCCESS',
          metadata: {
            actionTokenId: resolved.token.id,
            rejectionReason: input.rejectionReason ?? null,
          },
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
        tx,
      );
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
