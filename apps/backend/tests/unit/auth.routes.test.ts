import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { clearAuthRateLimitStore } from '../../src/middleware/authRateLimit.js';
import { generateAuthToken } from '../../src/services/auth-token.service.js';
import { hashPassword } from '../../src/services/password.service.js';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

describe('Auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAuthRateLimitStore();
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

    const response = await request(createApp()).post('/auth/register').send({
      email: '  Johan@exampleemail.com  ',
      firstName: ' Johan ',
      lastName: ' Nel ',
      password: 'mySecurePassword123!',
    });

    expect(response.status).toBe(201);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'johan@exampleemail.com',
        firstName: 'Johan',
        lastName: 'Nel',
        passwordHash: expect.stringMatching(/^scrypt\$/),
        userType: 'GENERAL_LEARNER',
        authStatus: 'ACTIVE',
      }),
    });

    const createdData = prismaMock.user.create.mock.calls[0][0].data;
    expect(createdData.passwordHash).not.toBe('mySecurePassword123!');

    expect(response.body).toEqual({
      user: {
        id: 'id-123',
        firstName: 'Johan',
        lastName: 'Nel',
        email: 'johan@exampleemail.com',
        userType: 'GENERAL_LEARNER',
        authStatus: 'ACTIVE',
        createdAt: '2026-05-12T06:00:00.000Z',
      },
    });
    expect(response.body.user).not.toHaveProperty('passwordHash');
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

  it('returns 409 when trying to register with an existing email', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'existing-user-id',
      email: 'johan@example.com',
      firstName: 'Existing',
      lastName: 'User',
      passwordHash: 'scrypt$existinghash',
      userType: 'GENERAL_LEARNER',
      authStatus: 'ACTIVE',
      createdAt: new Date('2026-05-12T06:00:00.000Z'),
    });

    const response = await request(createApp()).post('/auth/register').send({
      email: 'johan@example.com',
      firstName: 'Johan',
      lastName: 'Nel',
      password: 'mySecurePassword123!',
    });

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty('error', 'AUTH_EMAIL_EXISTS');
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('logs in a valid user with a token and safe response structure', async () => {
    const passwordHash = await hashPassword('mySecurePassword123!');

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'id-123',
      firstName: 'Johan',
      lastName: 'Nel',
      email: 'johan@example.com',
      passwordHash,
      userType: 'GENERAL_LEARNER',
      authStatus: 'ACTIVE',
      createdAt: new Date('2026-05-12T06:00:00.000Z'),
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
      user: {
        id: 'id-123',
        firstName: 'Johan',
        lastName: 'Nel',
        email: 'johan@example.com',
        userType: 'GENERAL_LEARNER',
        authStatus: 'ACTIVE',
        createdAt: '2026-05-12T06:00:00.000Z',
      },
      token: expect.any(String),
      tokenType: 'Bearer',
      expiresAt: expect.any(String),
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
      userType: 'GENERAL_LEARNER',
      authStatus: 'ACTIVE',
      createdAt: new Date('2026-05-12T06:00:00.000Z'),
    });

    const response = await request(createApp()).post('/auth/login').send({
      email: 'johan@example.com',
      password: 'wrongPassword',
    });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'AUTH_INVALID');
  });

  it('returns the current authenticated user without exposing the password hash', async () => {
    const token = generateAuthToken('id-123').token;

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'id-123',
      firstName: 'Johan',
      lastName: 'Nel',
      email: 'johan@example.com',
      passwordHash: 'hashed-password',
      userType: 'GENERAL_LEARNER',
      authStatus: 'ACTIVE',
      createdAt: new Date('2026-05-12T06:00:00.000Z'),
    });

    const response = await request(createApp())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'id-123',
      },
    });
    expect(response.body).toEqual({
      user: {
        id: 'id-123',
        firstName: 'Johan',
        lastName: 'Nel',
        email: 'johan@example.com',
        userType: 'GENERAL_LEARNER',
        authStatus: 'ACTIVE',
        createdAt: '2026-05-12T06:00:00.000Z',
      },
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
      userType: 'GENERAL_LEARNER',
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
      });
    }

    expect(response?.status).toBe(429);
    expect(response?.body).toEqual({
      error: 'AUTH_RATE_LIMITED',
      message: 'Too many authentication requests. Please try again later.',
    });
    expect(response?.headers).toHaveProperty('retry-after');
  });
});
