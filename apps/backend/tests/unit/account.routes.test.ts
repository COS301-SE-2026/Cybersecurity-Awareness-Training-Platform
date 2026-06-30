import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  actionToken: {
    updateMany: vi.fn(),
  },
  authSession: {
    updateMany: vi.fn(),
  },
  refreshToken: {
    updateMany: vi.fn(),
  },
  auditLogEntry: {
    create: vi.fn().mockResolvedValue({ id: 'audit-123' }),
  },
}));

const actionTokenServiceMock = vi.hoisted(() => ({
  validateActionToken: vi.fn(),
}));

const authEmailHookServiceMock = vi.hoisted(() => ({
  requestAuthEmailSend: vi.fn(),
}));

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../../src/services/action-token.service.js', () => actionTokenServiceMock);
vi.mock('../../src/services/auth-email-hook.service.js', () => authEmailHookServiceMock);

describe('Account routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((action) => action(prismaMock));
  });

  describe('POST /account/verify-email-change', () => {
    it('completes verified email change and returns 200 OK with VALID state', async () => {
      actionTokenServiceMock.validateActionToken.mockResolvedValue({
        state: 'VALID',
        token: { id: 'token-123', userId: 'user-1', targetEmail: 'new@example.com' },
      });
      prismaMock.user.findUnique.mockImplementation(async ({ where }) => {
        if (where.id === 'user-1') {
          return { id: 'user-1', email: 'old@example.com', authStatus: 'ACTIVE', userType: 'GENERAL_TRAINEE' };
        }
        return null;
      });
      prismaMock.actionToken.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.user.update.mockResolvedValue({});

      const response = await request(createApp())
        .post('/account/verify-email-change')
        .send({ token: 'validEmailChangeTokenWithAtLeast32Chars' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ state: 'VALID' });
      expect(prismaMock.user.update).toHaveBeenCalled();
      expect(authEmailHookServiceMock.requestAuthEmailSend).toHaveBeenCalledTimes(2);
    });

    it('returns 409 Conflict if new email address is already in use', async () => {
      actionTokenServiceMock.validateActionToken.mockResolvedValue({
        state: 'VALID',
        token: { id: 'token-123', userId: 'user-1', targetEmail: 'taken@example.com' },
      });
      prismaMock.user.findUnique.mockImplementation(async ({ where }) => {
        if (where.id === 'user-1') {
          return { id: 'user-1', email: 'old@example.com', authStatus: 'ACTIVE', userType: 'GENERAL_TRAINEE' };
        }
        if (where.email === 'taken@example.com') {
          return { id: 'another-user', email: 'taken@example.com' };
        }
        return null;
      });

      const response = await request(createApp())
        .post('/account/verify-email-change')
        .send({ token: 'validEmailChangeTokenWithAtLeast32Chars' });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('AUTH_EMAIL_EXISTS');
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('returns state response for invalid/expired tokens', async () => {
      actionTokenServiceMock.validateActionToken.mockResolvedValue({
        state: 'EXPIRED',
      });

      const response = await request(createApp())
        .post('/account/verify-email-change')
        .send({ token: 'expiredEmailChangeTokenWithAtLeast32Chars' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ state: 'EXPIRED' });
    });
  });
});
