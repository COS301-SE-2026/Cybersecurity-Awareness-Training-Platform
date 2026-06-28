import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { verifyPassword } from '../../src/services/password.service.js';
import { loginTestUser, testUserPassword } from '../helpers/auth.js';
import { createTrainee, createOrganisation } from '../helpers/factories.js';
import { issueActionToken } from '../../src/services/action-token.service.js';
import { clearAuthRateLimitStore } from '../../src/middleware/authRateLimit.js';

const secureRegisterPassword = ['Secure', 'Password', '123!'].join('');

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    clearAuthRateLimitStore();
  });

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
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.token).toBeDefined();
    expect(response.body.tokenType).toBe('Bearer');
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe(email);
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('returns 403 when trying to log in a user in a suspended organisation', async () => {
    const org = await createOrganisation({ status: 'SUSPENDED' });
    const trainee = await createTrainee({
      user: { email: 'suspended-org@example.com' },
      organisationProfile: {
        organisationId: org.id,
      },
    });

    const response = await request(createApp()).post('/auth/login').send({
      email: trainee.user.email,
      password: testUserPassword,
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('ORGANISATION_SUSPENDED');
  });

  it('returns 403 when trying to log in a disabled user', async () => {
    const trainee = await createTrainee({
      user: {
        email: 'disabled-user@example.com',
        authStatus: 'DISABLED',
      },
    });

    const response = await request(createApp()).post('/auth/login').send({
      email: trainee.user.email,
      password: testUserPassword,
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('USER_DISABLED');
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
    const token = loginResponse.body.accessToken;

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

  it('returns 403 when fetching context for a user in a suspended organisation', async () => {
    const org = await createOrganisation({ status: 'ACTIVE' });
    const trainee = await createTrainee({
      user: { email: 'suspended-me@example.com' },
      organisationProfile: {
        organisationId: org.id,
      },
    });

    const loginResponse = await loginTestUser(trainee.user.email);
    const token = loginResponse.body.accessToken;

    // Suspend organisation after login
    await prisma.organisation.update({
      where: { id: org.id },
      data: { status: 'SUSPENDED' },
    });

    const response = await request(createApp())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('ORGANISATION_SUSPENDED');
  });

  it('logs out a user, revoking their session and clearing the cookie', async () => {
    const email = 'logout-test@example.com';
    await createTrainee({ user: { email } });

    const loginResponse = await loginTestUser(email);
    const cookies = loginResponse.headers['set-cookie'];
    expect(cookies).toBeDefined();

    const response = await request(createApp()).post('/auth/logout').set('Cookie', cookies);

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie'][0]).toContain('refreshToken=;');
  });

  it('rotates refresh token and returns new access token/context on valid cookie', async () => {
    const email = 'refresh-test@example.com';
    await createTrainee({ user: { email } });

    const loginResponse = await loginTestUser(email);
    const cookies = loginResponse.headers['set-cookie'];

    const response = await request(createApp()).post('/auth/refresh').set('Cookie', cookies);

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 TOKEN_REUSE_DETECTED when refresh token is reused', async () => {
    const email = 'reuse-test@example.com';
    await createTrainee({ user: { email } });

    const loginResponse = await loginTestUser(email);
    const cookies = loginResponse.headers['set-cookie'];

    // First rotation succeeds
    const response1 = await request(createApp()).post('/auth/refresh').set('Cookie', cookies);

    expect(response1.status).toBe(200);

    // Second rotation with the same old cookie fails
    const response2 = await request(createApp()).post('/auth/refresh').set('Cookie', cookies);

    expect(response2.status).toBe(401);
    expect(response2.body.error).toBe('TOKEN_REUSE_DETECTED');
  });

  it('resends verification email for a pending unverified user', async () => {
    const email = 'unverified-resend@example.com';
    await createTrainee({
      user: {
        email,
        authStatus: 'PENDING_EMAIL_VERIFICATION',
      },
    });

    const response = await request(createApp()).post('/auth/resend-verification').send({ email });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain('verification link has been sent');
  });

  describe('Setup Token Flow', () => {
    it('retrieves setup token context successfully', async () => {
      const email = 'setup-context-test@example.com';
      const trainee = await createTrainee({ user: { email } });

      const { rawToken } = await issueActionToken({
        purpose: 'PLATFORM_ADMIN_INVITE',
        userId: trainee.user.id,
        targetEmail: email,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      });

      const response = await request(createApp()).get(`/setup/token/${rawToken}/context`);

      expect(response.status).toBe(200);
      expect(response.body.token.state).toBe('VALID');
      expect(response.body.token.purpose).toBe('PLATFORM_ADMIN_INVITE');
      expect(response.body.targetEmail).toBe(email);
    });

    it('returns EXPIRED for an expired setup token', async () => {
      const email = 'setup-expired-test@example.com';
      const trainee = await createTrainee({ user: { email } });

      const { rawToken } = await issueActionToken({
        purpose: 'PLATFORM_ADMIN_INVITE',
        userId: trainee.user.id,
        targetEmail: email,
        expiresAt: new Date(Date.now() - 1000),
      });

      const response = await request(createApp()).get(`/setup/token/${rawToken}/context`);

      expect(response.status).toBe(200);
      expect(response.body.token.state).toBe('EXPIRED');
    });

    it('completes account setup and consumes the token', async () => {
      const email = 'setup-complete-test@example.com';
      const user = await prisma.user.create({
        data: {
          email,
          firstName: 'Platform',
          lastName: 'Admin',
          passwordHash: 'dummyHash',
          userType: 'IP_ADMIN',
          authStatus: 'PENDING_INVITE_SETUP',
        },
      });

      const { rawToken } = await issueActionToken({
        purpose: 'PLATFORM_ADMIN_INVITE',
        userId: user.id,
        targetEmail: email,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      });

      const response = await request(createApp()).post(`/setup/token/${rawToken}/complete`).send({
        password: 'newSecurePassword123!',
        confirmPassword: 'newSecurePassword123!',
        firstName: 'Fully',
        lastName: 'Setup',
      });

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(email);

      // Verify user state is ACTIVE and password is updated
      const updatedUser = await prisma.user.findUnique({ where: { email } });
      expect(updatedUser?.authStatus).toBe('ACTIVE');
      const isPassValid = await verifyPassword('newSecurePassword123!', updatedUser!.passwordHash);
      expect(isPassValid).toBe(true);

      // Verify token is marked as used
      const tokenRecord = await prisma.actionToken.findFirst({
        where: { userId: user.id, purpose: 'PLATFORM_ADMIN_INVITE' },
      });
      expect(tokenRecord?.usedAt).not.toBeNull();
    });

    it('returns conflict if setup token is already used', async () => {
      const email = 'setup-used-test@example.com';
      const user = await prisma.user.create({
        data: {
          email,
          firstName: 'Platform',
          lastName: 'Admin',
          passwordHash: 'dummyHash',
          userType: 'IP_ADMIN',
          authStatus: 'PENDING_INVITE_SETUP',
        },
      });

      const { rawToken } = await issueActionToken({
        purpose: 'PLATFORM_ADMIN_INVITE',
        userId: user.id,
        targetEmail: email,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      });

      // Complete first time
      const res1 = await request(createApp()).post(`/setup/token/${rawToken}/complete`).send({
        password: 'newSecurePassword123!',
        confirmPassword: 'newSecurePassword123!',
        firstName: 'First',
        lastName: 'Last',
      });
      expect(res1.status).toBe(201);

      // Attempt second time
      const res2 = await request(createApp()).post(`/setup/token/${rawToken}/complete`).send({
        password: 'anotherPassword123!',
        confirmPassword: 'anotherPassword123!',
        firstName: 'First',
        lastName: 'Last',
      });
      expect(res2.status).toBe(409);
    });
  });
});
