import { beforeEach, describe, expect, it, vi } from 'vitest';
const repoMock = vi.hoisted(() => ({
  createAuthSession: vi.fn(),
  findAuthSessionById: vi.fn(),
  revokeAuthSession: vi.fn(),
  revokeUserAuthSessions: vi.fn(),
  touchAuthSession: vi.fn(),
  updateAuthSessionPolicy: vi.fn(),
}));
vi.mock('../../src/repositories/auth-session.repository.js', () => repoMock);
import {
  calculateSessionExpiresAt,
  issueAuthSession,
  revokeSessionById,
  revokeSessionsForUser,
  updateSessionPolicy,
  validateAuthSession,
} from '../../src/services/auth-session.service.js';
const now = new Date('2026-06-26T10:00:00.000Z');
function session(overrides = {}) {
  return {
    id: 'session01',
    userId: 'user01',
    revokedAt: null,
    expiresAt: new Date('2026-06-26T11:00:00.000Z'),
    lastActiveAt: new Date('2026-06-26T10:00:00.000Z'),
    idleTimeoutMinutes: null,
    ...overrides,
  };
}
import type { AuthSessionRevokedReason } from '../../src/generated/prisma/enums.js';

describe('auth-session serivce', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calculates regular and remembered expiry correctly', () => {
    expect(
      calculateSessionExpiresAt({
        now,
        rememberMe: false,
        regularSessionSeconds: 60,
        rememberedSessionSeconds: 120,
      }).toISOString(),
    ).toBe('2026-06-26T10:01:00.000Z');
    expect(
      calculateSessionExpiresAt({
        now,
        rememberMe: true,
        regularSessionSeconds: 60,
        rememberedSessionSeconds: 120,
      }).toISOString(),
    ).toBe('2026-06-26T10:02:00.000Z');
  });

  it.each([
    ['MISSING', null],
    ['REVOKED', session({ revokedAt: now })],
    ['EXPIRED', session({ expiresAt: now })],
  ] as const)('return %s for invalid sessions', async (state, value) => {
    repoMock.findAuthSessionById.mockResolvedValue(value);
    await expect(validateAuthSession({ sessionId: 'session01', now })).resolves.toMatchObject({
      state,
    });
    expect(repoMock.touchAuthSession).not.toHaveBeenCalled();
  });

  it('returns active and touches despite old request activty', async () => {
    const active = session({
      idleTimeoutMinutes: 5,
      lastActiveAt: new Date('2026-06-26T09:00:00.000Z'),
    });
    repoMock.findAuthSessionById.mockResolvedValue(active);
    await expect(validateAuthSession({ sessionId: 'session01', now })).resolves.toEqual({
      state: 'ACTIVE',
      session: active,
    });
    expect(repoMock.touchAuthSession).toHaveBeenCalledWith('session01');
  });

  it('does not touch when you set touch to false', async () => {
    repoMock.findAuthSessionById.mockResolvedValue(session());
    await validateAuthSession({ sessionId: 'session01', now, touch: false });
    expect(repoMock.touchAuthSession).not.toHaveBeenCalled();
  });

  it('delegates issue and revocation helpers', async () => {
    const logoutReason: AuthSessionRevokedReason = 'LOGOUT';
    const passwordChangedReason: AuthSessionRevokedReason = 'PASSWORD_CHANGE';
    await issueAuthSession({ userId: 'user01', rememberMe: false, expiresAt: now });
    expect(repoMock.createAuthSession).toHaveBeenCalled();
    await revokeSessionById({ sessionId: 'session01', reason: logoutReason });
    expect(repoMock.revokeAuthSession).toHaveBeenCalledWith({
      id: 'session01',
      revokedReason: 'LOGOUT',
    });
    await revokeSessionsForUser({
      userId: 'user01',
      reason: passwordChangedReason,
      exceptSessionId: 'session02',
    });
    expect(repoMock.revokeUserAuthSessions).toHaveBeenCalledWith({
      userId: 'user01',
      revokedReason: 'PASSWORD_CHANGE',
      exceptSessionId: 'session02',
    });
  });

  it('delegates policy updates to the repository', async () => {
    const expiresAt = new Date('2026-06-26T10:30:00.000Z');

    await updateSessionPolicy({
      sessionId: 'session01',
      expiresAt,
      idleTimeoutMinutes: 5,
    });

    expect(repoMock.updateAuthSessionPolicy).toHaveBeenCalledWith({
      id: 'session01',
      expiresAt,
      idleTimeoutMinutes: 5,
    });
  });
}); //describe
