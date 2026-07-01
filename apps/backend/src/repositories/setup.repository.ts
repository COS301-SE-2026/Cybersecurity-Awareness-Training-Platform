import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

type SetupClient = PrismaClient | Prisma.TransactionClient;

export type SetupUserType = 'IP_ADMIN' | 'ORGANISATION_ADMIN' | 'ORGANISATION_TRAINEE';

export function findSetupActionTokenById(id: string, client: SetupClient = prisma) {
  return client.actionToken.findUnique({
    where: { id },
    include: {
      invitation: {
        include: {
          organisation: true,
          organisationRegistrationRequest: true,
        },
      },
      organisationRegistrationRequest: true,
      user: true,
    },
  });
}

export function markInvitationAccepted(id: string, client: SetupClient) {
  return client.invitation.update({
    where: { id },
    data: {
      status: 'ACCEPTED',
      acceptedAt: new Date(),
    },
  });
}

export function findSetupUserByEmail(email: string, client: SetupClient = prisma) {
  return client.user.findUnique({
    where: { email },
    include: {
      traineeProfile: {
        include: {
          organisationTraineeProfile: true,
        },
      },
      organisationAdminProfile: true,
      ipAdminProfile: true,
    },
  });
}

export function createOrganisationAdminUser(
  input: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    organisationId: string;
    isInitialAdmin?: boolean;
    createdFromInvitationId?: string | null;
  },
  client: SetupClient,
) {
  return client.user.create({
    data: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: input.passwordHash,
      userType: 'ORGANISATION_ADMIN',
      authStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
      organisationAdminProfile: {
        create: {
          organisationId: input.organisationId,
          adminStatus: 'ACTIVE',
          isInitialAdmin: input.isInitialAdmin ?? false,
          createdFromInvitationId: input.createdFromInvitationId ?? null,
        },
      },
    },
  });
}

export function createOrganisationTraineeUser(
  input: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    organisationId: string;
    isInitialAdmin?: boolean;
    createdFromInvitationId?: string | null;
  },
  client: SetupClient,
) {
  return client.user.create({
    data: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: input.passwordHash,
      userType: 'ORGANISATION_TRAINEE',
      authStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
      traineeProfile: {
        create: {
          traineeStatus: 'ACTIVE',
          organisationTraineeProfile: {
            create: {
              organisationId: input.organisationId,
              membershipStatus: 'ACTIVE',
            },
          },
        },
      },
    },
  });
}

export function createPlatformAdminUser(
  input: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
  },
  client: SetupClient,
) {
  return client.user.create({
    data: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: input.passwordHash,
      userType: 'IP_ADMIN',
      authStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
      ipAdminProfile: {
        create: {
          adminStatus: 'ACTIVE',
        },
      },
    },
  });
}

export async function activateOrganisationAdminUser(
  input: {
    userId: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    organisationId: string;
    isInitialAdmin?: boolean;
    createdFromInvitationId?: string | null;
  },
  client: SetupClient,
) {
  await client.user.update({
    where: { id: input.userId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: input.passwordHash,
      userType: 'ORGANISATION_ADMIN',
      authStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  await client.organisationAdminProfile.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      organisationId: input.organisationId,
      adminStatus: 'ACTIVE',
      isInitialAdmin: input.isInitialAdmin ?? false,
      createdFromInvitationId: input.createdFromInvitationId ?? null,
    },
    update: {
      organisationId: input.organisationId,
      adminStatus: 'ACTIVE',
      isInitialAdmin: input.isInitialAdmin ?? false,
      createdFromInvitationId: input.createdFromInvitationId ?? null,
    },
  });

  return client.user.findUniqueOrThrow({ where: { id: input.userId } });
}

export async function activateOrganisationTraineeUser(
  input: {
    userId: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    organisationId: string;
  },
  client: SetupClient,
) {
  await client.user.update({
    where: { id: input.userId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: input.passwordHash,
      userType: 'ORGANISATION_TRAINEE',
      authStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  const traineeProfile = await client.traineeProfile.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      traineeStatus: 'ACTIVE',
    },
    update: {
      traineeStatus: 'ACTIVE',
    },
  });

  await client.organisationTraineeProfile.upsert({
    where: { traineeProfileId: traineeProfile.id },
    create: {
      traineeProfileId: traineeProfile.id,
      organisationId: input.organisationId,
      membershipStatus: 'ACTIVE',
    },
    update: {
      organisationId: input.organisationId,
      membershipStatus: 'ACTIVE',
    },
  });

  return client.user.findUniqueOrThrow({ where: { id: input.userId } });
}

export async function activatePlatformAdminUser(
  input: {
    userId: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
  },
  client: SetupClient,
) {
  await client.user.update({
    where: { id: input.userId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: input.passwordHash,
      userType: 'IP_ADMIN',
      authStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  await client.ipAdminProfile.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      adminStatus: 'ACTIVE',
    },
    update: {
      adminStatus: 'ACTIVE',
      revokedAt: null,
      revokedReason: null,
    },
  });

  return client.user.findUniqueOrThrow({ where: { id: input.userId } });
}
