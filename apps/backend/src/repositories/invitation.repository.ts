import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import type { InvitationRoleGrantedDto } from '@insightful-phish/shared';
import { ACTIVE_INVITATION_STATUSES } from '../services/invitation-state-policy.js';
import { prisma } from '../lib/prisma.js';
import { ensureDefaultOrganisationSecuritySettings } from './security-settings.repository.js';

export type InvitationClient = PrismaClient | Prisma.TransactionClient;

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
      status: { in: ACTIVE_INVITATION_STATUSES },
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
      status: { in: ACTIVE_INVITATION_STATUSES },
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

export async function updateUserRoleAndProfilesFromInvitation(
  input: {
    userId: string;
    newRole: InvitationRoleGrantedDto;
    organisationId?: string | null;
    invitationId?: string | null;
  },
  client: Prisma.TransactionClient,
) {
  if (input.newRole === 'ORGANISATION_ADMIN') {
    if (!input.organisationId) {
      throw new Error('organisationId is required when assigning ORGANISATION_ADMIN role.');
    }

    await ensureDefaultOrganisationSecuritySettings(
      { organisationId: input.organisationId },
      client,
    );

    await client.user.update({
      where: { id: input.userId },
      data: {
        userType: 'ORGANISATION_ADMIN',
        authStatus: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
    });

    const adminProfile = await client.organisationAdminProfile.upsert({
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
      await client.invitation.update({
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

  if (input.newRole === 'ORGANISATION_TRAINEE') {
    if (!input.organisationId) {
      throw new Error('organisationId is required when assigning ORGANISATION_TRAINEE role.');
    }

    await ensureDefaultOrganisationSecuritySettings(
      { organisationId: input.organisationId },
      client,
    );

    await client.user.update({
      where: { id: input.userId },
      data: {
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

    const orgTraineeProfile = await client.organisationTraineeProfile.upsert({
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
      await client.invitation.update({
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

  if (input.newRole === 'IP_ADMIN' || input.newRole === 'PLATFORM_ADMIN') {
    const existingTargetUser = await client.user.findUnique({
      where: { id: input.userId },
      include: { organisationAdminProfile: true },
    });
    if (
      existingTargetUser?.userType === 'ORGANISATION_ADMIN' ||
      existingTargetUser?.organisationAdminProfile?.adminStatus === 'ACTIVE'
    ) {
      throw new InvitationRepositoryConflictError(
        'ROLE_TRANSITION_CONFLICT',
        'An active organisation administrator cannot directly accept a platform administrator upgrade.',
      );
    }

    await client.user.update({
      where: { id: input.userId },
      data: {
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

    return { userType: 'IP_ADMIN' as const };
  }


  throw new Error(`Unsupported role assignment: ${input.newRole}`);
}
