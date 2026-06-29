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

describe('organisation membership Prisma schema', () => {
  it('adds membership lifecycle fields to organisation trainee profiles', () => {
    const profile = schemaBlock('model', 'OrganisationTraineeProfile');

    expectValues(profile, [
      'membershipStatus',
      'joinedAt',
      'createdFromInvitationId',
      'disabledAt',
      'disabledReason',
      'createdFromInvitation',
      '@@index([membershipStatus])',
      '@@index([disabledAt])',
    ]);
    expect(profile).not.toContain('organisationUserStatus');
  });

  it('supports organisation trainee invitation lifecycle values', () => {
    expectValues(schemaBlock('enum', 'InvitationPurpose'), [
      'INITIAL_ORGANISATION_ADMIN_SETUP',
      'ORGANISATION_TRAINEE_INVITE',
    ]);
    expectValues(schemaBlock('enum', 'InvitationStatus'), [
      'PENDING',
      'SENT',
      'FAILED_TO_SEND',
      'ACCEPTED',
      'COMPLETED',
      'EXPIRED',
      'REVOKED',
      'REJECTED',
    ]);
  });

  it('links invitations to target users and accepted memberships', () => {
    const invitation = schemaBlock('model', 'Invitation');
    const user = schemaBlock('model', 'User');

    expectValues(invitation, [
      'targetUserId',
      'targetUser',
      'acceptedOrganisationTraineeProfile',
      '@@index([targetUserId])',
    ]);
    expect(user).toContain('targetedInvitations');
  });

  it('keeps invite token and email-log relations typed', () => {
    expectValues(schemaBlock('model', 'ActionToken'), [
      'invitationId',
      'invitation',
      'InvitationActionTokens',
      'ActionTokenEmailDeliveryLogs',
    ]);
    expectValues(schemaBlock('model', 'EmailDeliveryLog'), [
      'actionTokenId',
      'invitationId',
      'actionToken',
      'invitation',
      'ActionTokenEmailDeliveryLogs',
      'InvitationEmailDeliveryLogs',
    ]);
  });
});
