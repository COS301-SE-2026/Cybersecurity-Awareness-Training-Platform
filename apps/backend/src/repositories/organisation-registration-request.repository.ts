import type {
  OrganisationRegistrationRequestStatus,
  OrganisationStatus,
  Prisma,
  PrismaClient,
} from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { issueActionToken } from '../services/action-token.service.js';
import { recordAuditLog } from '../services/audit-log.service.js';
import { requestAuthEmailSend } from '../services/auth-email-hook.service.js';
import { ensureDefaultOrganisationSecuritySettings } from './security-settings.repository.js';
import { ORGANISATION_PERMISSION_SEEDS } from '../constants/organisation-permission-seeds.js';

type OrganisationRequestClient = PrismaClient | Prisma.TransactionClient;

const activeRequestStatuses: OrganisationRegistrationRequestStatus[] = [
  'PENDING_REVIEW',
  'CONTACTED',
  'APPROVED',
];

const conflictingOrganisationStatuses: OrganisationStatus[] = ['PENDING_ONBOARDING', 'ACTIVE'];

export class OrganisationRegistrationRequestRepositoryError extends Error {
  constructor(
    public readonly statusCode: 403 | 404 | 409 | 422,
    public readonly errorKey: string,
    message: string,
  ) {
    super(message);
    this.name = 'OrganisationRegistrationRequestRepositoryError';
  }

  get error(): string {
    return this.errorKey;
  }
}

export type CreateOrganisationRegistrationRequestRecordInput = {
  submittedOrganisationName: string;
  submittedWebsite: string | null;
  submittedOrganisationDescription: string | null;
  submittedOrganisationSize: number;
  submittedPrimaryDomain: string | null;
  representativeFirstName: string;
  representativeLastName: string;
  representativeEmail: string;
};

export function findUserWithIpAdminProfile(
  userId: string,
  client: OrganisationRequestClient = prisma,
) {
  return client.user.findUnique({
    where: { id: userId },
    include: { ipAdminProfile: true },
  });
}

export function findUserByEmail(email: string, client: OrganisationRequestClient = prisma) {
  return client.user.findUnique({
    where: { email },
  });
}

export function findOrganisationRegistrationRequestById(
  id: string,
  client: OrganisationRequestClient = prisma,
) {
  return client.organisationRegistrationRequest.findUnique({
    where: { id },
  });
}

export function findOrganisationRegistrationRequestWithReviewers(
  id: string,
  client: OrganisationRequestClient = prisma,
) {
  return client.organisationRegistrationRequest.findUnique({
    where: { id },
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
}

export function findActiveRequestByOrganisationName(
  organisationName: string,
  client: OrganisationRequestClient = prisma,
) {
  return client.organisationRegistrationRequest.findFirst({
    where: {
      status: {
        in: activeRequestStatuses,
      },
      submittedOrganisationName: {
        equals: organisationName,
        mode: 'insensitive',
      },
    },
  });
}

export function findActiveRequestByWebsiteOrDomain(
  input: { website: string; primaryDomain: string },
  client: OrganisationRequestClient = prisma,
) {
  return client.organisationRegistrationRequest.findFirst({
    where: {
      status: {
        in: activeRequestStatuses,
      },
      OR: [
        {
          submittedWebsite: {
            equals: input.website,
            mode: 'insensitive',
          },
        },
        {
          submittedPrimaryDomain: {
            equals: input.primaryDomain,
            mode: 'insensitive',
          },
        },
      ],
    },
  });
}

export function findActiveRequestByRepresentativeEmail(
  representativeEmail: string,
  client: OrganisationRequestClient = prisma,
) {
  return client.organisationRegistrationRequest.findFirst({
    where: {
      status: {
        in: activeRequestStatuses,
      },
      representativeEmail: {
        equals: representativeEmail,
        mode: 'insensitive',
      },
    },
  });
}

export function findOrganisationByName(
  organisationName: string,
  client: OrganisationRequestClient = prisma,
) {
  return client.organisation.findFirst({
    where: {
      status: {
        in: conflictingOrganisationStatuses,
      },
      name: {
        equals: organisationName,
        mode: 'insensitive',
      },
    },
  });
}

export function createOrganisationRegistrationRequest(
  input: CreateOrganisationRegistrationRequestRecordInput,
  client: OrganisationRequestClient = prisma,
) {
  return client.organisationRegistrationRequest.create({
    data: {
      submittedOrganisationName: input.submittedOrganisationName,
      submittedWebsite: input.submittedWebsite,
      submittedOrganisationDescription: input.submittedOrganisationDescription,
      submittedOrganisationSize: input.submittedOrganisationSize,
      submittedPrimaryDomain: input.submittedPrimaryDomain,
      representativeFirstName: input.representativeFirstName,
      representativeLastName: input.representativeLastName,
      representativeEmail: input.representativeEmail,
      status: 'PENDING_REVIEW',
    },
  });
}

export type ListOrganisationRegistrationRequestsOptions = {
  status?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

export async function findOrganisationRegistrationRequestsForPlatform(
  options: ListOrganisationRegistrationRequestsOptions,
  client: OrganisationRequestClient = prisma,
) {
  const { status, search, sort, page = 1, limit = 10 } = options;

  const where: Prisma.OrganisationRegistrationRequestWhereInput = {};

  if (status) {
    where.status = status as Prisma.EnumOrganisationRegistrationRequestStatusFilter;
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
    client.organisationRegistrationRequest.findMany({
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
                actionTokenId: true,
              },
            },
          },
        },
      },
    }),
    client.organisationRegistrationRequest.count({ where }),
  ]);

  return { requests, total };
}

export type MarkRequestContactedInput = {
  requestId: string;
  ipAdminProfileId: string;
};

export async function markOrganisationRegistrationRequestContacted(
  input: MarkRequestContactedInput,
  client: OrganisationRequestClient = prisma,
) {
  const updateResult = await client.organisationRegistrationRequest.updateMany({
    where: {
      id: input.requestId,
      status: 'PENDING_REVIEW',
    },
    data: {
      status: 'CONTACTED',
      contactedByIpAdminId: input.ipAdminProfileId,
      contactedAt: new Date(),
    },
  });

  if (updateResult.count === 0) {
    const exists = await client.organisationRegistrationRequest.findUnique({
      where: { id: input.requestId },
    });
    if (!exists) {
      throw new OrganisationRegistrationRequestRepositoryError(
        404,
        'REQUEST_NOT_FOUND',
        'Organisation registration request not found',
      );
    }
    throw new OrganisationRegistrationRequestRepositoryError(
      409,
      'REQUEST_ALREADY_RESOLVED',
      'Request has already been processed or status has changed',
    );
  }

  const updatedRequest = await findOrganisationRegistrationRequestWithReviewers(
    input.requestId,
    client,
  );

  if (!updatedRequest) {
    throw new OrganisationRegistrationRequestRepositoryError(
      404,
      'REQUEST_NOT_FOUND',
      'Organisation registration request not found',
    );
  }

  return updatedRequest;
}

export type RejectOrganisationRegistrationRequestInput = {
  requestId: string;
  ipAdminProfileId: string;
  rejectionReason: string;
};

export async function rejectOrganisationRegistrationRequest(
  input: RejectOrganisationRegistrationRequestInput,
  client: OrganisationRequestClient = prisma,
) {
  const updateResult = await client.organisationRegistrationRequest.updateMany({
    where: {
      id: input.requestId,
      status: { in: ['PENDING_REVIEW', 'CONTACTED'] },
    },
    data: {
      status: 'REJECTED',
      rejectedByIpAdminId: input.ipAdminProfileId,
      rejectedAt: new Date(),
      rejectionReason: input.rejectionReason,
    },
  });

  if (updateResult.count === 0) {
    const exists = await client.organisationRegistrationRequest.findUnique({
      where: { id: input.requestId },
    });
    if (!exists) {
      throw new OrganisationRegistrationRequestRepositoryError(
        404,
        'REQUEST_NOT_FOUND',
        'Organisation registration request not found',
      );
    }
    throw new OrganisationRegistrationRequestRepositoryError(
      409,
      'REQUEST_ALREADY_RESOLVED',
      'Request has already been processed or status has changed',
    );
  }

  const updatedRequest = await findOrganisationRegistrationRequestWithReviewers(
    input.requestId,
    client,
  );

  if (!updatedRequest) {
    throw new OrganisationRegistrationRequestRepositoryError(
      404,
      'REQUEST_NOT_FOUND',
      'Organisation registration request not found',
    );
  }

  return updatedRequest;
}

export function deleteOrganisationRegistrationRequest(
  id: string,
  client: OrganisationRequestClient = prisma,
) {
  return client.organisationRegistrationRequest.delete({
    where: { id },
  });
}

export type ApproveOrganisationRegistrationRequestTxInput = {
  actorUserId: string;
  requestId: string;
  ipAdminProfileId: string;
  orgName: string;
  initialAdminEmail: string;
  request: {
    submittedOrganisationDescription: string | null;
    submittedOrganisationSize: number | null;
    submittedWebsite: string | null;
    submittedPrimaryDomain: string | null;
    representativeFirstName: string;
    representativeLastName: string;
  };
};

export async function approveOrganisationRegistrationRequestTx(
  input: ApproveOrganisationRegistrationRequestTxInput,
  client: PrismaClient = prisma,
) {
  try {
    return await client.$transaction(async (tx) => {
      const updateResult = await tx.organisationRegistrationRequest.updateMany({
        where: {
          id: input.requestId,
          status: { in: ['PENDING_REVIEW', 'CONTACTED'] },
        },
        data: {
          status: 'APPROVED',
          approvedByIpAdminId: input.ipAdminProfileId,
          approvedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        const exists = await tx.organisationRegistrationRequest.findUnique({
          where: { id: input.requestId },
        });
        if (!exists) {
          throw new OrganisationRegistrationRequestRepositoryError(
            404,
            'REQUEST_NOT_FOUND',
            'Organisation registration request not found',
          );
        }
        throw new OrganisationRegistrationRequestRepositoryError(
          409,
          'REQUEST_ALREADY_RESOLVED',
          'Request has already been processed or status has changed',
        );
      }

      const organisation = await tx.organisation.create({
        data: {
          name: input.orgName,
          status: 'PENDING_ONBOARDING',
          description: input.request.submittedOrganisationDescription,
          approximateSize: input.request.submittedOrganisationSize,
          website: input.request.submittedWebsite,
          primaryDomain: input.request.submittedPrimaryDomain,
        },
      });

      const permissionData = ORGANISATION_PERMISSION_SEEDS.map((perm) => ({
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
          organisationRegistrationRequestId: input.requestId,
          recipientEmail: input.initialAdminEmail,
          recipientFirstName: input.request.representativeFirstName,
          recipientLastName: input.request.representativeLastName,
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
          organisationRegistrationRequestId: input.requestId,
        },
        tx,
      );

      const updatedRequest = await tx.organisationRegistrationRequest.update({
        where: { id: input.requestId },
        data: {
          approvedOrganisationId: organisation.id,
        },
      });

      await recordAuditLog(
        {
          actorUserId: input.actorUserId,
          actorType: 'IP_ADMIN',
          targetType: 'ORGANISATION_REGISTRATION_REQUEST',
          targetId: input.requestId,
          actionType: 'APPROVED',
          outcome: 'SUCCESS',
          organisationId: organisation.id,
        },
        tx,
      );

      await recordAuditLog(
        {
          actorUserId: input.actorUserId,
          actorType: 'IP_ADMIN',
          targetType: 'ORGANISATION',
          targetId: organisation.id,
          actionType: 'CREATED',
          outcome: 'SUCCESS',
          organisationId: organisation.id,
        },
        tx,
      );

      await recordAuditLog(
        {
          actorUserId: input.actorUserId,
          actorType: 'IP_ADMIN',
          targetType: 'INVITATION',
          targetId: invitation.id,
          actionType: 'CREATED',
          outcome: 'SUCCESS',
          organisationId: organisation.id,
        },
        tx,
      );

      const emailResult = await requestAuthEmailSend(
        {
          emailType: 'INITIAL_ORGANISATION_ADMIN_SETUP',
          recipientEmail: input.initialAdminEmail,
          organisationId: organisation.id,
          invitationId: invitation.id,
          actionTokenId: actionTokenResult.token.id,
          organisationRegistrationRequestId: input.requestId,
          templateData: {
            firstName: invitation.recipientFirstName ?? '',
            organisationName: organisation.name,
            actionToken: actionTokenResult.rawToken,
            actionTokenExpiresAt: actionTokenResult.token.expiresAt,
          },
        },
        tx,
      );

      if (emailResult.status === 'NOT_QUEUED') {
        throw new OrganisationRegistrationRequestRepositoryError(
          409,
          'EMAIL_QUEUE_FAILED',
          'Required email could not be queued for delivery',
        );
      }

      return {
        updatedRequest,
        organisation,
        invitation,
        actionToken: actionTokenResult,
        emailResult,
      };
    });
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      const pError = error as { meta?: { target?: unknown }; message?: string };
      const target = pError.meta?.target;
      const targetList = Array.isArray(target)
        ? target
        : typeof target === 'string'
          ? [target]
          : [];
      const errorMessage = pError.message || '';
      if (
        targetList.includes('name') ||
        errorMessage.includes('name') ||
        errorMessage.includes('Organisation_name_key')
      ) {
        throw new OrganisationRegistrationRequestRepositoryError(
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
        throw new OrganisationRegistrationRequestRepositoryError(
          409,
          'REPRESENTATIVE_CONFLICT',
          'A user with this email address already exists',
        );
      }
    }
    throw error;
  }
}
