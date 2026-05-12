import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';

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
});
