import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getPlatformOrganisationDetail,
  getOrganisationRequestDetails,
  resendInitialAdminSetup,
  OrganisationRegistrationRequestError,
} from '../../../src/services/platformOrganisation.service.js';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  ipAdminProfile: {
    findUnique: vi.fn(),
  },
  actionToken: {
    updateMany: vi.fn(),
  },
  invitation: {
    update: vi.fn(),
  },
  $transaction: vi.fn((callback) => callback(prismaMock)),
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
vi.mock('../../../src/services/auth-email-hook.service.js', () => emailHookMock);
vi.mock('../../../src/services/audit-log.service.js', () => auditLogMock);

const actorUserId = '44444444-4444-4444-8444-444444444444';
const requestId = '55555555-5555-4555-8555-555555555555';
const organisationId = '66666666-6666-4666-8666-666666666666';

function mockActivePlatformAdmin() {
  prismaMock.user.findUnique.mockResolvedValue({
    id: actorUserId,
    userType: 'IP_ADMIN',
    ipAdminProfile: { id: 'admin-profile-1', adminStatus: 'ACTIVE' },
  });
}

function mockInactivePlatformAdmin() {
  prismaMock.user.findUnique.mockResolvedValue({
    id: actorUserId,
    userType: 'IP_ADMIN',
    ipAdminProfile: { id: 'admin-profile-1', adminStatus: 'DISABLED' },
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
          user: {
            firstName: 'Alice',
            lastName: 'Smith',
            email: 'alice@target.com',
          },
        },
      ];

      const mockAuditLogs = [
        {
          id: 'audit-1',
          actionType: 'APPROVED',
          createdAt: new Date('2026-07-01T08:00:00Z'),
          outcome: 'SUCCESS',
          actorUser: {
            firstName: 'Patricia',
            lastName: 'Platform',
            email: 'patricia@example.test',
          },
          metadata: { ip: '127.0.0.1' },
        },
      ];

      const mockEmailLogs = [
        {
          id: 'email-log-123',
          emailType: 'INITIAL_ORGANISATION_ADMIN_SETUP',
          recipientEmail: 'admin@target.com',
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
      expect(response.createdAt).toBe('2026-07-01T08:00:00.000Z');
      expect(response._count.adminProfiles).toBe(1);
      expect(response.registrationRequest?.representativeEmail).toBe('john@example.com');
      expect(response.setupStatus?.status).toBe('PENDING');
      expect(response.setupStatus?.latestEmailDelivery?.deliveryStatus).toBe('SENT');
      expect(response.resendEligibility.isEligible).toBe(false); // token is still valid
      expect(response.admins).toHaveLength(1);
      expect(response.admins[0].email).toBe('alice@target.com');
      expect(response.admins[0].isInitialAdmin).toBe(false);
      expect(response.timeline).toHaveLength(2); // 1 audit log + 1 email log
      expect(response.timeline[0].type).toBe('EMAIL_DELIVERY'); // sorted by desc timestamp
      expect(response.timeline[0].outcome).toBe('SENT');
      expect(response.timeline[0].actor).toBe('System');
      expect(response.timeline[1].type).toBe('AUDIT_LOG');
      expect(response.timeline[1].outcome).toBe('SUCCESS');
      expect(response.timeline[1].actor).toBe('Patricia Platform');
      expect(response.timeline[1].metadata).toBeDefined();
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
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(mockInvitation);
      repositoryMock.findLatestEmailLogForInvitation.mockResolvedValue(null);

      actionTokenServiceMock.issueActionToken.mockResolvedValue({
        token: { id: 'new-token-id', expiresAt: new Date() },
        rawToken: 'raw-token-string',
      });
      emailHookMock.requestAuthEmailSend.mockResolvedValue({ queued: true });

      const response = await resendInitialAdminSetup(actorUserId, organisationId);

      expect(response.success).toBe(true);
      expect(response.emailQueued).toBe(true);
      expect(response.setupStatus).toBeDefined();
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
      };

      repositoryMock.findOrganisationById.mockResolvedValue(mockOrg);
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(mockInvitation);
      repositoryMock.findLatestEmailLogForInvitation.mockResolvedValue(mockLatestEmail);

      actionTokenServiceMock.issueActionToken.mockResolvedValue({
        token: { id: 'new-token-id', expiresAt: new Date() },
        rawToken: 'raw-token-string',
      });
      emailHookMock.requestAuthEmailSend.mockResolvedValue({ queued: true });

      const response = await resendInitialAdminSetup(actorUserId, organisationId);

      expect(response.success).toBe(true);
      expect(response.emailQueued).toBe(true);
      expect(response.setupStatus).toBeDefined();
    });

    it('throws 409 Conflict if organisation is already active', async () => {
      const mockOrg = {
        id: organisationId,
        name: 'Target Org',
        status: 'ACTIVE', // ACTIVE
      };

      repositoryMock.findOrganisationById.mockResolvedValue(mockOrg);

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
      };

      repositoryMock.findOrganisationById.mockResolvedValue(mockOrg);
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(mockInvitation);
      repositoryMock.findLatestEmailLogForInvitation.mockResolvedValue(null);

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
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(mockInvitation);
      repositoryMock.findLatestEmailLogForInvitation.mockResolvedValue(mockLatestEmail);

      await expect(resendInitialAdminSetup(actorUserId, organisationId)).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          409,
          'RESEND_NOT_ELIGIBLE',
          'Setup email is not eligible for resending: ACTIVE_SETUP_TOKEN_EXISTS',
        ),
      );
    });
  });
});
