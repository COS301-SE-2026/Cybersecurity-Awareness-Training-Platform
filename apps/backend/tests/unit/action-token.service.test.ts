import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  consumeActionToken,
  issueActionToken,
  revokeActionTokenById,
  validateActionToken,
  getTokenContext,
  resendActionToken,
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

const authEmailHookServiceMock = vi.hoisted(() => ({
  requestAuthEmailSend: vi.fn(),
}));

const notificationFailureEventMock = vi.hoisted(() => ({
  recordNotificationFailureEvent: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  actionToken: {
    findUnique: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
  invitation: {
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
  emailDeliveryLog: {
    findFirst: vi.fn(),
  },
}));

import type { Prisma } from '../../src/generated/prisma/client.js';

vi.mock('../../src/repositories/action-token.repository.js', () => repositoryMock);
vi.mock('../../src/services/token-hash.service.js', () => tokenHashServiceMock);
vi.mock('../../src/services/auth-email-hook.service.js', () => authEmailHookServiceMock);
vi.mock(
  '../../src/services/notification-failure-event.service.js',
  () => notificationFailureEventMock,
);
vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

const acceptedAuthEmailResult = {
  status: 'ACCEPTED' as const,
  acceptedByProvider: true as const,
  queued: true as const,
  deliveryLogId: 'email-log-1',
  providerMessageId: 'provider-message-1',
};

const acceptedPersistenceFailedAuthEmailResult = {
  status: 'ACCEPTED_PERSISTENCE_FAILED' as const,
  acceptedByProvider: true as const,
  queued: true as const,
  deliveryLogId: 'email-log-1',
  providerMessageId: 'provider-message-1',
  reason: 'EMAIL_PERSISTENCE_FAILED' as const,
  persistenceFailures: [
    {
      stage: 'DELIVERY_LOG_SENT' as const,
      code: 'DELIVERY_LOG_SENT_WRITE_FAILED' as const,
    },
  ],
  persistenceFailureReason: 'DELIVERY_LOG_SENT_WRITE_FAILED',
};

const notAcceptedAuthEmailResult = {
  status: 'NOT_ACCEPTED' as const,
  acceptedByProvider: false as const,
  queued: false as const,
  deliveryLogId: 'email-log-1',
  reason: 'EMAIL_SEND_FAILED' as const,
};

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
    repositoryMock.withClaimedActionToken.mockResolvedValue({ claimed: true, result: 111 });
    const { runWithConsumedActionToken } =
      await import('../../src/services/action-token.service.js');
    await runWithConsumedActionToken({ tokenId: 'actiontoken01' }, action);
    expect(repositoryMock.withClaimedActionToken).toHaveBeenCalledWith(
      { tokenId: 'actiontoken01' },
      action,
    );
  });

  describe('getTokenContext and resendActionToken', () => {
    beforeEach(() => {
      prismaMock.$transaction.mockImplementation((action) => action(prismaMock));
    });

    it('returns INVALID for missing token', async () => {
      prismaMock.actionToken.findUnique.mockResolvedValue(null);
      const res = await getTokenContext('some-missing-token');
      expect(res.tokenState).toBe('INVALID');
      expect(res.canResend).toBe(false);
    });

    it('returns VALID context and computes resend capability for active password reset token', async () => {
      prismaMock.actionToken.findUnique.mockResolvedValue({
        id: 'token-123',
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        revokedAt: null,
        user: { authStatus: 'ACTIVE', email: 'test@example.com' },
      });
      prismaMock.emailDeliveryLog.findFirst.mockResolvedValue(null);

      const res = await getTokenContext('some-token');
      expect(res.tokenState).toBe('VALID');
      expect(res.canResend).toBe(true);
      expect(res.resendCooldownSeconds).toBe(0);
    });

    it('computes cooldown remaining if email was recently sent', async () => {
      prismaMock.actionToken.findUnique.mockResolvedValue({
        id: 'token-123',
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        revokedAt: null,
        user: { authStatus: 'ACTIVE', email: 'test@example.com' },
      });
      prismaMock.emailDeliveryLog.findFirst.mockResolvedValue({
        createdAt: new Date(Date.now() - 20000), // 20s ago
      });

      const res = await getTokenContext('some-token');
      expect(res.resendCooldownSeconds).toBeGreaterThan(30);
      expect(res.resendCooldownSeconds).toBeLessThanOrEqual(40);
    });

    it('resends token successfully if eligible and not on cooldown', async () => {
      prismaMock.actionToken.findUnique.mockResolvedValue({
        id: 'token-123',
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() - 3600000), // expired
        usedAt: null,
        revokedAt: null,
        user: {
          id: 'user-123',
          authStatus: 'ACTIVE',
          email: 'test@example.com',
          firstName: 'John',
        },
      });
      prismaMock.emailDeliveryLog.findFirst.mockResolvedValue(null);
      repositoryMock.createActionToken.mockResolvedValue({
        id: 'token-456',
        expiresAt: new Date(Date.now() + 3600000),
      });
      authEmailHookServiceMock.requestAuthEmailSend.mockResolvedValue(acceptedAuthEmailResult);

      await resendActionToken('some-token');

      expect(prismaMock.actionToken.updateMany).toHaveBeenCalled();
      expect(repositoryMock.createActionToken).toHaveBeenCalled();
      expect(authEmailHookServiceMock.requestAuthEmailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          emailType: 'PASSWORD_RESET',
          recipientEmail: 'test@example.com',
        }),
      );
    });

    it('keeps a replacement token active when resend email persistence fails after acceptance', async () => {
      prismaMock.actionToken.findUnique.mockResolvedValue({
        id: 'token-123',
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() - 3600000),
        usedAt: null,
        revokedAt: null,
        user: {
          id: 'user-123',
          authStatus: 'ACTIVE',
          email: 'test@example.com',
          firstName: 'John',
        },
      });
      prismaMock.emailDeliveryLog.findFirst.mockResolvedValue(null);
      repositoryMock.createActionToken.mockResolvedValue({
        id: 'token-456',
        expiresAt: new Date(Date.now() + 3600000),
      });
      authEmailHookServiceMock.requestAuthEmailSend.mockResolvedValue(
        acceptedPersistenceFailedAuthEmailResult,
      );

      await resendActionToken('some-token');

      expect(prismaMock.actionToken.updateMany).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'token-456' }),
          data: expect.objectContaining({ revokedReason: 'EMAIL_SEND_FAILED' }),
        }),
      );
    });

    it('revokes the replacement token when resend email is explicitly not accepted', async () => {
      prismaMock.actionToken.findUnique.mockResolvedValue({
        id: 'token-123',
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() - 3600000),
        usedAt: null,
        revokedAt: null,
        user: {
          id: 'user-123',
          authStatus: 'ACTIVE',
          email: 'test@example.com',
          firstName: 'John',
        },
      });
      prismaMock.emailDeliveryLog.findFirst.mockResolvedValue(null);
      repositoryMock.createActionToken.mockResolvedValue({
        id: 'token-456',
        expiresAt: new Date(Date.now() + 3600000),
      });
      authEmailHookServiceMock.requestAuthEmailSend.mockResolvedValue(notAcceptedAuthEmailResult);

      await resendActionToken('some-token');

      expect(prismaMock.actionToken.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'token-456',
          usedAt: null,
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
          revokedReason: 'EMAIL_SEND_FAILED',
        },
      });
    });

    it('returns successfully and keeps the replacement token active when resend notification throws', async () => {
      prismaMock.actionToken.findUnique.mockResolvedValue({
        id: 'token-123',
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() - 3600000),
        usedAt: null,
        revokedAt: null,
        user: {
          id: 'user-123',
          authStatus: 'ACTIVE',
          email: 'test@example.com',
          firstName: 'John',
        },
      });
      prismaMock.emailDeliveryLog.findFirst.mockResolvedValue(null);
      repositoryMock.createActionToken.mockResolvedValue({
        id: 'token-456',
        expiresAt: new Date(Date.now() + 3600000),
      });
      authEmailHookServiceMock.requestAuthEmailSend.mockRejectedValueOnce(
        new Error('raw provider failure'),
      );

      await expect(resendActionToken('some-token')).resolves.toBeUndefined();

      expect(prismaMock.actionToken.updateMany).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'token-456' }),
          data: expect.objectContaining({ revokedReason: 'EMAIL_SEND_FAILED' }),
        }),
      );
      expect(notificationFailureEventMock.recordNotificationFailureEvent).toHaveBeenCalledWith(
        'ACTION_TOKEN_RESEND_NOTIFICATION_FAILED',
      );
    });

    it('throws TokenResendError if resend cooldown is active', async () => {
      prismaMock.actionToken.findUnique.mockResolvedValue({
        id: 'token-123',
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() - 3600000),
        usedAt: null,
        revokedAt: null,
        user: { authStatus: 'ACTIVE', email: 'test@example.com' },
      });
      prismaMock.emailDeliveryLog.findFirst.mockResolvedValue({
        createdAt: new Date(Date.now() - 20000),
      });

      await expect(resendActionToken('some-token')).rejects.toThrowError(
        'Resend cooldown active. Please try again later.',
      );
    });

    it('returns canResend: false for USED password reset tokens', async () => {
      prismaMock.actionToken.findUnique.mockResolvedValue({
        id: 'token-123',
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: new Date(),
        revokedAt: null,
        user: { authStatus: 'ACTIVE', email: 'test@example.com' },
      });

      const res = await getTokenContext('some-token');
      expect(res.tokenState).toBe('USED');
      expect(res.canResend).toBe(false);
    });

    it('returns canResend: false for REVOKED password reset tokens', async () => {
      prismaMock.actionToken.findUnique.mockResolvedValue({
        id: 'token-123',
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        revokedAt: new Date(),
        user: { authStatus: 'ACTIVE', email: 'test@example.com' },
      });

      const res = await getTokenContext('some-token');
      expect(res.tokenState).toBe('REVOKED');
      expect(res.canResend).toBe(false);
    });

    it('throws TokenResendError and does not resend if token is USED', async () => {
      prismaMock.actionToken.findUnique.mockResolvedValue({
        id: 'token-123',
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: new Date(),
        revokedAt: null,
        user: { authStatus: 'ACTIVE', email: 'test@example.com' },
      });

      await expect(resendActionToken('some-token')).rejects.toThrowError(
        'Token cannot be resent safely',
      );

      expect(prismaMock.actionToken.updateMany).not.toHaveBeenCalled();
      expect(repositoryMock.createActionToken).not.toHaveBeenCalled();
      expect(authEmailHookServiceMock.requestAuthEmailSend).not.toHaveBeenCalled();
    });

    it('throws TokenResendError and does not resend if token is REVOKED', async () => {
      prismaMock.actionToken.findUnique.mockResolvedValue({
        id: 'token-123',
        purpose: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
        revokedAt: new Date(),
        user: { authStatus: 'ACTIVE', email: 'test@example.com' },
      });

      await expect(resendActionToken('some-token')).rejects.toThrowError(
        'Token cannot be resent safely',
      );

      expect(prismaMock.actionToken.updateMany).not.toHaveBeenCalled();
      expect(repositoryMock.createActionToken).not.toHaveBeenCalled();
      expect(authEmailHookServiceMock.requestAuthEmailSend).not.toHaveBeenCalled();
    });

    it('throws TokenResendError if the token becomes invalid inside the transaction (stale check)', async () => {
      prismaMock.actionToken.findUnique
        .mockResolvedValueOnce({
          id: 'token-123',
          purpose: 'PASSWORD_RESET',
          expiresAt: new Date(Date.now() + 3600000),
          usedAt: null,
          revokedAt: null,
          user: {
            id: 'user-123',
            authStatus: 'ACTIVE',
            email: 'test@example.com',
            firstName: 'John',
          },
        })
        .mockResolvedValueOnce({
          id: 'token-123',
          purpose: 'PASSWORD_RESET',
          expiresAt: new Date(Date.now() + 3600000),
          usedAt: null,
          revokedAt: null,
          user: {
            id: 'user-123',
            authStatus: 'ACTIVE',
            email: 'test@example.com',
            firstName: 'John',
          },
        })
        .mockResolvedValueOnce({
          id: 'token-123',
          purpose: 'PASSWORD_RESET',
          expiresAt: new Date(Date.now() + 3600000),
          usedAt: new Date(),
          revokedAt: null,
          user: {
            id: 'user-123',
            authStatus: 'ACTIVE',
            email: 'test@example.com',
            firstName: 'John',
          },
        });

      prismaMock.actionToken.updateMany.mockResolvedValueOnce({ count: 0 });
      prismaMock.emailDeliveryLog.findFirst.mockResolvedValue(null);

      await expect(resendActionToken('some-token')).rejects.toThrowError(
        'Token has already been used or replaced concurrently.',
      );

      expect(prismaMock.actionToken.updateMany).toHaveBeenCalled();
      expect(repositoryMock.createActionToken).not.toHaveBeenCalled();
      expect(authEmailHookServiceMock.requestAuthEmailSend).not.toHaveBeenCalled();
    });
  });
}); //describe
