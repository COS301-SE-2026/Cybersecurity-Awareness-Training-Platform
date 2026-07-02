import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ORGANISATION_SECURITY_SETTINGS,
  buildOrganisationSecuritySettingsId,
  ensureDefaultOrganisationSecuritySettings,
  ensureDefaultOrganisationSecuritySettingsForAllOrganisations,
  findOrganisationSecuritySettings,
  findUserSecurityPreferences,
} from '../../src/repositories/security-settings.repository.js';

type RawCall = {
  readonly sql: string;
  readonly values: readonly unknown[];
};

type SecuritySettingsTestClient = NonNullable<
  Parameters<typeof ensureDefaultOrganisationSecuritySettings>[1]
>;

function normaliseSql(strings: TemplateStringsArray): string {
  return strings.join('?').replace(/\s+/g, ' ').trim();
}

function createSecuritySettingsClient(input: {
  readonly organisationCount?: bigint;
  readonly createdSettingsCount?: number;
  readonly organisationSettingsRows?: readonly unknown[];
  readonly userPreferenceRows?: readonly unknown[];
}) {
  const queryCalls: RawCall[] = [];
  const executeCalls: RawCall[] = [];

  const client = {
    $queryRaw: async <T = unknown>(
      strings: TemplateStringsArray,
      ...values: readonly unknown[]
    ): Promise<T> => {
      const sql = normaliseSql(strings);
      queryCalls.push({ sql, values });

      if (sql.includes('COUNT(*) AS "count"')) {
        return [{ count: input.organisationCount ?? 0n }] as T;
      }

      if (sql.includes('FROM "OrganisationSecuritySettings"')) {
        return (input.organisationSettingsRows ?? []) as T;
      }

      if (sql.includes('FROM "UserSecurityPreferences"')) {
        return (input.userPreferenceRows ?? []) as T;
      }

      throw new Error(`Unexpected security settings query: ${sql}`);
    },
    $executeRaw: async (strings: TemplateStringsArray, ...values: readonly unknown[]) => {
      executeCalls.push({ sql: normaliseSql(strings), values });
      return input.createdSettingsCount ?? 1;
    },
  };

  return {
    client: client as SecuritySettingsTestClient,
    queryCalls,
    executeCalls,
  };
}

describe('security settings repository', () => {
  it('defines schema uniqueness and backfill for organisation security settings', () => {
    const schema = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8');
    const migration = readFileSync(
      resolve(
        process.cwd(),
        'prisma/migrations/20260702120000_security_settings_foundation/migration.sql',
      ),
      'utf8',
    );

    expect(schema).toContain('model OrganisationSecuritySettings');
    expect(schema).toContain(
      'organisationId                             String                    @unique',
    );
    expect(schema).toContain('model UserSecurityPreferences');
    expect(schema).toContain('userId                                String   @unique');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "OrganisationSecuritySettings_organisationId_key"',
    );
    expect(migration).toContain('CREATE UNIQUE INDEX "UserSecurityPreferences_userId_key"');
    expect(migration).toContain('INSERT INTO "OrganisationSecuritySettings"');
    expect(migration).toContain('FROM "Organisation" o');
    expect(migration).toContain('WHERE NOT EXISTS');
  });

  it('builds deterministic settings ids and inserts safe defaults idempotently', async () => {
    const seedClient = createSecuritySettingsClient({ createdSettingsCount: 1 });

    const createdCount = await ensureDefaultOrganisationSecuritySettings(
      { organisationId: 'org-1' },
      seedClient.client,
    );

    expect(buildOrganisationSecuritySettingsId('org-1')).toBe(
      'organisation-security-settings-org-1',
    );
    expect(createdCount).toBe(1);
    expect(seedClient.executeCalls).toHaveLength(1);
    expect(seedClient.executeCalls[0]?.sql).toContain('ON CONFLICT ("organisationId") DO NOTHING');
    expect(seedClient.executeCalls[0]?.values).toEqual([
      'organisation-security-settings-org-1',
      'org-1',
      DEFAULT_ORGANISATION_SECURITY_SETTINGS.enforceRememberMePolicy,
      DEFAULT_ORGANISATION_SECURITY_SETTINGS.allowRememberMe,
      DEFAULT_ORGANISATION_SECURITY_SETTINGS.maxRememberedSessionHours,
      DEFAULT_ORGANISATION_SECURITY_SETTINGS.enforceRegularSessionLength,
      DEFAULT_ORGANISATION_SECURITY_SETTINGS.regularSessionLengthHours,
      DEFAULT_ORGANISATION_SECURITY_SETTINGS.enforceIdleTimeout,
      DEFAULT_ORGANISATION_SECURITY_SETTINGS.idleTimeoutMinutes,
      DEFAULT_ORGANISATION_SECURITY_SETTINGS.requireReauthenticationForSensitiveActions,
      DEFAULT_ORGANISATION_SECURITY_SETTINGS.allowTraineeEmailChange,
    ]);
  });

  it('reports actual default settings created while seeding all organisations', async () => {
    const seedClient = createSecuritySettingsClient({
      organisationCount: 3n,
      createdSettingsCount: 2,
    });

    await expect(
      ensureDefaultOrganisationSecuritySettingsForAllOrganisations(seedClient.client),
    ).resolves.toEqual({
      organisationCount: 3,
      createdSettingsCount: 2,
    });
    expect(seedClient.executeCalls[0]?.sql).toContain('WHERE NOT EXISTS');
  });

  it('reads organisation settings and optional user preferences', async () => {
    const organisationSettings = {
      organisationId: 'org-1',
      enforceRememberMePolicy: true,
      allowRememberMe: false,
      maxRememberedSessionHours: 24,
      enforceRegularSessionLength: true,
      regularSessionLengthHours: 2,
      enforceIdleTimeout: true,
      idleTimeoutMinutes: 10,
      requireReauthenticationForSensitiveActions: true,
      allowTraineeEmailChange: false,
    };
    const userPreferences = {
      userId: 'user-1',
      preferredRegularSessionLengthHours: 4,
      preferredRememberMeSessionLengthHours: 48,
      preferredIdleTimeoutMinutes: 15,
    };
    const seedClient = createSecuritySettingsClient({
      organisationSettingsRows: [organisationSettings],
      userPreferenceRows: [userPreferences],
    });

    await expect(
      findOrganisationSecuritySettings({ organisationId: 'org-1' }, seedClient.client),
    ).resolves.toEqual(organisationSettings);
    await expect(
      findUserSecurityPreferences({ userId: 'user-1' }, seedClient.client),
    ).resolves.toEqual(userPreferences);
  });
});
