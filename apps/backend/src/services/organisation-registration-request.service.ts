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
import { Prisma } from '../generated/prisma/client.js';
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

export async function requirePlatformAdminUser(userId: string) {
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
      include: {
        approvedOrganisation: {
          select: {
            status: true,
          },
        },
        initialAdminInvitations: {
          where: {
            purpose: 'INITIAL_ORGANISATION_ADMIN_SETUP',
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            actionTokens: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
              select: {
                id: true,
                expiresAt: true,
                usedAt: true,
                revokedAt: true,
              },
            },
            emailDeliveryLogs: {
              where: {
                emailType: 'INITIAL_ORGANISATION_ADMIN_SETUP',
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
              select: {
                id: true,
                deliveryStatus: true,
                sentAt: true,
                failedAt: true,
                failureReason: true,
              },
            },
          },
        },
      },
    }),
    prisma.organisationRegistrationRequest.count({ where }),
  ]);

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

      const tokens = invitation.actionTokens || [];
      const hasActiveToken = tokens.some(
        (t) => !t.usedAt && !t.revokedAt && new Date(t.expiresAt).getTime() > now.getTime(),
      );
      if (!hasActiveToken) {
        return 'SETUP_TOKEN_EXPIRED';
      }

      if (latestEmailLog?.deliveryStatus === 'FAILED') {
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

  const updateResult = await prisma.organisationRegistrationRequest.updateMany({
    where: {
      id: requestId,
      status: 'PENDING_REVIEW',
    },
    data: {
      status: 'CONTACTED',
      contactedByIpAdminId: ipAdminProfile.id,
      contactedAt: new Date(),
    },
  });

  if (updateResult.count === 0) {
    const exists = await prisma.organisationRegistrationRequest.findUnique({
      where: { id: requestId },
    });
    if (!exists) {
      throw new OrganisationRegistrationRequestError(
        404,
        'REQUEST_NOT_FOUND',
        'Organisation registration request not found',
      );
    }
    throw new OrganisationRegistrationRequestError(
      409,
      'REQUEST_ALREADY_RESOLVED',
      'Request has already been processed or status has changed',
    );
  }

  const updatedRequest = await prisma.organisationRegistrationRequest.findUnique({
    where: { id: requestId },
    include: {
      contactedBy: { include: { user: true } },
      approvedBy: { include: { user: true } },
      rejectedBy: { include: { user: true } },
    },
  });

  if (!updatedRequest) {
    throw new OrganisationRegistrationRequestError(
      404,
      'REQUEST_NOT_FOUND',
      'Organisation registration request not found',
    );
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

  const updateResult = await prisma.organisationRegistrationRequest.updateMany({
    where: {
      id: requestId,
      status: { in: ['PENDING_REVIEW', 'CONTACTED'] },
    },
    data: {
      status: 'REJECTED',
      rejectedByIpAdminId: ipAdminProfile.id,
      rejectedAt: new Date(),
      rejectionReason: input.rejectionReason,
    },
  });

  if (updateResult.count === 0) {
    const exists = await prisma.organisationRegistrationRequest.findUnique({
      where: { id: requestId },
    });
    if (!exists) {
      throw new OrganisationRegistrationRequestError(
        404,
        'REQUEST_NOT_FOUND',
        'Organisation registration request not found',
      );
    }
    throw new OrganisationRegistrationRequestError(
      409,
      'REQUEST_ALREADY_RESOLVED',
      'Request has already been processed or status has changed',
    );
  }

  const updatedRequest = await prisma.organisationRegistrationRequest.findUnique({
    where: { id: requestId },
    include: {
      contactedBy: { include: { user: true } },
      approvedBy: { include: { user: true } },
      rejectedBy: { include: { user: true } },
    },
  });

  if (!updatedRequest) {
    throw new OrganisationRegistrationRequestError(
      404,
      'REQUEST_NOT_FOUND',
      'Organisation registration request not found',
    );
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

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.organisationRegistrationRequest.updateMany({
        where: {
          id: requestId,
          status: { in: ['PENDING_REVIEW', 'CONTACTED'] },
        },
        data: {
          status: 'APPROVED',
          approvedByIpAdminId: ipAdminProfile.id,
          approvedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        const exists = await tx.organisationRegistrationRequest.findUnique({
          where: { id: requestId },
        });
        if (!exists) {
          throw new OrganisationRegistrationRequestError(
            404,
            'REQUEST_NOT_FOUND',
            'Organisation registration request not found',
          );
        }
        throw new OrganisationRegistrationRequestError(
          409,
          'REQUEST_ALREADY_RESOLVED',
          'Request has already been processed or status has changed',
        );
      }

      const organisation = await tx.organisation.create({
        data: {
          name: orgName,
          status: 'PENDING_ONBOARDING',
          description: freshRequest.submittedOrganisationDescription,
          approximateSize: freshRequest.submittedOrganisationSize,
          website: freshRequest.submittedWebsite,
          primaryDomain: freshRequest.submittedPrimaryDomain,
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
          initialAdminOrganisationId: organisation.id,
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
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = error.meta?.target;
      const targetList = Array.isArray(target)
        ? target
        : typeof target === 'string'
          ? [target]
          : [];
      const errorMessage = error.message || '';
      if (
        targetList.includes('name') ||
        errorMessage.includes('name') ||
        errorMessage.includes('Organisation_name_key')
      ) {
        throw new OrganisationRegistrationRequestError(
          409,
          'ORGANISATION_ALREADY_EXISTS',
          'An organisation with this name already exists',
        );
      }
      if (
        targetList.includes('email') ||
        errorMessage.includes('email') ||
        errorMessage.includes('User_email_key')
      ) {
        throw new OrganisationRegistrationRequestError(
          409,
          'REPRESENTATIVE_CONFLICT',
          'A user with this email address already exists',
        );
      }
    }
    throw error;
  }

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
    if (latestToken.usedAt) {
      status = 'USED';
    } else if (latestToken.revokedAt) {
      status = 'REVOKED';
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
