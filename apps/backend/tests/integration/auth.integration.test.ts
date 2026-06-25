import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { verifyPassword } from '../../src/services/password.service.js';
import { loginTestUser, testUserPassword } from '../helpers/auth.js';
import { createTrainee } from '../helpers/factories.js';

const secureRegisterPassword = ['Secure', 'Password', '123!'].join('');

describe('Auth Integration Tests', () => {
  it('registers a valid trainee user resulting in new database records', async () => {
    const payload = {
      email: 'new-trainee@example.com',
      firstName: 'Register',
      lastName: 'Test',
      password: secureRegisterPassword,
    };

    const response = await request(createApp()).post('/auth/register').send(payload);

    expect(response.status).toBe(201);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe('new-trainee@example.com');
    expect(response.body.user.firstName).toBe('Register');
    expect(response.body.user.lastName).toBe('Test');
    expect(response.body.user.userType).toBe('GENERAL_TRAINEE');
    expect(response.body.user.authStatus).toBe('PENDING_EMAIL_VERIFICATION');
    expect(response.body.verificationEmailQueued).toBe(false);
    expect(response.body.user.passwordHash).toBeUndefined();

    // Verify database record creation
    const dbUser = await prisma.user.findUnique({
      where: { email: 'new-trainee@example.com' },
      include: {
        traineeProfile: {
          include: {
            generalTraineeProfile: true,
          },
        },
      },
    });

    expect(dbUser).not.toBeNull();
    if (!dbUser) {
      throw new Error('Expected registered user to be persisted');
    }

    expect(dbUser.firstName).toBe('Register');
    expect(dbUser.lastName).toBe('Test');
    expect(dbUser.userType).toBe('GENERAL_TRAINEE');
    expect(dbUser.authStatus).toBe('PENDING_EMAIL_VERIFICATION');

    // Verify password is encrypted
    const isPasswordValid = await verifyPassword(payload.password, dbUser.passwordHash);
    expect(isPasswordValid).toBe(true);

    // Verify trainee profile is created
    expect(dbUser.traineeProfile).not.toBeNull();
    if (!dbUser.traineeProfile) {
      throw new Error('Expected registered user to have a trainee profile');
    }

    expect(dbUser.traineeProfile.traineeStatus).toBe('ACTIVE');
    expect(dbUser.traineeProfile.generalTraineeProfile).not.toBeNull();
    if (!dbUser.traineeProfile.generalTraineeProfile) {
      throw new Error('Expected registered user to have a general trainee profile');
    }

    expect(dbUser.traineeProfile.generalTraineeProfile.accessSource).toBe('SELF_SIGNUP');

    const verificationToken = await prisma.actionToken.findFirst({
      where: {
        userId: dbUser.id,
        targetEmail: 'new-trainee@example.com',
        purpose: 'EMAIL_VERIFICATION',
      },
    });

    expect(verificationToken).not.toBeNull();
    if (!verificationToken) {
      throw new Error('Expected registration to create an email verification token');
    }

    expect(verificationToken.tokenHash).toBeDefined();
    expect(verificationToken.tokenHash).not.toBe(secureRegisterPassword);
    expect(verificationToken.usedAt).toBeNull();
    expect(verificationToken.revokedAt).toBeNull();
  });

  it('authenticates a registered user and returns a token', async () => {
    const email = 'login-test@example.com';
    await createTrainee({
      user: {
        email,
        firstName: 'Login',
        lastName: 'Test',
      },
    });

    const response = await request(createApp()).post('/auth/login').send({
      email,
      password: testUserPassword,
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(response.body.tokenType).toBe('Bearer');
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(email);
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('fetches the current authenticated user via /auth/me', async () => {
    const email = 'me-test@example.com';
    const { user } = await createTrainee({
      user: {
        email,
        firstName: 'Me',
        lastName: 'Test',
      },
    });

    const loginResponse = await loginTestUser(email);

    const token = loginResponse.body.token;

    const response = await request(createApp())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.id).toBe(user.id);
    expect(response.body.user.email).toBe(email);
    expect(response.body.user.firstName).toBe('Me');
    expect(response.body.user.lastName).toBe('Test');
    expect(response.body.user.passwordHash).toBeUndefined();
  });
});
