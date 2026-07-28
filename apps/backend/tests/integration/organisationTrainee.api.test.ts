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
import { traineeListResponseSchema } from '@insightful-phish/shared';

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
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Invitation sent successfully.');
      expect(response.body.invitation).toEqual(
        expect.objectContaining({
          email: 'invitee.test@example.com',
          firstName: 'Invitee',
          lastName: 'Person',
          rowType: 'INVITATION',
          status: 'INVITE_PENDING',
          invitationStatus: 'SENT',
          deliveryState: 'SENT',
        }),
      );

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
      expect(traineeListResponseSchema.parse(response.body)).toMatchObject({
        trainees: expect.any(Array),
        invitations: expect.any(Array),
      });
      expect(response.body.trainees).toContainEqual(
        expect.objectContaining({
          email: 'active.trainee@example.com',
          status: 'ACTIVE',
        }),
      );
      expect(response.body.invitations).toContainEqual(
        expect.objectContaining({
          email: 'pending.trainee@example.com',
        }),
      );
    });

    it('includes terminal invitation lifecycle rows in the management list', async () => {
      const accepted = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({ email: 'accepted.trainee@example.com' });
      const rejected = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({ email: 'rejected.trainee@example.com' });
      const revoked = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({ email: 'revoked.trainee@example.com' });

      await prisma.invitation.update({
        where: { id: accepted.body.invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });
      await prisma.invitation.update({
        where: { id: rejected.body.invitation.id },
        data: { status: 'REJECTED' },
      });
      await prisma.invitation.update({
        where: { id: revoked.body.invitation.id },
        data: { status: 'REVOKED', revokedAt: new Date() },
      });
      await prisma.invitation.update({
        where: { id: accepted.body.invitation.id },
        data: {
          emailDeliveryLogs: {
            create: {
              recipientEmail: 'accepted.trainee@example.com',
              emailType: 'ORGANISATION_TRAINEE_INVITE',
              deliveryStatus: 'SENT',
            },
          },
        },
      });

      const response = await request(app)
        .get(`/organisations/${fixture.organisation.id}/trainees`)
        .set('Authorization', `Bearer ${fixture.token}`);

      expect(response.status).toBe(200);
      expect(response.body.invitations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            email: 'accepted.trainee@example.com',
            invitationStatus: 'ACCEPTED',
          }),
          expect.objectContaining({
            email: 'rejected.trainee@example.com',
            invitationStatus: 'REJECTED',
          }),
          expect.objectContaining({
            email: 'revoked.trainee@example.com',
            invitationStatus: 'REVOKED',
          }),
        ]),
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

    it('keeps a revoked invitation revoked even when a stale resend email SMTP succeeds later', async () => {
      const inviteRes = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({ email: 'race.revoke.success@example.com' });

      const invId = inviteRes.body.invitation.id;
      const initialToken = await prisma.actionToken.findFirstOrThrow({
        where: { invitationId: invId },
      });

      let resolveSmtp: (value: unknown) => void = () => {};
      const smtpPromise = new Promise((resolve) => {
        resolveSmtp = resolve;
      });
      sendMailMock.mockReturnValue(smtpPromise);

      const resendPromise = request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations/${invId}/resend`)
        .set('Authorization', `Bearer ${fixture.token}`);

      // Start the request in the background
      const responsePromise = resendPromise.then((res) => res);

      // Wait until the resend transaction commits (second token is created)
      let replacementToken = null;
      for (let i = 0; i < 100; i++) {
        const tokens = await prisma.actionToken.findMany({
          where: { invitationId: invId },
        });
        if (tokens.length > 1) {
          replacementToken = tokens.find((t) => t.id !== initialToken.id);
          break;
        }
        await new Promise((r) => setTimeout(r, 50));
      }
      expect(replacementToken).not.toBeNull();
      if (!replacementToken) {
        throw new Error('Replacement token not found');
      }

      // Perform concurrent revoke request
      const revokeResponse = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations/${invId}/revoke`)
        .set('Authorization', `Bearer ${fixture.token}`);
      expect(revokeResponse.status).toBe(200);

      // Now resolve the SMTP send
      resolveSmtp({ messageId: 'smtpmessage01' });

      const resendResponse = await responsePromise;
      expect(resendResponse.status).toBe(409);
      expect(resendResponse.body).toMatchObject({
        error: 'INVITATION_REVOKED',
      });

      // Verify final database state
      const invitation = await prisma.invitation.findUniqueOrThrow({ where: { id: invId } });
      expect(invitation.status).toBe('REVOKED');

      const finalTokens = await prisma.actionToken.findMany({
        where: { invitationId: invId },
      });
      expect(finalTokens.every((token) => token.revokedAt !== null)).toBe(true);

      // Verify email delivery log status is updated but state is still REVOKED
      const deliveryLog = await prisma.emailDeliveryLog.findFirst({
        where: { actionTokenId: replacementToken.id },
      });
      expect(deliveryLog).toBeDefined();
      expect(deliveryLog?.deliveryStatus).toBe('SENT');
    });

    it('keeps a revoked invitation revoked even when a stale resend email SMTP rejects later', async () => {
      const inviteRes = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({ email: 'race.revoke.fail@example.com' });

      const invId = inviteRes.body.invitation.id;
      const initialToken = await prisma.actionToken.findFirstOrThrow({
        where: { invitationId: invId },
      });

      let rejectSmtp: (reason: Error) => void = () => {};
      const smtpPromise = new Promise((_, reject) => {
        rejectSmtp = reject;
      });
      sendMailMock.mockReturnValue(smtpPromise);

      const resendPromise = request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations/${invId}/resend`)
        .set('Authorization', `Bearer ${fixture.token}`);

      // Start the request in the background
      const responsePromise = resendPromise.then((res) => res);

      // Wait until the resend transaction commits (second token is created)
      let replacementToken = null;
      for (let i = 0; i < 100; i++) {
        const tokens = await prisma.actionToken.findMany({
          where: { invitationId: invId },
        });
        if (tokens.length > 1) {
          replacementToken = tokens.find((t) => t.id !== initialToken.id);
          break;
        }
        await new Promise((r) => setTimeout(r, 50));
      }
      expect(replacementToken).not.toBeNull();
      if (!replacementToken) {
        throw new Error('Replacement token not found');
      }

      // Perform concurrent revoke request
      const revokeResponse = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations/${invId}/revoke`)
        .set('Authorization', `Bearer ${fixture.token}`);
      expect(revokeResponse.status).toBe(200);

      // Now reject SMTP send
      rejectSmtp(new Error('SMTP delivery failed'));

      const resendResponse = await responsePromise;
      expect(resendResponse.status).toBe(409);
      expect(resendResponse.body).toMatchObject({
        error: 'INVITATION_REVOKED',
      });

      // Verify final database state
      const invitation = await prisma.invitation.findUniqueOrThrow({ where: { id: invId } });
      expect(invitation.status).toBe('REVOKED');

      const finalTokens = await prisma.actionToken.findMany({
        where: { invitationId: invId },
      });
      expect(finalTokens.every((token) => token.revokedAt !== null)).toBe(true);

      const deliveryLog = await prisma.emailDeliveryLog.findFirst({
        where: { actionTokenId: replacementToken.id },
      });
      expect(deliveryLog).toBeDefined();
      expect(deliveryLog?.deliveryStatus).toBe('FAILED');
    });

    it('returns a truthful failed-delivery response when SMTP rejects the invitation email', async () => {
      sendMailMock.mockReset();
      sendMailMock.mockRejectedValue(new Error('SMTP rejected the message'));

      const response = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({ email: 'smtp.fail@example.com' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.invitation.deliveryState).toBe('FAILED');
      expect(response.body.invitation.invitationLifecycleState).toBe('FAILED_TO_SEND');
    });

    it('returns an unknown delivery outcome when provider success is followed by delivery-log persistence failure', async () => {
      const updateSpy = vi
        .spyOn(prisma.emailDeliveryLog, 'update')
        .mockRejectedValueOnce(new Error('delivery log write failed'));

      const response = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({ email: 'unknown.delivery@example.com' });

      updateSpy.mockRestore();

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.invitation.deliveryState).toBe('UNKNOWN');
      expect(response.body.invitation.invitationLifecycleState).toBe('SENT');
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

    it('returns 409 Conflict when inviting a disabled trainee in the same organisation', async () => {
      const disabledTrainee = await createTrainee({
        user: { email: 'disabled.trainee@example.com' },
        organisationProfile: {
          organisationId: fixture.organisation.id,
          membershipStatus: 'DISABLED',
        },
      });

      await prisma.organisationTraineeProfile.update({
        where: { id: disabledTrainee.organisationTraineeProfile!.id },
        data: {
          disabledAt: new Date(),
          disabledReason: 'Previously disabled',
        },
      });

      const response = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({ email: 'disabled.trainee@example.com' });

      expect(response.status).toBe(409);

      const invitationCount = await prisma.invitation.count({
        where: { recipientEmail: 'disabled.trainee@example.com' },
      });
      expect(invitationCount).toBe(0);
    });
  });
});
