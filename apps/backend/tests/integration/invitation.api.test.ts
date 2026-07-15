import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { clearAuthRateLimitStore } from '../../src/middleware/authRateLimit.js';
import { prisma } from '../../src/lib/prisma.js';
import { createInvitationTestFixture } from '../helpers/dbSeed.js';
import { loginTestUser } from '../helpers/auth.js';

describe('Invitation Acceptance Integration Tests', () => {
  beforeEach(() => {
    clearAuthRateLimitStore();
  });

  describe('GET /invitations/token/:token/context', () => {
    it('returns 200 OK with exact context matching the contract for a valid token', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture();

      const res = await request(app).get(`/invitations/token/${fixture.rawToken}/context`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        requiredAction: 'LOGIN_REQUIRED',
        rejectAllowed: true,
        status: 'PENDING',
        expiresAt: fixture.actionToken.expiresAt.toISOString(),
      });
    });

    it('returns 400 Bad Request when the token parameter is malformed', async () => {
      const app = createApp();
      const res = await request(app).get('/invitations/token/invalid-short-token/context');

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('returns privacy-safe 200 context with requiredAction: SWITCH_ACCOUNT when logged in as a different user', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture();
      const otherFixture = await createInvitationTestFixture();
      const loginRes = await loginTestUser(otherFixture.user.email);

      const res = await request(app)
        .get(`/invitations/token/${fixture.rawToken}/context`)
        .set('Authorization', `Bearer ${loginRes.body.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        requiredAction: 'SWITCH_ACCOUNT',
        rejectAllowed: true,
        status: 'PENDING',
        expiresAt: fixture.actionToken.expiresAt.toISOString(),
      });
      expect(res.body.invitationType).toBeUndefined();
      expect(res.body.roleGranted).toBeUndefined();
      expect(res.body.permissions).toBeUndefined();
    });
  });

  describe('POST /invitations/token/:token/accept', () => {
    it('returns 401 AUTH_REQUIRED when attempting to accept anonymously without bearer token', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture();

      const res = await request(app)
        .post(`/invitations/token/${fixture.rawToken}/accept`)
        .send({ confirmRoleChange: true });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('AUTH_REQUIRED');
    });

    it('returns 401 AUTH_REQUIRED when invalid or malformed bearer token is supplied without silently downgrading', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture();

      const res = await request(app)
        .post(`/invitations/token/${fixture.rawToken}/accept`)
        .set('Authorization', 'Bearer invalid.fake.token')
        .send({ confirmRoleChange: true });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('AUTH_REQUIRED');
    });

    it('returns 403 AUTH_USER_MISMATCH without exposing either email address when authenticated as wrong user', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture();
      const otherFixture = await createInvitationTestFixture();
      const loginRes = await loginTestUser(otherFixture.user.email);

      const res = await request(app)
        .post(`/invitations/token/${fixture.rawToken}/accept`)
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ confirmRoleChange: true });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('AUTH_USER_MISMATCH');
      expect(res.body.message).not.toContain(fixture.user.email);
      expect(res.body.message).not.toContain(otherFixture.user.email);
    });

    it('returns 409 SETUP_REQUIRED when attempting to generically accept a setup-owned purpose', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture({
        purpose: 'INITIAL_ORGANISATION_ADMIN_SETUP',
      });
      const loginRes = await loginTestUser(fixture.user.email);

      const res = await request(app)
        .post(`/invitations/token/${fixture.rawToken}/accept`)
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ confirmRoleChange: true });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('SETUP_REQUIRED');
    });

    it('returns REAUTHENTICATE session outcome when accepting PLATFORM_ADMIN_INVITE role', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture({
        purpose: 'PLATFORM_ADMIN_INVITE',
      });
      const loginRes = await loginTestUser(fixture.user.email);

      const res = await request(app)
        .post(`/invitations/token/${fixture.rawToken}/accept`)
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ confirmRoleChange: true });

      expect(res.status).toBe(200);
      expect(res.body.sessionOutcome).toBe('REAUTHENTICATE');
    });

    it('returns 409 CROSS_ORGANISATION_CONFLICT when user belongs to a different organisation', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture();
      const otherFixture = await createInvitationTestFixture();
      const loginRes = await loginTestUser(otherFixture.user.email);

      // Force otherFixture user's email to match invitation target email so it passes target match check
      // but belongs to otherFixture.organisation instead of fixture.organisation
      await prisma.user.update({
        where: { id: fixture.user.id },
        data: { email: 'unused-placeholder@example.com' },
      });
      await prisma.user.update({
        where: { id: otherFixture.user.id },
        data: { email: fixture.invitation.recipientEmail },
      });
      await prisma.actionToken.update({
        where: { id: fixture.actionToken.id },
        data: { userId: otherFixture.user.id },
      });

      const res = await request(app)
        .post(`/invitations/token/${fixture.rawToken}/accept`)
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ confirmRoleChange: true });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('CROSS_ORGANISATION_CONFLICT');
    });

    it('returns 200 OK and atomically updates database state when accepting a valid invitation', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture();
      const loginRes = await loginTestUser(fixture.user.email);

      const res = await request(app)
        .post(`/invitations/token/${fixture.rawToken}/accept`)
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ confirmRoleChange: true });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: 'Invitation accepted successfully.',
      });

      // Assert database state changes
      const dbInvitation = await prisma.invitation.findUnique({
        where: { id: fixture.invitation.id },
      });
      expect(dbInvitation?.status).toBe('ACCEPTED');
      expect(dbInvitation?.acceptedAt).not.toBeNull();

      const dbActionToken = await prisma.actionToken.findUnique({
        where: { id: fixture.actionToken.id },
      });
      expect(dbActionToken?.usedAt).not.toBeNull();

      const dbUser = await prisma.user.findUnique({
        where: { id: fixture.user.id },
        include: {
          traineeProfile: {
            include: {
              organisationTraineeProfile: true,
            },
          },
        },
      });
      expect(dbUser?.userType).toBe('ORGANISATION_TRAINEE');
      expect(dbUser?.authStatus).toBe('ACTIVE');
      expect(dbUser?.traineeProfile?.organisationTraineeProfile?.organisationId).toBe(
        fixture.organisation.id,
      );
      expect(dbUser?.traineeProfile?.organisationTraineeProfile?.membershipStatus).toBe('ACTIVE');

      const auditLogs = await prisma.auditLogEntry.findMany({
        where: {
          targetId: fixture.invitation.id,
          actionType: 'ACCEPTED',
        },
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]?.outcome).toBe('SUCCESS');
    });

    it('returns 409 Conflict when attempting to accept an already used token', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture({ actionTokenUsed: true });
      const loginRes = await loginTestUser(fixture.user.email);

      const res = await request(app)
        .post(`/invitations/token/${fixture.rawToken}/accept`)
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ confirmRoleChange: true });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('TOKEN_USED');
    });

    it('returns 409 Conflict when attempting to accept an expired token', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture({ actionTokenExpired: true });
      const loginRes = await loginTestUser(fixture.user.email);

      const res = await request(app)
        .post(`/invitations/token/${fixture.rawToken}/accept`)
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ confirmRoleChange: true });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('INVITATION_EXPIRED');
    });

    it('returns 400 Bad Request when token is malformed UUID', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture();
      const loginRes = await loginTestUser(fixture.user.email);

      const res = await request(app)
        .post('/invitations/token/malformed-token-string/accept')
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('returns 409 Conflict when attempting to accept an invite for a suspended organisation', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture();
      const loginRes = await loginTestUser(fixture.user.email);

      await prisma.organisation.update({
        where: { id: fixture.organisation.id },
        data: { status: 'SUSPENDED' },
      });

      const res = await request(app)
        .post(`/invitations/token/${fixture.rawToken}/accept`)
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ confirmRoleChange: true });

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /invitations/token/:token/reject', () => {
    it('returns 200 OK and atomically updates database state when rejecting a valid invitation', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture();

      const res = await request(app)
        .post(`/invitations/token/${fixture.rawToken}/reject`)
        .send({ rejectionReason: 'Not interested in training at this time' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        message: 'Invitation rejected successfully.',
      });

      // Assert database state changes
      const dbInvitation = await prisma.invitation.findUnique({
        where: { id: fixture.invitation.id },
      });
      expect(dbInvitation?.status).toBe('REJECTED');

      const dbActionToken = await prisma.actionToken.findUnique({
        where: { id: fixture.actionToken.id },
      });
      expect(dbActionToken?.usedAt).not.toBeNull();

      const auditLogs = await prisma.auditLogEntry.findMany({
        where: {
          targetId: fixture.invitation.id,
          actionType: 'REJECTED',
        },
      });
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]?.outcome).toBe('SUCCESS');
    });

    it('returns 400 Bad Request when token is malformed', async () => {
      const app = createApp();
      const res = await request(app).post('/invitations/token/not-a-valid-token/reject').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });
});
