import type {
  OrganisationContextMetadataDto,
  OrganisationProfileUpdateDto,
} from '@insightful-phish/shared';
import type {
  Prisma,
  PrismaClient,
  InvitationStatus,
  OrganisationContextProcessingStatus,
  OrganisationContextType,
} from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

export type OrganisationClient = PrismaClient | Prisma.TransactionClient;

const TIMELINE_REGISTRATION_REQUEST_ACTIONS = [
  'CREATED',
  'CONTACTED',
  'APPROVED',
  'REJECTED',
] as const;

const TIMELINE_INITIAL_ADMIN_INVITATION_ACTIONS = [
  'CREATED',
  'RESENT',
  'ACCEPTED',
  'COMPLETED',
] as const;

const TIMELINE_ORGANISATION_LIFECYCLE_ACTIONS = [
  'CREATED',
  'ENABLED',
  'SUSPENDED',
  'REACTIVATED',
] as const;

export function findOrganisationById(organisationId: string, client: OrganisationClient = prisma) {
  return client.organisation.findUnique({
    where: { id: organisationId },
  });
}

export function findOrganisationWithCount(
  organisationId: string,
  client: OrganisationClient = prisma,
) {
  return client.organisation.findUnique({
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
}

export function findOrganisationInformation(
  organisationId: string,
  client: OrganisationClient = prisma,
) {
  return client.organisation.findUnique({
    where: { id: organisationId },
    include: {
      contexts: {
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      },
      _count: {
        select: {
          traineeProfiles: true,
        },
      },
    },
  });
}

export function findRegistrationRequestByOrganisationId(
  organisationId: string,
  client: OrganisationClient = prisma,
) {
  return client.organisationRegistrationRequest.findFirst({
    where: { approvedOrganisationId: organisationId },
  });
}

export function findRegistrationRequestById(
  requestId: string,
  client: OrganisationClient = prisma,
) {
  return client.organisationRegistrationRequest.findUnique({
    where: { id: requestId },
  });
}

export function findOrganisationAdmins(
  organisationId: string,
  client: OrganisationClient = prisma,
) {
  return client.organisationAdminProfile.findMany({
    where: { organisationId },
    select: {
      id: true,
      adminStatus: true,
      isInitialAdmin: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

export function findSetupInvitationAndEmailLog(
  input: { organisationId: string } | { organisationRegistrationRequestId: string },
  client: OrganisationClient = prisma,
) {
  const where: Prisma.InvitationWhereInput =
    'organisationId' in input
      ? { organisationId: input.organisationId, purpose: 'INITIAL_ORGANISATION_ADMIN_SETUP' }
      : {
          organisationRegistrationRequestId: input.organisationRegistrationRequestId,
          purpose: 'INITIAL_ORGANISATION_ADMIN_SETUP',
        };

  return client.invitation.findFirst({
    where,
    include: {
      actionTokens: {
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      },
    },
  });
}

export function findLatestEmailLogForInvitation(
  invitationId: string,
  client: OrganisationClient = prisma,
) {
  return client.emailDeliveryLog.findFirst({
    where: {
      invitationId,
      emailType: 'INITIAL_ORGANISATION_ADMIN_SETUP',
    },
    include: {
      deliveryJob: {
        select: {
          lastProviderOutcome: true,
          lastReasonCode: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
}

export function findAuditLogsForTimeline(
  input: {
    organisationId: string | null;
    requestId: string | null;
    invitationId: string | null;
  },
  client: OrganisationClient = prisma,
) {
  const orClauses: Prisma.AuditLogEntryWhereInput[] = [];

  if (input.organisationId) {
    orClauses.push({
      organisationId: input.organisationId,
      targetType: 'ORGANISATION',
      targetId: input.organisationId,
      actionType: { in: [...TIMELINE_ORGANISATION_LIFECYCLE_ACTIONS] },
    });
  }
  if (input.requestId) {
    orClauses.push({
      targetType: 'ORGANISATION_REGISTRATION_REQUEST',
      targetId: input.requestId,
      actionType: { in: [...TIMELINE_REGISTRATION_REQUEST_ACTIONS] },
    });
  }
  if (input.invitationId) {
    orClauses.push({
      targetType: 'INVITATION',
      targetId: input.invitationId,
      actionType: { in: [...TIMELINE_INITIAL_ADMIN_INVITATION_ACTIONS] },
    });
  }

  if (orClauses.length === 0) {
    return Promise.resolve([]);
  }

  return client.auditLogEntry.findMany({
    where: { OR: orClauses },
    include: {
      actorUser: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 50,
  });
}

export function findEmailLogsForTimeline(
  invitationId: string | null,
  client: OrganisationClient = prisma,
) {
  if (!invitationId) {
    return Promise.resolve([]);
  }

  return client.emailDeliveryLog.findMany({
    where: {
      invitationId,
      emailType: 'INITIAL_ORGANISATION_ADMIN_SETUP',
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 50,
  });
}

export function findUserForSetupValidation(email: string, client: OrganisationClient = prisma) {
  return client.user.findUnique({
    where: { email },
    include: {
      organisationAdminProfile: true,
      traineeProfile: {
        include: {
          organisationTraineeProfile: true,
        },
      },
    },
  });
}

export async function claimInvitationForResend(
  input: {
    id: string;
    status: InvitationStatus;
    updatedAt: Date;
    expiresAt: Date;
  },
  client: OrganisationClient = prisma,
) {
  const result = await client.invitation.updateMany({
    where: {
      id: input.id,
      status: input.status,
      updatedAt: input.updatedAt,
    },
    data: {
      status: 'PENDING',
      expiresAt: input.expiresAt,
    },
  });

  return result.count === 1;
}

export function revokeActiveActionTokensForInvitation(
  invitationId: string,
  revokedReason: string = 'SUPERSEDED_BY_RESEND',
  client: OrganisationClient = prisma,
) {
  return client.actionToken.updateMany({
    where: {
      invitationId,
      usedAt: null,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokedReason,
    },
  });
}

export function markActionTokenRevoked(
  tokenId: string,
  revokedReason: string = 'EMAIL_SEND_FAILED',
  client: OrganisationClient = prisma,
) {
  return client.actionToken.updateMany({
    where: {
      id: tokenId,
      usedAt: null,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokedReason,
    },
  });
}

export type UpdateOrganisationProfileInput = OrganisationProfileUpdateDto & {
  organisationId: string;
};
export function updateOrganisationProfile(
  input: UpdateOrganisationProfileInput,
  client: OrganisationClient = prisma,
) {
  return client.organisation.update({
    where: { id: input.organisationId },
    data: {
      name: input.name,
      description: input.description,
      website: input.website,
      primaryDomain: input.primaryDomain,
      approximateSize: input.approximateSize,
    },
  });
}

export type CreateOrganisationContextInput = {
  organisationId: string;
  uploadedByUserId: string;
  contextType: OrganisationContextType;
  name: string;
  description: string | null;
  contentSummary: string;
  metadata: OrganisationContextMetadataDto;
  processingStatus: OrganisationContextProcessingStatus;
  aiUsable: boolean;
};
export function createOrganisationContext(
  input: CreateOrganisationContextInput,
  client: OrganisationClient = prisma,
) {
  return client.organisationContext.create({
    data: {
      organisationId: input.organisationId,
      uploadedByUserId: input.uploadedByUserId,
      contextType: input.contextType,
      name: input.name,
      description: input.description,
      contentSummary: input.contentSummary,
      metadata: input.metadata,
      processingStatus: input.processingStatus,
      aiUsable: input.aiUsable,
    },
  });
}

export type UpdateOrganisationContextInput = {
  organisationId: string;
  contextId: string;
  contextType: OrganisationContextType;
  name: string;
  description: string | null;
  contentSummary: string;
  metadata: OrganisationContextMetadataDto;
  processingStatus: OrganisationContextProcessingStatus;
  aiUsable: boolean;
};
export async function updateOrganisationContext(
  input: UpdateOrganisationContextInput,
  client: OrganisationClient = prisma,
) {
  const result = await client.organisationContext.updateMany({
    where: { id: input.contextId, organisationId: input.organisationId },
    data: {
      contextType: input.contextType,
      name: input.name,
      description: input.description,
      contentSummary: input.contentSummary,
      metadata: input.metadata,
      processingStatus: input.processingStatus,
      aiUsable: input.aiUsable,
    },
  });
  return result.count === 1;
}

export type UpdateOrganisationContextStatusInput = {
  organisationId: string;
  contextId: string;
  processingStatus: OrganisationContextProcessingStatus;
};
export async function updateOrganisationContextStatus(
  input: UpdateOrganisationContextStatusInput,
  client: OrganisationClient = prisma,
) {
  const result = await client.organisationContext.updateMany({
    where: { id: input.contextId, organisationId: input.organisationId },
    data: { processingStatus: input.processingStatus },
  });
  return result.count === 1;
}

export type UpdateOrganisationContextAiUsableInput = {
  organisationId: string;
  contextId: string;
  aiUsable: boolean;
};
export async function updateOrganisationContextAiUsable(
  input: UpdateOrganisationContextAiUsableInput,
  client: OrganisationClient = prisma,
) {
  const result = await client.organisationContext.updateMany({
    where: { id: input.contextId, organisationId: input.organisationId },
    data: { aiUsable: input.aiUsable },
  });
  return result.count === 1;
}

export function runInTransaction<T>(
  action: (tx: Prisma.TransactionClient) => Promise<T>,
  client: OrganisationClient = prisma,
): Promise<T> {
  if ('$transaction' in client && typeof client.$transaction === 'function') {
    return client.$transaction(async (tx) => action(tx));
  }
  return action(client);
}
