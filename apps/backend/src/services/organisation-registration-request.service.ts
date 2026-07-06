import type {
  CreateOrganisationRegistrationRequestDto,
  OrganisationRegistrationRequestResponseDto,
  ListOrganisationRequestsQueryDto,
  ApproveOrganisationRequestDto,
  RejectOrganisationRequestDto,
} from '@insightful-phish/shared';
import * as OrganisationRequestRepository from '../repositories/organisation-registration-request.repository.js';
import * as UserRepository from '../repositories/user.repository.js';
import { recordAuditLog } from './audit-log.service.js';
import { requestAuthEmailSend } from './auth-email-hook.service.js';
import { prisma } from '../lib/prisma.js';
import type { Prisma } from '../generated/prisma/client.js';
import { issueActionToken } from './action-token.service.js';
import { ensureDefaultOrganisationSecuritySettings } from '../repositories/security-settings.repository.js';

const ORGANISATION_ADMIN_PERMISSION_SEEDS = [
  {
    key: 'VIEW_ORGANISATION_ADMINS' as const,
    displayName: 'View organisation admins',
    description: 'View organisation admin users and their permission grants.',
    isCritical: false,
  },
  {
    key: 'INVITE_ORGANISATION_ADMINS' as const,
    displayName: 'Invite organisation admins',
    description: 'Invite or promote users to organisation admin access.',
    isCritical: true,
  },
  {
    key: 'REMOVE_ORGANISATION_ADMINS' as const,
    displayName: 'Remove organisation admins',
    description: 'Disable or remove organisation admin access.',
    isCritical: false,
  },
  {
    key: 'CHANGE_ORGANISATION_ADMIN_PERMISSIONS' as const,
    displayName: 'Change organisation admin permissions',
    description: 'Grant or revoke organisation admin permissions.',
    isCritical: true,
  },
  {
    key: 'CHANGE_ORGANISATION_SECURITY_SETTINGS' as const,
    displayName: 'Change organisation security settings',
    description: 'Change organisation security policy and related settings.',
    isCritical: true,
  },
];

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

  const where: Prisma.OrganisationRegistrationRequestWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { submittedOrganisationName: { contains: search, mode: 'insensitive' } },
      { representativeEmail: { contains: search, mode: 'insensitive' } },
      { representativeFirstName: { contains: search, mode: 'insensitive' } },
      { representativeLastName: { contains: search, mode: 'insensitive' } },
    ];
  }

  let orderBy: Prisma.OrganisationRegistrationRequestOrderByWithRelationInput = {
    createdAt: 'desc',
  };

  if (sort) {
    const [field, order] = sort.split(':');
    if (field && (order === 'asc' || order === 'desc')) {
      const allowedFields: Record<
        string,
        keyof Prisma.OrganisationRegistrationRequestOrderByWithRelationInput
      > = {
        organisationName: 'submittedOrganisationName',
        submittedOrganisationName: 'submittedOrganisationName',
        representativeEmail: 'representativeEmail',
        status: 'status',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      };
      const prismaField = allowedFields[field];
      if (prismaField) {
        orderBy = { [prismaField]: order };
      }
    }
  }

  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    prisma.organisationRegistrationRequest.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.organisationRegistrationRequest.count({ where }),
  ]);

  return {
    requests: requests.map((req) => ({
      ...req,
      createdAt: req.createdAt.toISOString(),
      updatedAt: req.updatedAt.toISOString(),
      contactedAt: req.contactedAt?.toISOString() ?? null,
      approvedAt: req.approvedAt?.toISOString() ?? null,
      rejectedAt: req.rejectedAt?.toISOString() ?? null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
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

export async function getOrganisationRequest(actorUserId: string, requestId: string) {
  await requirePlatformAdminUser(actorUserId);

  const request = await prisma.organisationRegistrationRequest.findUnique({
    where: { id: requestId },
    include: {
      contactedBy: {
        include: {
          user: true,
        },
      },
      approvedBy: {
        include: {
          user: true,
        },
      },
      rejectedBy: {
        include: {
          user: true,
        },
      },
    },
  });

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

  const request = await prisma.organisationRegistrationRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new OrganisationRegistrationRequestError(
      404,
      'REQUEST_NOT_FOUND',
      'Organisation registration request not found',
    );
  }

  if (
    request.status === 'APPROVED' ||
    request.status === 'REJECTED' ||
    request.status === 'CANCELLED'
  ) {
    throw new OrganisationRegistrationRequestError(
      409,
      'REQUEST_ALREADY_RESOLVED',
      'Request is already approved, rejected, or cancelled',
    );
  }

  const updatedRequest = await prisma.organisationRegistrationRequest.update({
    where: { id: requestId },
    data: {
      status: 'CONTACTED',
      contactedByIpAdminId: ipAdminProfile.id,
      contactedAt: new Date(),
    },
  });

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

  const request = await prisma.organisationRegistrationRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new OrganisationRegistrationRequestError(
      404,
      'REQUEST_NOT_FOUND',
      'Organisation registration request not found',
    );
  }

  if (
    request.status === 'APPROVED' ||
    request.status === 'REJECTED' ||
    request.status === 'CANCELLED'
  ) {
    throw new OrganisationRegistrationRequestError(
      409,
      'REQUEST_ALREADY_RESOLVED',
      'Request is already approved, rejected, or cancelled',
    );
  }

  const updatedRequest = await prisma.organisationRegistrationRequest.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      rejectedByIpAdminId: ipAdminProfile.id,
      rejectedAt: new Date(),
      rejectionReason: input.rejectionReason,
    },
  });

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
    recipientEmail: request.representativeEmail,
    organisationRegistrationRequestId: requestId,
    templateData: {
      organisationName: request.submittedOrganisationName,
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

  const freshRequest = await prisma.organisationRegistrationRequest.findUnique({
    where: { id: requestId },
  });
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

  const existingUser = await prisma.user.findUnique({
    where: { email: input.initialAdminEmail },
  });
  if (existingUser) {
    throw new OrganisationRegistrationRequestError(
      409,
      'REPRESENTATIVE_CONFLICT',
      'A user with this email address already exists',
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const txRequest = await tx.organisationRegistrationRequest.findUnique({
      where: { id: requestId },
    });
    if (!txRequest) {
      throw new OrganisationRegistrationRequestError(
        404,
        'REQUEST_NOT_FOUND',
        'Organisation registration request not found',
      );
    }
    if (
      txRequest.status === 'APPROVED' ||
      txRequest.status === 'REJECTED' ||
      txRequest.status === 'CANCELLED'
    ) {
      throw new OrganisationRegistrationRequestError(
        409,
        'REQUEST_ALREADY_RESOLVED',
        'Request is already approved, rejected, or cancelled',
      );
    }

    const organisation = await tx.organisation.create({
      data: {
        name: orgName,
        status: 'PENDING_ONBOARDING',
      },
    });

    const permissionData = ORGANISATION_ADMIN_PERMISSION_SEEDS.map((perm) => ({
      id: ['organisation-permission', organisation.id, perm.key].join('-'),
      organisationId: organisation.id,
      key: perm.key,
      displayName: perm.displayName,
      description: perm.description,
      isCritical: perm.isCritical,
    }));
    await tx.organisationPermission.createMany({
      data: permissionData,
    });

    await ensureDefaultOrganisationSecuritySettings({ organisationId: organisation.id }, tx);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const invitation = await tx.invitation.create({
      data: {
        organisationId: organisation.id,
        organisationRegistrationRequestId: requestId,
        recipientEmail: input.initialAdminEmail,
        recipientFirstName: freshRequest.representativeFirstName,
        recipientLastName: freshRequest.representativeLastName,
        purpose: 'INITIAL_ORGANISATION_ADMIN_SETUP',
        status: 'PENDING',
        expiresAt,
      },
    });

    const actionTokenResult = await issueActionToken(
      {
        purpose: 'INITIAL_ORGANISATION_ADMIN_SETUP',
        expiresAt,
        targetEmail: input.initialAdminEmail,
        invitationId: invitation.id,
        organisationRegistrationRequestId: requestId,
      },
      tx,
    );

    const updatedRequest = await tx.organisationRegistrationRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approvedByIpAdminId: ipAdminProfile.id,
        approvedAt: new Date(),
        approvedOrganisationId: organisation.id,
      },
    });

    await recordAuditLog(
      {
        actorUserId,
        actorType: 'IP_ADMIN',
        targetType: 'ORGANISATION_REGISTRATION_REQUEST',
        targetId: requestId,
        actionType: 'APPROVED',
        outcome: 'SUCCESS',
        organisationId: organisation.id,
      },
      tx,
    );

    await recordAuditLog(
      {
        actorUserId,
        actorType: 'IP_ADMIN',
        targetType: 'ORGANISATION',
        targetId: organisation.id,
        actionType: 'CREATED',
        outcome: 'SUCCESS',
        organisationId: organisation.id,
      },
      tx,
    );

    return {
      updatedRequest,
      organisation,
      invitation,
      actionToken: actionTokenResult,
    };
  });

  const emailResult = await requestAuthEmailSend({
    emailType: 'INITIAL_ORGANISATION_ADMIN_SETUP',
    recipientEmail: input.initialAdminEmail,
    organisationId: result.organisation.id,
    invitationId: result.invitation.id,
    actionTokenId: result.actionToken.token.id,
    organisationRegistrationRequestId: requestId,
    templateData: {
      firstName: result.invitation.recipientFirstName ?? '',
      organisationName: result.organisation.name,
      actionToken: result.actionToken.rawToken,
      actionTokenExpiresAt: result.actionToken.token.expiresAt,
    },
  });

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
    setupEmailQueued: emailResult.queued,
  };
}

export async function deleteOrganisationRequest(actorUserId: string, requestId: string) {
  await requirePlatformAdminUser(actorUserId);

  const request = await prisma.organisationRegistrationRequest.findUnique({
    where: { id: requestId },
  });

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

  await prisma.organisationRegistrationRequest.delete({
    where: { id: requestId },
  });

  return { success: true };
}

export async function getPlatformOrganisationDetail(actorUserId: string, organisationId: string) {
  await requirePlatformAdminUser(actorUserId);

  const organisation = await prisma.organisation.findUnique({
    where: { id: organisationId },
    include: {
      _count: {
        select: {
          adminProfiles: true,
          traineeProfiles: true,
        },
      },
    },
  });

  if (!organisation) {
    throw new OrganisationRegistrationRequestError(
      404,
      'ORGANISATION_NOT_FOUND',
      'Organisation not found',
    );
  }

  // Find associated registration request
  const registrationRequest = await prisma.organisationRegistrationRequest.findFirst({
    where: { approvedOrganisationId: organisationId },
  });

  // Find initial setup invitation and tokens
  const { invitation, latestEmailLog } = await querySetupInvitationAndEmailLog({ organisationId });

  const resendEligibility = getResendEligibility(organisation.status, invitation, latestEmailLog);

  // Fetch admin profiles with high-level summary only
  const admins = await prisma.organisationAdminProfile.findMany({
    where: { organisationId },
    select: {
      id: true,
      adminStatus: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  // Fetch unified timeline
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

  const request = await prisma.organisationRegistrationRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new OrganisationRegistrationRequestError(
      404,
      'REQUEST_NOT_FOUND',
      'Organisation registration request not found',
    );
  }

  // Find initial setup invitation and tokens (if request is approved)
  const { invitation, latestEmailLog } = await querySetupInvitationAndEmailLog({
    organisationRegistrationRequestId: requestId,
  });

  const organisation = request.approvedOrganisationId
    ? await prisma.organisation.findUnique({ where: { id: request.approvedOrganisationId } })
    : null;

  const resendEligibility = getResendEligibility(
    organisation?.status ?? 'PENDING_ONBOARDING',
    invitation,
    latestEmailLog,
  );

  // Fetch unified timeline
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

  const organisation = await prisma.organisation.findUnique({
    where: { id: organisationId },
  });

  if (!organisation) {
    throw new OrganisationRegistrationRequestError(
      404,
      'ORGANISATION_NOT_FOUND',
      'Organisation not found',
    );
  }

  const invitation = await prisma.invitation.findFirst({
    where: {
      organisationId,
      purpose: 'INITIAL_ORGANISATION_ADMIN_SETUP',
    },
    include: {
      actionTokens: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!invitation) {
    throw new OrganisationRegistrationRequestError(
      404,
      'SETUP_INVITATION_NOT_FOUND',
      'Initial admin setup invitation not found',
    );
  }

  const latestEmailLog = await prisma.emailDeliveryLog.findFirst({
    where: {
      invitationId: invitation.id,
      emailType: 'INITIAL_ORGANISATION_ADMIN_SETUP',
    },
    orderBy: { createdAt: 'desc' },
  });

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
  const auditLogs = await prisma.auditLogEntry.findMany({
    where: {
      OR: [
        ...(organisationId ? [{ organisationId }] : []),
        ...(requestId
          ? [{ targetType: 'ORGANISATION_REGISTRATION_REQUEST' as const, targetId: requestId }]
          : []),
        ...(invitationId ? [{ targetType: 'INVITATION' as const, targetId: invitationId }] : []),
      ],
    },
    include: {
      actorUser: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const emailLogs = await prisma.emailDeliveryLog.findMany({
    where: {
      OR: [
        ...(organisationId ? [{ organisationId }] : []),
        ...(requestId ? [{ organisationRegistrationRequestId: requestId }] : []),
        ...(invitationId ? [{ invitationId }] : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
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

  return { isEligible: false, reason: 'ACTIVE_SETUP_TOKEN_EXISTS' };
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
}) {
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
    return {
      queued: false,
      reason: 'EMAIL_SEND_FAILED' as const,
    };
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

async function querySetupInvitationAndEmailLog(where: {
  organisationId?: string;
  organisationRegistrationRequestId?: string;
}) {
  const invitation = await prisma.invitation.findFirst({
    where: {
      purpose: 'INITIAL_ORGANISATION_ADMIN_SETUP',
      ...where,
    },
    include: {
      actionTokens: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const latestEmailLog = invitation
    ? await prisma.emailDeliveryLog.findFirst({
        where: {
          invitationId: invitation.id,
          emailType: 'INITIAL_ORGANISATION_ADMIN_SETUP',
        },
        orderBy: { createdAt: 'desc' },
      })
    : null;

  return { invitation, latestEmailLog };
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
