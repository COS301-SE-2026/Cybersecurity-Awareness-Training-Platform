import { describe, expect, it } from 'vitest';
import { buildAuthContext } from '../../src/services/auth-context.service.js';
const baseUser = { id: 'user01', authStatus: 'ACTIVE' as const };

describe('auth-context serivce', () => {
  it('throws an error without a user', () => {
    expect(() => buildAuthContext({ user: null })).toThrow(
      'Cannot build auth context without a user',
    );
  });

  it.each([
    ['IP_ADMIN', ['PLATFORM_ADMIN'], '/admin'],
    ['ORGANISATION_ADMIN', ['ORGANISATION_ADMIN'], '/organisation'],
    ['ORGANISATION_TRAINEE', ['ORGANISATION_TRAINEE'], '/trainee/campaigns'],
    ['GENERAL_TRAINEE', ['GENERAL_TRAINEE'], '/trainee/campaigns'],
  ] as const)('builds context for %s', (userType, permissions, redirectTo) => {
    const context = buildAuthContext({
      user: { ...baseUser, userType },
      organisationAdminProfile:
        userType === 'ORGANISATION_ADMIN'
          ? { adminStatus: 'ACTIVE', organisation: { id: 'org01', status: 'ACTIVE' } }
          : null,
    });
    expect(context).toMatchObject({ role: userType, permissions, redirectTo });
  });

  it('returns null when the subject doesnt have an organisation profile', () => {
    expect(
      buildAuthContext({ user: { ...baseUser, userType: 'GENERAL_TRAINEE' } }).organisation,
    ).toBeNull();
  });
}); //describe
