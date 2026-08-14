import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearAuthRateLimitStore } from '../../src/middleware/authRateLimit.js';
import { prisma } from '../../src/lib/prisma.js';
import { issueActionToken } from '../../src/services/action-token.service.js';
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
