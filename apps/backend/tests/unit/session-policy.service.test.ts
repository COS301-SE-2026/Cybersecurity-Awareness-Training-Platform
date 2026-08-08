import { describe, expect, it } from 'vitest';
import { resolveSessionPolicy } from '../../src/services/session-policy.service.js';
const platform = {
  regularSessionSeconds: 900,
  rememberedSessionSeconds: 604800,
  idleTimeoutMinutes: 30,
  allowRememberMe: true,
};

describe('session-policy service', () => {
  it('uses platform default values', () => {
    expect(resolveSessionPolicy({ rememberMeRequested: true, platform })).toMatchObject({
      rememberMeAllowed: true,
      rememberMeApplied: true,
      regularSessionSeconds: 900,
      rememberedSessionSeconds: 604800,
      effectiveSessionSeconds: 604800,
      idleTimeoutMinutes: 30,
      sources: {
        rememberMe: 'PLATFORM_DEFAULT',
        regularSession: 'PLATFORM_DEFAULT',
        rememberedSession: 'PLATFORM_DEFAULT',
        idleTimeout: 'PLATFORM_DEFAULT',
      },
    });
  });

  it('applies user preferences when not overriden by an organisation policy', () => {
    expect(
      resolveSessionPolicy({
        rememberMeRequested: true,
        platform,
        userPreference: {
          preferredIdleTimeoutMinutes: 10,
          preferredRegularSessionSeconds: 1200,
          preferredRememberedSessionSeconds: 86400,
        },
      }),
    ).toMatchObject({
      regularSessionSeconds: 1200,
      rememberedSessionSeconds: 86400,
      idleTimeoutMinutes: 10,
      sources: {
        regularSession: 'USER_PREFERENCE',
        rememberedSession: 'USER_PREFERENCE',
        idleTimeout: 'USER_PREFERENCE',
      },
    });
  });

  it('lets organisation policy override regular session and idle timout', () => {
    expect(
      resolveSessionPolicy({
        rememberMeRequested: false,
        platform,
        userPreference: {
          preferredRegularSessionSeconds: 1200,
          preferredIdleTimeoutMinutes: 10,
        },
        organisationPolicy: {
          enforceRegularSessionLength: true,
          regularSessionSeconds: 600,
          enforceIdleTimeout: true,
          idleTimeoutMinutes: 5,
        },
      }),
    ).toMatchObject({
      regularSessionSeconds: 600,
      effectiveSessionSeconds: 600,
      idleTimeoutMinutes: 5,
      sources: {
        regularSession: 'ORGANISATION_POLICY',
        idleTimeout: 'ORGANISATION_POLICY',
      },
    });
  });

  it('disabled remember me when organisation policy doesnt allow it', () => {
    expect(
      resolveSessionPolicy({
        rememberMeRequested: true,
        platform,
        organisationPolicy: { enforceRememberMePolicy: true, allowRememberMe: false },
      }),
    ).toMatchObject({
      rememberMeAllowed: false,
      rememberMeApplied: false,
      effectiveSessionSeconds: 900,
    });
  });

  it('caps remembered session length by the organisations max', () => {
    expect(
      resolveSessionPolicy({
        rememberMeRequested: true,
        platform,
        userPreference: { preferredRememberedSessionSeconds: 1000 },
        organisationPolicy: {
          enforceRememberMePolicy: true,
          allowRememberMe: true,
          maxRememberedSessionSeconds: 500,
        },
      }),
    ).toMatchObject({
      rememberedSessionSeconds: 500,
      effectiveSessionSeconds: 500,
      sources: { rememberedSession: 'ORGANISATION_POLICY' },
    });
  });

  it('ignores negative and zero preferences values', () => {
    expect(
      resolveSessionPolicy({
        rememberMeRequested: true,
        platform,
        userPreference: {
          preferredRegularSessionSeconds: 0,
          preferredRememberedSessionSeconds: -1,
          preferredIdleTimeoutMinutes: Number.NaN,
        },
        organisationPolicy: {
          enforceRegularSessionLength: true,
          regularSessionSeconds: 0,
          enforceIdleTimeout: true,
          idleTimeoutMinutes: 30,
        },
      }),
    ).toMatchObject({
      regularSessionSeconds: 900,
      rememberedSessionSeconds: 604800,
      idleTimeoutMinutes: 30,
    });
  });
}); //describe
