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
}) {
  const queryCalls: RawCall[] = [];
  const executeCalls: RawCall[] = [];

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
        executeCalls.push({
          sql: normaliseSql(strings),
          values,
        });
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
      ],
    });

    const summary = await seedOrganisationAdminPermissions(seedClient.client);

    expect(summary).toEqual({
      organisationCount: 1,
      permissionCount: 4,
      initialAdminGrantCount: 4,
    });

    const serializedExecuteValues = JSON.stringify(
      seedClient.executeCalls.map((call) => call.values),
    );

    expect(serializedExecuteValues).toContain('VIEW_ORGANISATION_ADMINS');
    expect(serializedExecuteValues).toContain('INVITE_ORGANISATION_ADMINS');
    expect(serializedExecuteValues).toContain('REMOVE_ORGANISATION_ADMINS');
    expect(serializedExecuteValues).toContain('CHANGE_ORGANISATION_ADMIN_PERMISSIONS');
    expect(serializedExecuteValues).not.toContain('password');
    expect(serializedExecuteValues).not.toContain('token');

    expect(
      seedClient.executeCalls.filter((call) =>
        call.sql.includes('INSERT INTO "OrganisationPermission"'),
      ),
    ).toHaveLength(4);
    expect(
      seedClient.executeCalls.filter((call) =>
        call.sql.includes('INSERT INTO "OrganisationAdminPermission"'),
      ),
    ).toHaveLength(4);
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
      permissionCount: 4,
      initialAdminGrantCount: 0,
    });
    expect(
      seedClient.executeCalls.some((call) =>
        call.sql.includes('INSERT INTO "OrganisationAdminPermission"'),
      ),
    ).toBe(false);
  });
});
