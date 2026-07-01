import type {
  InvitationStatus,
  OrganisationPermissionKey,
  Prisma,
  PrismaClient,
} from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

type OrganisationAdminClient = PrismaClient | Prisma.TransactionClient;

export type CreatePromotionInvitationInput = {
  organisationId: string;
  targetUserId: string;
  recipientEmail: string;
  recipientFirstName?: string | null;
  recipientLastName?: string | null;
  expiresAt: Date;
};

export type ReplaceAdminPermissionGrantsInput = {
  organisationId: string;
  organisationAdminId: string;
  organisationPermissionIds: readonly string[];
  grantedByOrganisationAdminId: string;
};

export function findActorOrganisationAdmin(
  input: { userId: string; organisationId: string },
  client: OrganisationAdminClient = prisma,
) {
  return client.organisationAdminProfile.findFirst({
    where: {
      userId: input.userId,
      organisationId: input.organisationId,
      adminStatus: 'ACTIVE',
    },
    include: {
      organisation: true,
      user: true,
      permissionGrants: {
        include: {
          organisationPermission: true,
        },
      },
    },
  });
}

export function findOrganisationAdminById(
  input: { organisationId: string; adminId: string },
  client: OrganisationAdminClient = prisma,
) {
  return client.organisationAdminProfile.findFirst({
    where: {
      id: input.adminId,
      organisationId: input.organisationId,
    },
    include: {
      user: true,
      permissionGrants: {
        include: {
          organisationPermission: true,
        },
      },
    },
  });
}

export function findOrganisationAdminByUserId(
  input: { organisationId: string; userId: string },
  client: OrganisationAdminClient = prisma,
) {
  return client.organisationAdminProfile.findFirst({
    where: {
      organisationId: input.organisationId,
      userId: input.userId,
    },
  });
}

export function listOrganisationAdminsWithPermissions(
  organisationId: string,
  client: OrganisationAdminClient = prisma,
) {
  return client.organisationAdminProfile.findMany({
    where: {
      organisationId,
    },
    include: {
      user: true,
      permissionGrants: {
        include: {
          organisationPermission: true,
        },
      },
    },
    orderBy: [{ isInitialAdmin: 'desc' }, { adminStatus: 'asc' }, { joinedAt: 'asc' }],
  });
}

export function listOrganisationPermissions(
  organisationId: string,
  client: OrganisationAdminClient = prisma,
) {
  return client.organisationPermission.findMany({
    where: {
      organisationId,
    },
    orderBy: {
      key: 'asc',
    },
  });
}

export function findOrganisationPermissionsByKeys(
  input: { organisationId: string; permissionKeys: readonly OrganisationPermissionKey[] },
  client: OrganisationAdminClient = prisma,
) {
  return client.organisationPermission.findMany({
    where: {
      organisationId: input.organisationId,
      key: {
        in: [...input.permissionKeys],
      },
    },
    orderBy: {
      key: 'asc',
    },
  });
}

export function findActiveOrganisationTraineeByEmail(
  input: { organisationId: string; email: string },
  client: OrganisationAdminClient = prisma,
) {
  return client.user.findFirst({
    where: {
      email: input.email,
      userType: 'ORGANISATION_TRAINEE',
      authStatus: 'ACTIVE',
      traineeProfile: {
        traineeStatus: 'ACTIVE',
        organisationTraineeProfile: {
          organisationId: input.organisationId,
          membershipStatus: 'ACTIVE',
        },
      },
    },
    include: {
      traineeProfile: {
        include: {
          organisationTraineeProfile: true,
        },
      },
    },
  });
}

export function findPendingOrganisationAdminPromotionInvitation(
  input: { organisationId: string; targetUserId: string },
  client: OrganisationAdminClient = prisma,
) {
  return client.invitation.findFirst({
    where: {
      organisationId: input.organisationId,
      targetUserId: input.targetUserId,
      purpose: 'ORGANISATION_ADMIN_PROMOTION',
      status: {
        in: ['PENDING', 'SENT', 'FAILED_TO_SEND'],
      },
      revokedAt: null,
    },
  });
}

export function createOrganisationAdminPromotionInvitation(
  input: CreatePromotionInvitationInput,
  client: OrganisationAdminClient = prisma,
) {
  return client.invitation.create({
    data: {
      organisationId: input.organisationId,
      targetUserId: input.targetUserId,
      recipientEmail: input.recipientEmail,
      recipientFirstName: input.recipientFirstName ?? null,
      recipientLastName: input.recipientLastName ?? null,
      purpose: 'ORGANISATION_ADMIN_PROMOTION',
      status: 'PENDING',
      expiresAt: input.expiresAt,
    },
  });
}

export function createInvitationPermissionGrants(
  input: {
    organisationId: string;
    invitationId: string;
    organisationPermissionIds: readonly string[];
  },
  client: OrganisationAdminClient = prisma,
) {
  return client.invitationPermissionGrant.createMany({
    data: input.organisationPermissionIds.map((permissionId) => ({
      organisationId: input.organisationId,
      invitationId: input.invitationId,
      organisationPermissionId: permissionId,
    })),
    skipDuplicates: true,
  });
}

export function updatePromotionInvitationStatus(
  input: { invitationId: string; status: InvitationStatus },
  client: OrganisationAdminClient = prisma,
) {
  return client.invitation.update({
    where: {
      id: input.invitationId,
    },
    data: {
      status: input.status,
    },
  });
}

export async function replaceOrganisationAdminPermissionGrants(
  input: ReplaceAdminPermissionGrantsInput,
  client: OrganisationAdminClient = prisma,
) {
  await client.organisationAdminPermission.deleteMany({
    where: {
      organisationId: input.organisationId,
      organisationAdminId: input.organisationAdminId,
    },
  });

  if (input.organisationPermissionIds.length === 0) {
    return { count: 0 };
  }

  return client.organisationAdminPermission.createMany({
    data: input.organisationPermissionIds.map((permissionId) => ({
      organisationId: input.organisationId,
      organisationAdminId: input.organisationAdminId,
      organisationPermissionId: permissionId,
      grantedByOrganisationAdminId: input.grantedByOrganisationAdminId,
    })),
    skipDuplicates: true,
  });
}

export function countActiveOrganisationAdminsWithPermission(
  input: {
    organisationId: string;
    permissionKey: OrganisationPermissionKey;
    excludingAdminId?: string | null;
  },
  client: OrganisationAdminClient = prisma,
) {
  return client.organisationAdminProfile.count({
    where: {
      organisationId: input.organisationId,
      adminStatus: 'ACTIVE',
      ...(input.excludingAdminId ? { id: { not: input.excludingAdminId } } : {}),
      permissionGrants: {
        some: {
          organisationPermission: {
            organisationId: input.organisationId,
            key: input.permissionKey,
          },
        },
      },
    },
  });
}

export function disableOrganisationAdmin(
  input: { organisationId: string; adminId: string; disabledReason: string },
  client: OrganisationAdminClient = prisma,
) {
  return client.organisationAdminProfile.update({
    where: {
      id_organisationId: {
        id: input.adminId,
        organisationId: input.organisationId,
      },
    },
    data: {
      adminStatus: 'DISABLED',
      disabledAt: new Date(),
      disabledReason: input.disabledReason,
    },
  });
}

export function deleteOrganisationAdminPermissionGrants(
  input: { organisationId: string; organisationAdminId: string },
  client: OrganisationAdminClient = prisma,
) {
  return client.organisationAdminPermission.deleteMany({
    where: {
      organisationId: input.organisationId,
      organisationAdminId: input.organisationAdminId,
    },
  });
}

export function restoreOrganisationTraineeUserTypeIfActiveMember(
  input: { organisationId: string; userId: string },
  client: OrganisationAdminClient = prisma,
) {
  return client.user.updateMany({
    where: {
      id: input.userId,
      userType: 'ORGANISATION_ADMIN',
      traineeProfile: {
        traineeStatus: 'ACTIVE',
        organisationTraineeProfile: {
          organisationId: input.organisationId,
          membershipStatus: 'ACTIVE',
        },
      },
    },
    data: {
      userType: 'ORGANISATION_TRAINEE',
    },
  });
}

export function runOrganisationAdminTransaction<T>(
  action: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return prisma.$transaction(action);
}
