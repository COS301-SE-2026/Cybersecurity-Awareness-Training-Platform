import type {
  CreateTraineeInvitationRequestDto,
  CreateTraineeInvitationResponseDto,
  DisableTraineeRequestDto,
  DisableTraineeResponseDto,
  InvitationResendResponseDto,
  InvitationRevokeResponseDto,
  TraineeListResponseDto,
  TraineeListItemDto,
} from '@insightful-phish/shared';
import { OrganisationPermissionKey } from '../generated/prisma/enums.js';
import { prisma } from '../lib/prisma.js';
import { generateOpaqueToken, hashOpaqueToken } from './token-hash.service.js';
import { recordAuditLog } from './audit-log.service.js';
import { sendEmail } from './email.service.js';
import {
  permissionKeysForAdmin,
  requireActorAdmin,
  requirePermission,
} from './organisation-admin.service.js';
import { verifyPassword } from './password.service.js';
import {
  disableOrganisationTraineeProfile,
  findOrganisationTraineeByEmail,
  findOrganisationTraineeById,
  findOrganisationTraineeInvitations,
  findOrganisationTrainees,
  findPendingTraineeInvitationByEmail,
} from '../repositories/organisation-trainee.repository.js';
import {
  findInvitationById,
  findUserByEmailWithProfiles,
} from '../repositories/invitation.repository.js';
import { revokeUserAuthSessions } from '../repositories/auth-session.repository.js';

export class OrganisationTraineeServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorKey: string,
    message: string,
  ) {
    super(message);
    this.name = 'OrganisationTraineeServiceError';
  }

  get error(): string {
    return this.errorKey;
  }
}

function assertTraineeMutationAllowed(status: string) {
  if (status === 'ACTIVE') {
    return;
  }
  throw new OrganisationTraineeServiceError(
    409,
    'ORGANISATION_SUSPENDED',
    'Organisation is suspended or inactive.',
  );
}

export async function listOrganisationTrainees(
  actorUserId: string,
  organisationId: string,
): Promise<TraineeListResponseDto> {
  const actor = await requireActorAdmin(actorUserId, organisationId);
  requirePermission(
    permissionKeysForAdmin(actor),
    OrganisationPermissionKey.VIEW_ORGANISATION_TRAINEES,
  );

  const [traineeProfiles, invitations] = await Promise.all([
    findOrganisationTrainees(organisationId),
    findOrganisationTraineeInvitations(organisationId),
  ]);

  const trainees: TraineeListItemDto[] = traineeProfiles.map((trainee) => {
    let status: TraineeListItemDto['status'] = 'ACTIVE';
    if (trainee.disabledAt || trainee.membershipStatus === 'DISABLED') {
      status = 'DISABLED';
    }

    return {
      email: trainee.traineeProfile.user.email,
      firstName: trainee.traineeProfile.user.firstName ?? undefined,
      lastName: trainee.traineeProfile.user.lastName ?? undefined,
      status,
    };
  });

  const pendingInvitations: TraineeListItemDto[] = [];
  for (const inv of invitations) {
    let status: TraineeListItemDto['status'] = 'INVITE_PENDING';
    if (inv.status === 'FAILED_TO_SEND') {
      status = 'INVITE_FAILED';
    } else if (inv.status !== 'PENDING' && inv.status !== 'SENT') {
      continue;
    }

    pendingInvitations.push({
      email: inv.recipientEmail,
      firstName: inv.recipientFirstName ?? undefined,
      lastName: inv.recipientLastName ?? undefined,
      status,
    });
  }

  return [...trainees, ...pendingInvitations];
}

export async function createOrganisationTraineeInvitation(
  actorUserId: string,
  organisationId: string,
  input: CreateTraineeInvitationRequestDto,
): Promise<CreateTraineeInvitationResponseDto> {
  const actor = await requireActorAdmin(actorUserId, organisationId);
  requirePermission(
    permissionKeysForAdmin(actor),
    OrganisationPermissionKey.INVITE_ORGANISATION_TRAINEES,
  );
  assertTraineeMutationAllowed(actor.organisation.status);

  const normalisedEmail = input.email.trim().toLowerCase();

  const [existingTrainee, existingInvite, existingUser] = await Promise.all([
    findOrganisationTraineeByEmail(organisationId, normalisedEmail),
    findPendingTraineeInvitationByEmail(organisationId, normalisedEmail),
    findUserByEmailWithProfiles(normalisedEmail),
  ]);

  if (
    existingTrainee &&
    existingTrainee.membershipStatus !== 'DISABLED' &&
    !existingTrainee.disabledAt
  ) {
    throw new OrganisationTraineeServiceError(
      409,
      'CANNOT_INVITE_USER',
      'User is already a trainee in this organisation.',
    );
  }

  if (existingInvite) {
    throw new OrganisationTraineeServiceError(
      409,
      'CANNOT_INVITE_USER',
      'A pending invitation already exists for this email address.',
    );
  }

  const isPlatformAdmin = existingUser && existingUser.userType === 'IP_ADMIN';
  const belongsToAnotherOrg =
    existingUser &&
    existingUser.traineeProfile?.organisationTraineeProfile &&
    existingUser.traineeProfile.organisationTraineeProfile.organisationId !== organisationId;

  if (isPlatformAdmin || belongsToAnotherOrg) {
    throw new OrganisationTraineeServiceError(
      409,
      'CANNOT_INVITE_USER',
      'The requested user cannot be invited to this organisation.',
    );
  }

  const requiresAccountConflictResolution = Boolean(
    existingUser &&
    existingUser.userType !== 'ORGANISATION_TRAINEE' &&
    existingUser.userType !== 'GENERAL_TRAINEE',
  );

  return prisma.$transaction(async (tx) => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await tx.invitation.create({
      data: {
        organisationId,
        recipientEmail: normalisedEmail,
        recipientFirstName: input.firstName ?? null,
        recipientLastName: input.lastName ?? null,
        purpose: 'ORGANISATION_TRAINEE_INVITE',
        status: 'PENDING',
        expiresAt,
      },
    });

    const rawToken = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(rawToken);
    const actionToken = await tx.actionToken.create({
      data: {
        tokenHash,
        purpose: 'ORGANISATION_TRAINEE_INVITE',
        invitationId: invitation.id,
        expiresAt,
      },
    });

    await recordAuditLog(
      {
        actorUserId,
        actorType: 'ORGANISATION_ADMIN',
        organisationId,
        targetType: 'INVITATION',
        targetId: invitation.id,
        actionType: 'INVITED',
        newValues: {
          recipientEmail: normalisedEmail,
          purpose: 'ORGANISATION_TRAINEE_INVITE',
        },
      },
      tx,
    );

    await sendEmail(
      {
        emailType: 'ORGANISATION_TRAINEE_INVITE',
        recipientEmail: normalisedEmail,
        relatedEntity: {
          organisationId,
          invitationId: invitation.id,
          actionTokenId: actionToken.id,
        },
        templateData: {
          firstName: input.firstName,
          organisationName: actor.organisation.name,
          actionToken: rawToken,
          actionTokenExpiresAt: expiresAt,
          requiresAccountConflictResolution,
        },
      },
      tx,
    );

    return {
      success: true,
      message: 'Invitation sent successfully.',
    };
  });
}

export async function resendTraineeInvitation(
  actorUserId: string,
  organisationId: string,
  invitationId: string,
): Promise<InvitationResendResponseDto> {
  const actor = await requireActorAdmin(actorUserId, organisationId);
  requirePermission(
    permissionKeysForAdmin(actor),
    OrganisationPermissionKey.INVITE_ORGANISATION_TRAINEES,
  );
  assertTraineeMutationAllowed(actor.organisation.status);

  const invitation = await findInvitationById(invitationId);
  if (
    !invitation ||
    invitation.purpose !== 'ORGANISATION_TRAINEE_INVITE' ||
    invitation.organisationId !== organisationId
  ) {
    throw new OrganisationTraineeServiceError(
      404,
      'INVITATION_NOT_FOUND',
      'Trainee invitation not found.',
    );
  }

  if (invitation.status === 'ACCEPTED') {
    throw new OrganisationTraineeServiceError(
      409,
      'INVITATION_ALREADY_ACCEPTED',
      'Cannot resend an invitation that has already been accepted.',
    );
  }

  if (invitation.status === 'REVOKED') {
    throw new OrganisationTraineeServiceError(
      409,
      'INVITATION_REVOKED',
      'Cannot resend an invitation that has been revoked.',
    );
  }

  const existingUser = await findUserByEmailWithProfiles(invitation.recipientEmail);

  const isPlatformAdmin = existingUser && existingUser.userType === 'IP_ADMIN';
  const belongsToAnotherOrg =
    existingUser &&
    existingUser.traineeProfile?.organisationTraineeProfile &&
    existingUser.traineeProfile.organisationTraineeProfile.organisationId !==
      invitation.organisationId;

  if (isPlatformAdmin || belongsToAnotherOrg) {
    throw new OrganisationTraineeServiceError(
      409,
      'CANNOT_INVITE_USER',
      'The requested user cannot be invited to this organisation.',
    );
  }

  const requiresAccountConflictResolution = Boolean(
    existingUser &&
    existingUser.userType !== 'ORGANISATION_TRAINEE' &&
    existingUser.userType !== 'GENERAL_TRAINEE',
  );

  return prisma.$transaction(async (tx) => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await tx.actionToken.updateMany({
      where: {
        invitationId: invitation.id,
        revokedAt: null,
        usedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    const rawToken = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(rawToken);
    const actionToken = await tx.actionToken.create({
      data: {
        tokenHash,
        purpose: 'ORGANISATION_TRAINEE_INVITE',
        invitationId: invitation.id,
        expiresAt,
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        expiresAt,
        status: 'PENDING',
      },
    });

    await recordAuditLog(
      {
        actorUserId,
        actorType: 'ORGANISATION_ADMIN',
        organisationId: invitation.organisationId,
        targetType: 'INVITATION',
        targetId: invitation.id,
        actionType: 'RESENT',
        newValues: {
          expiresAt: expiresAt.toISOString(),
        },
      },
      tx,
    );

    await sendEmail(
      {
        emailType: 'ORGANISATION_TRAINEE_INVITE',
        recipientEmail: invitation.recipientEmail,
        relatedEntity: {
          organisationId: invitation.organisationId,
          invitationId: invitation.id,
          actionTokenId: actionToken.id,
        },
        templateData: {
          firstName: invitation.recipientFirstName ?? undefined,
          organisationName: actor.organisation.name,
          actionToken: rawToken,
          actionTokenExpiresAt: expiresAt,
          requiresAccountConflictResolution,
        },
      },
      tx,
    );

    const updatedInvitation = await tx.invitation.findUnique({
      where: { id: invitation.id },
    });

    let status: 'PENDING' | 'SENT' | 'FAILED_TO_SEND' = 'SENT';
    if (updatedInvitation?.status === 'PENDING' || updatedInvitation?.status === 'FAILED_TO_SEND') {
      status = updatedInvitation.status;
    }

    return {
      success: true,
      message: 'Invitation resent successfully.',
      invitationId: invitation.id,
      status,
      resentAt: new Date().toISOString(),
    };
  });
}

export async function revokeTraineeInvitation(
  actorUserId: string,
  organisationId: string,
  invitationId: string,
): Promise<InvitationRevokeResponseDto> {
  const actor = await requireActorAdmin(actorUserId, organisationId);
  requirePermission(
    permissionKeysForAdmin(actor),
    OrganisationPermissionKey.INVITE_ORGANISATION_TRAINEES,
  );
  assertTraineeMutationAllowed(actor.organisation.status);

  const invitation = await findInvitationById(invitationId);
  if (
    !invitation ||
    invitation.purpose !== 'ORGANISATION_TRAINEE_INVITE' ||
    invitation.organisationId !== organisationId
  ) {
    throw new OrganisationTraineeServiceError(
      404,
      'INVITATION_NOT_FOUND',
      'Trainee invitation not found.',
    );
  }

  if (invitation.status === 'ACCEPTED') {
    throw new OrganisationTraineeServiceError(
      409,
      'INVITATION_ALREADY_ACCEPTED',
      'Cannot revoke an invitation that has already been accepted.',
    );
  }

  if (invitation.status === 'REVOKED') {
    return {
      success: true,
      message: 'Invitation has already been revoked.',
      invitationId: invitation.id,
      status: 'REVOKED',
      revokedAt: invitation.updatedAt.toISOString(),
    };
  }

  return prisma.$transaction(async (tx) => {
    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'REVOKED',
      },
    });

    await tx.actionToken.updateMany({
      where: {
        invitationId: invitation.id,
        revokedAt: null,
        usedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    await recordAuditLog(
      {
        actorUserId,
        actorType: 'ORGANISATION_ADMIN',
        organisationId: invitation.organisationId,
        targetType: 'INVITATION',
        targetId: invitation.id,
        actionType: 'REVOKED',
        newValues: {
          status: 'REVOKED',
        },
      },
      tx,
    );

    return {
      success: true,
      message: 'Invitation revoked successfully.',
      invitationId: invitation.id,
      status: 'REVOKED',
      revokedAt: new Date().toISOString(),
    };
  });
}

export async function disableOrganisationTrainee(
  actorUserId: string,
  organisationId: string,
  traineeId: string,
  input: DisableTraineeRequestDto,
): Promise<DisableTraineeResponseDto> {
  const actor = await requireActorAdmin(actorUserId, organisationId);
  requirePermission(
    permissionKeysForAdmin(actor),
    OrganisationPermissionKey.REMOVE_ORGANISATION_TRAINEES,
  );
  assertTraineeMutationAllowed(actor.organisation.status);

  const passwordMatches = await verifyPassword(input.password, actor.user.passwordHash);
  if (!passwordMatches) {
    await recordAuditLog({
      actorUserId,
      actorType: 'ORGANISATION_ADMIN',
      organisationId,
      targetType: 'USER',
      targetId: traineeId,
      actionType: 'DISABLED',
      outcome: 'FAILURE',
      metadata: {
        reason: 'INCORRECT_PASSWORD',
        traineeId,
      },
    });
    throw new OrganisationTraineeServiceError(
      403,
      'ORG_TRAINEE_PASSWORD_INVALID',
      'Password confirmation failed',
    );
  }

  const orgTrainee = await findOrganisationTraineeById(organisationId, traineeId);
  if (!orgTrainee) {
    throw new OrganisationTraineeServiceError(
      404,
      'TRAINEE_NOT_FOUND',
      'Organisation trainee profile not found.',
    );
  }

  if (orgTrainee.membershipStatus === 'DISABLED' || orgTrainee.disabledAt) {
    throw new OrganisationTraineeServiceError(
      409,
      'TRAINEE_ALREADY_DISABLED',
      'Trainee profile is already disabled.',
    );
  }

  return prisma.$transaction(async (tx) => {
    await disableOrganisationTraineeProfile(orgTrainee.id, null, tx);

    await revokeUserAuthSessions(
      {
        userId: orgTrainee.traineeProfile.userId,
        revokedReason: 'ADMIN_DISABLED',
      },
      tx,
    );

    await recordAuditLog(
      {
        actorUserId,
        actorType: 'ORGANISATION_ADMIN',
        organisationId,
        targetType: 'USER',
        targetId: orgTrainee.traineeProfile.userId,
        actionType: 'DISABLED',
        outcome: 'SUCCESS',
        metadata: {
          organisationTraineeProfileId: orgTrainee.id,
          traineeProfileId: orgTrainee.traineeProfileId,
          disabledReason: 'Disabled by organisation admin',
        },
      },
      tx,
    );

    await sendEmail(
      {
        emailType: 'ROLE_CHANGED_NOTIFICATION',
        recipientEmail: orgTrainee.traineeProfile.user.email,
        relatedEntity: {
          userId: orgTrainee.traineeProfile.userId,
          organisationId,
        },
        templateData: {
          firstName: orgTrainee.traineeProfile.user.firstName || 'Trainee',
          organisationName: actor.organisation.name,
          roleName: 'Disabled',
        },
      },
      tx,
    );

    return {
      success: true,
      message: 'Trainee account disabled successfully.',
    };
  });
}
