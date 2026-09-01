import { beforeEach, describe, expect, it, vi } from 'vitest';
const repoMock = vi.hoisted(() => ({
  createRefreshToken: vi.fn(),
  findRefreshTokenByHash: vi.fn(),
  revokeRefreshToken: vi.fn(),
  revokeSessionRefreshTokens: vi.fn(),
  rotateRefreshTokenRecord: vi.fn(),
}));
const tokenMock = vi.hoisted(() => ({ generateOpaqueToken: vi.fn(), hashOpaqueToken: vi.fn() }));
const sessionMock = vi.hoisted(() => ({
  revokeSessionById: vi.fn(),
  validateAuthSession: vi.fn(),
}));
const auditMock = vi.hoisted(() => ({ recordRefreshTokenReuseDetected: vi.fn() }));
vi.mock('../../src/repositories/refresh-token.repository.js', () => repoMock);
vi.mock('../../src/services/token-hash.service.js', () => tokenMock);
vi.mock('../../src/services/auth-session.service.js', () => sessionMock);
vi.mock('../../src/services/auth-audit.service.js', () => auditMock);
import {
  handleRefreshTokenReuse,
  issueRefreshToken,
  rotateRefreshToken,
  validateRefreshToken,
} from '../../src/services/refresh-token.service.js';
const now = new Date('2026-06-26T10:00:00.000Z');

function refresh(overrides = {}) {
  return {
    id: 'refreshtoken01',
    authSessionId: 'session01',
    tokenHash: 'hash:rawtoken',
    usedAt: null,
    replacedByTokenId: null,
    revokedAt: null,
    expiresAt: new Date('2026-06-26T11:00:00.000Z'),
    authSession: { userId: 'user01' },
    ...overrides,
  };
}

describe('refresh-token service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenMock.generateOpaqueToken.mockReturnValue('rawnexttoken');
    tokenMock.hashOpaqueToken.mockImplementation((token: string) => `hash:${token}`);
    sessionMock.validateAuthSession.mockResolvedValue({ state: 'ACTIVE', session: {} });
  });

  it('issues a refresh token and stores only the hash', async () => {
    repoMock.createRefreshToken.mockResolvedValue({
      id: 'refreshtoken01',
      tokenHash: 'hash:rawnexttoken',
    });
    const result = await issueRefreshToken({ authSessionId: 'session01', expiresAt: now });

    expect(repoMock.createRefreshToken).toHaveBeenCalledWith({
      authSessionId: 'session01',
      expiresAt: now,
      tokenHash: 'hash:rawnexttoken',
    });
    expect(result.rawToken).toBe('rawnexttoken');
  });

  it.each([
    ['REVOKED', 'SESSION_REVOKED'],
    ['MISSING', 'SESSION_REVOKED'],
    ['EXPIRED', 'SESSION_EXPIRED'],
  ] as const)('maps session %s to %s', async (sessionState, expected) => {
    repoMock.findRefreshTokenByHash.mockResolvedValue(refresh());
    sessionMock.validateAuthSession.mockResolvedValue({ state: sessionState });
    await expect(validateRefreshToken({ rawToken: 'rawtoken', now })).resolves.toMatchObject({
      state: expected,
    });
  });

  it.each([
    ['INVALID', null],
    ['REVOKED', refresh({ revokedAt: now })],
    ['EXPIRED', refresh({ expiresAt: now })],
  ] as const)('erturns %s during validation', async (state, token) => {
    repoMock.findRefreshTokenByHash.mockResolvedValue(token);
    await expect(validateRefreshToken({ rawToken: 'rawtoken', now })).resolves.toMatchObject({
      state,
    });
  });

  it('returns VALID for valid and active sessions', async () => {
    const token = refresh();
    repoMock.findRefreshTokenByHash.mockResolvedValue(token);
    await expect(validateRefreshToken({ rawToken: 'rawtoken', now })).resolves.toEqual({
      state: 'VALID',
      token,
    });
    expect(sessionMock.validateAuthSession).toHaveBeenCalledWith({
      sessionId: 'session01',
      now,
      touch: false,
    });
  });

  it('detects reuse for used or replaced refresh tokens', async () => {
    repoMock.findRefreshTokenByHash.mockResolvedValue(refresh({ usedAt: now }));
    await expect(validateRefreshToken({ rawToken: 'rawtoken', now })).resolves.toMatchObject({
      state: 'REUSE_DETECTED',
    });
    expect(repoMock.revokeSessionRefreshTokens).toHaveBeenCalledWith({
      authSessionId: 'session01',
      revokedReason: 'TOKEN_REUSE_DETECTED',
    });
    expect(sessionMock.revokeSessionById).toHaveBeenCalledWith({
      sessionId: 'session01',
      reason: 'TOKEN_REUSE_DETECTED',
    });
  });

  it('rotates a valid refresh token and correctly returns a new raw token', async () => {
    const previousToken = refresh();
    const nextExpiresAt = new Date('2026-06-27T10:00:00.000Z');
    const nextToken = {
      id: 'refreshtoken02',
      authSessionId: 'session01',
      tokenHash: 'hash:rawnexttoken',
      expiresAt: nextExpiresAt,
    };
    repoMock.findRefreshTokenByHash.mockResolvedValue(previousToken);
    sessionMock.validateAuthSession.mockResolvedValue({
      state: 'ACTIVE',
      session: { id: 'session01' },
    });
    repoMock.rotateRefreshTokenRecord.mockResolvedValue(nextToken);

    await expect(rotateRefreshToken({ rawToken: 'rawtoken', nextExpiresAt, now })).resolves.toEqual(
      {
        state: 'ROTATED',
        rawToken: 'rawnexttoken',
        token: nextToken,
        previousTokenId: 'refreshtoken01',
      },
    );
    expect(repoMock.rotateRefreshTokenRecord).toHaveBeenCalledWith({
      previousTokenId: 'refreshtoken01',
      authSessionId: 'session01',
      nextTokenHash: 'hash:rawnexttoken',
      nextExpiresAt,
    });
  });

  it('trats failed rotation claims as token reuse', async () => {
    repoMock.findRefreshTokenByHash.mockResolvedValue(refresh());
    repoMock.rotateRefreshTokenRecord.mockResolvedValue(null);
    await expect(
      rotateRefreshToken({ rawToken: 'raw', nextExpiresAt: new Date('2026-06-27'), now }),
    ).resolves.toMatchObject({ state: 'REUSE_DETECTED' });
  });

  it('handles refresh token reuse boundary', async () => {
    await handleRefreshTokenReuse('session01', 'refresh01', {
      userId: 'user01',
      ipAddress: '127.0.0.1',
      userAgent: 'TestAgent',
    });
    expect(auditMock.recordRefreshTokenReuseDetected).toHaveBeenCalledWith({
      userId: 'user01',
      authSessionId: 'session01',
      refreshTokenId: 'refresh01',
      metadata: { ipAddress: '127.0.0.1', userAgent: 'TestAgent' },
    });
  });
}); //describe
