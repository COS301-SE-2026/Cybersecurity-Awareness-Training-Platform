import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

type SecuritySettingsClient = PrismaClient | Prisma.TransactionClient;

export const DEFAULT_ORGANISATION_SECURITY_SETTINGS = {
  enforceRememberMePolicy: true,
  allowRememberMe: true,
  maxRememberedSessionHours: 168,
  enforceRegularSessionLength: true,
  regularSessionLengthHours: 8,
  enforceIdleTimeout: false,
  idleTimeoutMinutes: null,
  requireReauthenticationForSensitiveActions: true,
  allowTraineeEmailChange: true,
} as const;

export type OrganisationSecuritySettingsSeedSummary = {
  readonly organisationCount: number;
  readonly createdSettingsCount: number;
};

export type OrganisationSecuritySettingsRecord = {
  readonly organisationId: string;
  readonly enforceRememberMePolicy: boolean;
  readonly allowRememberMe: boolean;
  readonly maxRememberedSessionHours: number | null;
  readonly enforceRegularSessionLength: boolean;
  readonly regularSessionLengthHours: number | null;
  readonly enforceIdleTimeout: boolean;
  readonly idleTimeoutMinutes: number | null;
  readonly requireReauthenticationForSensitiveActions: boolean;
  readonly allowTraineeEmailChange: boolean;
};

export type UserSecurityPreferencesRecord = {
  readonly userId: string;
  readonly preferredRegularSessionLengthHours: number | null;
  readonly preferredRememberMeSessionLengthHours: number | null;
  readonly preferredIdleTimeoutMinutes: number | null;
};

type OrganisationCountRow = {
  readonly count: bigint;
};

function supportsExecuteRaw(client: SecuritySettingsClient): boolean {
  return typeof (client as { $executeRaw?: unknown }).$executeRaw === 'function';
}

function supportsQueryRaw(client: SecuritySettingsClient): boolean {
  return typeof (client as { $queryRaw?: unknown }).$queryRaw === 'function';
}

export function buildOrganisationSecuritySettingsId(organisationId: string): string {
  return ['organisation-security-settings', organisationId].join('-');
}

export async function ensureDefaultOrganisationSecuritySettings(
  input: { organisationId: string },
  client: SecuritySettingsClient = prisma,
): Promise<number> {
  if (!supportsExecuteRaw(client)) {
    return Promise.resolve(0);
  }

  return client.$executeRaw`
    INSERT INTO "OrganisationSecuritySettings" (
      "id",
      "organisationId",
      "enforceRememberMePolicy",
      "allowRememberMe",
      "maxRememberedSessionHours",
      "enforceRegularSessionLength",
      "regularSessionLengthHours",
      "enforceIdleTimeout",
      "idleTimeoutMinutes",
      "requireReauthenticationForSensitiveActions",
      "allowTraineeEmailChange",
      "updatedByOrganisationAdminId",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${buildOrganisationSecuritySettingsId(input.organisationId)},
      ${input.organisationId},
      ${DEFAULT_ORGANISATION_SECURITY_SETTINGS.enforceRememberMePolicy},
      ${DEFAULT_ORGANISATION_SECURITY_SETTINGS.allowRememberMe},
      ${DEFAULT_ORGANISATION_SECURITY_SETTINGS.maxRememberedSessionHours},
      ${DEFAULT_ORGANISATION_SECURITY_SETTINGS.enforceRegularSessionLength},
      ${DEFAULT_ORGANISATION_SECURITY_SETTINGS.regularSessionLengthHours},
      ${DEFAULT_ORGANISATION_SECURITY_SETTINGS.enforceIdleTimeout},
      ${DEFAULT_ORGANISATION_SECURITY_SETTINGS.idleTimeoutMinutes},
      ${DEFAULT_ORGANISATION_SECURITY_SETTINGS.requireReauthenticationForSensitiveActions},
      ${DEFAULT_ORGANISATION_SECURITY_SETTINGS.allowTraineeEmailChange},
      NULL,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("organisationId")
    DO NOTHING
  `;
}

export async function findOrganisationSecuritySettings(
  input: { organisationId: string },
  client: SecuritySettingsClient = prisma,
): Promise<OrganisationSecuritySettingsRecord | null> {
  if (!supportsQueryRaw(client)) {
    return null;
  }

  const rows = await client.$queryRaw<OrganisationSecuritySettingsRecord[]>`
    SELECT
      "organisationId",
      "enforceRememberMePolicy",
      "allowRememberMe",
      "maxRememberedSessionHours",
      "enforceRegularSessionLength",
      "regularSessionLengthHours",
      "enforceIdleTimeout",
      "idleTimeoutMinutes",
      "requireReauthenticationForSensitiveActions",
      "allowTraineeEmailChange"
    FROM "OrganisationSecuritySettings"
    WHERE "organisationId" = ${input.organisationId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function findUserSecurityPreferences(
  input: { userId: string },
  client: SecuritySettingsClient = prisma,
): Promise<UserSecurityPreferencesRecord | null> {
  if (!supportsQueryRaw(client)) {
    return null;
  }

  const rows = await client.$queryRaw<UserSecurityPreferencesRecord[]>`
    SELECT
      "userId",
      "preferredRegularSessionLengthHours",
      "preferredRememberMeSessionLengthHours",
      "preferredIdleTimeoutMinutes"
    FROM "UserSecurityPreferences"
    WHERE "userId" = ${input.userId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function ensureDefaultOrganisationSecuritySettingsForAllOrganisations(
  client: SecuritySettingsClient = prisma,
): Promise<OrganisationSecuritySettingsSeedSummary> {
  if (!supportsExecuteRaw(client) || !supportsQueryRaw(client)) {
    return {
      organisationCount: 0,
      createdSettingsCount: 0,
    };
  }

  const organisationRows = await client.$queryRaw<OrganisationCountRow[]>`
    SELECT COUNT(*) AS "count"
    FROM "Organisation"
  `;

  const createdSettingsCount = await client.$executeRaw`
    INSERT INTO "OrganisationSecuritySettings" (
      "id",
      "organisationId",
      "enforceRememberMePolicy",
      "allowRememberMe",
      "maxRememberedSessionHours",
      "enforceRegularSessionLength",
      "regularSessionLengthHours",
      "enforceIdleTimeout",
      "idleTimeoutMinutes",
      "requireReauthenticationForSensitiveActions",
      "allowTraineeEmailChange",
      "updatedByOrganisationAdminId",
      "createdAt",
      "updatedAt"
    )
    SELECT
      CONCAT('organisation-security-settings-', organisation."id"),
      organisation."id",
      ${DEFAULT_ORGANISATION_SECURITY_SETTINGS.enforceRememberMePolicy},
      ${DEFAULT_ORGANISATION_SECURITY_SETTINGS.allowRememberMe},
      ${DEFAULT_ORGANISATION_SECURITY_SETTINGS.maxRememberedSessionHours},
      ${DEFAULT_ORGANISATION_SECURITY_SETTINGS.enforceRegularSessionLength},
      ${DEFAULT_ORGANISATION_SECURITY_SETTINGS.regularSessionLengthHours},
      ${DEFAULT_ORGANISATION_SECURITY_SETTINGS.enforceIdleTimeout},
      ${DEFAULT_ORGANISATION_SECURITY_SETTINGS.idleTimeoutMinutes},
      ${DEFAULT_ORGANISATION_SECURITY_SETTINGS.requireReauthenticationForSensitiveActions},
      ${DEFAULT_ORGANISATION_SECURITY_SETTINGS.allowTraineeEmailChange},
      NULL,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    FROM "Organisation" organisation
    WHERE NOT EXISTS (
      SELECT 1
      FROM "OrganisationSecuritySettings" settings
      WHERE settings."organisationId" = organisation."id"
    )
  `;

  return {
    organisationCount: Number(organisationRows[0]?.count ?? 0n),
    createdSettingsCount,
  };
}
