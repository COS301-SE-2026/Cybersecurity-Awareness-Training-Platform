import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearAuthRateLimitStore } from '../../src/middleware/authRateLimit.js';

const actorUserId = '11111111-1111-4111-8111-111111111111';
const currentSessionId = '22222222-2222-4222-8222-222222222222';

const accountServiceMock = vi.hoisted(() => {
  class MockAccountServiceError extends Error {
    constructor(
      public readonly statusCode: 403 | 404 | 409 | 422,
      public readonly error: string,
      message: string,
      public readonly fieldErrors: Array<{ field: string; message: string }> = [],
    ) {
      super(message);
      this.name = 'AccountServiceError';
    }
  }

  return {
    AccountServiceError: MockAccountServiceError,
    changeAccountPassword: vi.fn(),
    getAccount: vi.fn(),
    listAccountSessionSummaries: vi.fn(),
    logoutOtherAccountSessions: vi.fn(),
    patchAccountProfile: vi.fn(),
    patchAccountSecurityPreferences: vi.fn(),
    requestAccountEmailChange: vi.fn(),
    revokeAccountSession: vi.fn(),
  };
});

vi.mock('../../src/services/account.service.js', () => accountServiceMock);

vi.mock('../../src/middleware/requireAuth.js', () => ({
  requireAuth(req: Request, _res: Response, next: NextFunction) {
    req.auth = {
      userId: actorUserId,
      authSessionId: currentSessionId,
      user: {
        id: actorUserId,
        firstName: 'Amina',
        lastName: 'Admin',
        email: 'amina@example.test',
        userType: 'GENERAL_TRAINEE',
        authStatus: 'ACTIVE',
        createdAt: '2026-07-01T08:00:00.000Z',
      },
    };
    next();
  },
}));

function accountResponse() {
  return {
    profile: {
      id: actorUserId,
      firstName: 'Amina',
      lastName: 'Admin',
      email: 'amina@example.test',
      userType: 'GENERAL_TRAINEE',
      authStatus: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: '2026-07-01T08:00:00.000Z',
      createdAt: '2026-07-01T08:00:00.000Z',
      updatedAt: '2026-07-01T08:00:00.000Z',
    },
    securityPreferences: {
      id: null,
      preferredRegularSessionLengthHours: null,
      preferredRememberMeSessionLengthHours: null,
      preferredIdleTimeoutMinutes: null,
      updatedAt: null,
    },
    effectivePolicy: {
      organisationId: null,
      rememberMeRequested: false,
      rememberMeAllowed: true,
      rememberMeApplied: false,
      regularSessionSeconds: 900,
      rememberedSessionSeconds: 604800,
      effectiveSessionSeconds: 900,
      idleTimeoutMinutes: 30,
      requireReauthenticationForSensitiveActions: true,
      allowEmailChange: true,
      sources: {
        rememberMe: 'PLATFORM_DEFAULT',
        regularSession: 'PLATFORM_DEFAULT',
        rememberedSession: 'PLATFORM_DEFAULT',
        idleTimeout: 'PLATFORM_DEFAULT',
      },
    },
    capabilities: {
      canEditProfile: true,
      canRequestEmailChange: true,
      canChangePassword: true,
      canEditSecurityPreferences: true,
      canDeleteAccount: false,
      securityPreferenceEditable: {
        preferredRegularSessionLengthHours: true,
        preferredRememberMeSessionLengthHours: true,
        preferredIdleTimeoutMinutes: true,
      },
      blockedReasons: {
        emailChange: null,
        securityPreferences: null,
        preferredRegularSessionLengthHours: null,
        preferredRememberMeSessionLengthHours: null,
        preferredIdleTimeoutMinutes: null,
        deleteAccount: 'SELF_DELETION_NOT_SUPPORTED',
      },
    },
  };
}

describe('account settings routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAuthRateLimitStore();
  });

  it('returns account settings for the authenticated user', async () => {
    accountServiceMock.getAccount.mockResolvedValue(accountResponse());

    const response = await request(createApp()).get('/account');

    expect(response.status).toBe(200);
    expect(accountServiceMock.getAccount).toHaveBeenCalledWith(actorUserId);
    expect(response.body.profile.email).toBe('amina@example.test');
  });

  it('updates profile with 422 validation on invalid names', async () => {
    const response = await request(createApp()).patch('/account/profile').send({
      firstName: '',
      lastName: 'Admin',
    });

    expect(response.status).toBe(422);
    expect(accountServiceMock.patchAccountProfile).not.toHaveBeenCalled();
  });

  it('requests email change for the authenticated user', async () => {
    accountServiceMock.requestAccountEmailChange.mockResolvedValue({
      message:
        'If this email change can be completed, a confirmation email has been queued for delivery to the new address.',
      emailQueued: true,
    });

    const payload = {
      newEmail: 'new-address@example.test',
      confirmNewEmail: 'new-address@example.test',
      password: 'CorrectPassword1!',
    };

    const response = await request(createApp()).post('/account/change-email').send(payload);

    expect(response.status).toBe(200);
    expect(accountServiceMock.requestAccountEmailChange).toHaveBeenCalledWith(actorUserId, payload);
    expect(JSON.stringify(response.body)).not.toContain('CorrectPassword1!');
  });

  it('changes password without returning password fields', async () => {
    accountServiceMock.changeAccountPassword.mockResolvedValue({
      message: 'Password changed successfully.',
      notificationQueued: true,
      revokedSessionCount: 2,
    });

    const response = await request(createApp()).post('/account/change-password').send({
      currentPassword: 'CorrectPassword1!',
      newPassword: 'UpdatedPassword1!',
      confirmNewPassword: 'UpdatedPassword1!',
    });

    expect(response.status).toBe(200);
    expect(accountServiceMock.changeAccountPassword).toHaveBeenCalledWith(
      actorUserId,
      expect.objectContaining({ newPassword: 'UpdatedPassword1!' }),
    );
    expect(JSON.stringify(response.body)).not.toContain('UpdatedPassword1!');
  });

  it('lists sessions using the authenticated current session id', async () => {
    accountServiceMock.listAccountSessionSummaries.mockResolvedValue({
      sessions: [
        {
          id: currentSessionId,
          rememberMe: false,
          current: true,
          createdAt: '2026-07-24T08:00:00.000Z',
          lastActiveAt: '2026-07-24T08:30:00.000Z',
          expiresAt: '2026-07-24T09:00:00.000Z',
          idleTimeoutMinutes: 30,
          deviceSummary: null,
          locationSummary: null,
        },
      ],
    });

    const response = await request(createApp()).get('/account/sessions');

    expect(response.status).toBe(200);
    expect(accountServiceMock.listAccountSessionSummaries).toHaveBeenCalledWith(
      actorUserId,
      currentSessionId,
    );
    expect(JSON.stringify(response.body)).not.toContain('tokenHash');
  });

  it('revokes an owned session by id', async () => {
    accountServiceMock.revokeAccountSession.mockResolvedValue({ revoked: true });

    const response = await request(createApp()).delete(
      '/account/sessions/33333333-3333-4333-8333-333333333333',
    );

    expect(response.status).toBe(200);
    expect(accountServiceMock.revokeAccountSession).toHaveBeenCalledWith(
      actorUserId,
      '33333333-3333-4333-8333-333333333333',
    );
  });

  it('logs out other sessions with the current session preserved', async () => {
    accountServiceMock.logoutOtherAccountSessions.mockResolvedValue({ revokedSessionCount: 2 });

    const response = await request(createApp()).post('/account/sessions/logout-others').send({});

    expect(response.status).toBe(200);
    expect(accountServiceMock.logoutOtherAccountSessions).toHaveBeenCalledWith(
      actorUserId,
      currentSessionId,
    );
  });

  it('updates security preferences with 403 service errors preserved', async () => {
    accountServiceMock.patchAccountSecurityPreferences.mockRejectedValue(
      new accountServiceMock.AccountServiceError(
        403,
        'ACCOUNT_SECURITY_PREFERENCES_POLICY_BLOCKED',
        'Organisation security policy blocks one or more requested preference changes',
        [
          {
            field: 'preferredIdleTimeoutMinutes',
            message: 'This preference is managed by organisation security policy.',
          },
        ],
      ),
    );

    const response = await request(createApp()).patch('/account/security-preferences').send({
      preferredIdleTimeoutMinutes: 30,
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('ACCOUNT_SECURITY_PREFERENCES_POLICY_BLOCKED');
    expect(response.body.details).toEqual([
      {
        field: 'preferredIdleTimeoutMinutes',
        message: 'This preference is managed by organisation security policy.',
      },
    ]);
  });
});
