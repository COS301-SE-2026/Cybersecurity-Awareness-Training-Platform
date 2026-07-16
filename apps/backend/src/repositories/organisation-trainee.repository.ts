import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

export type OrganisationTraineeClient = PrismaClient | Prisma.TransactionClient;

export function findOrganisationTrainees(
  organisationId: string,
  client: OrganisationTraineeClient = prisma,
) {
  return client.organisationTraineeProfile.findMany({
    where: {
      organisationId,
    },
    include: {
      traineeProfile: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export function findOrganisationTraineeInvitations(
  organisationId: string,
  client: OrganisationTraineeClient = prisma,
) {
  return client.invitation.findMany({
    where: {
      organisationId,
      purpose: 'ORGANISATION_TRAINEE_INVITE',
    },
    include: {
      emailDeliveryLogs: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export function findOrganisationTraineeByEmail(
  organisationId: string,
  email: string,
  client: OrganisationTraineeClient = prisma,
) {
  const normalisedEmail = email.trim().toLowerCase();
  return client.organisationTraineeProfile.findFirst({
    where: {
      organisationId,
      traineeProfile: {
        user: {
          email: normalisedEmail,
        },
      },
    },
    include: {
      traineeProfile: {
        include: {
          user: true,
        },
      },
    },
  });
}

export function findPendingTraineeInvitationByEmail(
  organisationId: string,
  email: string,
  client: OrganisationTraineeClient = prisma,
) {
  const normalisedEmail = email.trim().toLowerCase();
  return client.invitation.findFirst({
    where: {
      organisationId,
      purpose: 'ORGANISATION_TRAINEE_INVITE',
      recipientEmail: normalisedEmail,
      status: {
        in: ['PENDING', 'SENT', 'FAILED_TO_SEND'],
      },
    },
  });
}

export function findOrganisationTraineeById(
  organisationId: string,
  traineeId: string,
  client: OrganisationTraineeClient = prisma,
) {
  return client.organisationTraineeProfile.findFirst({
    where: {
      organisationId,
      OR: [
        { id: traineeId },
        { traineeProfileId: traineeId },
        { traineeProfile: { userId: traineeId } },
      ],
    },
    include: {
      traineeProfile: {
        include: {
          user: true,
        },
      },
    },
  });
}

export function disableOrganisationTraineeProfile(
  id: string,
  disabledReason?: string | null,
  client: OrganisationTraineeClient = prisma,
) {
  return client.organisationTraineeProfile.update({
    where: { id },
    data: {
      membershipStatus: 'DISABLED',
      disabledAt: new Date(),
      disabledReason: disabledReason ?? 'Disabled by organisation admin',
    },
  });
}
