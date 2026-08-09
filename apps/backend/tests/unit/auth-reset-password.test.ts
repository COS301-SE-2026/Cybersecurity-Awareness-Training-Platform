import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { clearAuthRateLimitStore } from '../../src/middleware/authRateLimit.js';

const userRepositoryMock = vi.hoisted(() => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
}));

const actionTokenServiceMock = vi.hoisted(() => {
  class MockTokenResendError extends Error {
    constructor(
      public readonly statusCode: number,
      public readonly code: string,
      message: string,
      public readonly cooldownSeconds?: number,
    ) {
      super(message);
      this.name = 'TokenResendError';
    }
  }

  return {
    issueActionToken: vi.fn(),
    validateActionToken: vi.fn(),
    getTokenContext: vi.fn(),
    resendActionToken: vi.fn(),
    TokenResendError: MockTokenResendError,
  };
});

const authEmailHookServiceMock = vi.hoisted(() => ({
  requestAuthEmailSend: vi.fn(),
}));

const passwordServiceMock = vi.hoisted(() => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  actionToken: {
    updateMany: vi.fn(),
  },
  user: {
    update: vi.fn(),
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

vi.mock('../../src/repositories/user.repository.js', () => userRepositoryMock);
vi.mock('../../src/services/action-token.service.js', () => actionTokenServiceMock);
vi.mock('../../src/services/auth-email-hook.service.js', () => authEmailHookServiceMock);
vi.mock('../../src/services/password.service.js', () => passwordServiceMock);
vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

describe('Forgot Password and Reset Password API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAuthRateLimitStore();
    prismaMock.$transaction.mockImplementation((action) => action(prismaMock));
  });

  describe('POST /auth/forgot-password', () => {
    it('returns 200 and sends reset email for active, eligible users', async () => {
      userRepositoryMock.findUserByEmail.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        authStatus: 'ACTIVE',
        userType: 'GENERAL_TRAINEE',
      });

      prismaMock.actionToken.updateMany.mockResolvedValue({ count: 1 });
      actionTokenServiceMock.issueActionToken.mockResolvedValue({
        rawToken: 'raw-token-12345678901234567890123456789012',
        token: {
          id: 'token-123',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      authEmailHookServiceMock.requestAuthEmailSend.mockResolvedValue({
        status: 'ACCEPTED',
        acceptedByProvider: true,
        queued: true,
        deliveryLogId: 'log-123',
      });

      const response = await request(createApp())
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        'message',
        'If the email is registered, a password reset link has been queued for delivery.',
      );
      expect(userRepositoryMock.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(actionTokenServiceMock.issueActionToken).toHaveBeenCalled();
      expect(authEmailHookServiceMock.requestAuthEmailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          emailType: 'PASSWORD_RESET',
          recipientEmail: 'test@example.com',
          userId: 'user-123',
        }),
      );
    });

    it('returns 200 and does NOT send reset email if user does not exist (enumeration safe)', async () => {
      userRepositoryMock.findUserByEmail.mockResolvedValue(null);

      const response = await request(createApp())
        .post('/auth/forgot-password')
        .send({ email: 'missing@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        'message',
        'If the email is registered, a password reset link has been queued for delivery.',
      );
      expect(actionTokenServiceMock.issueActionToken).not.toHaveBeenCalled();
      expect(authEmailHookServiceMock.requestAuthEmailSend).not.toHaveBeenCalled();
    });

    it('returns the generic response when reset email hook rejects for an eligible user', async () => {
      userRepositoryMock.findUserByEmail.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        authStatus: 'ACTIVE',
        userType: 'GENERAL_TRAINEE',
      });
      prismaMock.actionToken.updateMany.mockResolvedValue({ count: 1 });
      actionTokenServiceMock.issueActionToken.mockResolvedValue({
        rawToken: 'raw-token-12345678901234567890123456789012',
        token: {
          id: 'token-123',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      authEmailHookServiceMock.requestAuthEmailSend.mockRejectedValueOnce(
        new Error('unexpected hook failure'),
      );

      const response = await request(createApp())
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        'message',
        'If the email is registered, a password reset link has been queued for delivery.',
      );
      expect(actionTokenServiceMock.issueActionToken).toHaveBeenCalled();
      expect(authEmailHookServiceMock.requestAuthEmailSend).toHaveBeenCalled();
    });

    it('returns 200 and does NOT send reset email if user is disabled (enumeration safe)', async () => {
      userRepositoryMock.findUserByEmail.mockResolvedValue({
        id: 'user-disabled',
        email: 'disabled@example.com',
        authStatus: 'DISABLED',
        userType: 'GENERAL_TRAINEE',
      });

      const response = await request(createApp())
        .post('/auth/forgot-password')
        .send({ email: 'disabled@example.com' });

      expect(response.status).toBe(200);
      expect(actionTokenServiceMock.issueActionToken).not.toHaveBeenCalled();
      expect(authEmailHookServiceMock.requestAuthEmailSend).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid email input', async () => {
      const response = await request(createApp())
        .post('/auth/forgot-password')
        .send({ email: 'not-an-email' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    });
  });

  describe('POST /auth/reset-password', () => {
    const validPayload = {
      token: 'raw-token-12345678901234567890123456789012',
      newPassword: 'NewSecurePassword1!',
      confirmNewPassword: 'NewSecurePassword1!',
    };

    it('successfully resets password when token is valid', async () => {
      actionTokenServiceMock.validateActionToken.mockResolvedValue({
        state: 'VALID',
        token: {
          id: 'token-123',
          userId: 'user-123',
          purpose: 'PASSWORD_RESET',
        },
      });

      userRepositoryMock.findUserById.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        authStatus: 'ACTIVE',
        userType: 'GENERAL_TRAINEE',
      });

      passwordServiceMock.hashPassword.mockResolvedValue('scrypt$newhash');
      prismaMock.actionToken.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.user.update.mockResolvedValue({});
      prismaMock.authSession.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const response = await request(createApp()).post('/auth/reset-password').send(validPayload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });

      expect(passwordServiceMock.hashPassword).toHaveBeenCalledWith(validPayload.newPassword);
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { passwordHash: 'scrypt$newhash' },
      });
      expect(prismaMock.authSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', revokedAt: null },
        data: { revokedAt: expect.any(Date), revokedReason: 'PASSWORD_RESET' },
      });
      expect(prismaMock.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { authSession: { userId: 'user-123' }, revokedAt: null },
        data: { revokedAt: expect.any(Date), revokedReason: 'PASSWORD_RESET' },
      });
      expect(authEmailHookServiceMock.requestAuthEmailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          emailType: 'PASSWORD_CHANGED',
          recipientEmail: 'test@example.com',
        }),
      );
    });

    it('returns success when password-changed notification fails after reset is committed', async () => {
      actionTokenServiceMock.validateActionToken.mockResolvedValue({
        state: 'VALID',
        token: {
          id: 'token-123',
          userId: 'user-123',
          purpose: 'PASSWORD_RESET',
        },
      });
      userRepositoryMock.findUserById.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        authStatus: 'ACTIVE',
        userType: 'GENERAL_TRAINEE',
      });
      passwordServiceMock.hashPassword.mockResolvedValue('scrypt$newhash');
      prismaMock.actionToken.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.user.update.mockResolvedValue({});
      prismaMock.authSession.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      authEmailHookServiceMock.requestAuthEmailSend.mockRejectedValueOnce(
        new Error('raw provider failure'),
      );

      const response = await request(createApp()).post('/auth/reset-password').send(validPayload);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
      expect(prismaMock.auditLogEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorType: 'SYSTEM',
            targetType: 'OTHER',
            actionType: 'UPDATED',
            outcome: 'FAILURE',
            metadata: { eventType: 'PASSWORD_CHANGED_NOTIFICATION_FAILED' },
          }),
        }),
      );
      expect(prismaMock.auditLogEntry.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              eventType: expect.stringContaining('raw provider failure'),
            }),
          }),
        }),
      );
    });

    it('returns 401 for an expired token', async () => {
      actionTokenServiceMock.validateActionToken.mockResolvedValue({
        state: 'EXPIRED',
        token: { id: 'token-123' },
      });

      const response = await request(createApp()).post('/auth/reset-password').send(validPayload);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'RESET_TOKEN_EXPIRED');
    });

    it('returns 409 for an already used token', async () => {
      actionTokenServiceMock.validateActionToken.mockResolvedValue({
        state: 'USED',
        token: { id: 'token-123' },
      });

      const response = await request(createApp()).post('/auth/reset-password').send(validPayload);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'RESET_TOKEN_USED');
    });

    it('returns 403 if the user is disabled', async () => {
      actionTokenServiceMock.validateActionToken.mockResolvedValue({
        state: 'VALID',
        token: {
          id: 'token-123',
          userId: 'user-123',
        },
      });

      userRepositoryMock.findUserById.mockResolvedValue({
        id: 'user-123',
        authStatus: 'DISABLED',
      });

      const response = await request(createApp()).post('/auth/reset-password').send(validPayload);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error', 'USER_DISABLED');
    });

    it('returns 422 for password confirmation mismatch', async () => {
      const response = await request(createApp())
        .post('/auth/reset-password')
        .send({
          ...validPayload,
          confirmNewPassword: 'mismatchPassword!',
        });

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    });
  });

  describe('GET /auth/tokens/:token/context', () => {
    it('returns token context', async () => {
      actionTokenServiceMock.getTokenContext.mockResolvedValue({
        tokenState: 'VALID',
        canResend: true,
        resendCooldownSeconds: 0,
        messageCode: 'TOKEN_VALID',
        flow: 'PASSWORD_RESET',
      });

      const response = await request(createApp()).get(
        '/auth/tokens/exampleResetTokenValueWithAtLeast32Chars/context',
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        tokenState: 'VALID',
        canResend: true,
        resendCooldownSeconds: 0,
        messageCode: 'TOKEN_VALID',
        flow: 'PASSWORD_RESET',
      });
      expect(actionTokenServiceMock.getTokenContext).toHaveBeenCalledWith(
        'exampleResetTokenValueWithAtLeast32Chars',
      );
    });

    it('returns 400 for invalid token format', async () => {
      const response = await request(createApp()).get('/auth/tokens/too-short/context');
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    });
  });

  describe('POST /auth/tokens/:token/resend', () => {
    it('resends token successfully', async () => {
      actionTokenServiceMock.resendActionToken.mockResolvedValue(undefined);

      const response = await request(createApp()).post(
        '/auth/tokens/exampleResetTokenValueWithAtLeast32Chars/resend',
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
      expect(actionTokenServiceMock.resendActionToken).toHaveBeenCalledWith(
        'exampleResetTokenValueWithAtLeast32Chars',
      );
    });

    it('returns 429 when cooldown is active', async () => {
      actionTokenServiceMock.resendActionToken.mockRejectedValue(
        new actionTokenServiceMock.TokenResendError(
          429,
          'RESEND_COOLDOWN_ACTIVE',
          'Resend cooldown active. Please try again later.',
          40,
        ),
      );

      const response = await request(createApp()).post(
        '/auth/tokens/exampleResetTokenValueWithAtLeast32Chars/resend',
      );

      expect(response.status).toBe(429);
      expect(response.body).toEqual({
        error: 'RESEND_COOLDOWN_ACTIVE',
        message: 'Resend cooldown active. Please try again later.',
        cooldownSeconds: 40,
      });
    });

    it('returns 400 when resend is ineligible', async () => {
      actionTokenServiceMock.resendActionToken.mockRejectedValue(
        new actionTokenServiceMock.TokenResendError(
          400,
          'TOKEN_RESEND_INELIGIBLE',
          'Token cannot be resent safely',
        ),
      );

      const response = await request(createApp()).post(
        '/auth/tokens/exampleResetTokenValueWithAtLeast32Chars/resend',
      );

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'TOKEN_RESEND_INELIGIBLE',
        message: 'Token cannot be resent safely',
      });
    });
  });
});
