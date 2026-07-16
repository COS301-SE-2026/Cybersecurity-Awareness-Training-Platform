import type {
  CreateTraineeInvitationRequestDto,
  CreateTraineeInvitationResponseDto,
  DisableTraineeRequestDto,
  DisableTraineeResponseDto,
  InvitationActionUnavailableReasonCode,
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
import {
  ACTIVE_INVITATION_STATUSES,
  deriveInvitationLifecycleState,
  getInvitationActionPolicy,
} from './invitation-state-policy.js';

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

type TraineeListInvitation = Awaited<ReturnType<typeof findOrganisationTraineeInvitations>>[number];

function buildEligibility(input: {
  canResend: boolean;
  canRevoke: boolean;
  canDisable: boolean;
  canPromote: boolean;
  resendCooldownSeconds: number;
  resendDisabledReason: string | null;
  revokeDisabledReason: string | null;
  disableDisabledReason: string | null;
  promoteDisabledReason: string | null;
  resendDisabledReasonCode: InvitationActionUnavailableReasonCode | null;
  revokeDisabledReasonCode: InvitationActionUnavailableReasonCode | null;
  disableDisabledReasonCode: InvitationActionUnavailableReasonCode | null;
  promoteDisabledReasonCode: InvitationActionUnavailableReasonCode | null;
}) {
  return input;
}

function buildActiveTraineeRow(
  trainee: Awaited<ReturnType<typeof findOrganisationTrainees>>[number],
): TraineeListItemDto {
  return {
    id: trainee.id,
    rowType: 'ACTIVE_TRAINEE' as const,
    type: 'ACTIVE_TRAINEE' as const,
    traineeProfileId: trainee.traineeProfileId,
    userId: trainee.traineeProfile.userId,
    invitationId: null,
    invitationStatus: null,
    invitationLifecycleState: null,
    email: trainee.traineeProfile.user.email,
    firstName: trainee.traineeProfile.user.firstName ?? null,
    lastName: trainee.traineeProfile.user.lastName ?? null,
    status: trainee.disabledAt || trainee.membershipStatus === 'DISABLED' ? 'DISABLED' : 'ACTIVE',
    createdAt: trainee.createdAt.toISOString(),
    joinedAt: trainee.createdAt.toISOString(),
    invitedAt: null,
    disabledAt: trainee.disabledAt ? trainee.disabledAt.toISOString() : null,
    disabledReason: trainee.disabledReason ?? null,
    expiresAt: null,
    invitationExpiresAt: null,
    emailDeliveryStatus: 'PENDING' as const,
    deliveryState: 'PENDING' as const,
    requiredAction: 'NONE' as const,
    requiredActions: ['NONE'] as Array<'NONE'>,
    eligibility: buildEligibility({
      canResend: false,
      canRevoke: false,
      canDisable: trainee.disabledAt == null && trainee.membershipStatus !== 'DISABLED',
      canPromote: trainee.disabledAt == null && trainee.membershipStatus !== 'DISABLED',
      resendCooldownSeconds: 0,
      resendDisabledReason: 'Resend is only available for invitations.',
      revokeDisabledReason: 'Revoke is only available for invitations.',
      disableDisabledReason:
        trainee.disabledAt == null && trainee.membershipStatus !== 'DISABLED'
          ? null
          : 'Trainee profile is already disabled.',
      promoteDisabledReason:
        trainee.disabledAt == null && trainee.membershipStatus !== 'DISABLED'
          ? null
          : 'Only active trainees can be promoted.',
      resendDisabledReasonCode: 'NOT_APPLICABLE',
      revokeDisabledReasonCode: 'NOT_APPLICABLE',
      disableDisabledReasonCode:
        trainee.disabledAt == null && trainee.membershipStatus !== 'DISABLED'
          ? null
          : 'NOT_APPLICABLE',
      promoteDisabledReasonCode:
        trainee.disabledAt == null && trainee.membershipStatus !== 'DISABLED'
          ? null
          : 'NOT_APPLICABLE',
    }),
  };
}

function buildInvitationRow(invitation: TraineeListInvitation, now: Date): TraineeListItemDto {
  const latestLog =
    'emailDeliveryLogs' in invitation &&
    Array.isArray(invitation.emailDeliveryLogs) &&
    invitation.emailDeliveryLogs[0]
      ? invitation.emailDeliveryLogs[0]
      : undefined;
  const lifecycleState = deriveInvitationLifecycleState(invitation, now);
  const managementPolicy = getInvitationActionPolicy(invitation, now);
  const deliveryState =
    latestLog?.deliveryStatus === 'SENT'
      ? 'SENT'
      : latestLog?.deliveryStatus === 'FAILED'
        ? 'FAILED'
        : invitation.status === 'FAILED_TO_SEND'
          ? 'FAILED'
          : 'PENDING';
  const cooldownBase = latestLog?.createdAt ? new Date(latestLog.createdAt).getTime() : null;
  let resendCooldownSeconds = 0;

  if (cooldownBase) {
    const elapsed = now.getTime() - cooldownBase;
    if (elapsed < 60000) {
      resendCooldownSeconds = Math.max(0, Math.ceil((60000 - elapsed) / 1000));
    }
  }

  const canResend = managementPolicy.canResend && resendCooldownSeconds === 0;
  const canRevoke = managementPolicy.canRevoke;
  const invitationExpiresAt = invitation.expiresAt
    ? invitation.expiresAt.toISOString()
    : new Date().toISOString();

  return {
    id: invitation.id,
    rowType: 'INVITATION' as const,
    type: 'INVITATION' as const,
    traineeProfileId: null,
    userId: null,
    invitationId: invitation.id,
    invitationStatus: lifecycleState,
    invitationLifecycleState: lifecycleState,
    email: invitation.recipientEmail,
    firstName: invitation.recipientFirstName ?? null,
    lastName: invitation.recipientLastName ?? null,
    status: managementPolicy.managementStatus,
    createdAt: invitation.createdAt.toISOString(),
    joinedAt: null,
    invitedAt: invitation.createdAt.toISOString(),
    disabledAt: null,
    disabledReason: null,
    expiresAt: invitationExpiresAt,
    invitationExpiresAt,
    emailDeliveryStatus: deliveryState,
    deliveryState,
    requiredAction: 'CONTINUE_SETUP' as const,
    requiredActions: ['CONTINUE_SETUP'],
    eligibility: buildEligibility({
      canResend,
      canRevoke,
      canDisable: false,
      canPromote: false,
      resendCooldownSeconds,
      resendDisabledReason:
        !canResend && managementPolicy.resendDisabledReasonCode === 'COOLDOWN_ACTIVE'
          ? 'Resend cooldown is currently active.'
          : !canResend
            ? 'Invitation is no longer active.'
            : resendCooldownSeconds > 0
              ? 'Resend cooldown is currently active.'
              : null,
      revokeDisabledReason: !canRevoke ? 'Invitation is no longer active.' : null,
      disableDisabledReason: 'Cannot disable a pending invitation.',
      promoteDisabledReason: 'Only active trainees can be promoted.',
      resendDisabledReasonCode:
        !canResend && managementPolicy.resendDisabledReasonCode === 'COOLDOWN_ACTIVE'
          ? 'COOLDOWN_ACTIVE'
          : !canResend
            ? (managementPolicy.resendDisabledReasonCode ?? 'INVITATION_NOT_ACTIVE')
            : null,
      revokeDisabledReasonCode: !canRevoke
        ? (managementPolicy.revokeDisabledReasonCode ?? 'INVITATION_NOT_ACTIVE')
        : null,
      disableDisabledReasonCode: 'NOT_APPLICABLE',
      promoteDisabledReasonCode: 'NOT_APPLICABLE',
    }),
  };
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

  const now = new Date();
  const trainees: TraineeListItemDto[] = traineeProfiles.map((trainee) =>
    buildActiveTraineeRow(trainee),
  );

  const invitationRows: TraineeListItemDto[] = invitations.map((invitation) =>
    buildInvitationRow(invitation, now),
  );

  return {
    trainees,
    invitations: invitationRows,
    pendingInvitations: invitationRows,
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
    if (typeof tx.$executeRaw === 'function') {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${organisationId + ':' + normalisedEmail}))`;
    }
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

  const emailResult = await sendEmail({
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

  const invitationLifecycleState = deriveInvitationLifecycleState(
    finalInvite ?? { status: 'PENDING', expiresAt: txResult.expiresAt },
  );
  const canResend =
    invitationLifecycleState === 'PENDING' ||
    invitationLifecycleState === 'SENT' ||
    invitationLifecycleState === 'FAILED_TO_SEND';
  const canRevoke = canResend;
  const deliveryState: 'PENDING' | 'SENT' | 'FAILED' | 'UNKNOWN' = emailResult.deliveryStatus;
  const isDeliveryUnknown = deliveryState === 'UNKNOWN';
  const emailDelivered = emailResult.ok;
  const invitationExpiresAt = (finalInvite?.expiresAt ?? txResult.expiresAt).toISOString();
  const createdAt = txResult.invitation.createdAt.toISOString();

  return {
    success: true,
    message: isDeliveryUnknown
      ? 'Invitation created and queued, but email delivery outcome is unknown because persistence failed after provider acceptance.'
      : emailDelivered
        ? 'Invitation sent successfully.'
        : 'Invitation created, but email delivery failed to send.',
    invitation: {
      id: txResult.invitation.id,
      rowType: 'INVITATION',
      type: 'INVITATION',
      traineeProfileId: null,
      userId: null,
      invitationId: txResult.invitation.id,
      invitationStatus: invitationLifecycleState,
      invitationLifecycleState,
      email: txResult.invitation.recipientEmail,
      firstName: txResult.invitation.recipientFirstName ?? null,
      lastName: txResult.invitation.recipientLastName ?? null,
      status: emailDelivered ? 'INVITE_PENDING' : 'INVITE_FAILED',
      createdAt,
      joinedAt: null,
      invitedAt: createdAt,
      disabledAt: null,
      disabledReason: null,
      expiresAt: invitationExpiresAt,
      invitationExpiresAt,
      emailDeliveryStatus: deliveryState,
      deliveryState,
      requiredAction: 'CONTINUE_SETUP',
      requiredActions: ['CONTINUE_SETUP'] as Array<'CONTINUE_SETUP'>,
      eligibility: buildEligibility({
        canResend: false,
        canRevoke,
        canDisable: false,
        canPromote: false,
        resendCooldownSeconds: 60,
        resendDisabledReason: 'Resend cooldown is currently active.',
        revokeDisabledReason: !canRevoke ? 'Invitation is no longer active.' : null,
        disableDisabledReason: 'Cannot disable a pending invitation.',
        promoteDisabledReason: 'Only active trainees can be promoted.',
        resendDisabledReasonCode: 'COOLDOWN_ACTIVE',
        revokeDisabledReasonCode: !canRevoke ? 'INVITATION_NOT_ACTIVE' : null,
        disableDisabledReasonCode: 'NOT_APPLICABLE',
        promoteDisabledReasonCode: 'NOT_APPLICABLE',
      }),
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

  const observedUpdatedAt = invitation.updatedAt;

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
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const claimedAt = new Date();
    const claimedInv = await tx.invitation.updateMany({
      where: {
        id: invitation.id,
        status: { in: [...ACTIVE_INVITATION_STATUSES] },
        updatedAt: observedUpdatedAt,
      },
      data: {
        status: 'PENDING',
        expiresAt,
        updatedAt: claimedAt,
      },
    });

    if (claimedInv.count === 0) {
      throw new OrganisationTraineeServiceError(
        409,
        'INVITATION_NOT_RESENDABLE',
        'Invitation was modified concurrently or is no longer in a resendable state.',
      );
    }

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

    return { actionToken, rawToken, expiresAt, claimedAt };
  });

  const emailResult = await sendEmail({
    emailType: 'ORGANISATION_TRAINEE_INVITE',
    recipientEmail: invitation.recipientEmail,
    relatedEntity: {
      organisationId: invitation.organisationId,
      invitationId: invitation.id,
      actionTokenId: txResult.actionToken.id,
      invitationStateVersion: txResult.claimedAt.toISOString(),
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

  const invitationLifecycleState = deriveInvitationLifecycleState(
    updatedInvitation ?? { status: 'PENDING', expiresAt: txResult.expiresAt },
  );
  const deliveryState: 'PENDING' | 'SENT' | 'FAILED' | 'UNKNOWN' = emailResult.deliveryStatus;
  const isDeliveryUnknown = deliveryState === 'UNKNOWN';
  const emailDelivered = emailResult.ok;
  const canResend =
    invitationLifecycleState === 'PENDING' ||
    invitationLifecycleState === 'SENT' ||
    invitationLifecycleState === 'FAILED_TO_SEND';
  const canRevoke = canResend;
  const invitationExpiresAt = (updatedInvitation?.expiresAt ?? txResult.expiresAt).toISOString();
  const createdAt = invitation.createdAt.toISOString();

  return {
    success: true,
    message: isDeliveryUnknown
      ? 'Invitation was resent and the action token rotated, but email delivery outcome is unknown because persistence failed after provider acceptance.'
      : emailDelivered
        ? 'Invitation resent successfully.'
        : 'Invitation action token rotated successfully, but email delivery failed to send.',
    invitationId: invitation.id,
    status:
      updatedInvitation?.status === 'SENT'
        ? 'SENT'
        : updatedInvitation?.status === 'FAILED_TO_SEND'
          ? 'FAILED_TO_SEND'
          : 'PENDING',
    resentAt: new Date().toISOString(),
    invitation: {
      id: invitation.id,
      rowType: 'INVITATION',
      type: 'INVITATION',
      traineeProfileId: null,
      userId: null,
      invitationId: invitation.id,
      invitationStatus: invitationLifecycleState,
      invitationLifecycleState,
      email: invitation.recipientEmail,
      firstName: invitation.recipientFirstName ?? null,
      lastName: invitation.recipientLastName ?? null,
      status: emailDelivered ? 'INVITE_PENDING' : 'INVITE_FAILED',
      createdAt,
      joinedAt: null,
      invitedAt: createdAt,
      disabledAt: null,
      disabledReason: null,
      expiresAt: invitationExpiresAt,
      invitationExpiresAt,
      emailDeliveryStatus: deliveryState,
      deliveryState,
      requiredAction: 'CONTINUE_SETUP',
      requiredActions: ['CONTINUE_SETUP'],
      eligibility: buildEligibility({
        canResend: false,
        canRevoke,
        canDisable: false,
        canPromote: false,
        resendCooldownSeconds: 60,
        resendDisabledReason: 'Resend cooldown is currently active.',
        revokeDisabledReason: !canRevoke ? 'Invitation is no longer active.' : null,
        disableDisabledReason: 'Cannot disable a pending invitation.',
        promoteDisabledReason: 'Only active trainees can be promoted.',
        resendDisabledReasonCode: 'COOLDOWN_ACTIVE',
        revokeDisabledReasonCode: !canRevoke ? 'INVITATION_NOT_ACTIVE' : null,
        disableDisabledReasonCode: 'NOT_APPLICABLE',
        promoteDisabledReasonCode: 'NOT_APPLICABLE',
      }),
    },
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
    const claimedInv = await tx.invitation.updateMany({
      where: {
        id: invitation.id,
        status: { in: [...ACTIVE_INVITATION_STATUSES] },
      },
      data: {
        status: 'REVOKED',
      },
    });

    if (claimedInv.count === 0) {
      const txInv = await findInvitationById(invitation.id, tx);
      if (txInv && txInv.status === 'REVOKED') {
        return {
          success: true,
          message: 'Invitation has already been revoked.',
          invitationId: txInv.id,
          status: 'REVOKED' as const,
          revokedAt: txInv.updatedAt.toISOString(),
        };
      }
      throw new OrganisationTraineeServiceError(
        409,
        'INVITATION_ALREADY_ACCEPTED',
        'Cannot revoke an invitation that has already been accepted or mutated concurrently.',
      );
    }

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
