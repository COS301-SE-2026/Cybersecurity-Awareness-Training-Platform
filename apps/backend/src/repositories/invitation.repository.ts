import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import type { InvitationRoleGrantedDto } from '@insightful-phish/shared';
import { ACTIVE_INVITATION_STATUSES } from '@insightful-phish/shared';
import { prisma } from '../lib/prisma.js';
import { ensureDefaultOrganisationSecuritySettings } from './security-settings.repository.js';

export type InvitationClient = PrismaClient | Prisma.TransactionClient;

type RoleProfileUser = Prisma.UserGetPayload<{
  include: {
    traineeProfile: {
      include: {
        organisationTraineeProfile: true;
      };
    };
    organisationAdminProfile: true;
    ipAdminProfile: true;
  };
}>;

export class InvitationRepositoryConflictError extends Error {
  constructor(
    public readonly errorKey: string,
    message: string,
  ) {
    super(message);
    this.name = 'InvitationRepositoryConflictError';
  }
}

export function findInvitationTokenByHash(tokenHash: string, client: InvitationClient = prisma) {
  return client.actionToken.findUnique({
    where: { tokenHash },
    include: {
      invitation: {
        include: {
          organisation: true,
          permissionGrants: true,
        },
      },
      user: {
        include: {
          traineeProfile: {
            include: {
              organisationTraineeProfile: true,
            },
          },
          organisationAdminProfile: true,
          ipAdminProfile: true,
        },
      },
    },
  });
}

export function findInvitationById(id: string, client: InvitationClient = prisma) {
  return client.invitation.findUnique({
    where: { id },
    include: {
      organisation: true,
      permissionGrants: true,
    },
  });
}

export function findUserByEmailWithProfiles(email: string, client: InvitationClient = prisma) {
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

export async function claimInvitationAccept(
  invitationId: string,
  client: Prisma.TransactionClient,
) {
  const result = await client.invitation.updateMany({
    where: {
      id: invitationId,
      status: { in: [...ACTIVE_INVITATION_STATUSES] },
    },
    data: {
      status: 'ACCEPTED',
      acceptedAt: new Date(),
    },
  });

  if (result.count !== 1) {
    throw new InvitationRepositoryConflictError(
      'INVITATION_ALREADY_ACCEPTED_OR_RESOLVED',
      'Invitation is no longer pending or has already been accepted/resolved.',
    );
  }
}

export async function claimInvitationReject(
  invitationId: string,
  client: Prisma.TransactionClient,
) {
  const result = await client.invitation.updateMany({
    where: {
      id: invitationId,
      status: { in: [...ACTIVE_INVITATION_STATUSES] },
    },
    data: {
      status: 'REJECTED',
    },
  });

  if (result.count !== 1) {
    throw new InvitationRepositoryConflictError(
      'INVITATION_ALREADY_REJECTED_OR_RESOLVED',
      'Invitation is no longer pending or has already been rejected/resolved.',
    );
  }
}

export async function claimInvitationToken(
  actionTokenId: string,
  client: Prisma.TransactionClient,
) {
  const result = await client.actionToken.updateMany({
    where: {
      id: actionTokenId,
      usedAt: null,
      revokedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  if (result.count !== 1) {
    throw new InvitationRepositoryConflictError(
      'TOKEN_ALREADY_USED',
      'Invitation action token has already been used or revoked.',
    );
  }
}

export async function insertInvitationPermissionGrantsToAdmin(
  organisationId: string,
  organisationAdminId: string,
  grants: Array<{ organisationPermissionId: string }>,
  client: Prisma.TransactionClient,
) {
  if (grants.length === 0) {
    return;
  }

  await client.organisationAdminPermission.createMany({
    data: grants.map((g) => ({
      organisationId,
      organisationAdminId,
      organisationPermissionId: g.organisationPermissionId,
    })),
    skipDuplicates: true,
  });
}

async function loadUserWithRoleProfiles(userId: string, client: Prisma.TransactionClient) {
  return client.user.findUnique({
    where: { id: userId },
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

async function deactivateExistingTraineeMembership(
  existingUser: RoleProfileUser | null,
  client: Prisma.TransactionClient,
  disabledReason: string,
) {
  if (!existingUser?.traineeProfile) {
    return;
  }

  await client.traineeProfile.update({
    where: { id: existingUser.traineeProfile.id },
    data: { traineeStatus: 'INACTIVE' },
  });

  if (existingUser.traineeProfile.organisationTraineeProfile) {
    await client.organisationTraineeProfile.update({
      where: { traineeProfileId: existingUser.traineeProfile.id },
      data: {
        membershipStatus: 'INACTIVE',
        disabledAt: new Date(),
        disabledReason,
      },
    });
  }
}

async function updateUserToOrganisationAdmin(input: {
  userId: string;
  organisationId: string;
  invitationId?: string | null;
  client: Prisma.TransactionClient;
}) {
  const existingUser = await loadUserWithRoleProfiles(input.userId, input.client);

  await deactivateExistingTraineeMembership(
    existingUser,
    input.client,
    'Promoted to organisation admin',
  );

  await ensureDefaultOrganisationSecuritySettings(
    { organisationId: input.organisationId },
    input.client,
  );

  await input.client.user.update({
    where: { id: input.userId },
    data: {
      userType: 'ORGANISATION_ADMIN',
      authStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  const adminProfile = await input.client.organisationAdminProfile.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      organisationId: input.organisationId,
      adminStatus: 'ACTIVE',
      isInitialAdmin: false,
      createdFromInvitationId: input.invitationId ?? null,
    },
    update: {
      adminStatus: 'ACTIVE',
      isInitialAdmin: false,
      createdFromInvitationId: input.invitationId ?? null,
    },
  });

  if (input.invitationId) {
    await input.client.invitation.update({
      where: { id: input.invitationId },
      data: {
        acceptedOrganisationAdminProfile: {
          connect: { userId: input.userId },
        },
      },
    });
  }

  return { userType: 'ORGANISATION_ADMIN' as const, adminProfileId: adminProfile.id };
}

async function updateUserToOrganisationTrainee(input: {
  userId: string;
  organisationId: string;
  invitationId?: string | null;
  client: Prisma.TransactionClient;
}) {
  await ensureDefaultOrganisationSecuritySettings(
    { organisationId: input.organisationId },
    input.client,
  );

  await input.client.user.update({
    where: { id: input.userId },
    data: {
      userType: 'ORGANISATION_TRAINEE',
      authStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  const traineeProfile = await input.client.traineeProfile.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      traineeStatus: 'ACTIVE',
    },
    update: {
      traineeStatus: 'ACTIVE',
    },
  });

  const orgTraineeProfile = await input.client.organisationTraineeProfile.upsert({
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

  if (input.invitationId) {
    await input.client.invitation.update({
      where: { id: input.invitationId },
      data: {
        acceptedOrganisationTraineeProfile: {
          connect: { traineeProfileId: traineeProfile.id },
        },
      },
    });
  }

  return {
    userType: 'ORGANISATION_TRAINEE' as const,
    traineeProfileId: traineeProfile.id,
    orgTraineeProfileId: orgTraineeProfile.traineeProfileId,
  };
}

async function updateUserToPlatformAdmin(input: {
  userId: string;
  client: Prisma.TransactionClient;
}) {
  const existingUser = await loadUserWithRoleProfiles(input.userId, input.client);

  if (
    existingUser?.userType === 'ORGANISATION_ADMIN' ||
    existingUser?.organisationAdminProfile?.adminStatus === 'ACTIVE'
  ) {
    throw new InvitationRepositoryConflictError(
      'ROLE_TRANSITION_CONFLICT',
      'An active organisation administrator cannot directly accept a platform administrator upgrade.',
    );
  }

  await deactivateExistingTraineeMembership(
    existingUser,
    input.client,
    'Promoted to platform admin',
  );

  await input.client.user.update({
    where: { id: input.userId },
    data: {
      userType: 'IP_ADMIN',
      authStatus: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  await input.client.ipAdminProfile.upsert({
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

  return { userType: 'IP_ADMIN' as const };
}

export async function updateUserRoleAndProfilesFromInvitation(
  input: {
    userId: string;
    newRole: InvitationRoleGrantedDto;
    organisationId?: string | null;
    invitationId?: string | null;
  },
  client: Prisma.TransactionClient,
) {
  if (
    input.newRole !== 'ORGANISATION_ADMIN' &&
    input.newRole !== 'ORGANISATION_TRAINEE' &&
    input.newRole !== 'IP_ADMIN' &&
    input.newRole !== 'PLATFORM_ADMIN'
  ) {
    throw new Error(`Unsupported role assignment: ${input.newRole}`);
  }

  if (input.newRole === 'ORGANISATION_ADMIN') {
    if (!input.organisationId) {
      throw new Error('organisationId is required when assigning ORGANISATION_ADMIN role.');
    }
    return updateUserToOrganisationAdmin({
      userId: input.userId,
      organisationId: input.organisationId,
      invitationId: input.invitationId,
      client,
    });
  }

  if (input.newRole === 'ORGANISATION_TRAINEE') {
    if (!input.organisationId) {
      throw new Error('organisationId is required when assigning ORGANISATION_TRAINEE role.');
    }
    return updateUserToOrganisationTrainee({
      userId: input.userId,
      organisationId: input.organisationId,
      invitationId: input.invitationId,
      client,
    });
  }

  if (input.newRole === 'IP_ADMIN' || input.newRole === 'PLATFORM_ADMIN') {
    return updateUserToPlatformAdmin({
      userId: input.userId,
      client,
    });
  }

  throw new Error(`Unsupported role assignment: ${input.newRole}`);
}
