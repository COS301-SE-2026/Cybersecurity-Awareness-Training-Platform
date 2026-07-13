import { prisma } from '../lib/prisma.js';
import * as OrganisationRepository from '../repositories/organisation.repository.js';
import { recordAuditLog } from './audit-log.service.js';
import { requestAuthEmailSend } from './auth-email-hook.service.js';
import { issueActionToken } from './action-token.service.js';

export class OrganisationRegistrationRequestError extends Error {
  constructor(
    public readonly statusCode: 403 | 404 | 409 | 422,
    public readonly error: string,
    message: string,
  ) {
    super(message);
    this.name = 'OrganisationRegistrationRequestError';
  }
}

async function requirePlatformAdminUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { ipAdminProfile: true },
  });
  if (!user || user.userType !== 'IP_ADMIN' || user.ipAdminProfile?.adminStatus !== 'ACTIVE') {
    throw new OrganisationRegistrationRequestError(
      403,
      'IP_ADMIN_DISABLED',
      'Platform admin profile is disabled or not found',
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
    id: organisation.id,
    name: organisation.name,
    status: organisation.status,
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

  return {
    ...formatRegistrationRequestBase(request),
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

  return {
    success: true,
    emailQueued: emailResult.queued,
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
    actor?: string | null;
    status?: string | null;
    details?: unknown;
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
      details: log.metadata ?? undefined,
    });
  }

  for (const log of emailLogs) {
    timeline.push({
      id: log.id,
      type: 'EMAIL_DELIVERY',
      timestamp: log.createdAt.toISOString(),
      action: log.emailType,
      summary: `Email of type ${log.emailType} to ${log.recipientEmail}`,
      status: log.deliveryStatus,
      details: log.failureReason ? { failureReason: log.failureReason } : undefined,
    });
  }

  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return timeline;
}

interface FormatInvitationInput {
  id: string;
  status: string;
  recipientEmail: string;
  expiresAt: Date;
  actionTokens: Array<{
    id: string;
    expiresAt: Date;
    usedAt: Date | null;
    revokedAt: Date | null;
  }>;
}

interface FormatEmailLogInput {
  id: string;
  deliveryStatus: string;
  sentAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
}

function formatSetupStatus(
  invitation: FormatInvitationInput | null,
  latestEmailLog: FormatEmailLogInput | null,
) {
  if (!invitation) return null;
  return {
    id: invitation.id,
    status: invitation.status,
    recipientEmail: invitation.recipientEmail,
    expiresAt: invitation.expiresAt.toISOString(),
    activeActionToken: invitation.actionTokens[0]
      ? {
          id: invitation.actionTokens[0].id,
          expiresAt: invitation.actionTokens[0].expiresAt.toISOString(),
          usedAt: invitation.actionTokens[0].usedAt?.toISOString() ?? null,
          revokedAt: invitation.actionTokens[0].revokedAt?.toISOString() ?? null,
        }
      : null,
    latestEmailDelivery: latestEmailLog
      ? {
          id: latestEmailLog.id,
          deliveryStatus: latestEmailLog.deliveryStatus,
          sentAt: latestEmailLog.sentAt?.toISOString() ?? null,
          failedAt: latestEmailLog.failedAt?.toISOString() ?? null,
          failureReason: latestEmailLog.failureReason,
        }
      : null,
  };
}

interface RegistrationRequestBase {
  id: string;
  submittedOrganisationName: string;
  submittedWebsite: string | null;
  submittedOrganisationDescription: string | null;
  submittedOrganisationSize: number | null;
  submittedPrimaryDomain: string | null;
  representativeFirstName: string;
  representativeLastName: string;
  representativeEmail: string;
  representativePhone: string | null;
  status: string;
  contactedByIpAdminId: string | null;
  approvedByIpAdminId: string | null;
  rejectedByIpAdminId: string | null;
  approvedOrganisationId: string | null;
  contactedAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const formatRegistrationRequestBase = (req: RegistrationRequestBase) => {
  return {
    id: req.id,
    submittedOrganisationName: req.submittedOrganisationName,
    submittedWebsite: req.submittedWebsite,
    submittedOrganisationDescription: req.submittedOrganisationDescription,
    submittedOrganisationSize: req.submittedOrganisationSize,
    submittedPrimaryDomain: req.submittedPrimaryDomain,
    representativeFirstName: req.representativeFirstName,
    representativeLastName: req.representativeLastName,
    representativeEmail: req.representativeEmail,
    representativePhone: req.representativePhone,
    status: req.status,
    contactedByIpAdminId: req.contactedByIpAdminId,
    approvedByIpAdminId: req.approvedByIpAdminId,
    rejectedByIpAdminId: req.rejectedByIpAdminId,
    approvedOrganisationId: req.approvedOrganisationId,
    contactedAt: req.contactedAt?.toISOString() ?? null,
    approvedAt: req.approvedAt?.toISOString() ?? null,
    rejectedAt: req.rejectedAt?.toISOString() ?? null,
    rejectionReason: req.rejectionReason,
    createdAt: req.createdAt.toISOString(),
    updatedAt: req.updatedAt.toISOString(),
  };
};

function getResendEligibility(
  organisationStatus: string,
  invitation: FormatInvitationInput | null,
  latestEmailLog: FormatEmailLogInput | null,
  now: Date = new Date(),
) {
  if (organisationStatus !== 'PENDING_ONBOARDING') {
    return { isEligible: false, reason: 'ORGANISATION_NOT_ONBOARDING' };
  }
  if (!invitation) {
    return { isEligible: false, reason: 'INVITATION_NOT_ELIGIBLE' };
  }
  if (invitation.status === 'ACCEPTED' || invitation.status === 'COMPLETED') {
    return { isEligible: false, reason: 'SETUP_ALREADY_COMPLETED' };
  }
  if (invitation.status === 'REVOKED' || invitation.status === 'REJECTED') {
    return { isEligible: false, reason: 'INVITATION_NOT_ELIGIBLE' };
  }
  if (new Date(invitation.expiresAt).getTime() <= now.getTime()) {
    return { isEligible: true, reason: 'SETUP_TOKEN_EXPIRED' };
  }

  const tokens = invitation.actionTokens || [];
  const hasActiveToken = tokens.some(
    (t) => !t.usedAt && !t.revokedAt && new Date(t.expiresAt).getTime() > now.getTime(),
  );

  if (!hasActiveToken) {
    return { isEligible: true, reason: null };
  }

  if (latestEmailLog?.deliveryStatus === 'FAILED') {
    return { isEligible: true, reason: 'SETUP_EMAIL_FAILED' };
  }

  return {
    isEligible: false,
    reason: 'ACTIVE_SETUP_TOKEN_EXISTS',
  };
}
