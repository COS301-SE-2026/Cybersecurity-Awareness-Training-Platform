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
import { env } from '../config/env.js';
import { OrganisationPermissionKey } from '../generated/prisma/enums.js';
import { generateOpaqueToken, hashOpaqueToken } from './token-hash.service.js';
import { recordAuditLog } from './audit-log.service.js';
import { renderEmail } from './email-template-renderer.js';
import { sendEmail } from './email.service.js';
import {
  permissionKeysForAdmin,
  requireActorAdmin,
  requirePermission,
} from './organisation-admin.service.js';
import { verifyPassword } from './password.service.js';
import {
  createOrganisationTraineeInvitationTx,
  disableOrganisationTraineeTx,
  findAuthoritativeInvitationById,
  findAuthoritativeResentInvitation,
  findOrganisationTraineeByEmail,
  findOrganisationTraineeInvitations,
  findOrganisationTrainees,
  findPendingTraineeInvitationByEmail,
  OrganisationTraineeRepositoryError,
  resendOrganisationTraineeInvitationTx,
  revokeOrganisationTraineeInvitationTx,
} from '../repositories/organisation-trainee.repository.js';
import {
  findInvitationById,
  findUserByEmailWithProfiles,
} from '../repositories/invitation.repository.js';
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

function rethrowAsServiceError(error: unknown): never {
  if (error instanceof OrganisationTraineeRepositoryError) {
    throw new OrganisationTraineeServiceError(error.statusCode, error.errorKey, error.message);
  }
  throw error;
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

function isOrganisationTraineeActive(trainee: {
  disabledAt: Date | null;
  membershipStatus: string;
}) {
  return trainee.disabledAt == null && trainee.membershipStatus !== 'DISABLED';
}

function getTraineeStatus(trainee: { disabledAt: Date | null; membershipStatus: string }) {
  return isOrganisationTraineeActive(trainee) ? ('ACTIVE' as const) : ('DISABLED' as const);
}

function getTraineeEligibilityMessage(trainee: {
  disabledAt: Date | null;
  membershipStatus: string;
}) {
  return isOrganisationTraineeActive(trainee) ? null : 'Trainee profile is already disabled.';
}

function getTraineeEligibilityCode(trainee: { disabledAt: Date | null; membershipStatus: string }) {
  return isOrganisationTraineeActive(trainee) ? null : ('NOT_APPLICABLE' as const);
}

function getInvitationDeliveryState(
  invitation: TraineeListInvitation,
  latestLog?: { deliveryStatus: string } | undefined,
) {
  if (latestLog?.deliveryStatus === 'SENT') {
    return 'SENT' as const;
  }
  if (latestLog?.deliveryStatus === 'FAILED') {
    return 'FAILED' as const;
  }
  if (invitation.status === 'FAILED_TO_SEND') {
    return 'FAILED' as const;
  }
  return 'PENDING' as const;
}

function getInvitationResendDisabledReason(
  canResend: boolean,
  managementReasonCode: InvitationActionUnavailableReasonCode | null,
  resendCooldownSeconds: number,
) {
  if (canResend) {
    return null;
  }
  if (managementReasonCode === 'COOLDOWN_ACTIVE' || resendCooldownSeconds > 0) {
    return 'Resend cooldown is currently active.';
  }
  return 'Invitation is no longer active.';
}

function getInvitationResendDisabledReasonCode(
  canResend: boolean,
  managementReasonCode: InvitationActionUnavailableReasonCode | null,
) {
  if (canResend) {
    return null;
  }
  return managementReasonCode ?? 'INVITATION_NOT_ACTIVE';
}

function assertInvitationCreateEligibility(input: {
  organisationId: string;
  existingTrainee: Awaited<ReturnType<typeof findOrganisationTraineeByEmail>>;
  existingInvite: Awaited<ReturnType<typeof findPendingTraineeInvitationByEmail>>;
  existingUser: Awaited<ReturnType<typeof findUserByEmailWithProfiles>>;
}) {
  const { organisationId, existingTrainee, existingInvite, existingUser } = input;

  if (existingTrainee) {
    if (isOrganisationTraineeActive(existingTrainee)) {
      throw new OrganisationTraineeServiceError(
        409,
        'CANNOT_INVITE_USER',
        'User is already a trainee in this organisation.',
      );
    }
    throw new OrganisationTraineeServiceError(
      409,
      'CANNOT_INVITE_USER',
      'User already has a disabled or inactive trainee membership in this organisation.',
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

  return Boolean(
    existingUser &&
    existingUser.userType !== 'ORGANISATION_TRAINEE' &&
    existingUser.userType !== 'GENERAL_TRAINEE',
  );
}

function assertInvitationResendEligibility(input: {
  invitation: Awaited<ReturnType<typeof findInvitationById>>;
  organisationId: string;
  existingUser: Awaited<ReturnType<typeof findUserByEmailWithProfiles>>;
}) {
  const { invitation, organisationId, existingUser } = input;
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

  return Boolean(
    existingUser &&
    existingUser.userType !== 'ORGANISATION_TRAINEE' &&
    existingUser.userType !== 'GENERAL_TRAINEE',
  );
}

function buildActiveTraineeRow(
  trainee: Awaited<ReturnType<typeof findOrganisationTrainees>>[number],
): TraineeListItemDto {
  const active = isOrganisationTraineeActive(trainee);
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
    status: getTraineeStatus(trainee),
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
      canDisable: active,
      canPromote: active,
      resendCooldownSeconds: 0,
      resendDisabledReason: 'Resend is only available for invitations.',
      revokeDisabledReason: 'Revoke is only available for invitations.',
      disableDisabledReason: getTraineeEligibilityMessage(trainee),
      promoteDisabledReason: active ? null : 'Only active trainees can be promoted.',
      resendDisabledReasonCode: 'NOT_APPLICABLE',
      revokeDisabledReasonCode: 'NOT_APPLICABLE',
      disableDisabledReasonCode: getTraineeEligibilityCode(trainee),
      promoteDisabledReasonCode: getTraineeEligibilityCode(trainee),
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
  const deliveryState = getInvitationDeliveryState(invitation, latestLog);
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
      resendDisabledReason: getInvitationResendDisabledReason(
        canResend,
        managementPolicy.resendDisabledReasonCode,
        resendCooldownSeconds,
      ),
      revokeDisabledReason: !canRevoke ? 'Invitation is no longer active.' : null,
      disableDisabledReason: 'Cannot disable a pending invitation.',
      promoteDisabledReason: 'Only active trainees can be promoted.',
      resendDisabledReasonCode: getInvitationResendDisabledReasonCode(
        canResend,
        managementPolicy.resendDisabledReasonCode,
      ),
      revokeDisabledReasonCode: !canRevoke
        ? (managementPolicy.revokeDisabledReasonCode ?? 'INVITATION_NOT_ACTIVE')
        : null,
      disableDisabledReasonCode: 'NOT_APPLICABLE',
      promoteDisabledReasonCode: 'NOT_APPLICABLE',
    }),
  };
}

function shouldShowInvitationManagementRow(invitation: TraineeListInvitation, now: Date) {
  const managementPolicy = getInvitationActionPolicy(invitation, now);
  return managementPolicy.canResend || managementPolicy.canRevoke;
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

  const invitationRows: TraineeListItemDto[] = invitations
    .filter((invitation) => shouldShowInvitationManagementRow(invitation, now))
    .map((invitation) => buildInvitationRow(invitation, now));

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

  const requiresAccountConflictResolution = assertInvitationCreateEligibility({
    organisationId,
    existingTrainee,
    existingInvite,
    existingUser,
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const rawToken = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(rawToken);

  const renderedEmail = renderEmail('ORGANISATION_TRAINEE_INVITE', {
    firstName: input.firstName ?? '',
    organisationName: actor.organisation.name,
    actionToken: rawToken,
    actionTokenExpiresAt: expiresAt,
    requiresAccountConflictResolution,
  });

  let txResult: Awaited<ReturnType<typeof createOrganisationTraineeInvitationTx>>;
  try {
    txResult = await createOrganisationTraineeInvitationTx({
      organisationId,
      recipientEmail: normalisedEmail,
      recipientFirstName: input.firstName ?? null,
      recipientLastName: input.lastName ?? null,
      expiresAt,
      tokenHash,
      auditLogData: {
        actorUserId,
        actorType: 'ORGANISATION_ADMIN',
        organisationId,
        targetType: 'INVITATION',
        actionType: 'INVITED',
        outcome: 'SUCCESS',
        newValues: {
          recipientEmail: normalisedEmail,
          purpose: 'ORGANISATION_TRAINEE_INVITE',
        },
        metadata: {
          requiresAccountConflictResolution,
        },
      },
      emailDeliveryData: {
        emailType: 'ORGANISATION_TRAINEE_INVITE',
        recipientEmail: normalisedEmail,
        subject: renderedEmail.subject,
        text: renderedEmail.text,
        html: renderedEmail.html,
        maxAttempts: env.EMAIL_DISPATCHER_MAX_ATTEMPTS,
      },
    });
  } catch (error) {
    rethrowAsServiceError(error);
  }

  const finalInvite = await findAuthoritativeInvitationById(txResult.invitation.id);

  const invitationLifecycleState = deriveInvitationLifecycleState(
    finalInvite ?? { status: 'PENDING', expiresAt },
  );

  const canResend =
    invitationLifecycleState === 'PENDING' ||
    invitationLifecycleState === 'SENT' ||
    invitationLifecycleState === 'FAILED_TO_SEND';
  const canRevoke = canResend;
  const deliveryState: 'PENDING' | 'SENT' | 'FAILED' | 'UNKNOWN' = 'PENDING';
  const invitationStatus = 'INVITE_PENDING';
  const resendMessage = 'Invitation email queued for delivery.';

  const invitationExpiresAt = (finalInvite?.expiresAt ?? expiresAt).toISOString();
  const createdAt = txResult.invitation.createdAt.toISOString();

  return {
    success: true,
    message: resendMessage,
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
      status: invitationStatus,
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

  const existingUser = await findUserByEmailWithProfiles(invitation.recipientEmail);
  const requiresAccountConflictResolution = assertInvitationResendEligibility({
    invitation,
    organisationId,
    existingUser,
  });

  const observedUpdatedAt = invitation.updatedAt;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const rawToken = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(rawToken);

  const renderedEmail = renderEmail('ORGANISATION_TRAINEE_INVITE', {
    firstName: invitation.recipientFirstName ?? '',
    organisationName: actor.organisation.name,
    actionToken: rawToken,
    actionTokenExpiresAt: expiresAt,
    requiresAccountConflictResolution,
  });

  let txResult: Awaited<ReturnType<typeof resendOrganisationTraineeInvitationTx>>;
  try {
    txResult = await resendOrganisationTraineeInvitationTx({
      invitationId: invitation.id,
      organisationId: invitation.organisationId,
      observedUpdatedAt,
      expiresAt,
      tokenHash,
      auditLogData: {
        actorUserId,
        actorType: 'ORGANISATION_ADMIN',
        organisationId,
        targetType: 'INVITATION',
        actionType: 'RESENT',
        outcome: 'SUCCESS',
        newValues: {
          expiresAt: expiresAt.toISOString(),
        },
        metadata: {
          requiresAccountConflictResolution,
          invitationId: invitation.id,
        },
      },
      emailDeliveryData: {
        emailType: 'ORGANISATION_TRAINEE_INVITE',
        recipientEmail: invitation.recipientEmail,
        subject: renderedEmail.subject,
        text: renderedEmail.text,
        html: renderedEmail.html,
        maxAttempts: env.EMAIL_DISPATCHER_MAX_ATTEMPTS,
      },
    });
  } catch (error) {
    rethrowAsServiceError(error);
  }

  const finalInvitation = await findAuthoritativeResentInvitation(
    invitation.id,
    txResult.actionToken.id,
  );

  const finalActionToken = finalInvitation?.actionTokens[0];

  const isStaleOrTerminal =
    !finalInvitation ||
    !finalActionToken ||
    finalActionToken.revokedAt !== null ||
    finalActionToken.usedAt !== null ||
    !(ACTIVE_INVITATION_STATUSES as readonly string[]).includes(finalInvitation.status) ||
    finalInvitation.expiresAt.getTime() <= Date.now();

  if (isStaleOrTerminal) {
    if (finalInvitation?.status === 'REVOKED') {
      throw new OrganisationTraineeServiceError(
        409,
        'INVITATION_REVOKED',
        'Cannot resend an invitation that has been revoked.',
      );
    }
    if (finalInvitation?.status === 'ACCEPTED') {
      throw new OrganisationTraineeServiceError(
        409,
        'INVITATION_ALREADY_ACCEPTED',
        'Cannot resend an invitation that has already been accepted.',
      );
    }
    throw new OrganisationTraineeServiceError(
      409,
      'INVITATION_RESEND_STALE',
      'Invitation was revoked or superseded while the resend email was being processed.',
    );
  }

  const invitationLifecycleState = deriveInvitationLifecycleState(finalInvitation);
  const resendMessage = 'Invitation email queued for delivery.';
  const resendStatus =
    finalInvitation.status === 'SENT'
      ? 'SENT'
      : finalInvitation.status === 'FAILED_TO_SEND'
        ? 'FAILED_TO_SEND'
        : 'PENDING';
  const canResend =
    invitationLifecycleState === 'PENDING' ||
    invitationLifecycleState === 'SENT' ||
    invitationLifecycleState === 'FAILED_TO_SEND';
  const canRevoke = canResend;
  const invitationExpiresAt = finalInvitation.expiresAt.toISOString();
  const createdAt = invitation.createdAt.toISOString();
  const invitationStatus = 'INVITE_PENDING';
  const deliveryState: 'PENDING' | 'SENT' | 'FAILED' | 'UNKNOWN' = 'PENDING';

  return {
    success: true,
    message: resendMessage,
    invitationId: invitation.id,
    status: resendStatus,
    resentAt: new Date().toISOString(),
    invitation: {
      id: invitation.id,
      rowType: 'INVITATION',
      type: 'INVITATION',
      traineeProfileId: null,
      userId: null,
      invitationId: invitation.id,
      invitationStatus: finalInvitation.status,
      invitationLifecycleState,
      email: invitation.recipientEmail,
      firstName: invitation.recipientFirstName ?? null,
      lastName: invitation.recipientLastName ?? null,
      status: invitationStatus,
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

  let txResult: Awaited<ReturnType<typeof revokeOrganisationTraineeInvitationTx>>;
  try {
    txResult = await revokeOrganisationTraineeInvitationTx({
      actorUserId,
      organisationId: invitation.organisationId,
      invitationId: invitation.id,
      auditLogData: {
        actorUserId,
        actorType: 'ORGANISATION_ADMIN',
        organisationId,
        targetType: 'INVITATION',
        actionType: 'REVOKED',
        outcome: 'SUCCESS',
        newValues: {
          status: 'REVOKED',
        },
        metadata: {
          invitationId: invitation.id,
        },
      },
    });
  } catch (error) {
    rethrowAsServiceError(error);
  }

  return {
    success: true,
    message: txResult.alreadyRevoked
      ? 'Invitation has already been revoked.'
      : 'Invitation revoked successfully.',
    invitationId: txResult.invitationId,
    status: 'REVOKED',
    revokedAt: txResult.revokedAt,
  };
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

  const reason = input?.disabledReason ?? 'Disabled by organisation admin';

  let txResult: Awaited<ReturnType<typeof disableOrganisationTraineeTx>>;
  try {
    txResult = await disableOrganisationTraineeTx({
      actorUserId,
      organisationId,
      traineeId,
      disabledReason: reason,
      auditLogData: {
        actorUserId,
        actorType: 'ORGANISATION_ADMIN',
        organisationId,
        targetType: 'USER',
        actionType: 'DISABLED',
        outcome: 'SUCCESS',
        metadata: {
          reason,
          traineeId,
        },
      },
    });
  } catch (error) {
    rethrowAsServiceError(error);
  }

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
