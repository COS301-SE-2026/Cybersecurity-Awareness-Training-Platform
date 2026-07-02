import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { seedOrganisationAdminPermissions } from '../../prisma/seed-data/organisationPermissionSeed.js';
import { prisma } from '../../src/lib/prisma.js';

const NOW = new Date('2026-06-30T08:00:00.000Z');
const EXPIRES_AT = new Date('2026-07-30T08:00:00.000Z');
const CREDENTIAL_HASH = ['scrypt', 'org-admin-permission', 'fixture'].join('$');

type PermissionKey =
  | 'VIEW_ORGANISATION_ADMINS'
  | 'INVITE_ORGANISATION_ADMINS'
  | 'REMOVE_ORGANISATION_ADMINS'
  | 'CHANGE_ORGANISATION_ADMIN_PERMISSIONS'
  | 'CHANGE_ORGANISATION_SECURITY_SETTINGS';

function testId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

function testEmail(prefix: string): string {
  return `${prefix}-${randomUUID()}@example.test`;
}

async function createOrganisation(namePrefix: string): Promise<string> {
  const organisationId = testId('org');

  await prisma.$executeRaw`
    INSERT INTO "Organisation" (
      "id",
      "name",
      "status",
      "updatedAt"
    )
    VALUES (
      ${organisationId},
      ${`${namePrefix} ${randomUUID()}`},
      'ACTIVE',
      ${NOW}
    )
  `;

  return organisationId;
}

async function createOrganisationAdmin(input: {
  readonly organisationId: string;
  readonly emailPrefix: string;
  readonly isInitialAdmin?: boolean;
  readonly adminStatus?: 'ACTIVE' | 'DISABLED';
  readonly createdFromInvitationId?: string;
}): Promise<string> {
  const userId = testId('user');
  const adminId = testId('org-admin');

  await prisma.$executeRaw`
    INSERT INTO "User" (
      "id",
      "firstName",
      "lastName",
      "email",
      "passwordHash",
      "userType",
      "authStatus",
      "updatedAt"
    )
    VALUES (
      ${userId},
      'Test',
      'Admin',
      ${testEmail(input.emailPrefix)},
      ${CREDENTIAL_HASH},
      'ORGANISATION_ADMIN',
      'ACTIVE',
      ${NOW}
    )
  `;

  await prisma.$executeRaw`
    INSERT INTO "OrganisationAdminProfile" (
      "id",
      "userId",
      "organisationId",
      "adminStatus",
      "joinedAt",
      "isInitialAdmin",
      "createdFromInvitationId",
      "updatedAt"
    )
    VALUES (
      ${adminId},
      ${userId},
      ${input.organisationId},
      ${input.adminStatus ?? 'ACTIVE'},
      ${NOW},
      ${input.isInitialAdmin ?? false},
      ${input.createdFromInvitationId ?? null},
      ${NOW}
    )
  `;

  return adminId;
}

async function createOrganisationPermission(input: {
  readonly organisationId: string;
  readonly key: PermissionKey;
  readonly isCritical?: boolean;
}): Promise<string> {
  const permissionId = testId('org-permission');

  await prisma.$executeRaw`
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
      ${input.organisationId},
      ${input.key}::"OrganisationPermissionKey",
      ${input.key.replaceAll('_', ' ')},
      ${'Test permission fixture'},
      ${input.isCritical ?? false},
      ${NOW}
    )
  `;

  return permissionId;
}

async function grantAdminPermission(input: {
  readonly organisationId: string;
  readonly adminId: string;
  readonly permissionId: string;
}): Promise<string> {
  const grantId = testId('admin-permission');

  await prisma.$executeRaw`
    INSERT INTO "OrganisationAdminPermission" (
      "id",
      "organisationId",
      "organisationAdminId",
      "organisationPermissionId"
    )
    VALUES (
      ${grantId},
      ${input.organisationId},
      ${input.adminId},
      ${input.permissionId}
    )
  `;

  return grantId;
}

async function createPromotionInvitation(input: {
  readonly organisationId: string;
  readonly emailPrefix: string;
}): Promise<string> {
  const invitationId = testId('invitation');

  await prisma.$executeRaw`
    INSERT INTO "Invitation" (
      "id",
      "organisationId",
      "recipientEmail",
      "recipientFirstName",
      "recipientLastName",
      "purpose",
      "status",
      "expiresAt",
      "updatedAt"
    )
    VALUES (
      ${invitationId},
      ${input.organisationId},
      ${testEmail(input.emailPrefix)},
      'Promoted',
      'Admin',
      'ORGANISATION_ADMIN_PROMOTION',
      'SENT',
      ${EXPIRES_AT},
      ${NOW}
    )
  `;

  return invitationId;
}

async function createInvitationPermissionGrant(input: {
  readonly organisationId: string;
  readonly invitationId: string;
  readonly permissionId: string;
}): Promise<string> {
  const grantId = testId('invitation-permission');

  await prisma.$executeRaw`
    INSERT INTO "InvitationPermissionGrant" (
      "id",
      "organisationId",
      "invitationId",
      "organisationPermissionId"
    )
    VALUES (
      ${grantId},
      ${input.organisationId},
      ${input.invitationId},
      ${input.permissionId}
    )
  `;

  return grantId;
}

async function countActiveAdminsWithPermission(input: {
  readonly organisationId: string;
  readonly key: PermissionKey;
}): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ admin_count: bigint | number | string }>>`
    SELECT COUNT(DISTINCT admin."id") AS admin_count
    FROM "OrganisationAdminProfile" admin
    INNER JOIN "OrganisationAdminPermission" grant_record
      ON grant_record."organisationAdminId" = admin."id"
      AND grant_record."organisationId" = admin."organisationId"
    INNER JOIN "OrganisationPermission" permission
      ON permission."id" = grant_record."organisationPermissionId"
      AND permission."organisationId" = grant_record."organisationId"
    WHERE admin."organisationId" = ${input.organisationId}
      AND admin."adminStatus" = 'ACTIVE'
      AND permission."key" = ${input.key}::"OrganisationPermissionKey"
  `;

  return Number(rows[0]?.admin_count ?? 0);
}

async function grantedPermissionKeysForAdmin(input: {
  readonly organisationId: string;
  readonly adminId: string;
}): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ permission_key: string }>>`
    SELECT permission."key"::text AS permission_key
    FROM "OrganisationAdminPermission" grant_record
    INNER JOIN "OrganisationPermission" permission
      ON permission."id" = grant_record."organisationPermissionId"
      AND permission."organisationId" = grant_record."organisationId"
    WHERE grant_record."organisationId" = ${input.organisationId}
      AND grant_record."organisationAdminId" = ${input.adminId}
    ORDER BY permission."key"
  `;

  return rows.map((row) => row.permission_key).sort((left, right) => left.localeCompare(right));
}

describe('organisation admin permission Prisma relations', () => {
  it('rejects multiple initial admins in the same organisation', async () => {
    const organisationId = await createOrganisation('Single Initial Admin');

    await createOrganisationAdmin({
      organisationId,
      emailPrefix: 'initial-admin-a',
      isInitialAdmin: true,
    });

    await expect(
      createOrganisationAdmin({
        organisationId,
        emailPrefix: 'initial-admin-b',
        isInitialAdmin: true,
      }),
    ).rejects.toThrow();
  });

  it('allows multiple non-initial admins in the same organisation', async () => {
    const organisationId = await createOrganisation('Multiple Non Initial Admins');

    await expect(
      createOrganisationAdmin({
        organisationId,
        emailPrefix: 'non-initial-admin-a',
      }),
    ).resolves.toEqual(expect.stringContaining('org-admin-'));

    await expect(
      createOrganisationAdmin({
        organisationId,
        emailPrefix: 'non-initial-admin-b',
      }),
    ).resolves.toEqual(expect.stringContaining('org-admin-'));
  });

  it('seeds full default permissions for the initial organisation admin only', async () => {
    const organisationId = await createOrganisation('Initial Admin Seed Grants');
    const initialAdminId = await createOrganisationAdmin({
      organisationId,
      emailPrefix: 'seed-initial-admin',
      isInitialAdmin: true,
    });

    await createOrganisationAdmin({
      organisationId,
      emailPrefix: 'seed-promoted-admin',
    });

    const summary = await seedOrganisationAdminPermissions(prisma);

    expect(summary.organisationCount).toBeGreaterThanOrEqual(1);
    expect(summary.permissionCount).toBeGreaterThanOrEqual(5);
    expect(
      await grantedPermissionKeysForAdmin({ organisationId, adminId: initialAdminId }),
    ).toEqual([
      'CHANGE_ORGANISATION_ADMIN_PERMISSIONS',
      'CHANGE_ORGANISATION_SECURITY_SETTINGS',
      'INVITE_ORGANISATION_ADMINS',
      'REMOVE_ORGANISATION_ADMINS',
      'VIEW_ORGANISATION_ADMINS',
    ]);

    const repeatedSummary = await seedOrganisationAdminPermissions(prisma);
    expect(repeatedSummary.initialAdminGrantCount).toBe(0);
  });

  it('stores organisation-scoped permission records and explicit admin grants', async () => {
    const organisationId = await createOrganisation('Permission Grants');
    const adminId = await createOrganisationAdmin({
      organisationId,
      emailPrefix: 'permission-admin',
      isInitialAdmin: true,
    });
    const permissionId = await createOrganisationPermission({
      organisationId,
      key: 'VIEW_ORGANISATION_ADMINS',
    });

    const grantId = await grantAdminPermission({ organisationId, adminId, permissionId });

    const rows = await prisma.$queryRaw<Array<{ grant_id: string; permission_key: string }>>`
      SELECT grant_record."id" AS grant_id, permission."key"::text AS permission_key
      FROM "OrganisationAdminPermission" grant_record
      INNER JOIN "OrganisationPermission" permission
        ON permission."id" = grant_record."organisationPermissionId"
        AND permission."organisationId" = grant_record."organisationId"
      WHERE grant_record."id" = ${grantId}
    `;

    expect(rows).toEqual([
      {
        grant_id: grantId,
        permission_key: 'VIEW_ORGANISATION_ADMINS',
      },
    ]);
  });

  it('rejects organisation admin permission grants across organisations', async () => {
    const permissionOrganisationId = await createOrganisation('Permission Organisation');
    const adminOrganisationId = await createOrganisation('Admin Organisation');
    const adminId = await createOrganisationAdmin({
      organisationId: adminOrganisationId,
      emailPrefix: 'cross-org-admin',
    });
    const permissionId = await createOrganisationPermission({
      organisationId: permissionOrganisationId,
      key: 'INVITE_ORGANISATION_ADMINS',
      isCritical: true,
    });

    await expect(
      grantAdminPermission({
        organisationId: adminOrganisationId,
        adminId,
        permissionId,
      }),
    ).rejects.toThrow();
  });

  it('stores promotion invitation planned grants and rejects cross-organisation grants', async () => {
    const invitationOrganisationId = await createOrganisation('Invitation Organisation');
    const permissionOrganisationId = await createOrganisation('Permission Organisation');
    const invitationId = await createPromotionInvitation({
      organisationId: invitationOrganisationId,
      emailPrefix: 'promotion-invite',
    });
    const sameOrganisationPermissionId = await createOrganisationPermission({
      organisationId: invitationOrganisationId,
      key: 'CHANGE_ORGANISATION_ADMIN_PERMISSIONS',
      isCritical: true,
    });
    const otherOrganisationPermissionId = await createOrganisationPermission({
      organisationId: permissionOrganisationId,
      key: 'CHANGE_ORGANISATION_ADMIN_PERMISSIONS',
      isCritical: true,
    });

    await expect(
      createInvitationPermissionGrant({
        organisationId: invitationOrganisationId,
        invitationId,
        permissionId: sameOrganisationPermissionId,
      }),
    ).resolves.toEqual(expect.stringContaining('invitation-permission-'));

    await expect(
      createInvitationPermissionGrant({
        organisationId: invitationOrganisationId,
        invitationId,
        permissionId: otherOrganisationPermissionId,
      }),
    ).rejects.toThrow();
  });

  it('links accepted promotion invitations to resulting admins in the same organisation only', async () => {
    const invitationOrganisationId = await createOrganisation('Promotion Organisation');
    const adminOrganisationId = await createOrganisation('Other Admin Organisation');
    const invitationId = await createPromotionInvitation({
      organisationId: invitationOrganisationId,
      emailPrefix: 'accepted-promotion',
    });

    await expect(
      createOrganisationAdmin({
        organisationId: invitationOrganisationId,
        emailPrefix: 'accepted-admin',
        createdFromInvitationId: invitationId,
      }),
    ).resolves.toEqual(expect.stringContaining('org-admin-'));

    await expect(
      createOrganisationAdmin({
        organisationId: adminOrganisationId,
        emailPrefix: 'cross-org-accepted-admin',
        createdFromInvitationId: invitationId,
      }),
    ).rejects.toThrow();
  });

  it('represents permission revocation and last-critical-admin safeguard query support', async () => {
    const organisationId = await createOrganisation('Critical Permission Safeguard');
    const firstAdminId = await createOrganisationAdmin({
      organisationId,
      emailPrefix: 'critical-admin-a',
    });
    const secondAdminId = await createOrganisationAdmin({
      organisationId,
      emailPrefix: 'critical-admin-b',
    });
    const changePermissionId = await createOrganisationPermission({
      organisationId,
      key: 'CHANGE_ORGANISATION_ADMIN_PERMISSIONS',
      isCritical: true,
    });

    const firstGrantId = await grantAdminPermission({
      organisationId,
      adminId: firstAdminId,
      permissionId: changePermissionId,
    });
    const secondGrantId = await grantAdminPermission({
      organisationId,
      adminId: secondAdminId,
      permissionId: changePermissionId,
    });

    expect(
      await countActiveAdminsWithPermission({
        organisationId,
        key: 'CHANGE_ORGANISATION_ADMIN_PERMISSIONS',
      }),
    ).toBe(2);

    await prisma.$executeRaw`
      DELETE FROM "OrganisationAdminPermission"
      WHERE "id" = ${firstGrantId}
    `;

    expect(
      await countActiveAdminsWithPermission({
        organisationId,
        key: 'CHANGE_ORGANISATION_ADMIN_PERMISSIONS',
      }),
    ).toBe(1);

    await prisma.$executeRaw`
      DELETE FROM "OrganisationAdminPermission"
      WHERE "id" = ${secondGrantId}
    `;

    expect(
      await countActiveAdminsWithPermission({
        organisationId,
        key: 'CHANGE_ORGANISATION_ADMIN_PERMISSIONS',
      }),
    ).toBe(0);
  });
});
