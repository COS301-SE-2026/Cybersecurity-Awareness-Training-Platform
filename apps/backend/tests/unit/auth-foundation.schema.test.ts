import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const schema = readFileSync(resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8');

describe('auth foundation Prisma schema', () => {
  it('uses the domain auth status values and avoids deactivated terminology', () => {
    expect(schema).toContain('PENDING_EMAIL_VERIFICATION');
    expect(schema).toContain('PENDING_INVITE_SETUP');
    expect(schema).toContain('ACTIVE');
    expect(schema).toContain('DISABLED');
    expect(schema).not.toContain('DEACTIVATED');
  });

  it('defines user auth fields from the domain model', () => {
    expect(schema).toContain('emailVerifiedAt');
    expect(schema).toContain('lastLoginAt');
    expect(schema).toContain('disabledAt');
    expect(schema).toContain('disabledReason');
  });

  it('defines IP admin fields from the domain model', () => {
    expect(schema).toContain('platformAdminRole');
    expect(schema).toContain('SUPER_ADMIN');
    expect(schema).toContain('NORMAL_ADMIN');
    expect(schema).toContain('joinedAt');
    expect(schema).toContain('revokedAt');
    expect(schema).toContain('revokedReason');
  });

  it('defines auth sessions using domain model names', () => {
    expect(schema).toContain('model AuthSession');
    expect(schema).toContain('rememberMe');
    expect(schema).toContain('lastActiveAt');
    expect(schema).toContain('idleTimeoutMinutes');
    expect(schema).toContain('deviceSummary');
    expect(schema).toContain('locationSummary');
    expect(schema).toContain('AuthSessionRevokedReason');
  });

  it('stores refresh and action tokens as hashes only', () => {
    expect(schema).toContain('model RefreshToken');
    expect(schema).toContain('tokenHash');
    expect(schema).toContain('@unique');
    expect(schema).toContain('model ActionToken');
    expect(schema).toContain('purpose');
    expect(schema).not.toContain('plainTextToken');
    expect(schema).not.toContain('plaintextToken');
  });

  it('defines email delivery logging using domain model names', () => {
    expect(schema).toContain('model EmailDeliveryLog');
    expect(schema).toContain('emailType');
    expect(schema).toContain('fallbackRelatedEntityType');
    expect(schema).toContain('fallbackRelatedEntityId');
    expect(schema).toContain('@map("relatedEntityType")');
    expect(schema).toContain('@map("relatedEntityId")');
    expect(schema).toContain('sentAt');
    expect(schema).toContain('failedAt');
    expect(schema).toContain('failureReason');
  });
});
