import { prisma } from '../../src/lib/prisma.js';

const ORGANISATION_ADMIN_PERMISSION_SEEDS = [
  {
    key: 'VIEW_ORGANISATION_ADMINS',
    displayName: 'View organisation admins',
    description: 'View organisation admin users and their permission grants.',
    isCritical: false,
  },
  {
    key: 'INVITE_ORGANISATION_ADMINS',
    displayName: 'Invite organisation admins',
    description: 'Invite or promote users to organisation admin access.',
    isCritical: true,
  },
  {
    key: 'REMOVE_ORGANISATION_ADMINS',
    displayName: 'Remove organisation admins',
    description: 'Disable or remove organisation admin access.',
    isCritical: false,
  },
  {
    key: 'CHANGE_ORGANISATION_ADMIN_PERMISSIONS',
    displayName: 'Change organisation admin permissions',
    description: 'Grant or revoke organisation admin permissions.',
    isCritical: true,
  },
] as const;

export type OrganisationPermissionSeedSummary = {
  readonly organisationCount: number;
  readonly permissionCount: number;
  readonly initialAdminGrantCount: number;
};

type OrganisationPermissionKey = (typeof ORGANISATION_ADMIN_PERMISSION_SEEDS)[number]['key'];

type SeedClient = {
  $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: readonly unknown[]): Promise<T>;
  $executeRaw(query: TemplateStringsArray, ...values: readonly unknown[]): Promise<number>;
};

type OrganisationRow = {
  readonly id: string;
};

type OrganisationAdminRow = {
  readonly id: string;
};

type OrganisationPermissionRow = {
  readonly id: string;
};

export async function seedOrganisationAdminPermissions(
  client: SeedClient = prisma,
): Promise<OrganisationPermissionSeedSummary> {
  const organisations = await client.$queryRaw<OrganisationRow[]>`
    SELECT "id"
    FROM "Organisation"
    ORDER BY "id"
  `;

  let permissionCount = 0;
  let initialAdminGrantCount = 0;

  for (const organisation of organisations) {
    for (const permission of ORGANISATION_ADMIN_PERMISSION_SEEDS) {
      await upsertOrganisationPermission(client, organisation.id, permission);
      permissionCount += 1;
    }

    initialAdminGrantCount += await seedInitialAdminPermissionGrants(client, organisation.id);
  }

  return {
    organisationCount: organisations.length,
    permissionCount,
    initialAdminGrantCount,
  };
}

async function upsertOrganisationPermission(
  client: SeedClient,
  organisationId: string,
  permission: (typeof ORGANISATION_ADMIN_PERMISSION_SEEDS)[number],
): Promise<void> {
  const permissionId = buildOrganisationPermissionId(organisationId, permission.key);

  await client.$executeRaw`
    INSERT INTO "OrganisationPermission" (
      "id",
      "organisationId",
      "key",
      "displayName",
      "description",
      "isCritical",
      "updatedAt"
    )
    VALUES (
      ${permissionId},
      ${organisationId},
      ${permission.key}::"OrganisationPermissionKey",
      ${permission.displayName},
      ${permission.description},
      ${permission.isCritical},
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("organisationId", "key")
    DO UPDATE SET
      "displayName" = EXCLUDED."displayName",
      "description" = EXCLUDED."description",
      "isCritical" = EXCLUDED."isCritical",
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}

async function seedInitialAdminPermissionGrants(
  client: SeedClient,
  organisationId: string,
): Promise<number> {
  const initialAdmins = await client.$queryRaw<OrganisationAdminRow[]>`
    SELECT "id"
    FROM "OrganisationAdminProfile"
    WHERE "organisationId" = ${organisationId}
      AND "adminStatus" = 'ACTIVE'
      AND "isInitialAdmin" = true
    ORDER BY "id"
  `;

  if (initialAdmins.length === 0) {
    return 0;
  }

  const permissions = await client.$queryRaw<OrganisationPermissionRow[]>`
    SELECT "id"
    FROM "OrganisationPermission"
    WHERE "organisationId" = ${organisationId}
    ORDER BY "key"
  `;

  let grantCount = 0;

  for (const admin of initialAdmins) {
    for (const permission of permissions) {
      const grantId = buildOrganisationAdminPermissionId(admin.id, permission.id);

      await client.$executeRaw`
        INSERT INTO "OrganisationAdminPermission" (
          "id",
          "organisationId",
          "organisationAdminId",
          "organisationPermissionId"
        )
        VALUES (
          ${grantId},
          ${organisationId},
          ${admin.id},
          ${permission.id}
        )
        ON CONFLICT ("organisationAdminId", "organisationPermissionId")
        DO NOTHING
      `;
      grantCount += 1;
    }
  }

  return grantCount;
}

function buildOrganisationPermissionId(
  organisationId: string,
  permissionKey: OrganisationPermissionKey,
): string {
  return ['org-permission', organisationId, permissionKey].join(':');
}

function buildOrganisationAdminPermissionId(
  organisationAdminId: string,
  organisationPermissionId: string,
): string {
  return ['org-admin-permission', organisationAdminId, organisationPermissionId].join(':');
}
