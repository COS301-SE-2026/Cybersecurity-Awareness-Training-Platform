import { describe, expect, it } from 'vitest';
import {
  ensureActiveOrganisation,
  ensureActiveUser,
  ensureOrganisationAdmin,
  ensureOrganisationMember,
  ensurePlatformAdmin,
  ensureSameOrganisation,
  ensureUserCanAuthenticate,
} from '../../src/services/auth-status-guard.service.js';
const user = { id: 'user01', userType: 'GENERAL_TRAINEE' as const, authStatus: 'ACTIVE' as const };
const defaultOrg = { id: 'org01', status: 'ACTIVE' as const };

describe('auth-status guard service', () => {
  it.each([
    [null, 'USER_NOT_FOUND'],
    [{ ...user, authStatus: 'PENDING_EMAIL_VERIFICATION' }, 'USER_EMAIL_NOT_VERIFIED'],
    [{ ...user, authStatus: 'PENDING_INVITE_SETUP' }, 'USER_PENDING_INVITE_SETUP'],
    [{ ...user, authStatus: 'DISABLED' }, 'USER_DISABLED'],
  ] as const)('rejects inactive user state %s', (value, code) => {
    expect(ensureActiveUser(value)).toMatchObject({ allowed: false, code });
  });

  it('allows active users', () => {
    expect(ensureActiveUser(user)).toEqual({ allowed: true });
  });

  it.each([
    ['PENDING_ONBOARDING', 'ORGANISATION_PENDING_ONBOARDING'],
    ['SUSPENDED', 'ORGANISATION_SUSPENDED'],
    ['DISABLED', 'ORGANISATION_DISABLED'],
    ['ARCHIVED', 'ORGANISATION_ARCHIVED'],
    ['INACTIVE', 'ORGANISATION_NOT_ACTIVE'],
  ] as const)('rejects organisation status %s', (status, code) => {
    expect(ensureActiveOrganisation({ id: 'org01', status })).toMatchObject({
      allowed: false,
      code,
    });
  });

  it('checks fill authentication path for each role', () => {
    expect(
      ensureUserCanAuthenticate({ user: user, traineeProfile: { traineeStatus: 'ACTIVE' } }),
    ).toEqual({ allowed: true });

    expect(
      ensureUserCanAuthenticate({
        user: { ...user, userType: 'ORGANISATION_TRAINEE' },
        traineeProfile: { traineeStatus: 'ACTIVE' },
        organisationTraineeProfile: { membershipStatus: 'ACTIVE', organisation: defaultOrg },
      }),
    ).toEqual({ allowed: true });

    expect(
      ensureUserCanAuthenticate({
        user: { ...user, userType: 'ORGANISATION_ADMIN' },
        organisationAdminProfile: { adminStatus: 'ACTIVE', organisation: defaultOrg },
      }),
    ).toEqual({ allowed: true });

    expect(
      ensureUserCanAuthenticate({
        user: { ...user, userType: 'IP_ADMIN' },
        ipAdminProfile: { adminStatus: 'ACTIVE' },
      }),
    ).toEqual({ allowed: true });
  });

  it('checks role guards', () => {
    expect(
      ensurePlatformAdmin({
        user: { ...user, userType: 'IP_ADMIN' },
        ipAdminProfile: { adminStatus: 'ACTIVE' },
      }),
    ).toEqual({ allowed: true });

    expect(
      ensureOrganisationAdmin({
        user: { ...user, userType: 'ORGANISATION_ADMIN' },
        organisationAdminProfile: { adminStatus: 'ACTIVE', organisation: defaultOrg },
      }),
    ).toEqual({ allowed: true });

    expect(
      ensureOrganisationMember({
        user: { ...user, userType: 'ORGANISATION_TRAINEE' },
        organisationTraineeProfile: { membershipStatus: 'ACTIVE', organisation: defaultOrg },
      }),
    ).toEqual({ allowed: true });

    expect(
      ensureSameOrganisation(
        {
          user: { ...user, userType: 'ORGANISATION_ADMIN' },
          organisationAdminProfile: { adminStatus: 'ACTIVE', organisation: defaultOrg },
        },
        'org01',
      ),
    ).toEqual({ allowed: true });

    expect(ensurePlatformAdmin({ user })).toMatchObject({
      allowed: false,
      code: 'PLATFORM_ADMIN_REQUIRED',
    });
  });

  it.each([
    ['missing trainee profile', { user, traineeProfile: null }, 'TRAINEE_PROFILE_INACTIVE'],
    [
      'inactive trainee profile',
      { user, traineeProfile: { traineeStatus: 'INACTIVE' } },
      'TRAINEE_PROFILE_INACTIVE',
    ],
    [
      'inactive organisation trainee profile',
      {
        user: { ...user, userType: 'ORGANISATION_TRAINEE' },
        traineeProfile: { traineeStatus: 'ACTIVE' },
        organisationTraineeProfile: {
          membershipStatus: 'INACTIVE',
          organisation: defaultOrg,
        },
      },
      'ORGANISATION_USER_INACTIVE',
    ],
    [
      'missing organisation admin profile',
      { user: { ...user, userType: 'ORGANISATION_ADMIN' }, organisationAdminProfile: null },
      'ADMIN_DISABLED',
    ],
    [
      'disabled organisation admin profile',
      {
        user: { ...user, userType: 'ORGANISATION_ADMIN' },
        organisationAdminProfile: { adminStatus: 'DISABLED', organisation: defaultOrg },
      },
      'ADMIN_DISABLED',
    ],
    [
      'missing IP admin profile',
      { user: { ...user, userType: 'IP_ADMIN' }, ipAdminProfile: null },
      'IP_ADMIN_DISABLED',
    ],
    [
      'disabled IP admin profile',
      { user: { ...user, userType: 'IP_ADMIN' }, ipAdminProfile: { adminStatus: 'DISABLED' } },
      'IP_ADMIN_DISABLED',
    ],
  ] as const)('rejects authentication for %s', (_caseName, subject, code) => {
    expect(ensureUserCanAuthenticate(subject)).toMatchObject({ allowed: false, code });
  });

  it('rejects role gaurd mismatches', () => {
    expect(
      ensureOrganisationAdmin({ user, traineeProfile: { traineeStatus: 'ACTIVE' } }),
    ).toMatchObject({ allowed: false, code: 'ORGANISATION_ADMIN_REQUIRED' });
    expect(
      ensureOrganisationMember({ user, traineeProfile: { traineeStatus: 'ACTIVE' } }),
    ).toMatchObject({ allowed: false, code: 'ORGANISATION_MEMBER_REQUIRED' });
    expect(
      ensureSameOrganisation(
        {
          user: { ...user, userType: 'ORGANISATION_ADMIN' },
          organisationAdminProfile: { adminStatus: 'ACTIVE', organisation: defaultOrg },
        },
        'differentorgid',
      ),
    ).toMatchObject({ allowed: false, code: 'SAME_ORGANISATION_REQUIRED' });
  });
}); //describe
