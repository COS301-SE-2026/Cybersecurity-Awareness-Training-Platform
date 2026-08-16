import type {
  CreateOrganisationRegistrationRequestDto,
  OrganisationRegistrationRequestResponseDto,
  ListOrganisationRequestsQueryDto,
  ApproveOrganisationRequestDto,
  RejectOrganisationRequestDto,
} from '@insightful-phish/shared';
import { env } from '../config/env.js';
import * as OrganisationRequestRepository from '../repositories/organisation-registration-request.repository.js';
import * as UserRepository from '../repositories/user.repository.js';
import { recordAuditLog } from './audit-log.service.js';
import { requestAuthEmailSend } from './auth-email-hook.service.js';
import { renderEmail } from './email-template-renderer.js';
import { generateOpaqueToken, hashOpaqueToken } from './token-hash.service.js';

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

function rethrowAsServiceError(error: unknown): never {
  if (
    error instanceof OrganisationRequestRepository.OrganisationRegistrationRequestRepositoryError
  ) {
    throw new OrganisationRegistrationRequestError(error.statusCode, error.errorKey, error.message);
  }
  throw error;
}

export async function requirePlatformAdminUser(userId: string) {
  const user = await OrganisationRequestRepository.findUserWithIpAdminProfile(userId);
  if (user?.userType !== 'IP_ADMIN' || user?.ipAdminProfile?.adminStatus !== 'ACTIVE') {
    throw new OrganisationRegistrationRequestError(
      403,
      'FORBIDDEN',
      'Platform admin access is required',
    );
  }
  return user.ipAdminProfile;
}

export async function listOrganisationRequests(
  actorUserId: string,
  query: ListOrganisationRequestsQueryDto,
) {
  await requirePlatformAdminUser(actorUserId);

  const { status, search, sort, page = 1, limit = 10 } = query;

  const { requests, total } =
    await OrganisationRequestRepository.findOrganisationRegistrationRequestsForPlatform({
      status,
      search,
      sort,
      page,
      limit,
    });

  const getDerivedStatus = (
    requestStatus: string,
    orgStatus: string | null,
    invitation: FormatInvitationInput | null,
    latestEmailLog: FormatEmailLogInput | null,
    now: Date = new Date(),
  ): string => {
    if (requestStatus !== 'APPROVED') {
      return requestStatus;
    }
    if (!orgStatus) {
      return 'APPROVED';
    }
    if (orgStatus === 'PENDING_ONBOARDING') {
      if (!invitation) {
        return 'APPROVED_PENDING_SETUP';
      }
      if (invitation.status === 'ACCEPTED' || invitation.status === 'COMPLETED') {
        return 'ONBOARDING';
      }
      if (invitation.status === 'FAILED_TO_SEND') {
        return 'SETUP_EMAIL_FAILED';
      }
      if (invitation.status === 'EXPIRED') {
        return 'SETUP_TOKEN_EXPIRED';
      }
      if (new Date(invitation.expiresAt).getTime() <= now.getTime()) {
        return 'SETUP_TOKEN_EXPIRED';
      }

      const activeToken = findActiveSetupToken(invitation, now);
      if (!activeToken) {
        return 'SETUP_TOKEN_EXPIRED';
      }

      if (isFailedDeliveryForCurrentSetupToken(latestEmailLog, activeToken)) {
        return 'SETUP_EMAIL_FAILED';
      }

      return 'PENDING_ONBOARDING';
    }
    return orgStatus;
  };

  return {
    requests: requests.map((req) => {
      const orgStatus = req.approvedOrganisation?.status ?? null;
      const invitation = req.initialAdminInvitations[0] ?? null;
      const latestEmailLog = invitation?.emailDeliveryLogs[0] ?? null;
      return {
        ...formatRegistrationRequestBase(req),
        organisationStatus: orgStatus,
        setupStatus: formatSetupStatus(invitation, latestEmailLog),
        resendEligibility: getResendEligibility(
          orgStatus ?? 'PENDING_ONBOARDING',
          invitation,
          latestEmailLog,
        ),
        derivedStatus: getDerivedStatus(req.status, orgStatus, invitation, latestEmailLog),
      };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export interface RegistrationRequestBase {
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

export const formatRegistrationRequestBase = (req: RegistrationRequestBase) => {
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

export async function getOrganisationRequest(actorUserId: string, requestId: string) {
  await requirePlatformAdminUser(actorUserId);

  const request =
    await OrganisationRequestRepository.findOrganisationRegistrationRequestWithReviewers(requestId);

  if (!request) {
    throw new OrganisationRegistrationRequestError(
      404,
      'REQUEST_NOT_FOUND',
      'Organisation registration request not found',
    );
  }

  interface AdminProfileWithUser {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  }

  const mapAdminUser = (profile: AdminProfileWithUser | null) => {
    if (!profile) return null;
    return {
      id: profile.id,
      user: {
        firstName: profile.user.firstName,
        lastName: profile.user.lastName,
        email: profile.user.email,
      },
    };
  };

  return {
    ...formatRegistrationRequestBase(request),
    contactedBy: mapAdminUser(request.contactedBy),
    approvedBy: mapAdminUser(request.approvedBy),
    rejectedBy: mapAdminUser(request.rejectedBy),
  };
}

export async function markRequestContacted(actorUserId: string, requestId: string) {
  const ipAdminProfile = await requirePlatformAdminUser(actorUserId);

  let updatedRequest: Awaited<
    ReturnType<typeof OrganisationRequestRepository.markOrganisationRegistrationRequestContacted>
  >;
  try {
    updatedRequest =
      await OrganisationRequestRepository.markOrganisationRegistrationRequestContacted({
        requestId,
        ipAdminProfileId: ipAdminProfile.id,
      });
  } catch (error) {
    rethrowAsServiceError(error);
  }

  await recordAuditLog({
    actorUserId,
    actorType: 'IP_ADMIN',
    targetType: 'ORGANISATION_REGISTRATION_REQUEST',
    targetId: requestId,
    actionType: 'CONTACTED',
    outcome: 'SUCCESS',
  });

  return {
    ...updatedRequest,
    createdAt: updatedRequest.createdAt.toISOString(),
    updatedAt: updatedRequest.updatedAt.toISOString(),
    contactedAt: updatedRequest.contactedAt?.toISOString() ?? null,
    approvedAt: updatedRequest.approvedAt?.toISOString() ?? null,
    rejectedAt: updatedRequest.rejectedAt?.toISOString() ?? null,
  };
}

export async function rejectOrganisationRequest(
  actorUserId: string,
  requestId: string,
  input: RejectOrganisationRequestDto,
) {
  const ipAdminProfile = await requirePlatformAdminUser(actorUserId);

  let updatedRequest: Awaited<
    ReturnType<typeof OrganisationRequestRepository.rejectOrganisationRegistrationRequest>
  >;
  try {
    updatedRequest = await OrganisationRequestRepository.rejectOrganisationRegistrationRequest({
      requestId,
      ipAdminProfileId: ipAdminProfile.id,
      rejectionReason: input.rejectionReason,
    });
  } catch (error) {
    rethrowAsServiceError(error);
  }

  await recordAuditLog({
    actorUserId,
    actorType: 'IP_ADMIN',
    targetType: 'ORGANISATION_REGISTRATION_REQUEST',
    targetId: requestId,
    actionType: 'REJECTED',
    outcome: 'SUCCESS',
    metadata: { rejectionReason: input.rejectionReason },
  });

  const emailResult = await requestAuthEmailSend({
    emailType: 'ORGANISATION_REQUEST_REJECTED',
    recipientEmail: updatedRequest.representativeEmail,
    organisationRegistrationRequestId: requestId,
    templateData: {
      organisationName: updatedRequest.submittedOrganisationName,
      rejectionReason: input.rejectionReason,
    },
  });

  return {
    ...updatedRequest,
    createdAt: updatedRequest.createdAt.toISOString(),
    updatedAt: updatedRequest.updatedAt.toISOString(),
    contactedAt: updatedRequest.contactedAt?.toISOString() ?? null,
    approvedAt: updatedRequest.approvedAt?.toISOString() ?? null,
    rejectedAt: updatedRequest.rejectedAt?.toISOString() ?? null,
    rejectionEmailQueued: emailResult.queued,
  };
}

export async function approveOrganisationRequest(
  actorUserId: string,
  requestId: string,
  input: ApproveOrganisationRequestDto,
) {
  const ipAdminProfile = await requirePlatformAdminUser(actorUserId);

  const freshRequest =
    await OrganisationRequestRepository.findOrganisationRegistrationRequestById(requestId);
  if (!freshRequest) {
    throw new OrganisationRegistrationRequestError(
      404,
      'REQUEST_NOT_FOUND',
      'Organisation registration request not found',
    );
  }
  if (
    freshRequest.status === 'APPROVED' ||
    freshRequest.status === 'REJECTED' ||
    freshRequest.status === 'CANCELLED'
  ) {
    throw new OrganisationRegistrationRequestError(
      409,
      'REQUEST_ALREADY_RESOLVED',
      'Request is already approved, rejected, or cancelled',
    );
  }

  const orgName = input.organisationName ?? freshRequest.submittedOrganisationName;

  const existingOrganisation = await OrganisationRequestRepository.findOrganisationByName(orgName);
  if (existingOrganisation) {
    throw new OrganisationRegistrationRequestError(
      409,
      'ORGANISATION_ALREADY_EXISTS',
      'An organisation with this name already exists',
    );
  }

  // Enforce that the designated initial admin email matches the submitted representative email.
  if (input.initialAdminEmail !== freshRequest.representativeEmail) {
    throw new OrganisationRegistrationRequestError(
      409,
      'SETUP_EMAIL_MISMATCH',
      'Initial admin email must match the registration request representative email',
    );
  }

  const existingUser = await OrganisationRequestRepository.findUserByEmail(input.initialAdminEmail);
  if (existingUser) {
    throw new OrganisationRegistrationRequestError(
      409,
      'REPRESENTATIVE_CONFLICT',
      'A user with this email address already exists',
    );
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const rawToken = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(rawToken);

  const renderedEmail = renderEmail('INITIAL_ORGANISATION_ADMIN_SETUP', {
    firstName: freshRequest.representativeFirstName,
    organisationName: orgName,
    actionToken: rawToken,
    actionTokenExpiresAt: expiresAt,
  });

  let result: Awaited<
    ReturnType<typeof OrganisationRequestRepository.approveOrganisationRegistrationRequestTx>
  >;
  try {
    result = await OrganisationRequestRepository.approveOrganisationRegistrationRequestTx({
      actorUserId,
      requestId,
      ipAdminProfileId: ipAdminProfile.id,
      orgName,
      initialAdminEmail: input.initialAdminEmail,
      request: freshRequest,
      actionTokenData: {
        tokenHash,
        expiresAt,
      },
      emailDeliveryData: {
        emailType: 'INITIAL_ORGANISATION_ADMIN_SETUP',
        recipientEmail: input.initialAdminEmail,
        subject: renderedEmail.subject,
        text: renderedEmail.text,
        html: renderedEmail.html,
        maxAttempts: env.EMAIL_DISPATCHER_MAX_ATTEMPTS,
      },
      auditLogEntries: [
        {
          actorUserId,
          actorType: 'IP_ADMIN',
          targetType: 'ORGANISATION_REGISTRATION_REQUEST',
          targetId: requestId,
          actionType: 'APPROVED',
          outcome: 'SUCCESS',
        },
        {
          actorUserId,
          actorType: 'IP_ADMIN',
          targetType: 'ORGANISATION',
          targetId: null,
          actionType: 'CREATED',
          outcome: 'SUCCESS',
        },
        {
          actorUserId,
          actorType: 'IP_ADMIN',
          targetType: 'INVITATION',
          targetId: null,
          actionType: 'CREATED',
          outcome: 'SUCCESS',
        },
      ],
    });
  } catch (error) {
    rethrowAsServiceError(error);
  }

  return {
    ...result.updatedRequest,
    createdAt: result.updatedRequest.createdAt.toISOString(),
    updatedAt: result.updatedRequest.updatedAt.toISOString(),
    contactedAt: result.updatedRequest.contactedAt?.toISOString() ?? null,
    approvedAt: result.updatedRequest.approvedAt?.toISOString() ?? null,
    rejectedAt: result.updatedRequest.rejectedAt?.toISOString() ?? null,
    approvedOrganisation: {
      id: result.organisation.id,
      name: result.organisation.name,
    },
    setupEmailQueued: true,
  };
}

export async function deleteOrganisationRequest(actorUserId: string, requestId: string) {
  await requirePlatformAdminUser(actorUserId);

  const request =
    await OrganisationRequestRepository.findOrganisationRegistrationRequestById(requestId);

  if (!request) {
    throw new OrganisationRegistrationRequestError(
      404,
      'REQUEST_NOT_FOUND',
      'Organisation registration request not found',
    );
  }

  if (request.status !== 'REJECTED' && request.status !== 'CANCELLED') {
    throw new OrganisationRegistrationRequestError(
      409,
      'REQUEST_NOT_DELETABLE',
      'Only rejected or cancelled requests can be deleted',
    );
  }

  await OrganisationRequestRepository.deleteOrganisationRegistrationRequest(requestId);

  return { success: true };
}

export async function createOrganisationRegistrationRequest(
  input: CreateOrganisationRegistrationRequestDto,
): Promise<OrganisationRegistrationRequestResponseDto> {
  const normalisedWebsite = input.organisationWebsiteUrl
    ? normaliseWebsiteUrl(input.organisationWebsiteUrl)
    : null;
  const primaryDomain = normalisedWebsite ? primaryDomainFromWebsite(normalisedWebsite) : null;

  await assertNoDuplicateOrganisationRequest({
    organisationName: input.organisationName,
    website: normalisedWebsite,
    primaryDomain,
    representativeEmail: input.representativeEmail,
  });
  await assertNoRepresentativeRoleConflict(input.representativeEmail);

  const request = await OrganisationRequestRepository.createOrganisationRegistrationRequest({
    submittedOrganisationName: input.organisationName,
    submittedWebsite: normalisedWebsite,
    submittedOrganisationDescription: input.organisationDescription ?? null,
    submittedOrganisationSize: input.organisationSize,
    submittedPrimaryDomain: primaryDomain,
    representativeFirstName: input.representativeFirstName,
    representativeLastName: input.representativeLastName,
    representativeEmail: input.representativeEmail,
  });

  const emailResult = await requestRequestReceivedEmail({
    requestId: request.id,
    organisationName: request.submittedOrganisationName,
    representativeEmail: request.representativeEmail,
  });

  await recordRequestCreatedAudit(request.id);

  return {
    requestId: request.id,
    status: 'PENDING_REVIEW',
    confirmationEmailQueued: emailResult.queued,
  };
}

async function assertNoDuplicateOrganisationRequest(input: {
  organisationName: string;
  website: string | null;
  primaryDomain: string | null;
  representativeEmail: string;
}) {
  const existingOrganisation = await OrganisationRequestRepository.findOrganisationByName(
    input.organisationName,
  );
  if (existingOrganisation) {
    throw duplicateRequestError();
  }

  const duplicateName = await OrganisationRequestRepository.findActiveRequestByOrganisationName(
    input.organisationName,
  );
  if (duplicateName) {
    throw duplicateRequestError();
  }

  if (input.website && input.primaryDomain) {
    const duplicateWebsite = await OrganisationRequestRepository.findActiveRequestByWebsiteOrDomain(
      {
        website: input.website,
        primaryDomain: input.primaryDomain,
      },
    );
    if (duplicateWebsite) {
      throw duplicateRequestError();
    }
  }

  const duplicateRepresentative =
    await OrganisationRequestRepository.findActiveRequestByRepresentativeEmail(
      input.representativeEmail,
    );
  if (duplicateRepresentative) {
    throw duplicateRequestError();
  }
}

async function assertNoRepresentativeRoleConflict(representativeEmail: string) {
  const subject = await UserRepository.findAuthSubjectByEmail(representativeEmail);

  if (subject.user) {
    throw duplicateRequestError();
  }
}

function duplicateRequestError() {
  return new OrganisationRegistrationRequestError(
    409,
    'ORGANISATION_REQUEST_CONFLICT',
    'The organisation registration request conflicts with existing records.',
  );
}

async function requestRequestReceivedEmail(input: {
  requestId: string;
  organisationName: string;
  representativeEmail: string;
}): Promise<{ queued: boolean }> {
  try {
    return await requestAuthEmailSend({
      emailType: 'ORGANISATION_REQUEST_RECEIVED',
      recipientEmail: input.representativeEmail,
      organisationRegistrationRequestId: input.requestId,
      templateData: {
        organisationName: input.organisationName,
      },
    });
  } catch {
    return { queued: false };
  }
}

async function recordRequestCreatedAudit(requestId: string) {
  try {
    await recordAuditLog({
      actorType: 'SYSTEM',
      targetType: 'ORGANISATION_REGISTRATION_REQUEST',
      targetId: requestId,
      actionType: 'CREATED',
      metadata: {
        source: 'public_organisation_registration_request',
      },
    });
  } catch {
    return;
  }
}

function normaliseWebsiteUrl(value: string) {
  const url = new URL(value);
  url.hash = '';
  url.search = '';
  return url.toString().replace(/\/$/, '');
}

function primaryDomainFromWebsite(value: string) {
  const hostname = new URL(value).hostname.toLowerCase();
  return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
}

export interface FormatInvitationInput {
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

export interface FormatEmailLogInput {
  id: string;
  deliveryStatus: string;
  sentAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  actionTokenId?: string | null;
}

type FormatActionTokenInput = FormatInvitationInput['actionTokens'][number];

function findActiveSetupToken(
  invitation: FormatInvitationInput,
  now: Date,
): FormatActionTokenInput | undefined {
  return invitation.actionTokens.find(
    (token) =>
      !token.usedAt && !token.revokedAt && new Date(token.expiresAt).getTime() > now.getTime(),
  );
}

function isFailedDeliveryForCurrentSetupToken(
  latestEmailLog: FormatEmailLogInput | null,
  activeToken: FormatActionTokenInput | undefined,
) {
  if (latestEmailLog?.deliveryStatus !== 'FAILED') {
    return false;
  }

  return !activeToken || latestEmailLog.actionTokenId === activeToken.id;
}

export function formatSetupStatus(
  invitation: FormatInvitationInput | null,
  latestEmailLog: FormatEmailLogInput | null,
) {
  if (!invitation) return null;
  const latestToken = invitation.actionTokens[0];
  let latestActionToken = null;
  if (latestToken) {
    let status: 'AVAILABLE' | 'USED' | 'REVOKED' | 'EXPIRED' = 'AVAILABLE';
    if (latestToken.revokedAt) {
      status = 'REVOKED';
    } else if (latestToken.usedAt) {
      status = 'USED';
    } else if (new Date(latestToken.expiresAt).getTime() <= Date.now()) {
      status = 'EXPIRED';
    }

    latestActionToken = {
      id: latestToken.id,
      expiresAt: latestToken.expiresAt.toISOString(),
      usedAt: latestToken.usedAt?.toISOString() ?? null,
      revokedAt: latestToken.revokedAt?.toISOString() ?? null,
      status,
    };
  }

  return {
    id: invitation.id,
    status: invitation.status,
    recipientEmail: invitation.recipientEmail,
    expiresAt: invitation.expiresAt.toISOString(),
    latestActionToken,
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

export function getResendEligibility(
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
  if (invitation.status === 'FAILED_TO_SEND') {
    return { isEligible: true, reason: 'SETUP_EMAIL_FAILED' };
  }
  if (new Date(invitation.expiresAt).getTime() <= now.getTime()) {
    return { isEligible: true, reason: 'SETUP_TOKEN_EXPIRED' };
  }

  const activeToken = findActiveSetupToken(invitation, now);

  if (isFailedDeliveryForCurrentSetupToken(latestEmailLog, activeToken)) {
    return { isEligible: true, reason: 'SETUP_EMAIL_FAILED' };
  }

  if (!activeToken) {
    return { isEligible: true, reason: null };
  }

  return { isEligible: false, reason: 'ACTIVE_SETUP_TOKEN_EXISTS' };
}
