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
import {
  claimDueEmailDeliveryJobs,
  markEmailDeliveryProviderPersistenceFailed,
  recordEmailDeliveryAccepted,
} from '../../src/repositories/email-delivery.repository.js';
import { runEmailDispatcherCycle } from '../../src/services/email-dispatcher.service.js';
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
      expect(response.body.message).toBe('Invitation email queued for delivery.');
      expect(response.body.invitation).toEqual(
        expect.objectContaining({
          email: 'invitee.test@example.com',
          firstName: 'Invitee',
          lastName: 'Person',
          rowType: 'INVITATION',
          status: 'INVITE_PENDING',
          invitationStatus: 'PENDING',
          deliveryState: 'PENDING',
        }),
      );

      const invitation = await prisma.invitation.findFirstOrThrow({
        where: {
          organisationId: fixture.organisation.id,
          recipientEmail: 'invitee.test@example.com',
        },
      });
      expect(invitation.status).toBe('PENDING');
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
      expect(deliveryLog.deliveryStatus).toBe('PENDING');
      expect(sendMailMock).not.toHaveBeenCalled();

      await runEmailDispatcherCycle();

      const sentInvitation = await prisma.invitation.findUniqueOrThrow({
        where: { id: invitation.id },
      });
      const sentDeliveryLog = await prisma.emailDeliveryLog.findUniqueOrThrow({
        where: { id: deliveryLog.id },
      });
      expect(sentInvitation.status).toBe('SENT');
      expect(sentDeliveryLog.deliveryStatus).toBe('SENT');

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'invitee.test@example.com',
          subject: expect.stringContaining("You're invited to join"),
          text: expect.stringContaining('/accept-invite?token='),
          html: expect.stringContaining('/accept-invite?token='),
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

    it('lists memberships and actionable invitations without terminal invitation history', async () => {
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
      const completed = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({ email: 'completed.trainee@example.com' });

      await createTrainee({
        user: {
          email: 'accepted.trainee@example.com',
          firstName: 'Accepted',
          lastName: 'Member',
        },
        organisationProfile: {
          organisationId: fixture.organisation.id,
        },
      });
      const disabledMembership = await createTrainee({
        user: {
          email: 'disabled.member@example.com',
          firstName: 'Disabled',
          lastName: 'Member',
        },
        organisationProfile: {
          organisationId: fixture.organisation.id,
          membershipStatus: 'DISABLED',
        },
      });

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
        where: { id: completed.body.invitation.id },
        data: { status: 'COMPLETED', acceptedAt: new Date() },
      });
      await prisma.organisationTraineeProfile.update({
        where: { id: disabledMembership.organisationTraineeProfile!.id },
        data: {
          disabledAt: new Date(),
          disabledReason: 'No longer active',
        },
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
      expect(response.body.trainees).toContainEqual(
        expect.objectContaining({
          email: 'accepted.trainee@example.com',
          rowType: 'ACTIVE_TRAINEE',
          status: 'ACTIVE',
        }),
      );
      expect(response.body.trainees).toContainEqual(
        expect.objectContaining({
          email: 'disabled.member@example.com',
          rowType: 'ACTIVE_TRAINEE',
          status: 'DISABLED',
        }),
      );
      expect(response.body.invitations).toContainEqual(
        expect.objectContaining({
          email: 'rejected.trainee@example.com',
          rowType: 'INVITATION',
          invitationStatus: 'REJECTED',
        }),
      );
      expect(response.body.pendingInvitations).toEqual(response.body.invitations);
      expect(response.body.invitations).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ email: 'accepted.trainee@example.com' }),
          expect.objectContaining({ email: 'completed.trainee@example.com' }),
          expect.objectContaining({ email: 'revoked.trainee@example.com' }),
        ]),
      );

      const persistedInvitationCount = await prisma.invitation.count({
        where: {
          organisationId: fixture.organisation.id,
          recipientEmail: {
            in: [
              'accepted.trainee@example.com',
              'completed.trainee@example.com',
              'rejected.trainee@example.com',
              'revoked.trainee@example.com',
            ],
          },
        },
      });
      expect(persistedInvitationCount).toBe(4);
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

      const deliveryLog = await prisma.emailDeliveryLog.findFirstOrThrow({
        where: { actionTokenId: allTokens[1].id },
      });
      expect(deliveryLog.deliveryStatus).toBe('PENDING');
      expect(sendMailMock).not.toHaveBeenCalled();

      await runEmailDispatcherCycle();

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'resend.target@example.com',
          text: expect.stringContaining('/accept-invite?token='),
          html: expect.stringContaining('/accept-invite?token='),
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

    it('resends a rejected invitation that the management list advertises as actionable', async () => {
      const inviteRes = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({ email: 'rejected.resend@example.com' });

      expect(inviteRes.status).toBe(201);
      const invId = inviteRes.body.invitation.id;

      await prisma.invitation.update({
        where: { id: invId },
        data: { status: 'REJECTED' },
      });
      await prisma.emailDeliveryLog.updateMany({
        where: { invitationId: invId },
        data: { createdAt: new Date(Date.now() - 61_000) },
      });

      const listResponse = await request(app)
        .get(`/organisations/${fixture.organisation.id}/trainees`)
        .set('Authorization', `Bearer ${fixture.token}`);

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.invitations).toContainEqual(
        expect.objectContaining({
          id: invId,
          invitationStatus: 'REJECTED',
          eligibility: expect.objectContaining({
            canResend: true,
          }),
        }),
      );

      const resendResponse = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations/${invId}/resend`)
        .set('Authorization', `Bearer ${fixture.token}`);

      expect(resendResponse.status).toBe(200);
      expect(resendResponse.body).toMatchObject({
        success: true,
        invitationId: invId,
        invitation: expect.objectContaining({
          invitationStatus: 'PENDING',
          status: 'INVITE_PENDING',
        }),
      });

      const resentInvitation = await prisma.invitation.findUniqueOrThrow({
        where: { id: invId },
      });
      expect(resentInvitation.status).toBe('PENDING');
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

      await runEmailDispatcherCycle();
      sendMailMock.mockClear();

      const resendResponse = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations/${invId}/resend`)
        .set('Authorization', `Bearer ${fixture.token}`);
      expect(resendResponse.status).toBe(200);

      const tokens = await prisma.actionToken.findMany({
        where: { invitationId: invId },
      });
      const replacementToken = tokens.find((t) => t.id !== initialToken.id);
      expect(replacementToken).not.toBeNull();
      if (!replacementToken) {
        throw new Error('Replacement token not found');
      }

      // Perform concurrent revoke request
      const revokeResponse = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations/${invId}/revoke`)
        .set('Authorization', `Bearer ${fixture.token}`);
      expect(revokeResponse.status).toBe(200);

      await runEmailDispatcherCycle();

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

      await runEmailDispatcherCycle();
      sendMailMock.mockClear();

      const resendResponse = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations/${invId}/resend`)
        .set('Authorization', `Bearer ${fixture.token}`);
      expect(resendResponse.status).toBe(200);

      const tokens = await prisma.actionToken.findMany({
        where: { invitationId: invId },
      });
      const replacementToken = tokens.find((t) => t.id !== initialToken.id);
      expect(replacementToken).not.toBeNull();
      if (!replacementToken) {
        throw new Error('Replacement token not found');
      }

      // Perform concurrent revoke request
      const revokeResponse = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations/${invId}/revoke`)
        .set('Authorization', `Bearer ${fixture.token}`);
      expect(revokeResponse.status).toBe(200);

      sendMailMock.mockRejectedValueOnce(new Error('SMTP delivery failed'));
      await runEmailDispatcherCycle();

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

    it('records failed delivery after queued invitation email SMTP rejection', async () => {
      sendMailMock.mockReset();
      sendMailMock.mockRejectedValue(
        Object.assign(new Error('SMTP rejected the message'), { responseCode: 550 }),
      );

      const response = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({ email: 'smtp.fail@example.com' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.invitation.deliveryState).toBe('PENDING');
      expect(response.body.invitation.invitationLifecycleState).toBe('PENDING');

      await runEmailDispatcherCycle();

      const invitation = await prisma.invitation.findUniqueOrThrow({
        where: { id: response.body.invitation.id },
      });
      const deliveryLog = await prisma.emailDeliveryLog.findFirstOrThrow({
        where: { invitationId: invitation.id },
      });

      expect(invitation.status).toBe('FAILED_TO_SEND');
      expect(deliveryLog.deliveryStatus).toBe('FAILED');
    });

    it('records accepted-safe state when provider success is followed by persistence failure', async () => {
      const response = await request(app)
        .post(`/organisations/${fixture.organisation.id}/trainee-invitations`)
        .set('Authorization', `Bearer ${fixture.token}`)
        .send({ email: 'unknown.delivery@example.com' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.invitation.deliveryState).toBe('PENDING');

      const leaseOwner = 'integration-trainee-accepted-persistence-failure';
      const claimedJobs = await claimDueEmailDeliveryJobs({
        leaseOwner,
        batchSize: 1,
        leaseSeconds: 75,
        retryDeadlineSeconds: 120,
      });
      expect(claimedJobs).toHaveLength(1);

      const deliveryLog = await prisma.emailDeliveryLog.findFirstOrThrow({
        where: { invitationId: response.body.invitation.id },
      });

      await expect(
        recordEmailDeliveryAccepted({
          jobId: claimedJobs[0].id,
          deliveryLogId: 'missing-delivery-log-id',
          providerMessageId: 'smtpmessage01',
          leaseOwner,
        }),
      ).rejects.toThrow();

      await expect(
        markEmailDeliveryProviderPersistenceFailed({
          jobId: claimedJobs[0].id,
          deliveryLogId: deliveryLog.id,
          reasonCode: 'EMAIL_ACCEPTED_STATE_PERSISTENCE_FAILED',
          leaseOwner,
        }),
      ).resolves.toBe(true);

      const safeDeliveryLog = await prisma.emailDeliveryLog.findUniqueOrThrow({
        where: { id: deliveryLog.id },
      });
      const deliveryJob = await prisma.emailDeliveryJob.findUniqueOrThrow({
        where: { deliveryLogId: deliveryLog.id },
      });

      expect(safeDeliveryLog.deliveryStatus).toBe('FAILED');
      expect(safeDeliveryLog.failureReason).toBe('EMAIL_ACCEPTED_STATE_PERSISTENCE_FAILED');
      expect(deliveryJob.status).toBe('FAILED');
      expect(deliveryJob.lastProviderOutcome).toBe('PROVIDER_PERSISTENCE_FAILED');

      sendMailMock.mockClear();
      await runEmailDispatcherCycle();
      expect(sendMailMock).not.toHaveBeenCalled();
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

      await runEmailDispatcherCycle();

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
