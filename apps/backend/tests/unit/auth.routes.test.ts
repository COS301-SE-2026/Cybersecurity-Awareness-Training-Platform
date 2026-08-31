import { createHmac } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { clearAuthRateLimitStore } from '../../src/middleware/authRateLimit.js';
import { generateAuthToken } from '../../src/services/auth-token.service.js';
import { hashPassword } from '../../src/services/password.service.js';
import { clearResendCooldowns } from '../../src/services/auth.service.js';

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  actionToken: {
    findFirst: vi.fn(),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
  authSession: {
    findUnique: vi.fn(),
    create: vi.fn().mockImplementation(async (args) => ({
      id: 'session-123',
      userId: args.data.userId,
      rememberMe: args.data.rememberMe,
      expiresAt: args.data.expiresAt,
      idleTimeoutMinutes: args.data.idleTimeoutMinutes,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      revokedAt: null,
      revokedReason: null,
    })),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  refreshToken: {
    findUnique: vi.fn(),
    create: vi.fn().mockImplementation(async (args) => ({
      id: 'token-123',
      authSessionId: args.data.authSessionId,
      expiresAt: args.data.expiresAt,
      createdAt: new Date(),
      usedAt: null,
      revokedAt: null,
      revokedReason: null,
    })),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  auditLogEntry: {
    create: vi.fn().mockResolvedValue({ id: 'audit-123' }),
  },
}));

const actionTokenServiceMock = vi.hoisted(() => ({
  issueActionToken: vi.fn(),
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

describe('Auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAuthRateLimitStore();
    clearResendCooldowns();
    prismaMock.$transaction.mockImplementation((action) => action(prismaMock));
  });

  it('registers a valid user with a hashed password and safe response structure', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockImplementation(async ({ data }) => ({
      id: 'id-123',
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash: data.passwordHash,
      userType: data.userType,
      authStatus: data.authStatus,
      createdAt: new Date('2026-05-12T06:00:00.000Z'),
    }));
    actionTokenServiceMock.issueActionToken.mockResolvedValue({
      rawToken: 'raw-action-token',
      token: { id: 'action-token-1' },
    });
    authEmailHookServiceMock.requestAuthEmailSend.mockResolvedValue({
      status: 'QUEUED',
      queueAccepted: true,
      queued: true,
      deliveryLogId: 'email-log-1',
      jobId: 'email-job-1',
    });

    const response = await request(createApp()).post('/auth/register').send({
      email: '  Johan@exampleemail.com  ',
      firstName: ' Johan ',
      lastName: ' Nel ',
      password: 'mySecurePassword123!',
      confirmPassword: 'mySecurePassword123!',
    });

    expect(response.status).toBe(201);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'johan@exampleemail.com',
        firstName: 'Johan',
        lastName: 'Nel',
        passwordHash: expect.stringMatching(/^scrypt\$/),
        userType: 'GENERAL_TRAINEE',
        authStatus: 'PENDING_EMAIL_VERIFICATION',
      }),
    });

    const createdData = prismaMock.user.create.mock.calls[0][0].data;
    expect(createdData.passwordHash).not.toBe('mySecurePassword123!');

    expect(response.body).toEqual({
      message:
        "If this email can be registered, we'll send you an email verification link. Please check your inbox.",
    });
  });

  it('returns 400 for invalid register payload', async () => {
    const response = await request(createApp()).post('/auth/register').send({
      email: 'invalid-email',
      firstName: '',
      lastName: '',
      password: 'short',
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'VALIDATION_ERROR');
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('returns generic success when trying to register with an existing email', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'existing-user-id',
      email: 'johan@example.com',
      firstName: 'Existing',
      lastName: 'User',
      passwordHash: 'scrypt$existinghash',
      userType: 'GENERAL_TRAINEE',
      authStatus: 'ACTIVE',
      createdAt: new Date('2026-05-12T06:00:00.000Z'),
    });

    const response = await request(createApp()).post('/auth/register').send({
      email: 'johan@example.com',
      firstName: 'Johan',
      lastName: 'Nel',
      password: 'mySecurePassword123!',
      confirmPassword: 'mySecurePassword123!',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      message:
        "If this email can be registered, we'll send you an email verification link. Please check your inbox.",
    });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('keeps registration response generic when verification email cannot be queued for an eligible account', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'pending-user-id',
      email: 'pending@example.com',
      firstName: 'Pending',
      lastName: 'User',
      passwordHash: 'scrypt$existinghash',
      userType: 'GENERAL_TRAINEE',
      authStatus: 'PENDING_EMAIL_VERIFICATION',
      createdAt: new Date('2026-05-12T06:00:00.000Z'),
    });
    prismaMock.actionToken.findFirst.mockResolvedValue(null);
    actionTokenServiceMock.issueActionToken.mockResolvedValue({
      rawToken: 'raw-action-token',
      token: { id: 'replacement-token-id', expiresAt: new Date() },
    });
    authEmailHookServiceMock.requestAuthEmailSend.mockResolvedValueOnce({
      status: 'NOT_QUEUED',
      queueAccepted: false,
      queued: false,
      reason: 'EMAIL_QUEUE_FAILED',
    });

    const response = await request(createApp()).post('/auth/register').send({
      email: 'pending@example.com',
      firstName: 'Pending',
      lastName: 'User',
      password: 'mySecurePassword123!',
      confirmPassword: 'mySecurePassword123!',
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      message:
        "If this email can be registered, we'll send you an email verification link. Please check your inbox.",
    });
    expect(prismaMock.actionToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ revokedReason: 'REGISTRATION_VERIFICATION_REISSUED' }),
      }),
    );
    expect(authEmailHookServiceMock.requestAuthEmailSend).toHaveBeenCalled();
  });

  it('logs in a valid user with a token and safe response structure', async () => {
    const passwordHash = await hashPassword('mySecurePassword123!');

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'id-123',
      firstName: 'Johan',
      lastName: 'Nel',
      email: 'johan@example.com',
      passwordHash,
      userType: 'GENERAL_TRAINEE',
      authStatus: 'ACTIVE',
      createdAt: new Date('2026-05-12T06:00:00.000Z'),
      traineeProfile: { traineeStatus: 'ACTIVE' },
    });

    const response = await request(createApp()).post('/auth/login').send({
      email: '  Johan@example.com  ',
      password: 'mySecurePassword123!',
    });

    expect(response.status).toBe(200);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: {
        email: 'johan@example.com',
      },
    });
    expect(response.body).toEqual({
      accessToken: expect.any(String),
      idleTimeoutMinutes: 30,
      user: {
        id: 'id-123',
        firstName: 'Johan',
        lastName: 'Nel',
        email: 'johan@example.com',
        userType: 'GENERAL_TRAINEE',
        authStatus: 'ACTIVE',
        createdAt: '2026-05-12T06:00:00.000Z',
      },
      context: expect.objectContaining({
        role: 'GENERAL_TRAINEE',
        permissions: ['GENERAL_TRAINEE'],
      }),
      permissions: ['GENERAL_TRAINEE'],
      redirectTo: '/campaigns',
      token: expect.any(String),
      tokenType: 'Bearer',
      expiresAt: expect.any(String),
      sessionExpiresAt: expect.any(String),
    });
    expect(response.body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 401 for invalid login credentials', async () => {
    const passwordHash = await hashPassword('mySecurePassword123!');

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'id-123',
      firstName: 'Johan',
      lastName: 'Nel',
      email: 'johan@example.com',
      passwordHash,
      userType: 'GENERAL_TRAINEE',
      authStatus: 'ACTIVE',
      createdAt: new Date('2026-05-12T06:00:00.000Z'),
      traineeProfile: { traineeStatus: 'ACTIVE' },
    });

    const response = await request(createApp()).post('/auth/login').send({
      email: 'johan@example.com',
      password: 'wrongPassword',
    });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'AUTH_INVALID');
  });

  it('returns the authenticated user despite old request activityy', async () => {
    const token = generateAuthToken('id-123', 'session-123').token;

    prismaMock.authSession.findUnique.mockResolvedValue({
      id: 'session-123',
      userId: 'id-123',
      expiresAt: new Date(Date.now() + 60000),
      lastActiveAt: new Date(Date.now() - 60 * 60 * 1000),
      revokedAt: null,
      idleTimeoutMinutes: 30,
    });

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'id-123',
      firstName: 'Johan',
      lastName: 'Nel',
      email: 'johan@example.com',
      passwordHash: 'hashed-password',
      userType: 'GENERAL_TRAINEE',
      authStatus: 'ACTIVE',
      createdAt: new Date('2026-05-12T06:00:00.000Z'),
      traineeProfile: { traineeStatus: 'ACTIVE' },
    });

    const response = await request(createApp())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'id-123',
      },
      include: expect.any(Object),
    });
    expect(response.body).toEqual({
      user: {
        id: 'id-123',
        firstName: 'Johan',
        lastName: 'Nel',
        email: 'johan@example.com',
        userType: 'GENERAL_TRAINEE',
        authStatus: 'ACTIVE',
        createdAt: '2026-05-12T06:00:00.000Z',
      },
      context: expect.objectContaining({
        role: 'GENERAL_TRAINEE',
        permissions: ['GENERAL_TRAINEE'],
      }),
      permissions: ['GENERAL_TRAINEE'],
      redirectTo: '/campaigns',
    });
    expect(response.body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 401 when the token is missing', async () => {
    const response = await request(createApp()).get('/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'AUTH_REQUIRED');
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns 401 when the token is invalid', async () => {
    const response = await request(createApp())
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'AUTH_INVALID');
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns 401 when the token does not contain a session ID', async () => {
    const rawPayload = Buffer.from(
      JSON.stringify({
        userId: 'id-123',
        expiresAt: new Date(Date.now() + 60000).toISOString(),
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', env.AUTH_TOKEN_SECRET)
      .update(rawPayload)
      .digest('base64url');
    const tokenWithoutSession = `${rawPayload}.${signature}`;

    const response = await request(createApp())
      .get('/auth/me')
      .set('Authorization', `Bearer ${tokenWithoutSession}`);

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'AUTH_INVALID');
  });

  it('returns 401 when the token contains a non-existent or invalid session ID', async () => {
    const token = generateAuthToken('id-123', 'invalid-session-id').token;
    prismaMock.authSession.findUnique.mockResolvedValue(null);

    const response = await request(createApp())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'AUTH_INVALID');
  });

  it('returns 401 when the token userId does not match the session userId', async () => {
    const token = generateAuthToken('id-123', 'session-123').token;
    prismaMock.authSession.findUnique.mockResolvedValue({
      id: 'session-123',
      userId: 'different-user-id',
      expiresAt: new Date(Date.now() + 60000),
      lastActiveAt: new Date(),
      revokedAt: null,
      idleTimeoutMinutes: 30,
    });

    const response = await request(createApp())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'AUTH_INVALID');
  });

  it('returns 429 when login requests exceed the auth rate limit', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const app = createApp();
    let response: request.Response | undefined;

    for (let index = 0; index <= env.AUTH_RATE_LIMIT_MAX_REQUESTS; index += 1) {
      response = await request(app).post('/auth/login').send({
        email: 'johan@example.com',
        password: 'mySecurePassword123!',
      });
    }

    expect(response?.status).toBe(429);
    expect(response?.body).toEqual({
      error: 'AUTH_RATE_LIMITED',
      message: 'Too many authentication requests. Please try again later.',
    });
    expect(response?.headers).toHaveProperty('retry-after');
  });

  it('returns 429 when register requests exceed the auth rate limit', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'existing-user-id',
      email: 'johan@example.com',
      firstName: 'Johan',
      lastName: 'Nel',
      passwordHash: 'scrypt$existinghash',
      userType: 'GENERAL_TRAINEE',
      authStatus: 'ACTIVE',
      createdAt: new Date('2026-05-12T06:00:00.000Z'),
    });

    const app = createApp();
    let response: request.Response | undefined;

    for (let index = 0; index <= env.AUTH_RATE_LIMIT_MAX_REQUESTS; index += 1) {
      response = await request(app).post('/auth/register').send({
        email: 'johan@example.com',
        firstName: 'Johan',
        lastName: 'Nel',
        password: 'mySecurePassword123!',
        confirmPassword: 'mySecurePassword123!',
      });
    }

    expect(response?.status).toBe(429);
    expect(response?.body).toEqual({
      error: 'AUTH_RATE_LIMITED',
      message: 'Too many authentication requests. Please try again later.',
    });
    expect(response?.headers).toHaveProperty('retry-after');
  });

  describe('POST /auth/logout', () => {
    it('clears the refresh token cookie and revokes session if refresh token cookie is present', async () => {
      const expiresAt = new Date(Date.now() + 60000);
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'token-123',
        tokenHash: 'somehash',
        expiresAt,
        usedAt: null,
        revokedAt: null,
        authSessionId: 'session-123',
        authSession: {
          id: 'session-123',
          userId: 'user-123',
          expiresAt,
          lastActiveAt: new Date(),
          revokedAt: null,
          user: { id: 'user-123', userType: 'GENERAL_TRAINEE' },
        },
      });
      prismaMock.authSession.findUnique.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        expiresAt,
        lastActiveAt: new Date(),
        revokedAt: null,
        idleTimeoutMinutes: 30,
      });

      const response = await request(createApp())
        .post('/auth/logout')
        .set('Cookie', ['refreshToken=valid-raw-token']);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
      expect(response.headers['set-cookie'][0]).toContain('refreshToken=;');
      expect(prismaMock.authSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-123' },
          data: expect.objectContaining({ revokedReason: 'LOGOUT' }),
        }),
      );
    });

    it('returns 200 even if no refresh token cookie is present', async () => {
      const response = await request(createApp()).post('/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns 401 if refresh token cookie is missing', async () => {
      const response = await request(createApp()).post('/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'AUTH_REQUIRED',
        message: 'Refresh token is missing',
      });
    });

    it('rotates refresh token despite old request activity', async () => {
      const expiresAt = new Date(Date.now() + 60000);
      const lastActiveAt = new Date(Date.now() - 60 * 60 * 1000);
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'token-123',
        tokenHash: 'somehash',
        expiresAt,
        usedAt: null,
        revokedAt: null,
        authSessionId: 'session-123',
        authSession: {
          id: 'session-123',
          userId: 'user-123',
          expiresAt,
          lastActiveAt,
          revokedAt: null,
          user: {
            id: 'user-123',
            email: 'johan@example.com',
            firstName: 'Johan',
            lastName: 'Nel',
            userType: 'GENERAL_TRAINEE',
            authStatus: 'ACTIVE',
            createdAt: new Date(),
          },
        },
      });
      prismaMock.authSession.findUnique.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        expiresAt,
        lastActiveAt,
        revokedAt: null,
        idleTimeoutMinutes: 30,
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'johan@example.com',
        firstName: 'Johan',
        lastName: 'Nel',
        userType: 'GENERAL_TRAINEE',
        authStatus: 'ACTIVE',
        createdAt: new Date(),
        traineeProfile: { traineeStatus: 'ACTIVE' },
      });
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const response = await request(createApp())
        .post('/auth/refresh')
        .set('Cookie', ['refreshToken=valid-raw-token']);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        accessToken: expect.any(String),
        idleTimeoutMinutes: 30,
        user: {
          id: 'user-123',
          firstName: 'Johan',
          lastName: 'Nel',
          email: 'johan@example.com',
          userType: 'GENERAL_TRAINEE',
          authStatus: 'ACTIVE',
          createdAt: expect.any(String),
        },
        context: expect.objectContaining({
          role: 'GENERAL_TRAINEE',
          permissions: ['GENERAL_TRAINEE'],
        }),
        permissions: ['GENERAL_TRAINEE'],
        redirectTo: '/campaigns',
        token: expect.any(String),
        tokenType: 'Bearer',
        expiresAt: expect.any(String),
        sessionExpiresAt: expect.any(String),
      });
      expect(response.headers['set-cookie'][0]).toContain('refreshToken=');
    });

    it('returns 401 TOKEN_REUSE_DETECTED on token reuse', async () => {
      const expiresAt = new Date(Date.now() + 60000);
      prismaMock.refreshToken.findUnique.mockResolvedValue({
        id: 'token-123',
        tokenHash: 'somehash',
        expiresAt,
        usedAt: new Date(),
        revokedAt: new Date(),
        authSessionId: 'session-123',
        authSession: {
          id: 'session-123',
          userId: 'user-123',
          expiresAt,
          lastActiveAt: new Date(),
          revokedAt: null,
          user: {
            id: 'user-123',
            email: 'johan@example.com',
            firstName: 'Johan',
            lastName: 'Nel',
            userType: 'GENERAL_TRAINEE',
            authStatus: 'ACTIVE',
            createdAt: new Date(),
          },
        },
      });
      prismaMock.authSession.findUnique.mockResolvedValue({
        id: 'session-123',
        userId: 'user-123',
        expiresAt,
        lastActiveAt: new Date(),
        revokedAt: null,
        idleTimeoutMinutes: 30,
      });

      const response = await request(createApp())
        .post('/auth/refresh')
        .set('Cookie', ['refreshToken=reused-raw-token']);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'TOKEN_REUSE_DETECTED',
        message: 'Refresh token reuse detected',
      });
      expect(response.headers['set-cookie'][0]).toContain('refreshToken=;');
    });
  });

  describe('POST /auth/resend-verification', () => {
    it('always returns 200 OK and avoids account enumeration', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const response = await request(createApp())
        .post('/auth/resend-verification')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message:
          'If the email is registered and unverified, a verification link has been queued for delivery.',
      });
    });

    it('triggers verification resend if unverified user is found', async () => {
      const pendingUser = {
        id: 'user-pending',
        email: 'pending@example.com',
        firstName: 'Pending',
        lastName: 'User',
        authStatus: 'PENDING_EMAIL_VERIFICATION',
      };
      prismaMock.user.findUnique.mockResolvedValue(pendingUser);
      actionTokenServiceMock.issueActionToken.mockResolvedValue({
        rawToken: 'raw-resend-token',
        token: { id: 'token-resend-id' },
      });
      authEmailHookServiceMock.requestAuthEmailSend.mockResolvedValue({
        status: 'QUEUED',
        queueAccepted: true,
        queued: true,
        deliveryLogId: 'email-log-1',
        jobId: 'email-job-1',
      });

      const response = await request(createApp())
        .post('/auth/resend-verification')
        .send({ email: 'pending@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message:
          'If the email is registered and unverified, a verification link has been queued for delivery.',
      });
      expect(actionTokenServiceMock.issueActionToken).toHaveBeenCalledWith(
        expect.objectContaining({
          purpose: 'EMAIL_VERIFICATION',
          userId: 'user-pending',
        }),
        expect.any(Object),
      );
    });

    it('keeps verification resend response generic when email cannot be queued for an eligible account', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-pending',
        email: 'pending@example.com',
        firstName: 'Pending',
        lastName: 'User',
        authStatus: 'PENDING_EMAIL_VERIFICATION',
      });
      actionTokenServiceMock.issueActionToken.mockResolvedValue({
        rawToken: 'raw-resend-token',
        token: { id: 'token-resend-id' },
      });
      authEmailHookServiceMock.requestAuthEmailSend.mockResolvedValueOnce({
        status: 'NOT_QUEUED',
        queueAccepted: false,
        queued: false,
        reason: 'EMAIL_QUEUE_FAILED',
      });

      const response = await request(createApp())
        .post('/auth/resend-verification')
        .send({ email: 'pending@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message:
          'If the email is registered and unverified, a verification link has been queued for delivery.',
      });
      expect(actionTokenServiceMock.issueActionToken).toHaveBeenCalled();
      expect(authEmailHookServiceMock.requestAuthEmailSend).toHaveBeenCalled();
    });

    it('returns 429 Too Many Requests when requesting resend verification during cooldown', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-pending',
        email: 'pending@example.com',
        firstName: 'Pending',
        lastName: 'User',
        authStatus: 'PENDING_EMAIL_VERIFICATION',
      });
      actionTokenServiceMock.issueActionToken.mockResolvedValue({
        rawToken: 'raw-resend-token',
        token: { id: 'token-resend-id' },
      });
      authEmailHookServiceMock.requestAuthEmailSend.mockResolvedValue({
        status: 'QUEUED',
        queueAccepted: true,
        queued: true,
        deliveryLogId: 'email-log-1',
        jobId: 'email-job-1',
      });

      // First request succeeds
      const res1 = await request(createApp())
        .post('/auth/resend-verification')
        .send({ email: 'pending@example.com' });
      expect(res1.status).toBe(200);

      // Second request fails with 429
      const res2 = await request(createApp())
        .post('/auth/resend-verification')
        .send({ email: 'pending@example.com' });
      expect(res2.status).toBe(429);
      expect(res2.body.error).toBe('AUTH_RATE_LIMITED');
    });
  });

  describe('POST /auth/verify-email', () => {
    it('verifies registration email token and returns VALID state', async () => {
      actionTokenServiceMock.validateActionToken.mockResolvedValue({
        state: 'VALID',
        token: { id: 'token-123', userId: 'user-1' },
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        authStatus: 'PENDING_EMAIL_VERIFICATION',
      });
      prismaMock.actionToken.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.user.update.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        authStatus: 'ACTIVE',
        createdAt: new Date(),
      });

      const response = await request(createApp())
        .post('/auth/verify-email')
        .send({ token: 'validVerificationTokenWithAtLeast32Chars' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        state: 'VALID',
        user: expect.objectContaining({
          id: 'user-1',
          email: 'user@example.com',
          authStatus: 'ACTIVE',
        }),
      });
    });

    it('returns token state response on validation failure', async () => {
      actionTokenServiceMock.validateActionToken.mockResolvedValue({
        state: 'EXPIRED',
      });

      const response = await request(createApp())
        .post('/auth/verify-email')
        .send({ token: 'expiredVerificationTokenWithAtLeast32Chars' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        state: 'EXPIRED',
      });
    });
  });
});
