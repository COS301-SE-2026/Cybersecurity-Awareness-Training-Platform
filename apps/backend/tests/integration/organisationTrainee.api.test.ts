import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const sendMailMock = vi.hoisted(() => vi.fn());
const nodemailerMock = vi.hoisted(() => ({
  createTransport: vi.fn(() => ({ sendMail: sendMailMock })),
}));
vi.mock('nodemailer', () => ({ default: nodemailerMock }));
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { clearApiRateLimitStore } from '../../src/middleware/apiRateLimit.js';
import { clearAuthRateLimitStore } from '../../src/middleware/authRateLimit.js';
import { clearOrganisationTraineeRateLimitStores } from '../../src/routes/organisation-trainee.routes.js';
import { loginOrganisationAdmin, testUserPassword } from '../helpers/auth.js';
import { createOrganisation, createTrainee } from '../helpers/factories.js';

describe('Organisation Trainee API Integration Tests', () => {
  let app: ReturnType<typeof createApp>;
  let fixture: Awaited<ReturnType<typeof loginOrganisationAdmin>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    clearAuthRateLimitStore();
    await clearApiRateLimitStore();
    await clearOrganisationTraineeRateLimitStores();
    sendMailMock.mockResolvedValue({ messageId: 'smtpmessage01' });

    app = createApp();
    fixture = await loginOrganisationAdmin();
  });

  describe('Invite & List Trainees', () => {
    it('creates a trainee invitation and returns 201, updating database state and calling email mock', async () => {
      const payload = {
        email: 'invitee.test@example.com',
        firstName: 'Invitee',
        lastName: 'Person',
      };

      const response = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: 'Invitation sent successfully.',
        invitation: expect.objectContaining({
          email: 'invitee.test@example.com',
          firstName: 'Invitee',
          lastName: 'Person',
          status: 'SENT',
        }),
      });

      const invitation = await prisma.invitation.findFirstOrThrow({
        where: {
          organisationId: fixture.organisation.id,
          recipientEmail: 'invitee.test@example.com',
        },
      });
      expect(invitation.status).toBe('SENT');
      expect(invitation.purpose).toBe('ORGANISATION_TRAINEE_INVITE');

      const actionToken = await prisma.actionToken.findFirstOrThrow({
        where: { invitationId: invitation.id },
      });
      expect(actionToken.purpose).toBe('ORGANISATION_TRAINEE_INVITE');
      expect(actionToken.targetEmail).toBeNull();
      expect(actionToken.usedAt).toBeNull();
      expect(actionToken.revokedAt).toBeNull();

      const deliveryLog = await prisma.emailDeliveryLog.findFirstOrThrow({
        where: { invitationId: invitation.id },
      });
      expect(deliveryLog.recipientEmail).toBe('invitee.test@example.com');
      expect(deliveryLog.emailType).toBe('ORGANISATION_TRAINEE_INVITE');
      expect(deliveryLog.deliveryStatus).toBe('SENT');

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'invitee.test@example.com',
          subject: expect.stringContaining("You're invited to join"),
          text: expect.stringContaining('/setup/token/'),
          html: expect.stringContaining('/setup/token/'),
        }),
      );

      const auditLog = await prisma.auditLogEntry.findFirstOrThrow({
        where: {
          organisationId: fixture.organisation.id,
          actionType: 'INVITED',
        },
      });
      expect(auditLog.targetId).toBe(invitation.id);
      expect(auditLog.targetType).toBe('INVITATION');
      expect(auditLog.outcome).toBe('SUCCESS');
    });

    it('lists organisation trainees and pending invitations returning 200 OK', async () => {
      await createTrainee({
        user: {
          email: 'active.trainee@example.com',
          firstName: 'Active',
          lastName: 'User',
        },
        organisationProfile: {
          organisationId: fixture.organisation.id,
        },
      });

      await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({ email: 'pending.trainee@example.com' });

      const response = await request(app)
        .get(`/organisations/${fixture.organisation.id}/trainees`)
        .set('Authorization', `Bearer ${fixture.token}`);

      expect(response.status).toBe(200);
      expect(response.body.trainees).toContainEqual(
        expect.objectContaining({
          email: 'active.trainee@example.com',
          status: 'ACTIVE',
        }),
      );
      expect(response.body.pendingInvitations).toContainEqual(
        expect.objectContaining({
          email: 'pending.trainee@example.com',
        }),
      );
    });
  });

  describe('Resend & Revoke Invitations', () => {
    it('resends a trainee invitation, revoking old token, issuing a new token, and recording audit log', async () => {
      const inviteRes = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({ email: 'resend.target@example.com' });

      expect(inviteRes.status).toBe(201);
      const invId = inviteRes.body.invitation.id;

      const firstToken = await prisma.actionToken.findFirstOrThrow({
        where: { invitationId: invId },
      });
      expect(firstToken.revokedAt).toBeNull();

      sendMailMock.mockClear();

      const response = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations/${invId}/resend`)
        .set('Authorization', `Bearer ${fixture.token}`);

      expect(response.status).toBe(200);

      const oldTokenDb = await prisma.actionToken.findUniqueOrThrow({
        where: { id: firstToken.id },
      });
      expect(oldTokenDb.revokedAt).not.toBeNull();

      const allTokens = await prisma.actionToken.findMany({
        where: { invitationId: invId },
        orderBy: { createdAt: 'asc' },
      });
      expect(allTokens).toHaveLength(2);
      expect(allTokens[1].id).not.toBe(firstToken.id);
      expect(allTokens[1].revokedAt).toBeNull();

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'resend.target@example.com',
          text: expect.stringContaining('/setup/token/'),
          html: expect.stringContaining('/setup/token/'),
        }),
      );

      const auditLog = await prisma.auditLogEntry.findFirstOrThrow({
        where: {
          organisationId: fixture.organisation.id,
          actionType: 'RESENT',
        },
      });
      expect(auditLog.targetId).toBe(invId);
      expect(auditLog.targetType).toBe('INVITATION');
      expect(auditLog.outcome).toBe('SUCCESS');
    });

    it('revokes a trainee invitation, updating status to REVOKED and revoking active tokens', async () => {
      const inviteRes = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({ email: 'revoke.target@example.com' });

      expect(inviteRes.status).toBe(201);
      const invId = inviteRes.body.invitation.id;

      const response = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations/${invId}/revoke`)
        .set('Authorization', `Bearer ${fixture.token}`);

      expect(response.status).toBe(200);

      const invDb = await prisma.invitation.findUniqueOrThrow({
        where: { id: invId },
      });
      expect(invDb.status).toBe('REVOKED');

      const activeTokens = await prisma.actionToken.findMany({
        where: { invitationId: invId, revokedAt: null },
      });
      expect(activeTokens).toHaveLength(0);

      const auditLog = await prisma.auditLogEntry.findFirstOrThrow({
        where: {
          organisationId: fixture.organisation.id,
          actionType: 'REVOKED',
        },
      });
      expect(auditLog.targetId).toBe(invId);
      expect(auditLog.outcome).toBe('SUCCESS');
    });
  });

  describe('Disable Trainee', () => {
    it('disables a trainee, marks profile DISABLED, revokes active sessions, sends notification, and logs audit', async () => {
      const traineeFixture = await createTrainee({
        user: {
          email: 'disable.target@example.com',
          firstName: 'Dave',
          lastName: 'Disabled',
        },
        organisationProfile: {
          organisationId: fixture.organisation.id,
        },
      });

      const orgProfileId = traineeFixture.organisationTraineeProfile!.id;
      const sessionId = randomUUID();

      await prisma.authSession.create({
        data: {
          id: sessionId,
          userId: traineeFixture.user.id,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      sendMailMock.mockClear();

      const response = await request(app)
        .patch(`/organisations/${fixture.organisation.id}/trainees/${orgProfileId}/disable`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({
          password: testUserPassword,
          confirmation: true,
          disabledReason: 'Employee departed',
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        traineeId: orgProfileId,
        status: 'DISABLED',
      });

      const dbOrgProfile = await prisma.organisationTraineeProfile.findUniqueOrThrow({
        where: { id: orgProfileId },
      });
      expect(dbOrgProfile.membershipStatus).toBe('DISABLED');
      expect(dbOrgProfile.disabledAt).not.toBeNull();
      expect(dbOrgProfile.disabledReason).toBe('Employee departed');

      const sessionDb = await prisma.authSession.findUniqueOrThrow({
        where: { id: sessionId },
      });
      expect(sessionDb.revokedAt).not.toBeNull();
      expect(sessionDb.revokedReason).toBe('ADMIN_DISABLED');

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'disable.target@example.com',
          subject: expect.stringContaining('Your role has changed'),
          text: expect.stringContaining('Disabled'),
        }),
      );

      const auditLog = await prisma.auditLogEntry.findFirstOrThrow({
        where: {
          organisationId: fixture.organisation.id,
          actionType: 'DISABLED',
        },
      });
      expect(auditLog.targetId).toBe(traineeFixture.user.id);
      expect(auditLog.targetType).toBe('USER');
      expect(auditLog.outcome).toBe('SUCCESS');
    });
  });

  describe('Cross-Tenant Security', () => {
    it('prevents Org A admin from accessing Org B trainees', async () => {
      const orgB = await createOrganisation();

      const response = await request(app)
        .get(`/organisations/${orgB.id}/trainees`)
        .set('Authorization', `Bearer ${fixture.token}`);

      expect(response.status).toBe(403);
    });

    it('prevents Org A admin from disabling Org B trainee, even when passing Org A ID', async () => {
      const orgB = await createOrganisation();

      const traineeOrgB = await createTrainee({
        organisationProfile: { organisationId: orgB.id },
      });
      const orgProfileIdOrgB = traineeOrgB.organisationTraineeProfile!.id;

      const response = await request(app)
        .patch(`/organisations/${fixture.organisation.id}/trainees/${orgProfileIdOrgB}/disable`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({ password: testUserPassword, confirmation: true, disabledReason: 'Test' });

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('Granular Permission Matrices', () => {
    it('prevents POST invite when admin lacks INVITE_ORGANISATION_TRAINEES permission', async () => {
      await prisma.organisationAdminPermission.deleteMany({
        where: {
          organisationAdminId: fixture.adminProfile.id,
          organisationPermission: {
            key: 'INVITE_ORGANISATION_TRAINEES',
          },
        },
      });

      const response = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({ email: 'should.fail@example.com' });

      expect(response.status).toBe(403);

      const invCount = await prisma.invitation.count({
        where: { recipientEmail: 'should.fail@example.com' },
      });
      expect(invCount).toBe(0);
    });
  });

  describe('Edge Cases and Conflicts', () => {
    it('returns 409 Conflict when inviting an email that already has an active trainee account in the org', async () => {
      await createTrainee({
        user: { email: 'existing.trainee@example.com' },
        organisationProfile: { organisationId: fixture.organisation.id },
      });

      const response = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({ email: 'existing.trainee@example.com' });

      expect(response.status).toBe(409);
    });

    it('returns 409 Conflict when inviting an email that is registered as a platform admin', async () => {
      await prisma.user.create({
        data: {
          id: randomUUID(),
          email: 'platform.admin@example.com',
          firstName: 'Platform',
          lastName: 'Admin',
          passwordHash: 'hash',
          userType: 'IP_ADMIN',
        },
      });

      const response = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({ email: 'platform.admin@example.com' });

      expect(response.status).toBe(409);
    });
  });
});
