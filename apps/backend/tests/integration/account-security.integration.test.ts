import request from 'supertest';
import { readFile } from 'node:fs/promises';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearAuthRateLimitStore } from '../../src/middleware/authRateLimit.js';
import { prisma } from '../../src/lib/prisma.js';
import { issueActionToken } from '../../src/services/action-token.service.js';
import { verifyPassword } from '../../src/services/password.service.js';
import { testUserPassword } from '../helpers/auth.js';
import {
  createAccountSecuritySession,
  createAccountSecurityUserFixture,
  loginAccountSecurityUser,
  readAccountEmailDeliveries,
  readAccountSecurityUserState,
  readLatestEmailChangeRequest,
} from '../helpers/account-security.js';

const app = createApp();
const confirmationEmailType = 'EMAIL_CHANGE_CONFIRMATION';
const emailChangePurpose = 'EMAIL_CHANGE_VERIFICATION';
const changedPassword = 'UpdatedPassword1!';

function futureDate() {
  return new Date(Date.now() + 60 * 60 * 1000);
}

function pastDate() {
  return new Date(Date.now() - 60 * 60 * 1000);
}

function changeEmailPayload(newEmail: string, password = testUserPassword) {
  return {
    newEmail,
    confirmNewEmail: newEmail,
    password,
  };
}

function changePasswordPayload(currentPassword = testUserPassword, newPassword = changedPassword) {
  return {
    currentPassword,
    newPassword,
    confirmNewPassword: newPassword,
  };
}

function refreshCookie(rawRefreshToken: string) {
  return [`refreshToken=${rawRefreshToken}`];
}

async function createPendingEmailChangeToken(input: {
  userId: string;
  currentEmail: string;
  requestedEmail: string;
  requestExpiresAt?: Date;
  tokenExpiresAt?: Date;
}) {
  const emailChangeRequest = await prisma.emailChangeRequest.create({
    data: {
      userId: input.userId,
      currentEmail: input.currentEmail,
      RequestedEmail: input.requestedEmail,
      expiresAt: input.requestExpiresAt ?? futureDate(),
    },
  });
  const actionToken = await issueActionToken({
    purpose: emailChangePurpose,
    userId: input.userId,
    emailChangeRequestId: emailChangeRequest.id,
    targetEmail: input.requestedEmail,
    expiresAt: input.tokenExpiresAt ?? futureDate(),
  });

  return {
    emailChangeRequest,
    actionToken,
    rawToken: actionToken.rawToken,
  };
}

describe('account security integration - change email lifecycle', () => {
  beforeEach(() => {
    clearAuthRateLimitStore();
  });

  it('requests an email change through the authenticated account endpoint', async () => {
    const fixture = await createAccountSecurityUserFixture();
    const login = await loginAccountSecurityUser(fixture.user.email);
    const requestedEmail = 'requested-account-email@example.com';

    const response = await request(app)
      .post('/account/change-email')
      .set(login.headers)
      .send(changeEmailPayload(requestedEmail));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message:
        'If this email change can be completed, a confirmation email has been queued for delivery to the new address.',
      emailQueued: true,
    });

    const latestRequest = await readLatestEmailChangeRequest(fixture.user.id);
    expect(latestRequest).toMatchObject({
      userId: fixture.user.id,
      currentEmail: fixture.user.email,
      RequestedEmail: requestedEmail,
      status: 'PENDING',
    });
    expect(latestRequest?.actionTokens).toHaveLength(1);
    expect(latestRequest?.actionTokens[0]).toMatchObject({
      purpose: emailChangePurpose,
      userId: fixture.user.id,
      targetEmail: requestedEmail,
      usedAt: null,
      revokedAt: null,
    });

    const deliveries = await readAccountEmailDeliveries(fixture.user.id);
    expect(deliveries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          emailType: confirmationEmailType,
          deliveryStatus: 'PENDING',
          actionTokenId: latestRequest?.actionTokens[0]?.id,
          fallbackRelatedEntityType: 'EMAIL_CHANGE_REQUEST',
          fallbackRelatedEntityId: latestRequest?.id,
        }),
        expect.objectContaining({
          emailType: 'EMAIL_CHANGE_WARNING',
          deliveryStatus: 'PENDING',
          actionTokenId: null,
          fallbackRelatedEntityType: 'EMAIL_CHANGE_REQUEST',
          fallbackRelatedEntityId: latestRequest?.id,
        }),
      ]),
    );
  });

  it('rejects invalid change-email request bodies safely', async () => {
    const fixture = await createAccountSecurityUserFixture();
    const login = await loginAccountSecurityUser(fixture.user.email);

    const response = await request(app).post('/account/change-email').set(login.headers).send({
      newEmail: 'new@example.com',
      confirmNewEmail: 'different@example.com',
      password: testUserPassword,
    });

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      error: 'VALIDATION_ERROR',
      details: expect.arrayContaining([
        expect.objectContaining({
          field: 'confirmNewEmail',
        }),
      ]),
    });

    const latestRequest = await readLatestEmailChangeRequest(fixture.user.id);
    expect(latestRequest).toBeNull();
  });

  it('returns a safe conflict when the requested email already belongs to another user', async () => {
    const fixture = await createAccountSecurityUserFixture();
    const existingUser = await createAccountSecurityUserFixture();
    const login = await loginAccountSecurityUser(fixture.user.email);

    const response = await request(app)
      .post('/account/change-email')
      .set(login.headers)
      .send(changeEmailPayload(existingUser.user.email));

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      error: 'ACCOUNT_EMAIL_EXISTS',
      message: 'The requested email address is already in use.',
    });
    expect(JSON.stringify(response.body)).not.toContain(existingUser.user.email);

    const latestRequest = await readLatestEmailChangeRequest(fixture.user.id);
    expect(latestRequest).toBeNull();
  });

  it('rejects an expired confirmation request without changing the user email', async () => {
    const fixture = await createAccountSecurityUserFixture();
    const requestedEmail = 'expired-change@example.com';
    const { rawToken, emailChangeRequest } = await createPendingEmailChangeToken({
      userId: fixture.user.id,
      currentEmail: fixture.user.email,
      requestedEmail,
      requestExpiresAt: pastDate(),
    });

    const response = await request(app).post('/account/verify-email-change').send({
      token: rawToken,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ state: 'EXPIRED' });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: fixture.user.id } });
    expect(user.email).toBe(fixture.user.email);

    const updatedRequest = await prisma.emailChangeRequest.findUniqueOrThrow({
      where: { id: emailChangeRequest.id },
    });
    expect(updatedRequest.status).toBe('EXPIRED');

    const token = await prisma.actionToken.findFirstOrThrow({
      where: { emailChangeRequestId: emailChangeRequest.id },
    });
    expect(token.usedAt).toBeNull();
  });

  it('confirms a valid email-change token and revokes active sessions and refresh tokens', async () => {
    const fixture = await createAccountSecurityUserFixture();
    const login = await loginAccountSecurityUser(fixture.user.email);
    await createAccountSecuritySession({
      userId: fixture.user.id,
      deviceSummary: 'Second browser',
      locationSummary: 'Test location',
    });
    const requestedEmail = 'confirmed-change@example.com';
    const { rawToken, emailChangeRequest } = await createPendingEmailChangeToken({
      userId: fixture.user.id,
      currentEmail: fixture.user.email,
      requestedEmail,
    });

    const response = await request(app).post('/account/verify-email-change').send({
      token: rawToken,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ state: 'VALID' });

    const state = await readAccountSecurityUserState(fixture.user.id);
    expect(state.email).toBe(requestedEmail);
    expect(state.emailVerifiedAt).toBeInstanceOf(Date);
    expect(state.authSessions.length).toBeGreaterThanOrEqual(2);
    expect(state.authSessions.every((session) => session.revokedReason === 'EMAIL_CHANGE')).toBe(
      true,
    );
    expect(
      state.authSessions
        .flatMap((session) => session.refreshTokens)
        .every((refreshToken) => refreshToken.revokedReason === 'EMAIL_CHANGE'),
    ).toBe(true);
    expect(state.authSessions.map((session) => session.id)).toContain(login.currentSession.id);

    const confirmedRequest = await prisma.emailChangeRequest.findUniqueOrThrow({
      where: { id: emailChangeRequest.id },
    });
    expect(confirmedRequest.status).toBe('CONFIRMED');
    expect(confirmedRequest.confirmedAt).toBeInstanceOf(Date);
  });

  it('does not allow a used confirmation token to be reused', async () => {
    const fixture = await createAccountSecurityUserFixture();
    const requestedEmail = 'used-token-change@example.com';
    const { rawToken } = await createPendingEmailChangeToken({
      userId: fixture.user.id,
      currentEmail: fixture.user.email,
      requestedEmail,
    });

    const firstResponse = await request(app).post('/account/verify-email-change').send({
      token: rawToken,
    });
    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body).toEqual({ state: 'VALID' });

    const secondResponse = await request(app).post('/account/verify-email-change').send({
      token: rawToken,
    });
    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body).toEqual({ state: 'USED' });

    const state = await readAccountSecurityUserState(fixture.user.id);
    expect(state.email).toBe(requestedEmail);
    expect(state.emailChangeRequests).toHaveLength(1);
  });

  it('denies a token whose email-change request belongs to a different user', async () => {
    const tokenOwner = await createAccountSecurityUserFixture();
    const otherUser = await createAccountSecurityUserFixture();
    const requestedEmail = 'cross-user-change@example.com';
    const emailChangeRequest = await prisma.emailChangeRequest.create({
      data: {
        userId: otherUser.user.id,
        currentEmail: otherUser.user.email,
        RequestedEmail: requestedEmail,
        expiresAt: futureDate(),
      },
    });
    const actionToken = await issueActionToken({
      purpose: emailChangePurpose,
      userId: tokenOwner.user.id,
      emailChangeRequestId: emailChangeRequest.id,
      targetEmail: requestedEmail,
      expiresAt: futureDate(),
    });

    const response = await request(app).post('/account/verify-email-change').send({
      token: actionToken.rawToken,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ state: 'INVALID' });
    expect(JSON.stringify(response.body)).not.toContain(tokenOwner.user.email);
    expect(JSON.stringify(response.body)).not.toContain(otherUser.user.email);

    const tokenOwnerState = await readAccountSecurityUserState(tokenOwner.user.id);
    const otherUserState = await readAccountSecurityUserState(otherUser.user.id);
    expect(tokenOwnerState.email).toBe(tokenOwner.user.email);
    expect(otherUserState.email).toBe(otherUser.user.email);
  });
});

describe('account security integration - password and session lifecycle', () => {
  beforeEach(() => {
    clearAuthRateLimitStore();
  });

  it('rejects an incorrect current password without changing password material', async () => {
    const fixture = await createAccountSecurityUserFixture();
    const login = await loginAccountSecurityUser(fixture.user.email);

    const response = await request(app)
      .post('/account/change-password')
      .set(login.headers)
      .send(changePasswordPayload('wrong-password'));

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      error: 'ACCOUNT_CURRENT_PASSWORD_INVALID',
    });

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: fixture.user.id },
    });
    expect(user.passwordHash).toBe(fixture.user.passwordHash);
    expect(await verifyPassword(changedPassword, user.passwordHash)).toBe(false);

    const state = await readAccountSecurityUserState(fixture.user.id);
    expect(state.authSessions.some((session) => session.revokedAt !== null)).toBe(false);
  });

  it('changes the password, revokes active sessions and refresh tokens, and queues notification work', async () => {
    const fixture = await createAccountSecurityUserFixture();
    const login = await loginAccountSecurityUser(fixture.user.email);
    const otherSession = await createAccountSecuritySession({
      userId: fixture.user.id,
      deviceSummary: 'Second browser',
      locationSummary: 'Cape Town',
    });

    const response = await request(app)
      .post('/account/change-password')
      .set(login.headers)
      .send(changePasswordPayload());

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Password changed successfully.',
      notificationQueued: true,
      revokedSessionCount: 2,
    });

    const state = await readAccountSecurityUserState(fixture.user.id);
    expect(await verifyPassword(changedPassword, state.passwordHash)).toBe(true);
    expect(state.authSessions).toHaveLength(2);
    expect(state.authSessions.every((session) => session.revokedReason === 'PASSWORD_CHANGE')).toBe(
      true,
    );
    expect(
      state.authSessions
        .flatMap((session) => session.refreshTokens)
        .every((refreshToken) => refreshToken.revokedReason === 'PASSWORD_CHANGE'),
    ).toBe(true);
    expect(state.authSessions.map((session) => session.id)).toEqual(
      expect.arrayContaining([login.currentSession.id, otherSession.session.id]),
    );

    const deliveries = await readAccountEmailDeliveries(fixture.user.id);
    expect(deliveries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          emailType: 'PASSWORD_CHANGED',
          deliveryStatus: 'PENDING',
          actionTokenId: null,
        }),
      ]),
    );

    const refreshResponse = await request(app)
      .post('/auth/refresh')
      .set('Cookie', refreshCookie(otherSession.rawRefreshToken));
    expect(refreshResponse.status).toBe(401);
    expect(refreshResponse.body).toMatchObject({
      error: 'AUTH_INVALID',
    });
  });

  it('lists only the authenticated user sessions without exposing token material', async () => {
    const fixture = await createAccountSecurityUserFixture();
    const otherUser = await createAccountSecurityUserFixture();
    const login = await loginAccountSecurityUser(fixture.user.email);
    const otherSession = await createAccountSecuritySession({
      userId: fixture.user.id,
      deviceSummary: 'Tablet browser',
      locationSummary: 'Johannesburg',
    });
    await createAccountSecuritySession({
      userId: otherUser.user.id,
      deviceSummary: 'Other user browser',
      locationSummary: 'Pretoria',
    });

    const response = await request(app).get('/account/sessions').set(login.headers);

    expect(response.status).toBe(200);
    expect(response.body.sessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: login.currentSession.id,
          current: true,
        }),
        expect.objectContaining({
          id: otherSession.session.id,
          current: false,
          deviceSummary: 'Tablet browser',
          locationSummary: 'Johannesburg',
        }),
      ]),
    );
    expect(response.body.sessions).toHaveLength(2);
    expect(JSON.stringify(response.body)).not.toContain('tokenHash');
    expect(JSON.stringify(response.body)).not.toContain('refreshToken');
    expect(JSON.stringify(response.body)).not.toContain('ipAddress');
    expect(JSON.stringify(response.body)).not.toContain('userAgent');
  });

  it('revokes an owned non-current session and its refresh tokens', async () => {
    const fixture = await createAccountSecurityUserFixture();
    const login = await loginAccountSecurityUser(fixture.user.email);
    const otherSession = await createAccountSecuritySession({
      userId: fixture.user.id,
    });

    const response = await request(app)
      .delete(`/account/sessions/${otherSession.session.id}`)
      .set(login.headers);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ revoked: true });

    const state = await readAccountSecurityUserState(fixture.user.id);
    const revokedSession = state.authSessions.find(
      (session) => session.id === otherSession.session.id,
    );
    const currentSession = state.authSessions.find(
      (session) => session.id === login.currentSession.id,
    );
    expect(revokedSession?.revokedReason).toBe('LOGOUT');
    expect(
      revokedSession?.refreshTokens.every(
        (refreshToken) => refreshToken.revokedReason === 'LOGOUT',
      ),
    ).toBe(true);
    expect(currentSession?.revokedAt).toBeNull();
  });

  it('does not allow a user to revoke another user session', async () => {
    const fixture = await createAccountSecurityUserFixture();
    const otherUser = await createAccountSecurityUserFixture();
    const login = await loginAccountSecurityUser(fixture.user.email);
    const otherUserSession = await createAccountSecuritySession({
      userId: otherUser.user.id,
    });

    const response = await request(app)
      .delete(`/account/sessions/${otherUserSession.session.id}`)
      .set(login.headers);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      error: 'ACCOUNT_NOT_FOUND',
    });
    expect(JSON.stringify(response.body)).not.toContain(otherUser.user.email);

    const otherUserState = await readAccountSecurityUserState(otherUser.user.id);
    const untouchedSession = otherUserState.authSessions.find(
      (session) => session.id === otherUserSession.session.id,
    );
    expect(untouchedSession?.revokedAt).toBeNull();
  });

  it('allows direct current-session revocation and rejects the revoked refresh token', async () => {
    const fixture = await createAccountSecurityUserFixture();
    const login = await loginAccountSecurityUser(fixture.user.email);

    const response = await request(app)
      .delete(`/account/sessions/${login.currentSession.id}`)
      .set(login.headers);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ revoked: true });

    const state = await readAccountSecurityUserState(fixture.user.id);
    const currentSession = state.authSessions.find(
      (session) => session.id === login.currentSession.id,
    );
    expect(currentSession?.revokedReason).toBe('LOGOUT');

    const refreshResponse = await request(app).post('/auth/refresh').set('Cookie', login.cookies);
    expect(refreshResponse.status).toBe(401);
    expect(refreshResponse.body).toMatchObject({
      error: 'AUTH_INVALID',
    });
  });

  it('logs out other sessions while preserving the current session and refresh token', async () => {
    const fixture = await createAccountSecurityUserFixture();
    const login = await loginAccountSecurityUser(fixture.user.email);
    const otherSession = await createAccountSecuritySession({
      userId: fixture.user.id,
    });

    const response = await request(app).post('/account/sessions/logout-others').set(login.headers);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ revokedSessionCount: 1 });

    const state = await readAccountSecurityUserState(fixture.user.id);
    const currentSession = state.authSessions.find(
      (session) => session.id === login.currentSession.id,
    );
    const revokedSession = state.authSessions.find(
      (session) => session.id === otherSession.session.id,
    );

    expect(currentSession?.revokedAt).toBeNull();
    expect(
      currentSession?.refreshTokens.every((refreshToken) => refreshToken.revokedAt === null),
    ).toBe(true);
    expect(revokedSession?.revokedReason).toBe('LOGOUT_ALL');
    expect(
      revokedSession?.refreshTokens.every(
        (refreshToken) => refreshToken.revokedReason === 'LOGOUT_ALL',
      ),
    ).toBe(true);

    const refreshResponse = await request(app).post('/auth/refresh').set('Cookie', login.cookies);
    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body).toMatchObject({
      tokenType: 'Bearer',
    });
  });
});

describe('account security integration - account boundary checks', () => {
  it('keeps account routes and controllers free of direct Prisma/repository access', async () => {
    const [routesSource, controllerSource] = await Promise.all([
      readFile(new URL('../../src/routes/account.routes.ts', import.meta.url), 'utf8'),
      readFile(new URL('../../src/controllers/account.controller.ts', import.meta.url), 'utf8'),
    ]);

    expect(routesSource).not.toContain('../lib/prisma');
    expect(routesSource).not.toContain('../repositories/');
    expect(controllerSource).not.toContain('../lib/prisma');
    expect(controllerSource).not.toContain('../repositories/');
  });

  it('keeps account service behind repository and transaction helpers instead of direct Prisma client use', async () => {
    const serviceSource = await readFile(
      new URL('../../src/services/account.service.ts', import.meta.url),
      'utf8',
    );

    expect(serviceSource).not.toContain("from '../lib/prisma.js'");
    expect(serviceSource).not.toMatch(/\bprisma\./);
    expect(serviceSource).toContain('runAccountTransaction');
  });
});
