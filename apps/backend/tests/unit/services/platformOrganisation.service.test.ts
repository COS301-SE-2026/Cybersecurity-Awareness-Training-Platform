import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getPlatformOrganisationDetail,
  getOrganisationRequestDetails,
  getResendEligibility,
  resendInitialAdminSetup,
  OrganisationRegistrationRequestError,
} from '../../../src/services/platformOrganisation.service.js';
import type * as AuthEmailHookModule from '../../../src/services/auth-email-hook.service.js';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  ipAdminProfile: {
    findUnique: vi.fn(),
  },
  actionToken: {
    updateMany: vi.fn(),
    update: vi.fn(),
  },
  invitation: {
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
  emailDeliveryLog: {
    findFirst: vi.fn(),
  },
  $transaction: vi.fn((callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock)),
}));

const repositoryMock = vi.hoisted(() => ({
  findOrganisationById: vi.fn(),
  findOrganisationWithCount: vi.fn(),
  findRegistrationRequestByOrganisationId: vi.fn(),
  findRegistrationRequestById: vi.fn(),
  findOrganisationAdmins: vi.fn(),
  findAuditLogsForTimeline: vi.fn(),
  findEmailLogsForTimeline: vi.fn(),
  findSetupInvitationAndEmailLog: vi.fn(),
  findLatestEmailLogForInvitation: vi.fn(),
}));

const actionTokenServiceMock = vi.hoisted(() => ({
  issueActionToken: vi.fn(),
}));

const emailHookMock = vi.hoisted(() => ({
  requestAuthEmailSend: vi.fn(),
}));

const auditLogMock = vi.hoisted(() => ({
  recordAuditLog: vi.fn(),
}));

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../../../src/repositories/organisation.repository.js', () => repositoryMock);
vi.mock('../../../src/services/action-token.service.js', () => actionTokenServiceMock);
vi.mock('../../../src/services/auth-email-hook.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthEmailHookModule>();

  return {
    ...actual,
    requestAuthEmailSend: emailHookMock.requestAuthEmailSend,
  };
});
vi.mock('../../../src/services/audit-log.service.js', () => auditLogMock);

const actorUserId = '44444444-4444-4444-8444-444444444444';
const requestId = '55555555-5555-4555-8555-555555555555';
const organisationId = '66666666-6666-4666-8666-666666666666';

const acceptedHookResult = {
  status: 'ACCEPTED' as const,
  acceptedByProvider: true as const,
  queued: true as const,
  deliveryLogId: 'email-log-1',
  providerMessageId: 'provider-message-1',
};

function mockActivePlatformAdmin() {
  prismaMock.user.findUnique.mockImplementation((args: { where?: { id?: string } }) => {
    if (args?.where?.id === actorUserId) {
      return Promise.resolve({
        id: actorUserId,
        userType: 'IP_ADMIN',
        ipAdminProfile: { id: 'admin-profile-1', adminStatus: 'ACTIVE' },
      });
    }
    return Promise.resolve(null);
  });
}

function mockInactivePlatformAdmin() {
  prismaMock.user.findUnique.mockImplementation((args: { where?: { id?: string } }) => {
    if (args?.where?.id === actorUserId) {
      return Promise.resolve({
        id: actorUserId,
        userType: 'IP_ADMIN',
        ipAdminProfile: { id: 'admin-profile-1', adminStatus: 'DISABLED' },
      });
    }
    return Promise.resolve(null);
  });
}

describe('platformOrganisation service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActivePlatformAdmin();
  });

  describe('requirePlatformAdminUser access control', () => {
    it('throws Forbidden if actor is not an active platform admin', async () => {
      mockInactivePlatformAdmin();

      await expect(getPlatformOrganisationDetail(actorUserId, organisationId)).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          403,
          'FORBIDDEN',
          'Platform admin access is required',
        ),
      );
    });

    it('throws Forbidden if actor has no platform admin profile', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(getPlatformOrganisationDetail(actorUserId, organisationId)).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          403,
          'FORBIDDEN',
          'Platform admin access is required',
        ),
      );
    });
  });

  describe('getPlatformOrganisationDetail', () => {
    it('returns minimal organisation details, count, admin summary, setupStatus, and timeline logs', async () => {
      const mockOrg = {
        id: organisationId,
        name: 'Target Org',
        status: 'PENDING_ONBOARDING',
        description: 'A mock organization',
        approximateSize: 150,
        website: 'https://mock.example.com',
        primaryDomain: 'mock.example.com',
        createdAt: new Date('2026-07-01T08:00:00Z'),
        updatedAt: new Date('2026-07-02T08:00:00Z'),
        _count: { adminProfiles: 1, traineeProfiles: 10 },
      };

      const mockRequest = {
        id: requestId,
        representativeFirstName: 'John',
        representativeLastName: 'Doe',
        representativeEmail: 'john@example.com',
        submittedWebsite: 'https://example.com',
        submittedPrimaryDomain: 'example.com',
      };

      const mockInvitation = {
        id: 'invite-123',
        status: 'PENDING',
        recipientEmail: 'admin@target.com',
        recipientFirstName: 'Bob',
        expiresAt: new Date('2036-07-10T08:00:00Z'),
        actionTokens: [
          {
            id: 'token-123',
            expiresAt: new Date('2036-07-10T08:00:00Z'),
            usedAt: null,
            revokedAt: null,
          },
        ],
      };

      const mockLatestEmail = {
        id: 'email-log-123',
        deliveryStatus: 'SENT',
        sentAt: new Date('2026-07-01T08:30:00Z'),
        failedAt: null,
        failureReason: null,
      };

      const mockAdmins = [
        {
          id: 'admin-1',
          adminStatus: 'ACTIVE',
          isInitialAdmin: false,
          user: {
            firstName: 'Alice',
            lastName: 'Smith',
            email: 'alice@target.com',
          },
        },
      ];

      const mockAuditLogs = [
        {
          id: 'audit-3',
          actionType: 'ENABLED',
          targetType: 'ORGANISATION',
          createdAt: new Date('2026-07-01T08:45:00Z'),
          outcome: 'SUCCESS',
          actorUser: {
            firstName: 'Bob',
            lastName: 'Builder',
          },
        },
        {
          id: 'audit-2',
          actionType: 'COMPLETED',
          targetType: 'INVITATION',
          createdAt: new Date('2026-07-01T08:45:00Z'),
          outcome: 'SUCCESS',
          actorUser: {
            firstName: 'Bob',
            lastName: 'Builder',
          },
        },
        {
          id: 'audit-1',
          actionType: 'APPROVED',
          targetType: 'ORGANISATION_REGISTRATION_REQUEST',
          createdAt: new Date('2026-07-01T08:00:00Z'),
          outcome: 'SUCCESS',
          // email intentionally absent -- excluded in repository select
          actorUser: {
            firstName: 'Patricia',
            lastName: 'Platform',
          },
        },
      ];

      const mockEmailLogs = [
        {
          id: 'email-log-123',
          emailType: 'INITIAL_ORGANISATION_ADMIN_SETUP',
          deliveryStatus: 'SENT',
          createdAt: new Date('2026-07-01T08:30:00Z'),
          failureReason: null,
        },
      ];

      repositoryMock.findOrganisationWithCount.mockResolvedValue(mockOrg);
      repositoryMock.findRegistrationRequestByOrganisationId.mockResolvedValue(mockRequest);
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(mockInvitation);
      repositoryMock.findLatestEmailLogForInvitation.mockResolvedValue(mockLatestEmail);
      repositoryMock.findOrganisationAdmins.mockResolvedValue(mockAdmins);
      repositoryMock.findAuditLogsForTimeline.mockResolvedValue(mockAuditLogs);
      repositoryMock.findEmailLogsForTimeline.mockResolvedValue(mockEmailLogs);

      const response = await getPlatformOrganisationDetail(actorUserId, organisationId);

      expect(response.id).toBe(organisationId);
      expect(response.name).toBe('Target Org');
      expect(response.status).toBe('PENDING_ONBOARDING');
      expect(response.detailType).toBe('onboarding organisation');
      expect(response.description).toBe('A mock organization');
      expect(response.approximateSize).toBe(150);
      expect(response.website).toBe('https://mock.example.com');
      expect(response.primaryDomain).toBe('mock.example.com');
      expect(response.createdAt).toBe('2026-07-01T08:00:00.000Z');
      expect(response._count.adminProfiles).toBe(1);
      expect(response.registrationRequest?.representativeEmail).toBe('john@example.com');
      expect(response.setupStatus?.status).toBe('PENDING');
      expect(response.setupStatus?.latestEmailDelivery?.deliveryStatus).toBe('SENT');
      expect(response.resendEligibility.isEligible).toBe(false); // token is still valid
      expect(response.admins).toHaveLength(1);
      expect(response.admins[0].email).toBe('alice@target.com');
      expect(response.admins[0].isInitialAdmin).toBe(false);
      expect(response.timeline).toHaveLength(4);
      expect(response.timeline.map((event) => event.action)).toEqual([
        'COMPLETED',
        'ENABLED',
        'INITIAL_ORGANISATION_ADMIN_SETUP',
        'APPROVED',
      ]);
      expect(response.timeline[0]).toEqual(
        expect.objectContaining({
          type: 'AUDIT_LOG',
          outcome: 'SUCCESS',
          actor: 'Bob Builder',
          metadata: null,
        }),
      );
      expect(response.timeline[1]).toEqual(
        expect.objectContaining({
          type: 'AUDIT_LOG',
          outcome: 'SUCCESS',
          actor: 'Bob Builder',
          metadata: null,
        }),
      );
      expect(response.timeline[2].type).toBe('EMAIL_DELIVERY');
      expect(response.timeline[2].outcome).toBe('SENT');
      expect(response.timeline[2].actor).toBe('System');
      expect(response.timeline[3].actor).toBe('Patricia Platform');
    });

    it('throws 404 error if organisation is not found', async () => {
      repositoryMock.findOrganisationWithCount.mockResolvedValue(null);

      await expect(getPlatformOrganisationDetail(actorUserId, organisationId)).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          404,
          'ORGANISATION_NOT_FOUND',
          'Organisation not found',
        ),
      );
    });
  });

  describe('getOrganisationRequestDetails', () => {
    it('returns formatted request details and timeline logs', async () => {
      const mockRequest = {
        id: requestId,
        submittedOrganisationName: 'Pending Org',
        submittedWebsite: 'https://pending.com',
        submittedOrganisationDescription: 'Desc',
        submittedOrganisationSize: 100,
        submittedPrimaryDomain: 'pending.com',
        representativeFirstName: 'Jane',
        representativeLastName: 'Doe',
        representativeEmail: 'jane@pending.com',
        representativePhone: '123456789',
        status: 'PENDING_REVIEW',
        contactedByIpAdminId: null,
        approvedByIpAdminId: null,
        rejectedByIpAdminId: null,
        approvedOrganisationId: null,
        contactedAt: null,
        approvedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        createdAt: new Date('2026-07-01T08:00:00Z'),
        updatedAt: new Date('2026-07-01T08:00:00Z'),
      };

      repositoryMock.findRegistrationRequestById.mockResolvedValue(mockRequest);
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(null);
      repositoryMock.findAuditLogsForTimeline.mockResolvedValue([]);
      repositoryMock.findEmailLogsForTimeline.mockResolvedValue([]);

      const response = await getOrganisationRequestDetails(actorUserId, requestId);

      expect(response.id).toBe(requestId);
      expect(response.submittedOrganisationName).toBe('Pending Org');
      expect(response.detailType).toBe('request-only');
      expect(response.representativeEmail).toBe('jane@pending.com');
      expect(response.setupStatus).toBeNull();
      expect(response.resendEligibility.isEligible).toBe(false); // No invitation exists
      expect(response.timeline).toHaveLength(0);
    });

    it('throws 404 if request is not found', async () => {
      repositoryMock.findRegistrationRequestById.mockResolvedValue(null);

      await expect(getOrganisationRequestDetails(actorUserId, requestId)).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          404,
          'REQUEST_NOT_FOUND',
          'Organisation registration request not found',
        ),
      );
    });
  });

  describe('resendInitialAdminSetup eligibility and operations', () => {
    it('reports setup email failure eligibility when the undelivered token was revoked', () => {
      const eligibility = getResendEligibility(
        'PENDING_ONBOARDING',
        {
          id: 'invite-123',
          status: 'FAILED_TO_SEND',
          recipientEmail: 'admin@target.com',
          expiresAt: new Date(Date.now() + 100_000),
          actionTokens: [
            {
              id: 'token-123',
              expiresAt: new Date(Date.now() + 100_000),
              usedAt: null,
              revokedAt: new Date(),
            },
          ],
        },
        {
          id: 'email-log-123',
          deliveryStatus: 'FAILED',
          sentAt: null,
          failedAt: new Date(),
          failureReason: 'SMTP_NOT_ACCEPTED',
          actionTokenId: 'token-123',
        },
      );

      expect(eligibility).toEqual({
        isEligible: true,
        reason: 'SETUP_EMAIL_FAILED',
      });
    });

    it('does not treat an older failed delivery log as failure evidence for a newer active token', () => {
      const eligibility = getResendEligibility(
        'PENDING_ONBOARDING',
        {
          id: 'invite-123',
          status: 'PENDING',
          recipientEmail: 'admin@target.com',
          expiresAt: new Date(Date.now() + 100_000),
          actionTokens: [
            {
              id: 'token-new',
              expiresAt: new Date(Date.now() + 100_000),
              usedAt: null,
              revokedAt: null,
            },
          ],
        },
        {
          id: 'email-log-old',
          deliveryStatus: 'FAILED',
          sentAt: null,
          failedAt: new Date(),
          failureReason: 'SMTP_NOT_ACCEPTED',
          actionTokenId: 'token-old',
        },
      );

      expect(eligibility).toEqual({
        isEligible: false,
        reason: 'ACTIVE_SETUP_TOKEN_EXISTS',
      });
    });

    it('resends invitation successfully (expired token state)', async () => {
      const mockOrg = {
        id: organisationId,
        name: 'Target Org',
        status: 'PENDING_ONBOARDING',
      };

      const mockInvitation = {
        id: 'invite-123',
        status: 'PENDING',
        recipientEmail: 'admin@target.com',
        recipientFirstName: 'Bob',
        expiresAt: new Date(Date.now() - 1000), // expired
        organisationRegistrationRequestId: requestId,
        actionTokens: [],
      };

      repositoryMock.findOrganisationById.mockResolvedValue(mockOrg);
      repositoryMock.findRegistrationRequestByOrganisationId.mockResolvedValue(null);
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(mockInvitation);
      repositoryMock.findLatestEmailLogForInvitation.mockResolvedValue(null);

      // Inside the transaction: atomic claim succeeds, no competing delivery log
      prismaMock.invitation.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.emailDeliveryLog.findFirst.mockResolvedValue(null);

      actionTokenServiceMock.issueActionToken.mockResolvedValue({
        token: { id: 'new-token-id', expiresAt: new Date() },
        rawToken: 'raw-token-string',
      });
      emailHookMock.requestAuthEmailSend.mockResolvedValue(acceptedHookResult);

      const response = await resendInitialAdminSetup(actorUserId, organisationId);

      expect(response.success).toBe(true);
      expect(response.emailQueued).toBe(true);
      expect(response.setupStatus).toBeDefined();
      expect(prismaMock.invitation.updateMany).toHaveBeenCalled();
      expect(actionTokenServiceMock.issueActionToken).toHaveBeenCalled();
      expect(emailHookMock.requestAuthEmailSend).toHaveBeenCalled();
    });

    it('resends invitation successfully (failed email delivery state)', async () => {
      const mockOrg = {
        id: organisationId,
        name: 'Target Org',
        status: 'PENDING_ONBOARDING',
      };

      const mockInvitation = {
        id: 'invite-123',
        status: 'PENDING',
        recipientEmail: 'admin@target.com',
        recipientFirstName: 'Bob',
        expiresAt: new Date(Date.now() + 100_000), // active
        organisationRegistrationRequestId: requestId,
        actionTokens: [
          {
            id: 'token-123',
            expiresAt: new Date(Date.now() + 100_000),
            usedAt: null,
            revokedAt: null,
          },
        ],
      };

      const mockLatestEmail = {
        id: 'email-log-123',
        deliveryStatus: 'FAILED', // failed
        actionTokenId: 'token-123',
      };

      repositoryMock.findOrganisationById.mockResolvedValue(mockOrg);
      repositoryMock.findRegistrationRequestByOrganisationId.mockResolvedValue(null);
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(mockInvitation);
      repositoryMock.findLatestEmailLogForInvitation.mockResolvedValue(mockLatestEmail);

      // Inside the transaction: atomic claim succeeds, failed delivery log re-read
      prismaMock.invitation.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.emailDeliveryLog.findFirst.mockResolvedValue(mockLatestEmail);

      actionTokenServiceMock.issueActionToken.mockResolvedValue({
        token: { id: 'new-token-id', expiresAt: new Date() },
        rawToken: 'raw-token-string',
      });
      emailHookMock.requestAuthEmailSend.mockResolvedValue(acceptedHookResult);

      const response = await resendInitialAdminSetup(actorUserId, organisationId);

      expect(response.success).toBe(true);
      expect(response.emailQueued).toBe(true);
      expect(response.setupStatus).toBeDefined();
    });

    it('allows resend after definite first setup email failure revoked the original token', async () => {
      const mockOrg = {
        id: organisationId,
        name: 'Target Org',
        status: 'PENDING_ONBOARDING',
      };

      const mockInvitation = {
        id: 'invite-123',
        status: 'FAILED_TO_SEND',
        recipientEmail: 'admin@target.com',
        recipientFirstName: 'Bob',
        expiresAt: new Date(Date.now() + 100_000),
        organisationRegistrationRequestId: requestId,
        actionTokens: [
          {
            id: 'token-123',
            expiresAt: new Date(Date.now() + 100_000),
            usedAt: null,
            revokedAt: new Date(),
          },
        ],
      };

      const mockLatestEmail = {
        id: 'email-log-123',
        deliveryStatus: 'FAILED',
        sentAt: null,
        failedAt: new Date(),
        failureReason: 'SMTP_NOT_ACCEPTED',
        actionTokenId: 'token-123',
      };
      const newTokenExpiresAt = new Date(Date.now() + 200_000);
      const mockUpdatedInvitation = {
        ...mockInvitation,
        status: 'SENT',
        expiresAt: newTokenExpiresAt,
        actionTokens: [
          {
            id: 'new-token-id',
            expiresAt: newTokenExpiresAt,
            usedAt: null,
            revokedAt: null,
          },
        ],
      };

      repositoryMock.findOrganisationById.mockResolvedValue(mockOrg);
      repositoryMock.findRegistrationRequestByOrganisationId.mockResolvedValue(null);
      repositoryMock.findSetupInvitationAndEmailLog
        .mockResolvedValueOnce(mockInvitation)
        .mockResolvedValueOnce(mockInvitation)
        .mockResolvedValueOnce(mockUpdatedInvitation);
      repositoryMock.findLatestEmailLogForInvitation.mockResolvedValue(mockLatestEmail);
      prismaMock.invitation.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.emailDeliveryLog.findFirst.mockResolvedValue(mockLatestEmail);
      actionTokenServiceMock.issueActionToken.mockResolvedValue({
        token: { id: 'new-token-id', expiresAt: newTokenExpiresAt },
        rawToken: 'raw-token-string',
      });
      emailHookMock.requestAuthEmailSend.mockResolvedValue(acceptedHookResult);

      const response = await resendInitialAdminSetup(actorUserId, organisationId);

      expect(response.success).toBe(true);
      expect(response.emailQueued).toBe(true);
      expect(actionTokenServiceMock.issueActionToken).toHaveBeenCalled();
      expect(emailHookMock.requestAuthEmailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          invitationId: 'invite-123',
          actionTokenId: 'new-token-id',
        }),
      );
      expect(response.setupStatus?.latestActionToken).toEqual(
        expect.objectContaining({
          id: 'new-token-id',
          status: 'AVAILABLE',
        }),
      );
      expect(response.setupStatus?.latestEmailDelivery).toEqual(
        expect.objectContaining({
          deliveryStatus: 'FAILED',
          failureReason: 'SMTP_NOT_ACCEPTED',
        }),
      );

      const setupStatus = JSON.stringify(response.setupStatus);
      expect(setupStatus).not.toContain('SMTP broke');
      expect(setupStatus).not.toContain('provider host');
      expect(setupStatus).not.toContain('constraint');
    });

    it('does not revoke the replacement setup token when SMTP was accepted but persistence failed', async () => {
      const mockOrg = {
        id: organisationId,
        name: 'Target Org',
        status: 'PENDING_ONBOARDING',
      };

      const mockInvitation = {
        id: 'invite-123',
        status: 'PENDING',
        recipientEmail: 'admin@target.com',
        recipientFirstName: 'Bob',
        expiresAt: new Date(Date.now() - 1000),
        organisationRegistrationRequestId: requestId,
        actionTokens: [],
      };

      repositoryMock.findOrganisationById.mockResolvedValue(mockOrg);
      repositoryMock.findRegistrationRequestByOrganisationId.mockResolvedValue(null);
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(mockInvitation);
      repositoryMock.findLatestEmailLogForInvitation.mockResolvedValue(null);
      prismaMock.invitation.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.emailDeliveryLog.findFirst.mockResolvedValue(null);
      actionTokenServiceMock.issueActionToken.mockResolvedValue({
        token: { id: 'new-token-id', expiresAt: new Date() },
        rawToken: 'raw-token-string',
      });
      emailHookMock.requestAuthEmailSend.mockResolvedValue({
        status: 'ACCEPTED_PERSISTENCE_FAILED',
        acceptedByProvider: true,
        queued: true,
        deliveryLogId: 'email-log-1',
        providerMessageId: 'message-1',
        reason: 'EMAIL_PERSISTENCE_FAILED',
        persistenceFailures: [
          {
            stage: 'INVITATION_SENT',
            code: 'INVITATION_SENT_WRITE_FAILED',
          },
        ],
        persistenceFailureReason: 'INVITATION_SENT_WRITE_FAILED',
      });

      const response = await resendInitialAdminSetup(actorUserId, organisationId);

      expect(response.success).toBe(true);
      expect(response.emailQueued).toBe(true);
      expect(prismaMock.actionToken.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'new-token-id' },
          data: expect.objectContaining({ revokedReason: 'EMAIL_SEND_FAILED' }),
        }),
      );
    });

    it('does not revoke the replacement setup token when the email hook outcome is unknown', async () => {
      const mockOrg = {
        id: organisationId,
        name: 'Target Org',
        status: 'PENDING_ONBOARDING',
      };

      const mockInvitation = {
        id: 'invite-123',
        status: 'PENDING',
        recipientEmail: 'admin@target.com',
        recipientFirstName: 'Bob',
        expiresAt: new Date(Date.now() - 1000),
        organisationRegistrationRequestId: requestId,
        actionTokens: [],
      };

      repositoryMock.findOrganisationById.mockResolvedValue(mockOrg);
      repositoryMock.findRegistrationRequestByOrganisationId.mockResolvedValue(null);
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(mockInvitation);
      repositoryMock.findLatestEmailLogForInvitation.mockResolvedValue(null);
      prismaMock.invitation.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.emailDeliveryLog.findFirst.mockResolvedValue(null);
      actionTokenServiceMock.issueActionToken.mockResolvedValue({
        token: { id: 'new-token-id', expiresAt: new Date() },
        rawToken: 'raw-token-string',
      });
      emailHookMock.requestAuthEmailSend.mockRejectedValueOnce(
        new Error('unexpected hook failure'),
      );

      const response = await resendInitialAdminSetup(actorUserId, organisationId);

      expect(response.success).toBe(true);
      expect(response.emailQueued).toBe(false);
      expect(prismaMock.actionToken.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'new-token-id' },
          data: expect.objectContaining({ revokedReason: 'EMAIL_SEND_FAILED' }),
        }),
      );
      expect(auditLogMock.recordAuditLog).toHaveBeenCalledWith({
        actorType: 'SYSTEM',
        targetType: 'OTHER',
        actionType: 'UPDATED',
        outcome: 'FAILURE',
        metadata: { eventType: 'EMAIL_HOOK_UNEXPECTED_FAILURE' },
      });
    });

    it('revokes the replacement setup token only when the provider explicitly does not accept it', async () => {
      const mockOrg = {
        id: organisationId,
        name: 'Target Org',
        status: 'PENDING_ONBOARDING',
      };

      const mockInvitation = {
        id: 'invite-123',
        status: 'PENDING',
        recipientEmail: 'admin@target.com',
        recipientFirstName: 'Bob',
        expiresAt: new Date(Date.now() - 1000),
        organisationRegistrationRequestId: requestId,
        actionTokens: [],
      };

      repositoryMock.findOrganisationById.mockResolvedValue(mockOrg);
      repositoryMock.findRegistrationRequestByOrganisationId.mockResolvedValue(null);
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(mockInvitation);
      repositoryMock.findLatestEmailLogForInvitation.mockResolvedValue(null);
      prismaMock.invitation.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.emailDeliveryLog.findFirst.mockResolvedValue(null);
      actionTokenServiceMock.issueActionToken.mockResolvedValue({
        token: { id: 'new-token-id', expiresAt: new Date() },
        rawToken: 'raw-token-string',
      });
      emailHookMock.requestAuthEmailSend.mockResolvedValue({
        status: 'NOT_ACCEPTED',
        acceptedByProvider: false,
        queued: false,
        deliveryLogId: 'email-log-1',
        reason: 'EMAIL_SEND_FAILED',
      });

      const response = await resendInitialAdminSetup(actorUserId, organisationId);

      expect(response.success).toBe(true);
      expect(response.emailQueued).toBe(false);
      expect(prismaMock.actionToken.update).toHaveBeenCalledWith({
        where: { id: 'new-token-id' },
        data: {
          revokedAt: expect.any(Date),
          revokedReason: 'EMAIL_SEND_FAILED',
        },
      });
      expect(auditLogMock.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          outcome: 'FAILURE',
          metadata: { error: 'Email was not accepted for delivery by the provider' },
        }),
      );
    });

    it('throws 409 Conflict if organisation is already active', async () => {
      const mockOrg = {
        id: organisationId,
        name: 'Target Org',
        status: 'ACTIVE', // ACTIVE
      };

      const mockInvitation = {
        id: 'invite-123',
        status: 'PENDING',
        recipientEmail: 'admin@target.com',
        recipientFirstName: 'Bob',
        expiresAt: new Date(Date.now() - 1000),
        organisationRegistrationRequestId: requestId,
        actionTokens: [],
      };

      repositoryMock.findOrganisationById.mockResolvedValue(mockOrg);
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(mockInvitation);

      await expect(resendInitialAdminSetup(actorUserId, organisationId)).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          409,
          'RESEND_NOT_ELIGIBLE',
          'Setup email is not eligible for resending: ORGANISATION_NOT_ONBOARDING',
        ),
      );
    });

    it('throws 409 Conflict if setup token is already completed', async () => {
      const mockOrg = {
        id: organisationId,
        status: 'PENDING_ONBOARDING',
      };

      const mockInvitation = {
        id: 'invite-123',
        status: 'COMPLETED', // COMPLETED
        recipientEmail: 'admin@target.com',
        actionTokens: [],
      };

      repositoryMock.findOrganisationById.mockResolvedValue(mockOrg);
      repositoryMock.findRegistrationRequestByOrganisationId.mockResolvedValue(null);
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(mockInvitation);
      repositoryMock.findLatestEmailLogForInvitation.mockResolvedValue(null);

      // COMPLETED invitation: eligible check fires before the atomic claim
      prismaMock.emailDeliveryLog.findFirst.mockResolvedValue(null);

      await expect(resendInitialAdminSetup(actorUserId, organisationId)).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          409,
          'RESEND_NOT_ELIGIBLE',
          'Setup email is not eligible for resending: SETUP_ALREADY_COMPLETED',
        ),
      );
    });

    it('throws 409 Conflict if an active setup token exists and email did not fail', async () => {
      const mockOrg = {
        id: organisationId,
        status: 'PENDING_ONBOARDING',
      };

      const mockInvitation = {
        id: 'invite-123',
        status: 'PENDING',
        recipientEmail: 'admin@target.com',
        expiresAt: new Date(Date.now() + 100_000),
        actionTokens: [
          {
            id: 'token-123',
            expiresAt: new Date(Date.now() + 100_000),
            usedAt: null,
            revokedAt: null,
          },
        ],
      };

      const mockLatestEmail = {
        id: 'email-log-123',
        deliveryStatus: 'SENT', // SENT
      };

      repositoryMock.findOrganisationById.mockResolvedValue(mockOrg);
      repositoryMock.findRegistrationRequestByOrganisationId.mockResolvedValue(null);
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(mockInvitation);
      repositoryMock.findLatestEmailLogForInvitation.mockResolvedValue(mockLatestEmail);

      // Active token + SENT email: eligible check fires before the atomic claim
      prismaMock.emailDeliveryLog.findFirst.mockResolvedValue(mockLatestEmail);

      await expect(resendInitialAdminSetup(actorUserId, organisationId)).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          409,
          'RESEND_NOT_ELIGIBLE',
          'Setup email is not eligible for resending: ACTIVE_SETUP_TOKEN_EXISTS',
        ),
      );
    });

    it('does not revoke a newer active token because an older token delivery failed', async () => {
      const mockOrg = {
        id: organisationId,
        status: 'PENDING_ONBOARDING',
      };

      const mockInvitation = {
        id: 'invite-123',
        status: 'PENDING',
        recipientEmail: 'admin@target.com',
        expiresAt: new Date(Date.now() + 100_000),
        actionTokens: [
          {
            id: 'token-new',
            expiresAt: new Date(Date.now() + 100_000),
            usedAt: null,
            revokedAt: null,
          },
        ],
      };

      const mockLatestEmail = {
        id: 'email-log-old',
        deliveryStatus: 'FAILED',
        sentAt: null,
        failedAt: new Date(),
        failureReason: 'SMTP_NOT_ACCEPTED',
        actionTokenId: 'token-old',
      };

      repositoryMock.findOrganisationById.mockResolvedValue(mockOrg);
      repositoryMock.findRegistrationRequestByOrganisationId.mockResolvedValue(null);
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(mockInvitation);
      repositoryMock.findLatestEmailLogForInvitation.mockResolvedValue(mockLatestEmail);
      prismaMock.emailDeliveryLog.findFirst.mockResolvedValue(mockLatestEmail);

      await expect(resendInitialAdminSetup(actorUserId, organisationId)).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          409,
          'RESEND_NOT_ELIGIBLE',
          'Setup email is not eligible for resending: ACTIVE_SETUP_TOKEN_EXISTS',
        ),
      );

      expect(prismaMock.actionToken.updateMany).not.toHaveBeenCalled();
      expect(actionTokenServiceMock.issueActionToken).not.toHaveBeenCalled();
      expect(emailHookMock.requestAuthEmailSend).not.toHaveBeenCalled();
    });

    it('keeps pending delivery with an active setup token blocked from resend', async () => {
      const mockOrg = {
        id: organisationId,
        status: 'PENDING_ONBOARDING',
      };

      const mockInvitation = {
        id: 'invite-123',
        status: 'PENDING',
        recipientEmail: 'admin@target.com',
        expiresAt: new Date(Date.now() + 100_000),
        actionTokens: [
          {
            id: 'token-123',
            expiresAt: new Date(Date.now() + 100_000),
            usedAt: null,
            revokedAt: null,
          },
        ],
      };

      const mockLatestEmail = {
        id: 'email-log-123',
        deliveryStatus: 'PENDING',
        sentAt: null,
        failedAt: null,
        failureReason: null,
      };

      repositoryMock.findOrganisationById.mockResolvedValue(mockOrg);
      repositoryMock.findRegistrationRequestByOrganisationId.mockResolvedValue(null);
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(mockInvitation);
      repositoryMock.findLatestEmailLogForInvitation.mockResolvedValue(mockLatestEmail);
      prismaMock.emailDeliveryLog.findFirst.mockResolvedValue(mockLatestEmail);

      await expect(resendInitialAdminSetup(actorUserId, organisationId)).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          409,
          'RESEND_NOT_ELIGIBLE',
          'Setup email is not eligible for resending: ACTIVE_SETUP_TOKEN_EXISTS',
        ),
      );

      expect(actionTokenServiceMock.issueActionToken).not.toHaveBeenCalled();
      expect(emailHookMock.requestAuthEmailSend).not.toHaveBeenCalled();
    });
  });
});
