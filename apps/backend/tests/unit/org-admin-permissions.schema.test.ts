import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const schema = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8');
const migration = readFileSync(
  resolve(
    process.cwd(),
    'prisma/migrations/20260630120000_org_admin_permissions_foundation/migration.sql',
  ),
  'utf8',
);

function schemaBlock(kind: 'enum' | 'model', name: string): string {
  const match = schema.match(new RegExp(`${kind} ${name}\\s*\\{([\\s\\S]*?)\\n\\}`));

  if (!match?.[1]) {
    throw new Error(`${kind} ${name} was not found in Prisma schema.`);
  }

  return match[1];
}

function expectValues(block: string, values: readonly string[]): void {
  for (const value of values) {
    expect(block).toContain(value);
  }
}

describe('organisation admin permission Prisma schema', () => {
  it('adds organisation admin lifecycle fields and same-organisation invitation linkage', () => {
    const profile = schemaBlock('model', 'OrganisationAdminProfile');
    const invitation = schemaBlock('model', 'Invitation');

    expectValues(profile, [
      'adminStatus',
      'joinedAt',
      'isInitialAdmin',
      'createdFromInvitationId',
      'disabledAt',
      'disabledReason',
      'createdFromInvitation',
      'fields: [createdFromInvitationId, organisationId]',
      'references: [id, organisationId]',
      '@@unique([id, organisationId])',
      '@@unique([createdFromInvitationId, organisationId])',
      '@@index([isInitialAdmin])',
      '@@index([disabledAt])',
    ]);
    expect(invitation).toContain('acceptedOrganisationAdminProfile');
  });

  it('defines organisation-scoped permission and admin grant models', () => {
    expectValues(schemaBlock('enum', 'OrganisationPermissionKey'), [
      'VIEW_ORGANISATION_ADMINS',
      'INVITE_ORGANISATION_ADMINS',
      'REMOVE_ORGANISATION_ADMINS',
      'CHANGE_ORGANISATION_ADMIN_PERMISSIONS',
      'CHANGE_ORGANISATION_SECURITY_SETTINGS',
    ]);

    expectValues(schemaBlock('model', 'OrganisationPermission'), [
      'key                        OrganisationPermissionKey',
      'isCritical',
      '@@unique([organisationId, key])',
      '@@unique([id, organisationId])',
      '@@index([organisationId, isCritical])',
    ]);

    expectValues(schemaBlock('model', 'OrganisationAdminPermission'), [
      'organisationAdminId',
      'organisationPermissionId',
      'grantedByOrganisationAdminId',
      'fields: [organisationAdminId, organisationId]',
      'fields: [organisationPermissionId, organisationId]',
      'fields: [grantedByOrganisationAdminId, organisationId]',
      '@@unique([organisationAdminId, organisationPermissionId])',
      '@@index([organisationId, organisationPermissionId])',
    ]);
  });

  it('defines promotion invitation planned grants with organisation-scoped constraints', () => {
    expect(schemaBlock('enum', 'InvitationPurpose')).toContain('ORGANISATION_ADMIN_PROMOTION');
    expectValues(schemaBlock('model', 'InvitationPermissionGrant'), [
      'organisationId',
      'invitationId',
      'organisationPermissionId',
      'fields: [invitationId, organisationId]',
      'fields: [organisationPermissionId, organisationId]',
      '@@unique([invitationId, organisationPermissionId])',
      '@@index([organisationId, organisationPermissionId])',
    ]);
    expect(schemaBlock('model', 'Invitation')).toContain('permissionGrants');
  });

  it('keeps platform-admin fields separate from organisation-admin permissions', () => {
    const platformAdmin = schemaBlock('model', 'IpAdminProfile');
    const organisationAdmin = schemaBlock('model', 'OrganisationAdminProfile');
    const organisationPermission = schemaBlock('model', 'OrganisationPermission');

    expect(platformAdmin).toContain('platformAdminRole');
    expect(organisationAdmin).not.toContain('platformAdminRole');
    expect(organisationPermission).not.toContain('PlatformAdminRole');
  });

  it('keeps audit support generic for organisation admin permission targets', () => {
    expect(schemaBlock('enum', 'AuditTargetType')).toContain('ORGANISATION_ADMIN_PERMISSION');
    expect(schemaBlock('model', 'AuditLogEntry')).toContain('targetId');
  });

  it('backfills and enforces one initial organisation admin per organisation', () => {
    expect(migration).toContain('ROW_NUMBER() OVER');
    expect(migration).toContain('PARTITION BY "organisationId"');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "OrganisationAdminProfile_one_initial_admin_per_org"',
    );
    expect(migration).toContain('WHERE "isInitialAdmin" = true');
  });
});
