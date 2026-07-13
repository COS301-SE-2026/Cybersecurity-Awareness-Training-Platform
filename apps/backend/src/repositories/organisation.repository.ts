import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

type OrganisationClient = PrismaClient | Prisma.TransactionClient;

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

export function findAuditLogsForTimeline(
  whereClause: Prisma.AuditLogEntryWhereInput,
  client: OrganisationClient = prisma,
) {
  return client.auditLogEntry.findMany({
    where: whereClause,
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
}

export function findEmailLogsForTimeline(
  whereClause: Prisma.EmailDeliveryLogWhereInput,
  client: OrganisationClient = prisma,
) {
  return client.emailDeliveryLog.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });
}

export function findSetupInvitationAndEmailLog(
  whereClause: Prisma.InvitationWhereInput,
  client: OrganisationClient = prisma,
) {
  if (typeof whereClause.organisationId === 'string') {
    return client.invitation.findUnique({
      where: {
        initialAdminOrganisationId: whereClause.organisationId,
      },
      include: {
        actionTokens: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }
  return client.invitation.findFirst({
    where: {
      purpose: 'INITIAL_ORGANISATION_ADMIN_SETUP',
      ...whereClause,
    },
    include: {
      actionTokens: {
        orderBy: { createdAt: 'desc' },
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
    orderBy: { createdAt: 'desc' },
  });
}
