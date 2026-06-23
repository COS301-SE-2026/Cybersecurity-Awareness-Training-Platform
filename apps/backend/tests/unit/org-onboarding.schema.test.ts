import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const schema = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8');

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

describe('organisation onboarding Prisma schema', () => {
  it('defines organisation onboarding status values without deactivated terminology', () => {
    expectValues(schemaBlock('enum', 'OrganisationStatus'), [
      'PENDING_ONBOARDING',
      'ACTIVE',
      'SUSPENDED',
      'DISABLED',
    ]);
    expect(schema).not.toContain('DEACTIVATED');
  });

  it('defines registration request status values', () => {
    expectValues(schemaBlock('enum', 'OrganisationRegistrationRequestStatus'), [
      'PENDING_REVIEW',
      'CONTACTED',
      'APPROVED',
      'REJECTED',
      'CANCELLED',
    ]);
  });

  it('stores submitted organisation and representative details', () => {
    expectValues(schemaBlock('model', 'OrganisationRegistrationRequest'), [
      'submittedOrganisationName',
      'submittedWebsite',
      'submittedIndustry',
      'submittedEmployeeCount',
      'submittedPrimaryDomain',
      'representativeFirstName',
      'representativeLastName',
      'representativeEmail',
      'representativePhone',
    ]);
  });

  it('links registration requests to reviewers and approved organisations', () => {
    const request = schemaBlock('model', 'OrganisationRegistrationRequest');
    const ipAdmin = schemaBlock('model', 'IpAdminProfile');
    const organisation = schemaBlock('model', 'Organisation');

    expectValues(request, [
      'contactedByIpAdminId',
      'approvedByIpAdminId',
      'rejectedByIpAdminId',
      'approvedOrganisationId',
      'contactedBy',
      'approvedBy',
      'rejectedBy',
      'approvedOrganisation',
      'contactedAt',
      'approvedAt',
      'rejectedAt',
      'rejectionReason',
    ]);
    expect(ipAdmin).toContain('contactedOrganisationRegistrationRequests');
    expect(ipAdmin).toContain('approvedOrganisationRegistrationRequests');
    expect(ipAdmin).toContain('rejectedOrganisationRegistrationRequests');
    expect(organisation).toContain('registrationRequests');
  });

  it('defines initial organisation admin invitations', () => {
    const invitation = schemaBlock('model', 'Invitation');

    expectValues(schemaBlock('enum', 'InvitationPurpose'), ['INITIAL_ORGANISATION_ADMIN_SETUP']);
    expectValues(schemaBlock('enum', 'InvitationStatus'), [
      'PENDING',
      'ACCEPTED',
      'EXPIRED',
      'REVOKED',
    ]);
    expectValues(invitation, [
      'organisationId',
      'organisationRegistrationRequestId',
      'recipientEmail',
      'recipientFirstName',
      'recipientLastName',
      'expiresAt',
      'acceptedAt',
      'revokedAt',
      'revokedReason',
      'organisationRegistrationRequest',
      'actionTokens',
    ]);
  });

  it('links organisations to initial admin invitations', () => {
    const organisation = schemaBlock('model', 'Organisation');
    const invitation = schemaBlock('model', 'Invitation');

    expect(organisation).toContain('invitations');
    expect(invitation).toContain('organisation');
    expect(invitation).toContain('organisationRegistrationRequest');
    expect(invitation).toContain('@relation(fields: [organisationId], references: [id]');
  });

  it('reuses ActionToken for invitation and registration request lifecycle links', () => {
    const actionToken = schemaBlock('model', 'ActionToken');

    expectValues(actionToken, [
      'tokenHash',
      'invitationId',
      'organisationRegistrationRequestId',
      'invitation',
      'organisationRegistrationRequest',
    ]);
    expect(schema).not.toContain('plainTextToken');
    expect(schema).not.toContain('plaintextToken');
  });

  it('reuses EmailDeliveryLog for onboarding-related entities', () => {
    const emailLog = schemaBlock('model', 'EmailDeliveryLog');

    expectValues(emailLog, [
      'userId',
      'actionTokenId',
      'organisationId',
      'organisationRegistrationRequestId',
      'invitationId',
      'fallbackRelatedEntityType',
      'fallbackRelatedEntityId',
      'organisation',
      'organisationRegistrationRequest',
      'invitation',
    ]);
  });

  it('indexes onboarding lookup fields', () => {
    const request = schemaBlock('model', 'OrganisationRegistrationRequest');
    const invitation = schemaBlock('model', 'Invitation');
    const emailLog = schemaBlock('model', 'EmailDeliveryLog');

    expectValues(request, [
      '@@index([status])',
      '@@index([contactedByIpAdminId])',
      '@@index([approvedByIpAdminId])',
      '@@index([rejectedByIpAdminId])',
      '@@index([representativeEmail])',
      '@@index([approvedOrganisationId])',
    ]);
    expectValues(invitation, [
      '@@index([organisationId])',
      '@@index([organisationRegistrationRequestId])',
      '@@index([recipientEmail])',
      '@@index([status])',
      '@@index([expiresAt])',
    ]);
    expectValues(emailLog, [
      '@@index([organisationId])',
      '@@index([organisationRegistrationRequestId])',
      '@@index([invitationId])',
    ]);
  });
});
