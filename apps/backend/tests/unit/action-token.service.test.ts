import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  consumeActionToken,
  issueActionToken,
  revokeActionTokenById,
  validateActionToken,
} from '../../src/services/action-token.service.js';

const repositoryMock = vi.hoisted(() => ({
  createActionToken: vi.fn(),
  findActionTokenByHash: vi.fn(),
  markActionTokenUsed: vi.fn(),
  revokeActionToken: vi.fn(),
  withClaimedActionToken: vi.fn(),
}));

const tokenHashServiceMock = vi.hoisted(() => ({
  generateOpaqueToken: vi.fn(),
  hashOpaqueToken: vi.fn(),
}));

import type { Prisma } from '../../src/generated/prisma/client.js';

vi.mock('../../src/repositories/action-token.repository.js', () => repositoryMock);
vi.mock('../../src/services/token-hash.service.js', () => tokenHashServiceMock);

describe('action-token service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenHashServiceMock.generateOpaqueToken.mockReturnValue('rawactiontoken');
    tokenHashServiceMock.hashOpaqueToken.mockImplementation((token: string) => `hash:${token}`);
  });

  it('issues an opaque action token and only stores the hash', async () => {
    repositoryMock.createActionToken.mockResolvedValue({
      id: 'actiontoken01',
      tokenHash: 'hash:rawactiontoken',
      purpose: 'EMAIL_VERIFICATION',
      userId: 'user01',
      targetEmail: 'user@example.com',
      expiresAt: new Date('2026-06-24'),
      usedAt: null,
      revokedAt: null,
    });

    const result = await issueActionToken({
      purpose: 'EMAIL_VERIFICATION',
      userId: 'user01',
      targetEmail: 'user@example.com',
      expiresAt: new Date('2026-06-24'),
    });

    expect(tokenHashServiceMock.generateOpaqueToken).toHaveBeenCalledTimes(1);
    expect(tokenHashServiceMock.hashOpaqueToken).toHaveBeenCalledWith('rawactiontoken');
    expect(repositoryMock.createActionToken).toHaveBeenCalledWith({
      purpose: 'EMAIL_VERIFICATION',
      userId: 'user01',
      targetEmail: 'user@example.com',
      expiresAt: new Date('2026-06-24'),
      tokenHash: 'hash:rawactiontoken',
    });

    expect(result.rawToken).toBe('rawactiontoken');
    expect(result.token.tokenHash).toBe('hash:rawactiontoken');
    expect(result.token.tokenHash).not.toBe(result.rawToken);
  }); //it

  it('validates a useable token for the expecte purpose', async () => {
    const token = {
      id: 'actiontoken01',
      tokenHash: 'hash:rawactiontoken',
      purpose: 'EMAIL_VERIFICATION',
      expiresAt: new Date('2026-06-25'),
      usedAt: null,
      revokedAt: null,
    };

    repositoryMock.findActionTokenByHash.mockResolvedValue(token);

    const result = await validateActionToken({
      rawToken: 'rawactiontoken',
      expectedPurpose: 'EMAIL_VERIFICATION',
      now: new Date('2026-06-24'),
    });

    expect(repositoryMock.findActionTokenByHash).toHaveBeenCalledWith('hash:rawactiontoken');
    expect(result).toEqual({ state: 'VALID', token });
  }); //it

  it('returns INVALID when the token hash isnt found', async () => {
    repositoryMock.findActionTokenByHash.mockResolvedValue(null);

    await expect(
      validateActionToken({ rawToken: 'missingtoken', expectedPurpose: 'EMAIL_VERIFICATION' }),
    ).resolves.toEqual({ state: 'INVALID' });
  }); //it

  it('returns WRONG_PURPOSE when the token purpose dont match', async () => {
    const token = {
      id: 'actiontoken01',
      purpose: 'PASSWORD_RESET',
      expiresAt: new Date('2026-06-24'),
      usedAt: null,
      revokedAt: null,
    };

    repositoryMock.findActionTokenByHash.mockResolvedValue(token);

    await expect(
      validateActionToken({ rawToken: 'rawactiontoken', expectedPurpose: 'EMAIL_VERIFICATION' }),
    ).resolves.toEqual({ state: 'WRONG_PURPOSE', token });
  }); //it

  it('returns REVOKED when the token has been revoked', async () => {
    const token = {
      id: 'actiontoken01',
      purpose: 'EMAIL_VERIFICATION',
      expiresAt: new Date('2026-06-24'),
      usedAt: null,
      revokedAt: new Date('2026-06-24'),
    };

    repositoryMock.findActionTokenByHash.mockResolvedValue(token);

    await expect(
      validateActionToken({ rawToken: 'rawactiontoken', expectedPurpose: 'EMAIL_VERIFICATION' }),
    ).resolves.toEqual({ state: 'REVOKED', token });
  }); //it

  it('returns USED when the token has been consumed', async () => {
    const token = {
      id: 'actiontoken01',
      purpose: 'EMAIL_VERIFICATION',
      expiresAt: new Date('2026-06-24'),
      revokedAt: null,
      usedAt: new Date('2026-06-24'),
    };

    repositoryMock.findActionTokenByHash.mockResolvedValue(token);

    await expect(
      validateActionToken({ rawToken: 'rawactiontoken', expectedPurpose: 'EMAIL_VERIFICATION' }),
    ).resolves.toEqual({ state: 'USED', token });
  }); //it

  it('returns EXPIRED when the token expiry date has passed', async () => {
    const token = {
      id: 'actiontoken01',
      purpose: 'EMAIL_VERIFICATION',
      expiresAt: new Date('2026-06-24'),
      revokedAt: null,
      usedAt: null,
    };

    repositoryMock.findActionTokenByHash.mockResolvedValue(token);

    await expect(
      validateActionToken({
        rawToken: 'rawactiontoken',
        expectedPurpose: 'EMAIL_VERIFICATION',
        now: new Date('2026-06-25'),
      }),
    ).resolves.toEqual({ state: 'EXPIRED', token });
  }); //it

  it('marks a token as used when consumed is called', async () => {
    repositoryMock.markActionTokenUsed.mockResolvedValue({
      id: 'actiontoken01',
      usedAt: new Date('2026-06-24'),
    });

    await consumeActionToken({ tokenId: 'actiontoken01' });

    expect(repositoryMock.markActionTokenUsed).toHaveBeenCalledWith('actiontoken01');
  }); //it

  it('revokes a token with a reason', async () => {
    repositoryMock.revokeActionToken.mockResolvedValue({
      id: 'actiontoken01',
      revokedReason: 'newtokengenerated',
    });

    await revokeActionTokenById({ tokenId: 'actiontoken01', reason: 'newtokengenerated' });

    expect(repositoryMock.revokeActionToken).toHaveBeenCalledWith({
      id: 'actiontoken01',
      revokedReason: 'newtokengenerated',
    });
  });

  it('returns consumed false when the token claim is stail', async () => {
    repositoryMock.markActionTokenUsed.mockResolvedValue(false);
    await expect(consumeActionToken({ tokenId: 'actiontoken01' })).resolves.toEqual({
      consumed: false,
      state: 'USED_OR_REVOKED',
    });
  });

  it('passes a transaction client when issuing inside a transaction', async () => {
    const tx = { actionToken: { create: vi.fn() } };
    repositoryMock.createActionToken.mockResolvedValue({ id: 'actiontoken01' });
    await issueActionToken(
      { purpose: 'EMAIL_VERIFICATION', userId: 'user01', expiresAt: new Date('2026-06-26') },
      tx as unknown as Prisma.TransactionClient,
    );

    expect(repositoryMock.createActionToken).toHaveBeenCalledWith(
      {
        purpose: 'EMAIL_VERIFICATION',
        userId: 'user01',
        expiresAt: new Date('2026-06-26'),
        tokenHash: 'hash:rawactiontoken',
      },
      tx,
    );
  });

  it('delegates runWithConsumedActionToken to the repository helper', async () => {
    const action = vi.fn();
    repositoryMock.withClaimedActionToken = vi
      .fn()
      .mockResolvedValue({ claimed: true, result: 111 });
    const { runWithConsumedActionToken } =
      await import('../../src/services/action-token.service.js');
    await runWithConsumedActionToken({ tokenId: 'actiontoken01' }, action);
    expect(repositoryMock.withClaimedActionToken).toHaveBeenCalledWith(
      { tokenId: 'actiontoken01' },
      action,
    );
  });
}); //describe
