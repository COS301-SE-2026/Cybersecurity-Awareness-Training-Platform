import { beforeEach, describe, expect, it, vi } from 'vitest';
const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  refreshToken: {
    create: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
}));
vi.mock('../../src/lib/prisma.js', () => ({ prisma: prismaMock }));
import {
  createRefreshToken,
  revokeRefreshToken,
  revokeSessionRefreshTokens,
  rotateRefreshTokenRecord,
} from '../../src/repositories/refresh-token.repository.js';
const tx = { refreshToken: { create: vi.fn(), updateMany: vi.fn() } };

describe('refresh-token repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((fn) => fn(tx));
  });

  it('create a refresh token with a hash', async () => {
    await createRefreshToken({
      authSessionId: 'session01',
      tokenHash: 'tokenhash01',
      expiresAt: new Date('2026-06-26'),
    });
    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
      data: {
        authSessionId: 'session01',
        tokenHash: 'tokenhash01',
        expiresAt: new Date('2026-06-26'),
      },
    });
  });

  it('revokes one refresh token', async () => {
    await revokeRefreshToken({ id: 'refreshtoken01', revokedReason: 'LOGOUT' });
    expect(prismaMock.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'refreshtoken01' },
      data: { revokedAt: expect.any(Date), revokedReason: 'LOGOUT' },
    });
  });

  it('revokes active refresh tokens for a session', async () => {
    await revokeSessionRefreshTokens({
      authSessionId: 'session01',
      revokedReason: 'TOKEN_REUSE_DETECTED',
    });
    expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { authSessionId: 'session01', revokedAt: null },
      data: { revokedAt: expect.any(Date), revokedReason: 'TOKEN_REUSE_DETECTED' },
    });
  });

  it('atomically claims a previous token and uses it to create the next token', async () => {
    tx.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    tx.refreshToken.create.mockResolvedValue({ id: 'refreshtoken02' });
    await expect(
      rotateRefreshTokenRecord({
        previousTokenId: 'refreshtoken01',
        authSessionId: 'session01',
        nextTokenHash: 'tokenhash02',
        nextExpiresAt: new Date('2026-06-27'),
      }),
    ).resolves.toEqual({ id: 'refreshtoken02' });
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'refreshtoken01',
        authSessionId: 'session01',
        usedAt: null,
        revokedAt: null,
        replacedByTokenId: null,
      },
      data: {
        usedAt: expect.any(Date),
        revokedAt: expect.any(Date),
        revokedReason: 'ROTATED',
        replacedByTokenId: expect.any(String),
      },
    });
    expect(tx.refreshToken.create).toHaveBeenCalledWith({
      data: {
        id: expect.any(String),
        authSessionId: 'session01',
        tokenHash: 'tokenhash02',
        expiresAt: new Date('2026-06-27'),
      },
    });
  });
  it('return null and doesnt create a new token when the transaction claim fails', async () => {
    tx.refreshToken.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      rotateRefreshTokenRecord({
        previousTokenId: 'refreshtoken01',
        authSessionId: 'session01',
        nextTokenHash: 'hash02',
        nextExpiresAt: new Date('2026-06-27'),
      }),
    ).resolves.toBeNull();
  });
  expect(tx.refreshToken.create).not.toHaveBeenCalled();
}); //describe
