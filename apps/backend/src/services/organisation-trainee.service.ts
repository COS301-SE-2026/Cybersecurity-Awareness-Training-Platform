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
      id: trainee.id,
      traineeProfileId: trainee.traineeProfileId,
      userId: trainee.traineeProfile.userId,
      email: trainee.traineeProfile.user.email,
      firstName: trainee.traineeProfile.user.firstName ?? undefined,
      lastName: trainee.traineeProfile.user.lastName ?? undefined,
      status,
      createdAt: trainee.createdAt.toISOString(),
      joinedAt: trainee.createdAt.toISOString(),
      disabledAt: trainee.disabledAt ? trainee.disabledAt.toISOString() : null,
      disabledReason: trainee.disabledReason ?? null,
      eligibility: {
        canResend: false,
        canRevoke: false,
        canDisable: status === 'ACTIVE',
        canPromote: status === 'ACTIVE',
      },
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
      id: inv.id,
      invitationId: inv.id,
      email: inv.recipientEmail,
      firstName: inv.recipientFirstName ?? undefined,
      lastName: inv.recipientLastName ?? undefined,
      status,
      createdAt: inv.createdAt.toISOString(),
      invitedAt: inv.createdAt.toISOString(),
      expiresAt: inv.expiresAt ? inv.expiresAt.toISOString() : null,
      eligibility: {
        canResend: status === 'INVITE_PENDING' || status === 'INVITE_FAILED',
        canRevoke: status === 'INVITE_PENDING' || status === 'INVITE_FAILED',
        canDisable: false,
        canPromote: false,
      },
    });
  }

  return {
    trainees,
    pendingInvitations,
  };
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

  const isPlatformAdmin = existingUser?.userType === 'IP_ADMIN';
  const orgId = existingUser?.traineeProfile?.organisationTraineeProfile?.organisationId;
  const belongsToAnotherOrg = orgId !== undefined && orgId !== organisationId;

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

  const txResult = await prisma.$transaction(async (tx) => {
    const [txTrainee, txInvite] = await Promise.all([
      findOrganisationTraineeByEmail(organisationId, normalisedEmail, tx),
      findPendingTraineeInvitationByEmail(organisationId, normalisedEmail, tx),
    ]);
    if (txTrainee && txTrainee.membershipStatus !== 'DISABLED' && !txTrainee.disabledAt) {
      throw new OrganisationTraineeServiceError(
        409,
        'CANNOT_INVITE_USER',
        'User is already a trainee in this organisation.',
      );
    }
    if (txInvite) {
      throw new OrganisationTraineeServiceError(
        409,
        'CANNOT_INVITE_USER',
        'A pending invitation already exists for this email address.',
      );
    }

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

    return { invitation, actionToken, rawToken, expiresAt };
  });

  await sendEmail({
    emailType: 'ORGANISATION_TRAINEE_INVITE',
    recipientEmail: normalisedEmail,
    relatedEntity: {
      organisationId,
      invitationId: txResult.invitation.id,
      actionTokenId: txResult.actionToken.id,
    },
    templateData: {
      firstName: input.firstName,
      organisationName: actor.organisation.name,
      actionToken: txResult.rawToken,
      actionTokenExpiresAt: txResult.expiresAt,
      requiresAccountConflictResolution,
    },
  });

  const finalInvite = await prisma.invitation.findUnique({
    where: { id: txResult.invitation.id },
  });

  return {
    success: true,
    message: 'Invitation sent successfully.',
    invitation: {
      id: txResult.invitation.id,
      email: txResult.invitation.recipientEmail,
      firstName: txResult.invitation.recipientFirstName ?? undefined,
      lastName: txResult.invitation.recipientLastName ?? undefined,
      status: finalInvite?.status === 'FAILED_TO_SEND' ? 'FAILED_TO_SEND' : 'SENT',
    },
  };
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
    invitation?.purpose !== 'ORGANISATION_TRAINEE_INVITE' ||
    invitation?.organisationId !== organisationId
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

  const isPlatformAdmin = existingUser?.userType === 'IP_ADMIN';
  const orgId = existingUser?.traineeProfile?.organisationTraineeProfile?.organisationId;
  const belongsToAnotherOrg = orgId !== undefined && orgId !== invitation.organisationId;

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

  const txResult = await prisma.$transaction(async (tx) => {
    const txInv = await findInvitationById(invitation.id, tx);
    if (!txInv || (txInv.status !== 'PENDING' && txInv.status !== 'FAILED_TO_SEND')) {
      throw new OrganisationTraineeServiceError(
        409,
        'INVITATION_NOT_RESENDABLE',
        'Invitation is no longer in a resendable state.',
      );
    }

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

    return { actionToken, rawToken, expiresAt };
  });

  await sendEmail({
    emailType: 'ORGANISATION_TRAINEE_INVITE',
    recipientEmail: invitation.recipientEmail,
    relatedEntity: {
      organisationId: invitation.organisationId,
      invitationId: invitation.id,
      actionTokenId: txResult.actionToken.id,
    },
    templateData: {
      firstName: invitation.recipientFirstName ?? undefined,
      organisationName: actor.organisation.name,
      actionToken: txResult.rawToken,
      actionTokenExpiresAt: txResult.expiresAt,
      requiresAccountConflictResolution,
    },
  });

  const updatedInvitation = await prisma.invitation.findUnique({
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
    invitation?.purpose !== 'ORGANISATION_TRAINEE_INVITE' ||
    invitation?.organisationId !== organisationId
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
    const txInv = await findInvitationById(invitation.id, tx);
    if (!txInv || txInv.status === 'ACCEPTED') {
      throw new OrganisationTraineeServiceError(
        409,
        'INVITATION_ALREADY_ACCEPTED',
        'Cannot revoke an invitation that has already been accepted.',
      );
    }
    if (txInv.status === 'REVOKED') {
      return {
        success: true,
        message: 'Invitation has already been revoked.',
        invitationId: txInv.id,
        status: 'REVOKED' as const,
        revokedAt: txInv.updatedAt.toISOString(),
      };
    }

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

  const txResult = await prisma.$transaction(async (tx) => {
    const txTrainee = await findOrganisationTraineeById(organisationId, traineeId, tx);
    if (!txTrainee) {
      throw new OrganisationTraineeServiceError(
        404,
        'TRAINEE_NOT_FOUND',
        'Organisation trainee profile not found.',
      );
    }
    if (txTrainee.membershipStatus === 'DISABLED' || txTrainee.disabledAt) {
      throw new OrganisationTraineeServiceError(
        409,
        'TRAINEE_ALREADY_DISABLED',
        'Trainee profile is already disabled.',
      );
    }

    const reason = input?.disabledReason ?? 'Disabled by organisation admin';
    await disableOrganisationTraineeProfile(txTrainee.id, reason, tx);

    await revokeUserAuthSessions(
      {
        userId: txTrainee.traineeProfile.userId,
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
        targetId: txTrainee.traineeProfile.userId,
        actionType: 'DISABLED',
        outcome: 'SUCCESS',
        metadata: {
          organisationTraineeProfileId: txTrainee.id,
          traineeProfileId: txTrainee.traineeProfileId,
          disabledReason: reason,
        },
      },
      tx,
    );

    return { txTrainee, reason };
  });

  await sendEmail({
    emailType: 'ROLE_CHANGED_NOTIFICATION',
    recipientEmail: txResult.txTrainee.traineeProfile.user.email,
    relatedEntity: {
      userId: txResult.txTrainee.traineeProfile.userId,
      organisationId,
    },
    templateData: {
      firstName: txResult.txTrainee.traineeProfile.user.firstName || 'Trainee',
      organisationName: actor.organisation.name,
      roleName: 'Disabled',
    },
  });

  return {
    success: true,
    message: 'Trainee account disabled successfully.',
    traineeId: txResult.txTrainee.id,
    status: 'DISABLED',
  };
}
