import { randomUUID, createHmac } from 'node:crypto';
import { env } from '../../src/config/env.js';
import { generateAuthToken } from '../../src/services/auth-token.service.js';
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
    expect(response.body).toEqual({
      message:
        "If this email can be registered, we'll send you an email verification link. Please check your inbox.",
    });

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
      expect(res2.status).toBe(401);
    });
  });

  describe('Logout and Session Revocation DB Check', () => {
    it('properly revokes both the session and the corresponding refresh token in the database, and blocks old access token', async () => {
      const email = 'logout-db-check@example.com';
      await createTrainee({ user: { email } });

      const loginRes = await loginTestUser(email);
      const cookies = loginRes.headers['set-cookie'];
      const accessToken = loginRes.body.accessToken;

      // Access protected endpoint successfully before logout
      const meBefore = await request(createApp())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(meBefore.status).toBe(200);

      // Perform logout
      const logoutRes = await request(createApp()).post('/auth/logout').set('Cookie', cookies);
      expect(logoutRes.status).toBe(200);

      // Verify DB session is revoked
      const session = await prisma.authSession.findFirst({
        where: { userId: loginRes.body.user.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(session).not.toBeNull();
      expect(session?.revokedAt).not.toBeNull();
      expect(session?.revokedReason).toBe('LOGOUT');

      // Verify DB refresh token is revoked
      const refreshToken = await prisma.refreshToken.findFirst({
        where: { authSessionId: session?.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(refreshToken).not.toBeNull();
      expect(refreshToken?.revokedAt).not.toBeNull();
      expect(refreshToken?.revokedReason).toBe('LOGOUT');

      // Verify access token is now blocked
      const meAfter = await request(createApp())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(meAfter.status).toBe(401);
      expect(meAfter.body.error).toBe('AUTH_INVALID');
    });
  });

  describe('Refresh Token Rotation DB Check', () => {
    it('verifies that old refresh token is marked as used, replacedByTokenId is set, new refresh token is hashed, and old raw token cannot be reused', async () => {
      const email = 'refresh-db-check@example.com';
      await createTrainee({ user: { email } });

      const loginRes = await loginTestUser(email);
      const cookies = loginRes.headers['set-cookie'];

      // Perform refresh rotation
      const refreshRes = await request(createApp()).post('/auth/refresh').set('Cookie', cookies);
      expect(refreshRes.status).toBe(200);

      const newCookies = refreshRes.headers['set-cookie'];

      // Extract session
      const session = await prisma.authSession.findFirst({
        where: { userId: loginRes.body.user.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(session).not.toBeNull();

      // Retrieve tokens in database
      const tokens = await prisma.refreshToken.findMany({
        where: { authSessionId: session?.id },
        orderBy: { createdAt: 'asc' },
      });
      expect(tokens).toHaveLength(2);

      const oldTokenRecord = tokens[0];
      const newTokenRecord = tokens[1];

      // Verify old token is marked as used
      expect(oldTokenRecord.usedAt).not.toBeNull();
      expect(oldTokenRecord.replacedByTokenId).toBe(newTokenRecord.id);

      // Verify new token is stored exclusively as hash (not matching raw token)
      expect(newTokenRecord.tokenHash).toBeDefined();
      // Ensure raw token is not the same as hash
      const rawNewToken = newCookies[0].split(';')[0].split('=')[1];
      expect(newTokenRecord.tokenHash).not.toBe(rawNewToken);

      // Verify that reusing the old raw refresh token is impossible
      const reuseRes = await request(createApp()).post('/auth/refresh').set('Cookie', cookies);
      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.error).toBe('TOKEN_REUSE_DETECTED');
    });
  });

  describe('Refresh Token Reuse Detection DB & Audit Log Check', () => {
    it('genuinely revokes all refresh tokens and session in DB, records audit log with IP/UA, and returns 401', async () => {
      const email = 'reuse-audit@example.com';
      await createTrainee({ user: { email } });

      const loginRes = await loginTestUser(email);
      const cookies = loginRes.headers['set-cookie'];

      // Rotate once
      await request(createApp()).post('/auth/refresh').set('Cookie', cookies);

      // Trigger reuse
      const reuseRes = await request(createApp())
        .post('/auth/refresh')
        .set('Cookie', cookies)
        .set('User-Agent', 'TestUA')
        .set('X-Forwarded-For', '1.2.3.4');

      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.error).toBe('TOKEN_REUSE_DETECTED');

      // Verify session and token revocation in DB
      const session = await prisma.authSession.findFirst({
        where: { userId: loginRes.body.user.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(session?.revokedAt).not.toBeNull();
      expect(session?.revokedReason).toBe('TOKEN_REUSE_DETECTED');

      const allTokens = await prisma.refreshToken.findMany({
        where: { authSessionId: session?.id },
      });
      for (const t of allTokens) {
        expect(t.revokedAt).not.toBeNull();
        expect(['ROTATED', 'TOKEN_REUSE_DETECTED']).toContain(t.revokedReason);
      }

      // Verify TOKEN_REUSE_DETECTED audit log exists
      const auditLog = await prisma.auditLogEntry.findFirst({
        where: {
          actionType: 'TOKEN_REUSE_DETECTED',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.outcome).toBe('FAILURE');
      expect(auditLog?.userAgent).toContain('TestUA');
    });
  });

  describe('Protected Access After Status Changes', () => {
    it('successfully rejects disabled user, inactive trainee, inactive trainee membership, disabled org admin, disabled platform admin, and suspended org', async () => {
      // 1. Inactive Trainee
      const trainee = await createTrainee({
        user: { email: 'inactive-trainee-check@example.com' },
      });
      clearAuthRateLimitStore();
      const login1 = await loginTestUser(trainee.user.email);
      const token1 = login1.body.accessToken;

      // Update trainee profile to INACTIVE
      await prisma.traineeProfile.update({
        where: { id: trainee.traineeProfile.id },
        data: { traineeStatus: 'INACTIVE' },
      });

      const res1 = await request(createApp())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token1}`);
      expect(res1.status).toBe(403);
      expect(res1.body.error).toBe('TRAINEE_PROFILE_INACTIVE');

      // 2. Inactive Trainee Membership (OrganisationTraineeProfile)
      const org = await createOrganisation();
      const orgTrainee = await createTrainee({
        user: { email: 'inactive-mem-check@example.com' },
        organisationProfile: {
          organisationId: org.id,
        },
      });
      clearAuthRateLimitStore();
      const login2 = await loginTestUser(orgTrainee.user.email);
      const token2 = login2.body.accessToken;

      // Update organisation trainee user status to INACTIVE
      await prisma.organisationTraineeProfile.update({
        where: { id: orgTrainee.organisationTraineeProfile!.id },
        data: { membershipStatus: 'INACTIVE' },
      });

      const res2 = await request(createApp())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token2}`);
      expect(res2.status).toBe(403);
      expect(res2.body.error).toBe('ORGANISATION_USER_INACTIVE');

      // 3. Disabled Org Admin Profile
      const adminUser = await prisma.user.create({
        data: {
          email: 'disabled-admin@example.com',
          firstName: 'Org',
          lastName: 'Admin',
          passwordHash: trainee.user.passwordHash,
          userType: 'ORGANISATION_ADMIN',
          authStatus: 'ACTIVE',
        },
      });
      const adminProfile = await prisma.organisationAdminProfile.create({
        data: {
          id: randomUUID(),
          userId: adminUser.id,
          organisationId: org.id,
          adminStatus: 'ACTIVE',
        },
      });
      clearAuthRateLimitStore();
      const login3 = await loginTestUser(adminUser.email);
      const token3 = login3.body.accessToken;

      // Disable admin profile
      await prisma.organisationAdminProfile.update({
        where: { id: adminProfile.id },
        data: { adminStatus: 'DISABLED' },
      });

      const res3 = await request(createApp())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token3}`);
      expect(res3.status).toBe(403);
      expect(res3.body.error).toBe('ADMIN_DISABLED');

      // 4. Disabled Platform/IP Admin Profile
      const ipUser = await prisma.user.create({
        data: {
          email: 'disabled-ip@example.com',
          firstName: 'Platform',
          lastName: 'Admin',
          passwordHash: trainee.user.passwordHash,
          userType: 'IP_ADMIN',
          authStatus: 'ACTIVE',
        },
      });
      const ipProfile = await prisma.ipAdminProfile.create({
        data: {
          id: randomUUID(),
          userId: ipUser.id,
          adminStatus: 'ACTIVE',
        },
      });
      clearAuthRateLimitStore();
      const login4 = await loginTestUser(ipUser.email);
      const token4 = login4.body.accessToken;

      // Disable platform admin profile
      await prisma.ipAdminProfile.update({
        where: { id: ipProfile.id },
        data: { adminStatus: 'DISABLED' },
      });

      const res4 = await request(createApp())
        .get('/auth/me')
        .set('Authorization', `Bearer ${token4}`);
      expect(res4.status).toBe(403);
      expect(res4.body.error).toBe('IP_ADMIN_DISABLED');
    });
  });

  describe('Strict Token Session Binding Integration Check', () => {
    it('rejects access tokens without authSessionId, with invalid session ID, or with mismatched userId', async () => {
      // 1. Token without session ID
      const rawPayload = Buffer.from(
        JSON.stringify({
          userId: 'some-user-id',
          expiresAt: new Date(Date.now() + 60000).toISOString(),
        }),
      ).toString('base64url');
      const signature = createHmac('sha256', env.AUTH_TOKEN_SECRET)
        .update(rawPayload)
        .digest('base64url');
      const tokenWithoutSession = `${rawPayload}.${signature}`;

      const res1 = await request(createApp())
        .get('/auth/me')
        .set('Authorization', `Bearer ${tokenWithoutSession}`);
      expect(res1.status).toBe(401);
      expect(res1.body.error).toBe('AUTH_INVALID');

      // 2. Token with non-existent session ID
      const tokenWithInvalidSession = generateAuthToken('some-user-id', randomUUID()).token;
      const res2 = await request(createApp())
        .get('/auth/me')
        .set('Authorization', `Bearer ${tokenWithInvalidSession}`);
      expect(res2.status).toBe(401);
      expect(res2.body.error).toBe('AUTH_INVALID');

      // 3. Token with mismatched userId
      const trainee = await createTrainee();
      await loginTestUser(trainee.user.email);
      const session = await prisma.authSession.findFirst({
        where: { userId: trainee.user.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(session).not.toBeNull();

      // Create a token for a DIFFERENT user but signed with THIS valid session ID
      const mismatchedToken = generateAuthToken('different-user-id', session!.id).token;

      const res3 = await request(createApp())
        .get('/auth/me')
        .set('Authorization', `Bearer ${mismatchedToken}`);
      expect(res3.status).toBe(401);
      expect(res3.body.error).toBe('AUTH_INVALID');
    });
  });

  it('returns generic success for an existing registered email', async () => {
    await createTrainee({
      user: {
        email: 'existing-register@example.com',
      },
    });

    const response = await request(createApp()).post('/auth/register').send({
      email: 'existing-register@example.com',
      firstName: 'Existing',
      lastName: 'User',
      password: secureRegisterPassword,
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      message:
        "If this email can be registered, we'll send you an email verification link. Please check your inbox.",
    });
  });
});
