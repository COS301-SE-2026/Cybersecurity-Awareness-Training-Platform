import { randomUUID } from 'crypto';
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
        requiredAction: 'CONTINUE_SETUP',
        rejectAllowed: true,
        status: 'PENDING',
        expiresAt: fixture.actionToken.expiresAt.toISOString(),
      });
    });

    it('returns 400 Bad Request when the token parameter is malformed', async () => {
      const app = createApp();
      const res = await request(app).get('/invitations/token/invalid-short-token/context');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 401 AUTH_INVALID when invalid or malformed bearer token is supplied on GET /context without silently falling back to anonymous', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture();

      const res = await request(app)
        .get(`/invitations/token/${fixture.rawToken}/context`)
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('AUTH_INVALID');
    });

    it('returns 200 OK context with LOGIN_REQUIRED when checking action-token-only platform-admin upgrade path anonymously', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture({
        purpose: 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
      });

      expect(fixture.invitation).toBeNull();

      const res = await request(app).get(`/invitations/token/${fixture.rawToken}/context`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        requiredAction: 'LOGIN_REQUIRED',
        rejectAllowed: false,
        status: 'PENDING',
        expiresAt: fixture.actionToken.expiresAt.toISOString(),
      });
    });

    it('returns 200 OK context with CONFIRM_ROLE_CHANGE when checking action-token-only platform-admin upgrade path authenticated', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture({
        purpose: 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
      });
      const loginRes = await loginTestUser(fixture.user.email);

      expect(fixture.invitation).toBeNull();

      const res = await request(app)
        .get(`/invitations/token/${fixture.rawToken}/context`)
        .set('Authorization', `Bearer ${loginRes.body.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        requiredAction: 'CONFIRM_ROLE_CHANGE',
        rejectAllowed: false,
        status: 'PENDING',
        expiresAt: fixture.actionToken.expiresAt.toISOString(),
        invitationType: 'PLATFORM_ADMIN',
        roleGranted: 'PLATFORM_ADMIN',
      });
    });

    it('returns privacy-safe 200 context with requiredAction: SWITCH_ACCOUNT when logged in as a different user', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture();
      const otherFixture = await createInvitationTestFixture();
      const otherLoginRes = await loginTestUser(otherFixture.user.email);

      const res = await request(app)
        .get(`/invitations/token/${fixture.rawToken}/context`)
        .set('Authorization', `Bearer ${otherLoginRes.body.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        requiredAction: 'SWITCH_ACCOUNT',
        rejectAllowed: true,
        status: 'PENDING',
        expiresAt: fixture.actionToken.expiresAt.toISOString(),
      });
    });
  });

  describe('POST /invitations/token/:token/accept', () => {
    it('returns 401 AUTH_REQUIRED when attempting to accept anonymously without bearer token', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture();

      const res = await request(app).post(`/invitations/token/${fixture.rawToken}/accept`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('AUTH_REQUIRED');
    });

    it('returns 401 AUTH_REQUIRED when invalid or malformed bearer token is supplied without silently downgrading', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture();

      const res = await request(app)
        .post(`/invitations/token/${fixture.rawToken}/accept`)
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('AUTH_INVALID');
    });

    it('returns 403 AUTH_USER_MISMATCH without exposing either email address when authenticated as wrong user', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture({
        purpose: 'ORGANISATION_ADMIN_PROMOTION',
      });
      const otherFixture = await createInvitationTestFixture();
      const otherLoginRes = await loginTestUser(otherFixture.user.email);

      const res = await request(app)
        .post(`/invitations/token/${fixture.rawToken}/accept`)
        .set('Authorization', `Bearer ${otherLoginRes.body.token}`)
        .send({ confirmRoleChange: true });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('AUTH_USER_MISMATCH');
      expect(JSON.stringify(res.body)).not.toContain(fixture.invitation!.recipientEmail);
      expect(JSON.stringify(res.body)).not.toContain(otherFixture.user.email);
    });

    it('returns 409 SETUP_REQUIRED when attempting to generically accept a setup-owned purpose', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture({
        purpose: 'ORGANISATION_TRAINEE_INVITE',
      });
      const loginRes = await loginTestUser(fixture.user.email);

      const res = await request(app)
        .post(`/invitations/token/${fixture.rawToken}/accept`)
        .set('Authorization', `Bearer ${loginRes.body.token}`);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('SETUP_REQUIRED');
    });

    it('returns REAUTHENTICATE session outcome when accepting PLATFORM_ADMIN_UPGRADE_CONFIRMATION role without an associated invitation record', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture({
        purpose: 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
      });
      const loginRes = await loginTestUser(fixture.user.email);

      expect(fixture.invitation).toBeNull();

      const res = await request(app)
        .post(`/invitations/token/${fixture.rawToken}/accept`)
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ confirmRoleChange: true });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        message: 'Invitation accepted successfully.',
        sessionOutcome: 'REAUTHENTICATE',
      });
    });

    it('rejects an active organisation administrator attempting to accept a platform-admin upgrade', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture({
        purpose: 'PLATFORM_ADMIN_UPGRADE_CONFIRMATION',
        userType: 'ORGANISATION_ADMIN',
      });
      await prisma.organisationAdminProfile.create({
        data: {
          userId: fixture.user.id,
          organisationId: fixture.organisation.id,
          adminStatus: 'ACTIVE',
          isInitialAdmin: false,
        },
      });
      const loginRes = await loginTestUser(fixture.user.email);

      const res = await request(app)
        .post(`/invitations/token/${fixture.rawToken}/accept`)
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ confirmRoleChange: true });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('ROLE_TRANSITION_CONFLICT');
    });

    it('proves atomic concurrency guarantees by racing two concurrent accept requests via Promise.all, ensuring exactly one succeeds and one returns 409 Conflict', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture({
        purpose: 'ORGANISATION_ADMIN_PROMOTION',
      });
      const loginRes = await loginTestUser(fixture.user.email);

      const [res1, res2] = await Promise.all([
        request(app)
          .post(`/invitations/token/${fixture.rawToken}/accept`)
          .set('Authorization', `Bearer ${loginRes.body.token}`)
          .send({ confirmRoleChange: true }),
        request(app)
          .post(`/invitations/token/${fixture.rawToken}/accept`)
          .set('Authorization', `Bearer ${loginRes.body.token}`)
          .send({ confirmRoleChange: true }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);
    });

    it('returns 409 CROSS_ORGANISATION_CONFLICT when user belongs to a different organisation', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture({
        purpose: 'ORGANISATION_ADMIN_PROMOTION',
      });
      const otherFixture = await createInvitationTestFixture();
      await prisma.organisationTraineeProfile.create({
        data: {
          id: randomUUID(),
          traineeProfileId: otherFixture.trainee.traineeProfile.id,
          organisationId: otherFixture.organisation.id,
          membershipStatus: 'ACTIVE',
        },
      });
      const loginRes = await loginTestUser(otherFixture.user.email);

      // Force otherFixture user's email to match invitation target email so it passes target match check
      // but belongs to otherFixture.organisation instead of fixture.organisation
      await prisma.user.update({
        where: { id: fixture.user.id },
        data: { email: 'unused-placeholder@example.com' },
      });
      await prisma.user.update({
        where: { id: otherFixture.user.id },
        data: { email: fixture.invitation!.recipientEmail },
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
      const fixture = await createInvitationTestFixture({
        purpose: 'ORGANISATION_ADMIN_PROMOTION',
      });
      const loginRes = await loginTestUser(fixture.user.email);

      const res = await request(app)
        .post(`/invitations/token/${fixture.rawToken}/accept`)
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ confirmRoleChange: true });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        message: 'Invitation accepted successfully.',
      });

      // Assert database state changes
      const dbInvitation = await prisma.invitation.findUnique({
        where: { id: fixture.invitation!.id },
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
          organisationAdminProfile: true,
        },
      });
      expect(dbUser?.userType).toBe('ORGANISATION_ADMIN');
      expect(dbUser?.authStatus).toBe('ACTIVE');
      expect(dbUser?.organisationAdminProfile?.organisationId).toBe(fixture.organisation.id);

      const auditLogs = await prisma.auditLogEntry.findMany({
        where: {
          targetId: fixture.invitation!.id,
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
        where: { id: fixture.invitation!.id },
      });
      expect(dbInvitation?.status).toBe('REJECTED');

      const dbActionToken = await prisma.actionToken.findUnique({
        where: { id: fixture.actionToken.id },
      });
      expect(dbActionToken?.usedAt).not.toBeNull();

      const auditLogs = await prisma.auditLogEntry.findMany({
        where: {
          targetId: fixture.invitation!.id,
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

    it('returns 401 AUTH_INVALID when invalid or malformed bearer token is supplied on POST /reject without silently falling back to anonymous', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture();

      const res = await request(app)
        .post(`/invitations/token/${fixture.rawToken}/reject`)
        .set('Authorization', 'Bearer invalid.jwt.token')
        .send({ rejectionReason: 'Testing invalid token' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('AUTH_INVALID');
    });

    it('proves atomic concurrency guarantees by racing two concurrent reject requests via Promise.all, ensuring exactly one succeeds and one returns 409 Conflict', async () => {
      const app = createApp();
      const fixture = await createInvitationTestFixture();

      const [res1, res2] = await Promise.all([
        request(app)
          .post(`/invitations/token/${fixture.rawToken}/reject`)
          .send({ rejectionReason: 'Reason 1' }),
        request(app)
          .post(`/invitations/token/${fixture.rawToken}/reject`)
          .send({ rejectionReason: 'Reason 2' }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);
    });
  });
});
