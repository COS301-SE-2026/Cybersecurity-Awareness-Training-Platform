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
      isInitialAdmin:
        admin.user?.email === invitation?.recipientEmail ||
        admin.user?.email === registrationRequest?.representativeEmail,
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

  const latestEmailLog = await OrganisationRepository.findLatestEmailLogForInvitation(
    invitation.id,
  );

  const eligibility = getResendEligibility(organisation.status, invitation, latestEmailLog);
  if (!eligibility.isEligible) {
    throw new OrganisationRegistrationRequestError(
      409,
      'RESEND_NOT_ELIGIBLE',
      `Setup email is not eligible for resending: ${eligibility.reason}`,
    );
  }

  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const result = await prisma.$transaction(async (tx) => {
    // Revoke any existing active action tokens for this invitation
    await tx.actionToken.updateMany({
      where: {
        invitationId: invitation.id,
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
        targetEmail: invitation.recipientEmail,
        invitationId: invitation.id,
        organisationRegistrationRequestId:
          invitation.organisationRegistrationRequestId ?? undefined,
      },
      tx,
    );

    // Update invitation
    await tx.invitation.update({
      where: { id: invitation.id },
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
        targetId: invitation.id,
        actionType: 'RESENT',
        outcome: 'SUCCESS',
        organisationId: organisation.id,
      },
      tx,
    );

    return {
      actionToken: actionTokenResult,
    };
  });

  // Send the setup email outside of the transaction block
  const emailResult = await requestAuthEmailSend({
    emailType: 'INITIAL_ORGANISATION_ADMIN_SETUP',
    recipientEmail: invitation.recipientEmail,
    organisationId: organisation.id,
    invitationId: invitation.id,
    actionTokenId: result.actionToken.token.id,
    organisationRegistrationRequestId: invitation.organisationRegistrationRequestId ?? undefined,
    templateData: {
      firstName: invitation.recipientFirstName ?? '',
      organisationName: organisation.name,
      actionToken: result.actionToken.rawToken,
      actionTokenExpiresAt: result.actionToken.token.expiresAt,
    },
  });

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

  for (const log of auditLogs) {
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
      metadata: (log.metadata as Record<string, unknown>) ?? null,
    });
  }

  for (const log of emailLogs) {
    timeline.push({
      id: log.id,
      type: 'EMAIL_DELIVERY',
      timestamp: log.createdAt.toISOString(),
      action: log.emailType,
      summary: `Email of type ${log.emailType} to ${log.recipientEmail}`,
      actor: 'System',
      status: log.deliveryStatus,
      outcome: log.deliveryStatus,
      metadata: log.failureReason ? { failureReason: log.failureReason } : null,
    });
  }

  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return timeline;
}
