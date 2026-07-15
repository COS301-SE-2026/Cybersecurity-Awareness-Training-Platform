import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

type OrganisationClient = PrismaClient | Prisma.TransactionClient;

// Allowlisted audit action types for the onboarding timeline
const TIMELINE_AUDIT_ACTIONS = [
  'CREATED',
  'CONTACTED',
  'APPROVED',
  'REJECTED',
  'RESENT',
  'ACCEPTED',
  'COMPLETED',
  'SUSPENDED',
  'REACTIVATED',
] as const;

// Allowlisted audit target types for the onboarding timeline
const TIMELINE_AUDIT_TARGETS = [
  'ORGANISATION_REGISTRATION_REQUEST',
  'ORGANISATION',
  'INVITATION',
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

/**
 * Finds the authoritative INITIAL_ORGANISATION_ADMIN_SETUP invitation for an organisation
 * or registration request. Queries are scoped by purpose to enforce the partial unique index.
 */
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
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
}

/**
 * Finds audit logs for the onboarding timeline. Filters to allowed target types and action types
 * directly in the database query -- no in-memory filtering needed.
 */
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
      targetType: { in: [...TIMELINE_AUDIT_TARGETS] },
      actionType: { in: [...TIMELINE_AUDIT_ACTIONS] },
    });
  }
  if (input.requestId) {
    orClauses.push({
      targetType: 'ORGANISATION_REGISTRATION_REQUEST',
      targetId: input.requestId,
      actionType: { in: [...TIMELINE_AUDIT_ACTIONS] },
    });
  }
  if (input.invitationId) {
    orClauses.push({
      targetType: 'INVITATION',
      targetId: input.invitationId,
      actionType: { in: [...TIMELINE_AUDIT_ACTIONS] },
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
          // email intentionally excluded from the timeline
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 50,
  });
}

/**
 * Finds email delivery logs for the onboarding timeline. Scoped to the authoritative
 * INITIAL_ORGANISATION_ADMIN_SETUP invitation only.
 */
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
