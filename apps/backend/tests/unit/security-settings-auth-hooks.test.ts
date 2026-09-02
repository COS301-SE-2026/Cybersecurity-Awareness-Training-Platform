import { beforeEach, describe, expect, it, vi } from 'vitest';

const userRepositoryMock = vi.hoisted(() => ({
  findUserByEmail: vi.fn(),
  findAuthSubjectByUserId: vi.fn(),
  findUserWithAuthSubjectById: vi.fn(),
}));

const passwordServiceMock = vi.hoisted(() => ({
  verifyPassword: vi.fn(),
}));

const authTokenServiceMock = vi.hoisted(() => ({
  generateAuthToken: vi.fn(),
}));

const securityPolicyServiceMock = vi.hoisted(() => ({
  resolveEffectiveSecurityPolicy: vi.fn(),
}));

const authSessionServiceMock = vi.hoisted(() => ({
  calculateSessionExpiresAt: vi.fn(
    (input: {
      now?: Date;
      rememberMe: boolean;
      regularSessionSeconds: number;
      rememberedSessionSeconds: number;
    }) => {
      const now = input.now ?? new Date('2026-07-02T10:00:00.000Z');
      const seconds = input.rememberMe
        ? input.rememberedSessionSeconds
        : input.regularSessionSeconds;
      return new Date(now.getTime() + seconds * 1000);
    },
  ),
  issueAuthSession: vi.fn(),
  revokeSessionById: vi.fn(),
  touchSession: vi.fn(),
  updateSessionPolicy: vi.fn(),
}));

const refreshTokenServiceMock = vi.hoisted(() => ({
  issueRefreshToken: vi.fn(),
  rotateRefreshToken: vi.fn(),
  validateRefreshToken: vi.fn(),
  revokeRefreshTokensForSession: vi.fn(),
}));

const auditServiceMock = vi.hoisted(() => ({
  recordUserLogin: vi.fn(),
  recordAuthSessionRevoked: vi.fn(),
}));

const authContextServiceMock = vi.hoisted(() => ({
  buildAuthContext: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
}));

vi.mock('../../src/repositories/user.repository.js', () => userRepositoryMock);
vi.mock('../../src/services/password.service.js', () => passwordServiceMock);
vi.mock('../../src/services/auth-token.service.js', () => authTokenServiceMock);
vi.mock('../../src/services/security-policy.service.js', () => securityPolicyServiceMock);
vi.mock('../../src/services/auth-session.service.js', () => authSessionServiceMock);
vi.mock('../../src/services/refresh-token.service.js', () => refreshTokenServiceMock);
vi.mock('../../src/services/auth-audit.service.js', () => auditServiceMock);
vi.mock('../../src/services/auth-context.service.js', () => authContextServiceMock);
vi.mock('../../src/lib/prisma.js', () => ({ prisma: prismaMock }));

import {
  AuthRefreshTokenInvalidError,
  loginUser,
  refreshUserToken,
} from '../../src/services/auth.service.js';

const activeSubject = {
  user: {
    id: 'user-1',
    userType: 'ORGANISATION_TRAINEE',
    authStatus: 'ACTIVE',
  },
  traineeProfile: { traineeStatus: 'ACTIVE' },
  organisationTraineeProfile: {
    membershipStatus: 'ACTIVE',
    organisation: { id: 'org-1', status: 'ACTIVE' },
  },
};

const defaultPolicy = {
  organisationId: 'org-1',
  rememberMeRequested: true,
  rememberMeAllowed: true,
  rememberMeApplied: true,
  regularSessionSeconds: 900,
  rememberedSessionSeconds: 604800,
  effectiveSessionSeconds: 604800,
  idleTimeoutMinutes: 30,
  requireReauthenticationForSensitiveActions: true,
  allowEmailChange: true,
  sources: {
    rememberMe: 'ORGANISATION_POLICY',
    regularSession: 'ORGANISATION_POLICY',
    rememberedSession: 'ORGANISATION_POLICY',
    idleTimeout: 'ORGANISATION_POLICY',
  },
};

describe('security settings auth hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userRepositoryMock.findUserByEmail.mockResolvedValue({
      id: 'user-1',
      firstName: 'Org',
      lastName: 'Trainee',
      email: 'org.trainee@example.test',
      passwordHash: 'hashed-password',
      userType: 'ORGANISATION_TRAINEE',
      authStatus: 'ACTIVE',
      createdAt: new Date('2026-07-02T08:00:00.000Z'),
    });
    userRepositoryMock.findAuthSubjectByUserId.mockResolvedValue(activeSubject);
    userRepositoryMock.findUserWithAuthSubjectById.mockResolvedValue({
      id: 'user-1',
      firstName: 'Org',
      lastName: 'Trainee',
      email: 'org.trainee@example.test',
      passwordHash: 'hashed-password',
      userType: 'ORGANISATION_TRAINEE',
      authStatus: 'ACTIVE',
      createdAt: new Date('2026-07-02T08:00:00.000Z'),
    });
    passwordServiceMock.verifyPassword.mockResolvedValue(true);
    securityPolicyServiceMock.resolveEffectiveSecurityPolicy.mockResolvedValue(defaultPolicy);
    authSessionServiceMock.issueAuthSession.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      rememberMe: true,
      expiresAt: new Date('2026-07-09T10:00:00.000Z'),
      idleTimeoutMinutes: 30,
    });
    refreshTokenServiceMock.issueRefreshToken.mockResolvedValue({
      rawToken: 'raw-refresh-token',
      token: { id: 'refresh-token-1' },
    });
    authTokenServiceMock.generateAuthToken.mockReturnValue({
      token: 'access-token',
      expiresAt: '2026-07-02T10:15:00.000Z',
    });
    authContextServiceMock.buildAuthContext.mockReturnValue({
      role: 'ORGANISATION_TRAINEE',
      permissions: ['ORGANISATION_TRAINEE'],
      redirectTo: '/trainee/campaigns',
    });
  });

  it('creates login sessions from the resolved effective security policy', async () => {
    securityPolicyServiceMock.resolveEffectiveSecurityPolicy.mockResolvedValue({
      ...defaultPolicy,
      rememberMeRequested: true,
      rememberMeAllowed: false,
      rememberMeApplied: false,
      regularSessionSeconds: 7200,
      rememberedSessionSeconds: 604800,
      effectiveSessionSeconds: 7200,
      idleTimeoutMinutes: 10,
    });

    await loginUser({
      email: 'org.trainee@example.test',
      password: 'correct-password',
      rememberMe: true,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
    });

    expect(securityPolicyServiceMock.resolveEffectiveSecurityPolicy).toHaveBeenCalledWith({
      subject: activeSubject,
      rememberMeRequested: true,
    });
    expect(authSessionServiceMock.calculateSessionExpiresAt).toHaveBeenCalledWith({
      rememberMe: false,
      regularSessionSeconds: 7200,
      rememberedSessionSeconds: 604800,
    });
    expect(authSessionServiceMock.issueAuthSession).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        rememberMe: false,
        idleTimeoutMinutes: 10,
        deviceSummary: 'Windows · Chrome',
        locationSummary: null,
      }),
    );
    expect(refreshTokenServiceMock.issueRefreshToken).toHaveBeenCalledWith({
      authSessionId: 'session-1',
      expiresAt: new Date('2026-07-09T10:00:00.000Z'),
    });
  });

  it('revokes remembered sessions on refresh when policy now disallows remember me', async () => {
    refreshTokenServiceMock.validateRefreshToken.mockResolvedValue({
      state: 'VALID',
      token: {
        id: 'refresh-token-1',
        authSessionId: 'session-1',
        authSession: {
          id: 'session-1',
          userId: 'user-1',
          rememberMe: true,
          createdAt: new Date('2026-07-02T10:00:00.000Z'),
          expiresAt: new Date('2026-07-09T10:00:00.000Z'),
          lastActiveAt: new Date(),
          user: {
            id: 'user-1',
            firstName: 'Org',
            lastName: 'Trainee',
            email: 'org.trainee@example.test',
            userType: 'ORGANISATION_TRAINEE',
            authStatus: 'ACTIVE',
            createdAt: new Date('2026-07-02T08:00:00.000Z'),
          },
        },
      },
    });
    securityPolicyServiceMock.resolveEffectiveSecurityPolicy.mockResolvedValue({
      ...defaultPolicy,
      rememberMeAllowed: false,
      rememberMeApplied: false,
    });

    await expect(refreshUserToken('raw-refresh-token')).rejects.toBeInstanceOf(
      AuthRefreshTokenInvalidError,
    );
    expect(authSessionServiceMock.revokeSessionById).toHaveBeenCalledWith({
      sessionId: 'session-1',
      reason: 'OTHER',
    });
    expect(refreshTokenServiceMock.revokeRefreshTokensForSession).toHaveBeenCalledWith({
      authSessionId: 'session-1',
      reason: 'OTHER',
    });
    expect(refreshTokenServiceMock.rotateRefreshToken).not.toHaveBeenCalled();
  });

  it('updates session policy before refresh token rotation', async () => {
    const createdAt = new Date(Date.now() - 60_000);
    const expectedExpiresAt = new Date(createdAt.getTime() + 600 * 1000);
    refreshTokenServiceMock.validateRefreshToken.mockResolvedValue({
      state: 'VALID',
      token: {
        id: 'refresh-token-1',
        authSessionId: 'session-1',
        authSession: {
          id: 'session-1',
          userId: 'user-1',
          rememberMe: true,
          createdAt,
          expiresAt: new Date(createdAt.getTime() + 604800 * 1000),
          lastActiveAt: new Date(),
          user: {
            id: 'user-1',
            firstName: 'Org',
            lastName: 'Trainee',
            email: 'org.trainee@example.test',
            userType: 'ORGANISATION_TRAINEE',
            authStatus: 'ACTIVE',
            createdAt,
          },
        },
      },
    });
    securityPolicyServiceMock.resolveEffectiveSecurityPolicy.mockResolvedValue({
      ...defaultPolicy,
      rememberMeAllowed: true,
      rememberMeApplied: true,
      rememberedSessionSeconds: 600,
      idleTimeoutMinutes: 5,
    });
    refreshTokenServiceMock.rotateRefreshToken.mockResolvedValue({
      state: 'ROTATED',
      rawToken: 'next-refresh-token',
    });

    await refreshUserToken('raw-refresh-token');

    expect(authSessionServiceMock.updateSessionPolicy).toHaveBeenCalledWith({
      sessionId: 'session-1',
      expiresAt: expectedExpiresAt,
      idleTimeoutMinutes: 5,
    });
    expect(authSessionServiceMock.touchSession).toHaveBeenCalledWith('session-1');
    expect(refreshTokenServiceMock.rotateRefreshToken).toHaveBeenCalledWith({
      rawToken: 'raw-refresh-token',
      nextExpiresAt: expectedExpiresAt,
      ipAddress: undefined,
      userAgent: undefined,
    });
  });
});
