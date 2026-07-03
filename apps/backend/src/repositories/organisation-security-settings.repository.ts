import type { UpdateOrganisationSecuritySettingsRequestDto } from '@insightful-phish/shared';
import type {
  OrganisationPermissionKey,
  Prisma,
  PrismaClient,
} from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { ensureDefaultOrganisationSecuritySettings } from './security-settings.repository.js';

type OrganisationSecuritySettingsClient = PrismaClient | Prisma.TransactionClient;

export const ORGANISATION_SECURITY_SETTINGS_UPDATE_PERMISSION: OrganisationPermissionKey =
  'CHANGE_ORGANISATION_SECURITY_SETTINGS';

const organisationSecuritySettingsInclude = {
  organisation: true,
  updatedByOrganisationAdmin: {
    include: {
      user: true,
    },
  },
} satisfies Prisma.OrganisationSecuritySettingsInclude;

const actorOrganisationAdminInclude = {
  organisation: true,
  user: true,
  permissionGrants: {
    include: {
      organisationPermission: true,
    },
  },
} satisfies Prisma.OrganisationAdminProfileInclude;

export type OrganisationSecuritySettingsWithRelations =
  Prisma.OrganisationSecuritySettingsGetPayload<{
    include: typeof organisationSecuritySettingsInclude;
  }>;

export type OrganisationSecuritySettingsActorAdmin = Prisma.OrganisationAdminProfileGetPayload<{
  include: typeof actorOrganisationAdminInclude;
}>;

export type OrganisationWithSecuritySettings = Prisma.OrganisationGetPayload<{
  include: {
    securitySettings: true;
  };
}>;

export type UpdateOrganisationSecuritySettingsInput =
  UpdateOrganisationSecuritySettingsRequestDto & {
    organisationId: string;
    updatedByOrganisationAdminId: string;
  };

export type UpdateOrganisationSecuritySettingsResult = {
  oldSettings: OrganisationSecuritySettingsWithRelations;
  newSettings: OrganisationSecuritySettingsWithRelations;
};

export function findOrganisationSecuritySettingsActorAdmin(
  input: { actorUserId: string; organisationId: string },
  client: OrganisationSecuritySettingsClient = prisma,
): Promise<OrganisationSecuritySettingsActorAdmin | null> {
  return client.organisationAdminProfile.findFirst({
    where: {
      userId: input.actorUserId,
      organisationId: input.organisationId,
      adminStatus: 'ACTIVE',
    },
    include: actorOrganisationAdminInclude,
  });
}

export function findOrganisationWithSecuritySettings(
  organisationId: string,
  client: OrganisationSecuritySettingsClient = prisma,
): Promise<OrganisationWithSecuritySettings | null> {
  return client.organisation.findUnique({
    where: {
      id: organisationId,
    },
    include: {
      securitySettings: true,
    },
  });
}

export async function findOrganisationSecuritySettingsByOrganisationId(
  organisationId: string,
  client: OrganisationSecuritySettingsClient = prisma,
): Promise<OrganisationSecuritySettingsWithRelations | null> {
  await ensureDefaultOrganisationSecuritySettings({ organisationId }, client);

  return client.organisationSecuritySettings.findUnique({
    where: {
      organisationId,
    },
    include: organisationSecuritySettingsInclude,
  });
}

export async function updateOrganisationSecuritySettings(
  input: UpdateOrganisationSecuritySettingsInput,
  client: OrganisationSecuritySettingsClient = prisma,
): Promise<UpdateOrganisationSecuritySettingsResult | null> {
  const oldSettings = await client.organisationSecuritySettings.findUnique({
    where: {
      organisationId: input.organisationId,
    },
    include: organisationSecuritySettingsInclude,
  });

  if (!oldSettings) {
    return null;
  }

  const newSettings = await client.organisationSecuritySettings.update({
    where: {
      organisationId: input.organisationId,
    },
    data: {
      enforceRememberMePolicy: input.enforceRememberMePolicy,
      allowRememberMe: input.allowRememberMe,
      maxRememberedSessionHours: input.maxRememberedSessionHours,
      enforceRegularSessionLength: input.enforceRegularSessionLength,
      regularSessionLengthHours: input.regularSessionLengthHours,
      enforceIdleTimeout: input.enforceIdleTimeout,
      idleTimeoutMinutes: input.idleTimeoutMinutes,
      requireReauthenticationForSensitiveActions: input.requireReauthenticationForSensitiveActions,
      allowTraineeEmailChange: input.allowTraineeEmailChange,
      updatedByOrganisationAdmin: {
        connect: {
          id_organisationId: {
            id: input.updatedByOrganisationAdminId,
            organisationId: input.organisationId,
          },
        },
      },
    },
    include: organisationSecuritySettingsInclude,
  });

  return {
    oldSettings,
    newSettings,
  };
}

export function runOrganisationSecuritySettingsTransaction<T>(
  action: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return prisma.$transaction(action);
}
