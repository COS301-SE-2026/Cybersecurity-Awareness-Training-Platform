import { prisma } from '../lib/prisma.js';
import * as OrganisationRepository from '../repositories/organisation.repository.js';
import { recordAuditLog } from './audit-log.service.js';
import { requestAuthEmailSend } from './auth-email-hook.service.js';
import { issueActionToken } from './action-token.service.js';
import {
  OrganisationRegistrationRequestError,
  requirePlatformAdminUser,
  formatRegistrationRequestBase,
  type RegistrationRequestBase,
  type FormatInvitationInput,
  type FormatEmailLogInput,
  formatSetupStatus,
  getResendEligibility,
} from './organisation-registration-request.service.js';

export {
  OrganisationRegistrationRequestError,
  requirePlatformAdminUser,
  formatRegistrationRequestBase,
  type RegistrationRequestBase,
  type FormatInvitationInput,
  type FormatEmailLogInput,
  formatSetupStatus,
  getResendEligibility,
};

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

  let detailType:
    | 'request-only'
    | 'onboarding organisation'
    | 'active organisation'
    | 'suspended organisation'
    | 'disabled organisation' = 'disabled organisation';

  if (organisation.status === 'PENDING_ONBOARDING') {
    detailType = 'onboarding organisation';
  } else if (organisation.status === 'ACTIVE') {
    detailType = 'active organisation';
  } else if (organisation.status === 'SUSPENDED') {
    detailType = 'suspended organisation';
  }

  return {
    id: organisation.id,
    name: organisation.name,
    status: organisation.status,
    detailType,
    description: organisation.description,
    approximateSize: organisation.approximateSize,
    website: organisation.website,
    primaryDomain: organisation.primaryDomain,
    createdAt: organisation.createdAt.toISOString(),
    updatedAt: organisation.updatedAt.toISOString(),
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

  let detailType:
    | 'request-only'
    | 'onboarding organisation'
    | 'active organisation'
    | 'suspended organisation'
    | 'disabled organisation' = 'request-only';

  if (organisation) {
    if (organisation.status === 'PENDING_ONBOARDING') {
      detailType = 'onboarding organisation';
    } else if (organisation.status === 'ACTIVE') {
      detailType = 'active organisation';
    } else if (organisation.status === 'SUSPENDED') {
      detailType = 'suspended organisation';
    } else {
      detailType = 'disabled organisation';
    }
  }

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

  // Early setup compatibility checks
  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.recipientEmail },
    include: {
      organisationAdminProfile: true,
      traineeProfile: {
        include: {
          organisationTraineeProfile: true,
        },
      },
    },
  });

  if (existingUser) {
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

  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const result = await prisma.$transaction(async (tx) => {
    // Fetch invitation inside the transaction to atomically claim eligibility
    const invitationTx = await tx.invitation.findUnique({
      where: { initialAdminOrganisationId: organisationId },
      include: {
        actionTokens: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!invitationTx) {
      throw new OrganisationRegistrationRequestError(
        404,
        'SETUP_INVITATION_NOT_FOUND',
        'Initial admin setup invitation not found',
      );
    }

    const latestEmailLogTx = await tx.emailDeliveryLog.findFirst({
      where: {
        invitationId: invitationTx.id,
        emailType: 'INITIAL_ORGANISATION_ADMIN_SETUP',
      },
      orderBy: { createdAt: 'desc' },
    });

    const eligibilityTx = getResendEligibility(organisation.status, invitationTx, latestEmailLogTx);
    if (!eligibilityTx.isEligible) {
      throw new OrganisationRegistrationRequestError(
        409,
        'RESEND_NOT_ELIGIBLE',
        `Setup email is not eligible for resending: ${eligibilityTx.reason}`,
      );
    }

    // Revoke any existing active action tokens for this invitation
    await tx.actionToken.updateMany({
      where: {
        invitationId: invitationTx.id,
        usedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: 'SUPERSEDED_BY_RESEND',
      },
    });

    // Generate a new action token
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

    // Update invitation
    await tx.invitation.update({
      where: { id: invitationTx.id },
      data: {
        status: 'PENDING',
        expiresAt: newExpiresAt,
      },
    });

    // Log audit entry
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

    return {
      actionToken: actionTokenResult,
      invitationTx,
    };
  });

  // Send the setup email outside of the transaction block
  const emailResult = await requestAuthEmailSend({
    emailType: 'INITIAL_ORGANISATION_ADMIN_SETUP',
    recipientEmail: result.invitationTx.recipientEmail,
    organisationId: organisation.id,
    invitationId: result.invitationTx.id,
    actionTokenId: result.actionToken.token.id,
    organisationRegistrationRequestId:
      result.invitationTx.organisationRegistrationRequestId ?? undefined,
    templateData: {
      firstName: result.invitationTx.recipientFirstName ?? '',
      organisationName: organisation.name,
      actionToken: result.actionToken.rawToken,
      actionTokenExpiresAt: result.actionToken.token.expiresAt,
    },
  });

  // If the email sending failed/was not queued, revoke the action token to leave a recoverable state
  if (!emailResult.queued) {
    await prisma.actionToken.update({
      where: { id: result.actionToken.token.id },
      data: {
        revokedAt: new Date(),
        revokedReason: 'EMAIL_SEND_FAILED',
      },
    });

    await recordAuditLog({
      actorUserId,
      actorType: 'IP_ADMIN',
      targetType: 'INVITATION',
      targetId: result.invitationTx.id,
      actionType: 'RESENT',
      outcome: 'FAILURE',
      organisationId: organisation.id,
      metadata: { error: 'Email delivery failed or was not queued' },
    });
  }

  const updatedInvitation = await OrganisationRepository.findSetupInvitationAndEmailLog({
    organisationId,
  });
  const updatedEmailLog = updatedInvitation
    ? await OrganisationRepository.findLatestEmailLogForInvitation(updatedInvitation.id)
    : null;

  return {
    success: true,
    emailQueued: emailResult.queued,
    setupStatus: formatSetupStatus(updatedInvitation, updatedEmailLog),
  };
}

async function buildPlatformTimeline(
  organisationId: string | null,
  requestId: string | null,
  invitationId: string | null,
) {
  const auditLogs = await OrganisationRepository.findAuditLogsForTimeline({
    OR: [
      ...(organisationId ? [{ organisationId }] : []),
      ...(requestId
        ? [{ targetType: 'ORGANISATION_REGISTRATION_REQUEST' as const, targetId: requestId }]
        : []),
      ...(invitationId ? [{ targetType: 'INVITATION' as const, targetId: invitationId }] : []),
    ],
  });

  const emailLogs = await OrganisationRepository.findEmailLogsForTimeline({
    OR: [
      ...(organisationId ? [{ organisationId }] : []),
      ...(requestId ? [{ organisationRegistrationRequestId: requestId }] : []),
      ...(invitationId ? [{ invitationId }] : []),
    ],
  });

  const timeline: Array<{
    id: string;
    type: 'AUDIT_LOG' | 'EMAIL_DELIVERY';
    timestamp: string;
    action: string;
    summary: string;
    actor: string | null;
    status?: string | null;
    outcome: string | null;
    metadata?: Record<string, unknown> | null;
  }> = [];

  const allowedAuditTargets = ['ORGANISATION_REGISTRATION_REQUEST', 'ORGANISATION', 'INVITATION'];
  const allowedAuditActions = [
    'CREATED',
    'CONTACTED',
    'APPROVED',
    'REJECTED',
    'RESENT',
    'ACCEPTED',
    'COMPLETED',
    'SUSPENDED',
    'REACTIVATED',
  ];

  const filteredAudits = auditLogs.filter((log) => {
    if (!allowedAuditTargets.includes(log.targetType)) return false;
    if (!allowedAuditActions.includes(log.actionType)) return false;
    return true;
  });

  for (const log of filteredAudits) {
    let actorName = 'System';
    if (log.actorUser) {
      actorName =
        `${log.actorUser.firstName} ${log.actorUser.lastName}`.trim() || log.actorUser.email;
    }
    timeline.push({
      id: log.id,
      type: 'AUDIT_LOG',
      timestamp: log.createdAt.toISOString(),
      action: log.actionType,
      summary: `Action ${log.actionType} performed by ${actorName}`,
      actor: actorName,
      status: log.outcome,
      outcome: log.outcome,
      metadata: null, // Strip out raw audit metadata
    });
  }

  const filteredEmails = emailLogs.filter((log) => {
    // Only show the setup email to initial admin
    return log.emailType === 'INITIAL_ORGANISATION_ADMIN_SETUP';
  });

  for (const log of filteredEmails) {
    timeline.push({
      id: log.id,
      type: 'EMAIL_DELIVERY',
      timestamp: log.createdAt.toISOString(),
      action: log.emailType,
      summary: `Email of type ${log.emailType} to ${log.recipientEmail}`,
      actor: 'System',
      status: log.deliveryStatus,
      outcome: log.deliveryStatus,
      metadata: null, // Strip out provider failure text
    });
  }

  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return timeline;
}
