import { describe, expect, it } from 'vitest';
import { seedOrganisationAdminPermissions } from '../../prisma/seed-data/organisationPermissionSeed.js';

type RawCall = {
  readonly sql: string;
  readonly values: readonly unknown[];
};

function normaliseSql(strings: TemplateStringsArray): string {
  return strings.join('?').replace(/\s+/g, ' ').trim();
}

function createSeedClient(input: {
  readonly organisations: ReadonlyArray<{ readonly id: string }>;
  readonly initialAdmins: ReadonlyArray<{ readonly id: string }>;
  readonly permissions: ReadonlyArray<{ readonly id: string }>;
  readonly adminGrantInsertCounts?: readonly number[];
}) {
  const queryCalls: RawCall[] = [];
  const executeCalls: RawCall[] = [];
  const adminGrantInsertCounts = [...(input.adminGrantInsertCounts ?? [])];

  return {
    client: {
      async $queryRaw<T = unknown>(
        strings: TemplateStringsArray,
        ...values: readonly unknown[]
      ): Promise<T> {
        const sql = normaliseSql(strings);
        queryCalls.push({ sql, values });

        if (sql.includes('FROM "Organisation"')) {
          return input.organisations as T;
        }

        if (sql.includes('FROM "OrganisationAdminProfile"')) {
          return input.initialAdmins as T;
        }

        if (sql.includes('FROM "OrganisationPermission"')) {
          return input.permissions as T;
        }

        throw new Error(`Unexpected seed query: ${sql}`);
      },
      async $executeRaw(strings: TemplateStringsArray, ...values: readonly unknown[]) {
        const sql = normaliseSql(strings);
        executeCalls.push({
          sql,
          values,
        });

        if (sql.includes('INSERT INTO "OrganisationAdminPermission"')) {
          return adminGrantInsertCounts.shift() ?? 1;
        }

        return 1;
      },
    },
    queryCalls,
    executeCalls,
  };
}

describe('organisation admin permission seed', () => {
  it('seeds stable organisation permission keys and full initial-admin grants', async () => {
    const seedClient = createSeedClient({
      organisations: [{ id: 'org-1' }],
      initialAdmins: [{ id: 'admin-1' }],
      permissions: [
        { id: 'permission-view' },
        { id: 'permission-invite' },
        { id: 'permission-remove' },
        { id: 'permission-change' },
        { id: 'permission-security-settings' },
        { id: 'permission-view-trainees' },
        { id: 'permission-invite-trainees' },
        { id: 'permission-remove-trainees' },
        { id: 'permission-assign-campaigns' },
      ],
    });

    const summary = await seedOrganisationAdminPermissions(seedClient.client);

    expect(summary).toEqual({
      organisationCount: 1,
      permissionCount: 9,
      initialAdminGrantCount: 9,
    });

    const serializedExecuteValues = JSON.stringify(
      seedClient.executeCalls.map((call) => call.values),
    );

    expect(serializedExecuteValues).toContain('VIEW_ORGANISATION_ADMINS');
    expect(serializedExecuteValues).toContain('INVITE_ORGANISATION_ADMINS');
    expect(serializedExecuteValues).toContain('REMOVE_ORGANISATION_ADMINS');
    expect(serializedExecuteValues).toContain('CHANGE_ORGANISATION_ADMIN_PERMISSIONS');
    expect(serializedExecuteValues).toContain('CHANGE_ORGANISATION_SECURITY_SETTINGS');
    expect(serializedExecuteValues).toContain('VIEW_ORGANISATION_TRAINEES');
    expect(serializedExecuteValues).toContain('INVITE_ORGANISATION_TRAINEES');
    expect(serializedExecuteValues).toContain('REMOVE_ORGANISATION_TRAINEES');
    expect(serializedExecuteValues).toContain('ASSIGN_CAMPAIGNS');
    expect(serializedExecuteValues).not.toContain('password');
    expect(serializedExecuteValues).not.toContain('token');

    expect(
      seedClient.executeCalls.filter((call) =>
        call.sql.includes('INSERT INTO "OrganisationPermission"'),
      ),
    ).toHaveLength(9);
    expect(
      seedClient.executeCalls.filter((call) =>
        call.sql.includes('INSERT INTO "OrganisationAdminPermission"'),
      ),
    ).toHaveLength(9);
  });

  it('does not create grants when an organisation has no initial admins', async () => {
    const seedClient = createSeedClient({
      organisations: [{ id: 'org-1' }],
      initialAdmins: [],
      permissions: [],
    });

    const summary = await seedOrganisationAdminPermissions(seedClient.client);

    expect(summary).toEqual({
      organisationCount: 1,
      permissionCount: 9,
      initialAdminGrantCount: 0,
    });
    expect(
      seedClient.executeCalls.some((call) =>
        call.sql.includes('INSERT INTO "OrganisationAdminPermission"'),
      ),
    ).toBe(false);
  });

  it('reports actual inserted initial-admin grants instead of attempted grants', async () => {
    const seedClient = createSeedClient({
      organisations: [{ id: 'org-1' }],
      initialAdmins: [{ id: 'admin-1' }],
      permissions: [
        { id: 'permission-view' },
        { id: 'permission-invite' },
        { id: 'permission-remove' },
        { id: 'permission-change' },
        { id: 'permission-security-settings' },
        { id: 'permission-view-trainees' },
        { id: 'permission-invite-trainees' },
        { id: 'permission-remove-trainees' },
        { id: 'permission-assign-campaigns' },
      ],
      adminGrantInsertCounts: [1, 0, 1, 0, 1, 1, 0, 1, 1],
    });

    const summary = await seedOrganisationAdminPermissions(seedClient.client);

    expect(summary).toEqual({
      organisationCount: 1,
      permissionCount: 9,
      initialAdminGrantCount: 6,
    });
  });
});
