import { prisma } from '../../src/lib/prisma.js';
import { ORGANISATION_PERMISSION_SEEDS } from '../../src/constants/organisation-permission-seeds.js';

export type OrganisationPermissionSeedSummary = {
  readonly organisationCount: number;
  readonly permissionCount: number;
  readonly initialAdminGrantCount: number;
};

type OrganisationPermissionKey = (typeof ORGANISATION_PERMISSION_SEEDS)[number]['key'];

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
    for (const permission of ORGANISATION_PERMISSION_SEEDS) {
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
  permission: (typeof ORGANISATION_PERMISSION_SEEDS)[number],
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

      const insertedGrantCount = await client.$executeRaw`
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
      grantCount += insertedGrantCount;
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
