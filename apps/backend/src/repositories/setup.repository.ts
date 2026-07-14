import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { ensureDefaultOrganisationSecuritySettings } from './security-settings.repository.js';

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

export async function createOrganisationAdminUser(
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
  await ensureDefaultOrganisationSecuritySettings({ organisationId: input.organisationId }, client);

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

export async function createOrganisationTraineeUser(
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
  await ensureDefaultOrganisationSecuritySettings({ organisationId: input.organisationId }, client);

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

export class SetupRepositoryConflictError extends Error {
  constructor(
    public readonly statusCode: 409,
    public readonly error: string,
    message: string,
  ) {
    super(message);
    this.name = 'SetupRepositoryConflictError';
  }
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
  // Guard: reject if an existing profile already belongs to a different organisation.
  // Silently reassigning organisationId would move the admin out of their current org,
  // breaking their existing permissions and org membership.
  const existingProfile = await client.organisationAdminProfile.findUnique({
    where: { userId: input.userId },
  });
  if (existingProfile && existingProfile.organisationId !== input.organisationId) {
    throw new SetupRepositoryConflictError(
      409,
      'SETUP_ROLE_CONFLICT',
      'Account is already registered with a different organisation',
    );
  }

  await ensureDefaultOrganisationSecuritySettings({ organisationId: input.organisationId }, client);

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
      // organisationId is intentionally NOT in the update set.
      // The guard above ensures the existing profile is for the same org,
      // so the value cannot change; and omitting it prevents accidental reassignment.
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
  await ensureDefaultOrganisationSecuritySettings({ organisationId: input.organisationId }, client);

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
