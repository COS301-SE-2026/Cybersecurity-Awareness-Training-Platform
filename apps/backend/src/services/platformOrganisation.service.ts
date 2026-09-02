import * as OrganisationRepository from '../repositories/organisation.repository.js';
import { recordAuditLog } from './audit-log.service.js';
import { requestAuthEmailSend } from './auth-email-hook.service.js';
import { issueActionToken } from './action-token.service.js';
import {
  toBaseOrganisationDto,
  resolveOrganisationDetailType,
} from '../mappers/organisation.mapper.js';
import {
  OrganisationRegistrationRequestError,
  requirePlatformAdminUser,
  formatRegistrationRequestBase,
  formatSetupStatus,
  getResendEligibility,
} from './organisation-registration-request.service.js';

export {
  OrganisationRegistrationRequestError,
  requirePlatformAdminUser,
  formatRegistrationRequestBase,
  formatSetupStatus,
  getResendEligibility,
};
export type {
  RegistrationRequestBase,
  FormatInvitationInput,
  FormatEmailLogInput,
} from './organisation-registration-request.service.js';

function assertAuthEmailQueued(result: Awaited<ReturnType<typeof requestAuthEmailSend>>) {
  if (result.status === 'NOT_QUEUED') {
    throw new OrganisationRegistrationRequestError(
      409,
      'EMAIL_QUEUE_FAILED',
      'Required email could not be queued for delivery',
    );
  }
}

export async function getPlatformOrganisationDetail(actorUserId: string, organisationId: string) {
  await requirePlatformAdminUser(actorUserId);

  const organisation = await OrganisationRepository.findOrganisationWithCount(organisationId);
  if (!organisation) {
    throw new OrganisationRegistrationRequestError(
      404,
      'ORGANISATION_NOT_FOUND',
      'Organisation not found',
    );
  }

  const registrationRequest =
    await OrganisationRepository.findRegistrationRequestByOrganisationId(organisationId);

  const invitation = await OrganisationRepository.findSetupInvitationAndEmailLog({
    organisationId,
  });
  const latestEmailLog = invitation
    ? await OrganisationRepository.findLatestEmailLogForInvitation(invitation.id)
    : null;

  const resendEligibility = getResendEligibility(organisation.status, invitation, latestEmailLog);

  const admins = await OrganisationRepository.findOrganisationAdmins(organisationId);

  const timeline = await buildPlatformTimeline(
    organisationId,
    registrationRequest?.id ?? null,
    invitation?.id ?? null,
  );

  return {
    ...toBaseOrganisationDto(organisation),
    _count: organisation._count,
    registrationRequest: registrationRequest
      ? {
          id: registrationRequest.id,
          representativeFirstName: registrationRequest.representativeFirstName,
          representativeLastName: registrationRequest.representativeLastName,
          representativeEmail: registrationRequest.representativeEmail,
          submittedWebsite: registrationRequest.submittedWebsite,
          submittedPrimaryDomain: registrationRequest.submittedPrimaryDomain,
        }
      : null,
    setupStatus: formatSetupStatus(invitation, latestEmailLog),
    resendEligibility,
    admins: admins.map((admin) => ({
      id: admin.id,
      adminStatus: admin.adminStatus,
      firstName: admin.user?.firstName ?? '',
      lastName: admin.user?.lastName ?? '',
      email: admin.user?.email ?? '',
      isInitialAdmin: admin.isInitialAdmin,
    })),
    timeline,
  };
}

export async function getOrganisationRequestDetails(actorUserId: string, requestId: string) {
  await requirePlatformAdminUser(actorUserId);

  const request = await OrganisationRepository.findRegistrationRequestById(requestId);
  if (!request) {
    throw new OrganisationRegistrationRequestError(
      404,
      'REQUEST_NOT_FOUND',
      'Organisation registration request not found',
    );
  }

  const invitation = await OrganisationRepository.findSetupInvitationAndEmailLog({
    organisationRegistrationRequestId: requestId,
  });
  const latestEmailLog = invitation
    ? await OrganisationRepository.findLatestEmailLogForInvitation(invitation.id)
    : null;

  const organisation = request.approvedOrganisationId
    ? await OrganisationRepository.findOrganisationById(request.approvedOrganisationId)
    : null;

  const resendEligibility = getResendEligibility(
    organisation?.status ?? 'PENDING_ONBOARDING',
    invitation,
    latestEmailLog,
  );

  const timeline = await buildPlatformTimeline(
    request.approvedOrganisationId,
    requestId,
    invitation?.id ?? null,
  );

  const detailType:
    | 'request-only'
    | 'onboarding organisation'
    | 'active organisation'
    | 'suspended organisation'
    | 'disabled organisation' = organisation
    ? resolveOrganisationDetailType(organisation.status)
    : 'request-only';

  return {
    ...formatRegistrationRequestBase(request),
    detailType,
    setupStatus: formatSetupStatus(invitation, latestEmailLog),
    resendEligibility,
    timeline,
  };
}

export async function resendInitialAdminSetup(actorUserId: string, organisationId: string) {
  await requirePlatformAdminUser(actorUserId);

  const organisation = await OrganisationRepository.findOrganisationById(organisationId);
  if (!organisation) {
    throw new OrganisationRegistrationRequestError(
      404,
      'ORGANISATION_NOT_FOUND',
      'Organisation not found',
    );
  }

  if (organisation.status !== 'PENDING_ONBOARDING') {
    throw new OrganisationRegistrationRequestError(
      409,
      'RESEND_NOT_ELIGIBLE',
      'Setup email is not eligible for resending: ORGANISATION_NOT_ONBOARDING',
    );
  }

  const invitation = await OrganisationRepository.findSetupInvitationAndEmailLog({
    organisationId,
  });
  if (!invitation) {
    throw new OrganisationRegistrationRequestError(
      404,
      'SETUP_INVITATION_NOT_FOUND',
      'Initial admin setup invitation not found',
    );
  }

  const registrationRequest =
    await OrganisationRepository.findRegistrationRequestByOrganisationId(organisationId);
  if (
    registrationRequest &&
    registrationRequest.representativeEmail !== invitation.recipientEmail
  ) {
    throw new OrganisationRegistrationRequestError(
      409,
      'SETUP_ROLE_CONFLICT',
      'Invitation recipient does not match the registration request representative',
    );
  }

  const existingUser = await OrganisationRepository.findUserForSetupValidation(
    invitation.recipientEmail,
  );

  assertNoSetupRoleConflict(existingUser, organisationId);

  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const result = await OrganisationRepository.runInTransaction(async (tx) => {
    const invitationTx = await OrganisationRepository.findSetupInvitationAndEmailLog(
      {
        organisationId,
      },
      tx,
    );
    if (!invitationTx) {
      throw new OrganisationRegistrationRequestError(
        404,
        'SETUP_INVITATION_NOT_FOUND',
        'Initial admin setup invitation not found',
      );
    }

    const latestEmailLogTx = await OrganisationRepository.findLatestEmailLogForInvitation(
      invitationTx.id,
      tx,
    );

    const eligibilityTx = getResendEligibility(organisation.status, invitationTx, latestEmailLogTx);
    if (!eligibilityTx.isEligible) {
      throw new OrganisationRegistrationRequestError(
        409,
        'RESEND_NOT_ELIGIBLE',
        `Setup email is not eligible for resending: ${eligibilityTx.reason}`,
      );
    }

    const claimed = await OrganisationRepository.claimInvitationForResend(
      {
        id: invitationTx.id,
        status: invitationTx.status,
        updatedAt: invitationTx.updatedAt,
        expiresAt: newExpiresAt,
      },
      tx,
    );

    if (!claimed) {
      throw new OrganisationRegistrationRequestError(
        409,
        'RESEND_NOT_ELIGIBLE',
        'Setup email is not eligible for resending: CONCURRENT_RESEND_IN_PROGRESS',
      );
    }

    await OrganisationRepository.revokeActiveActionTokensForInvitation(
      invitationTx.id,
      'SUPERSEDED_BY_RESEND',
      tx,
    );

    const actionTokenResult = await issueActionToken(
      {
        purpose: 'INITIAL_ORGANISATION_ADMIN_SETUP',
        expiresAt: newExpiresAt,
        targetEmail: invitationTx.recipientEmail,
        invitationId: invitationTx.id,
        organisationRegistrationRequestId:
          invitationTx.organisationRegistrationRequestId ?? undefined,
      },
      tx,
    );

    await recordAuditLog(
      {
        actorUserId,
        actorType: 'IP_ADMIN',
        targetType: 'INVITATION',
        targetId: invitationTx.id,
        actionType: 'RESENT',
        outcome: 'SUCCESS',
        organisationId: organisation.id,
      },
      tx,
    );

    const emailResult = await requestAuthEmailSend(
      {
        emailType: 'INITIAL_ORGANISATION_ADMIN_SETUP',
        recipientEmail: invitationTx.recipientEmail,
        organisationId: organisation.id,
        invitationId: invitationTx.id,
        actionTokenId: actionTokenResult.token.id,
        organisationRegistrationRequestId:
          invitationTx.organisationRegistrationRequestId ?? undefined,
        templateData: {
          firstName: invitationTx.recipientFirstName ?? '',
          organisationName: organisation.name,
          actionToken: actionTokenResult.rawToken,
          actionTokenExpiresAt: actionTokenResult.token.expiresAt,
        },
      },
      tx,
    );
    assertAuthEmailQueued(emailResult);

    return {
      actionToken: actionTokenResult,
      invitation: invitationTx,
      emailResult,
    };
  });

  const updatedInvitation = await OrganisationRepository.findSetupInvitationAndEmailLog({
    organisationId,
  });
  const updatedEmailLog = updatedInvitation
    ? await OrganisationRepository.findLatestEmailLogForInvitation(updatedInvitation.id)
    : null;

  return {
    success: true,
    emailQueued: result.emailResult.queued,
    setupStatus: formatSetupStatus(updatedInvitation, updatedEmailLog),
  };
}

type PlatformTimelineEvent = {
  id: string;
  type: 'AUDIT_LOG' | 'EMAIL_DELIVERY';
  timestamp: string;
  action: string;
  summary: string;
  actor: string | null;
  outcome: string | null;
  metadata: null;
};

type InternalPlatformTimelineEvent = PlatformTimelineEvent & {
  timelineSequence: number;
};

function auditTimelineSequence(log: { actionType: string; targetType: string }) {
  if (log.targetType === 'ORGANISATION_REGISTRATION_REQUEST') {
    if (log.actionType === 'CREATED') return 10;
    if (log.actionType === 'CONTACTED') return 20;
    if (log.actionType === 'APPROVED' || log.actionType === 'REJECTED') return 30;
  }

  if (log.targetType === 'INVITATION') {
    if (
      log.actionType === 'CREATED' ||
      log.actionType === 'RESENT' ||
      log.actionType === 'ACCEPTED'
    ) {
      return 40;
    }
    if (log.actionType === 'COMPLETED') return 50;
  }

  if (log.targetType === 'ORGANISATION') {
    if (log.actionType === 'CREATED') return 35;
    if (log.actionType === 'ENABLED') return 60;
    if (log.actionType === 'SUSPENDED' || log.actionType === 'REACTIVATED') return 70;
  }

  return 90;
}

function publicTimelineEvent(event: InternalPlatformTimelineEvent): PlatformTimelineEvent {
  return {
    id: event.id,
    type: event.type,
    timestamp: event.timestamp,
    action: event.action,
    summary: event.summary,
    actor: event.actor,
    outcome: event.outcome,
    metadata: event.metadata,
  };
}

async function buildPlatformTimeline(
  organisationId: string | null,
  requestId: string | null,
  invitationId: string | null,
) {
  const auditLogs = await OrganisationRepository.findAuditLogsForTimeline({
    organisationId,
    requestId,
    invitationId,
  });

  const emailLogs = await OrganisationRepository.findEmailLogsForTimeline(invitationId);

  const timeline: InternalPlatformTimelineEvent[] = [];

  for (const log of auditLogs) {
    let actorName: string | null = null;
    if (log.actorUser) {
      const fullName = `${log.actorUser.firstName} ${log.actorUser.lastName}`.trim();
      actorName = fullName || null;
    }
    timeline.push({
      id: log.id,
      type: 'AUDIT_LOG',
      timestamp: log.createdAt.toISOString(),
      action: log.actionType,
      summary: `${log.actionType} on ${log.targetType}`,
      actor: actorName,
      outcome: log.outcome,
      metadata: null,
      timelineSequence: auditTimelineSequence(log),
    });
  }

  for (const log of emailLogs) {
    timeline.push({
      id: log.id,
      type: 'EMAIL_DELIVERY',
      timestamp: log.createdAt.toISOString(),
      action: log.emailType,
      summary: `Setup email ${log.deliveryStatus.toLowerCase()}`,
      actor: 'System',
      outcome: log.deliveryStatus,
      metadata: null,
      timelineSequence: 40,
    });
  }

  timeline.sort((a, b) => {
    const timeDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    if (timeDiff !== 0) return timeDiff;
    const sequenceDiff = b.timelineSequence - a.timelineSequence;
    if (sequenceDiff !== 0) return sequenceDiff;
    if (b.id > a.id) return 1;
    if (b.id < a.id) return -1;
    return 0;
  });

  return timeline.map(publicTimelineEvent);
}

function assertNoSetupRoleConflict(
  existingUser: {
    authStatus: string;
    userType: string;
    organisationAdminProfile: { organisationId: string } | null;
    traineeProfile: {
      organisationTraineeProfile: { organisationId: string } | null;
    } | null;
  } | null,
  organisationId: string,
) {
  if (!existingUser) return;

  if (existingUser.authStatus === 'DISABLED' || existingUser.userType !== 'ORGANISATION_ADMIN') {
    throw new OrganisationRegistrationRequestError(
      409,
      'SETUP_ROLE_CONFLICT',
      'Target account is disabled or has a conflicting role',
    );
  }

  if (
    existingUser.organisationAdminProfile &&
    existingUser.organisationAdminProfile.organisationId !== organisationId
  ) {
    throw new OrganisationRegistrationRequestError(
      409,
      'SETUP_ROLE_CONFLICT',
      'Target account is already registered with another organisation',
    );
  }

  if (
    existingUser.traineeProfile?.organisationTraineeProfile &&
    existingUser.traineeProfile.organisationTraineeProfile.organisationId !== organisationId
  ) {
    throw new OrganisationRegistrationRequestError(
      409,
      'SETUP_ROLE_CONFLICT',
      'Target account is already registered with another organisation',
    );
  }
}
