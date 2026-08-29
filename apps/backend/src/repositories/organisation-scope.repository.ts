import { prisma } from '../lib/prisma.js';

export async function findOrganisationScopeById(organisationId: string) {
  return prisma.organisation.findUnique({
    where: { id: organisationId },
    select: {
      id: true,
      name: true,
      status: true,
    },
  });
}

export async function findOrganisationAdminActorScope(input: {
  userId: string;
  organisationId: string;
}) {
  return prisma.organisationAdminProfile.findFirst({
    where: {
      userId: input.userId,
      organisationId: input.organisationId,
      adminStatus: 'ACTIVE',
      user: {
        authStatus: 'ACTIVE',
      },
    },
    include: {
      organisation: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      permissionGrants: {
        include: {
          organisationPermission: {
            select: {
              key: true,
            },
          },
        },
      },
    },
  });
}

export async function findOrganisationTraineeActorScope(input: {
  userId: string;
  organisationId: string;
}) {
  return prisma.organisationTraineeProfile.findFirst({
    where: {
      organisationId: input.organisationId,
      membershipStatus: 'ACTIVE',
      traineeProfile: {
        userId: input.userId,
        traineeStatus: 'ACTIVE',
        user: {
          authStatus: 'ACTIVE',
        },
      },
    },
    include: {
      organisation: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });
}

export async function findActiveIpAdminScope(userId: string) {
  return prisma.ipAdminProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      userId: true,
      adminStatus: true,
      platformAdminRole: true,
    },
  });
}
