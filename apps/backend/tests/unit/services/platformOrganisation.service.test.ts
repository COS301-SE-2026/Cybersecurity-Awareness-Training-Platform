import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getPlatformOrganisationDetail,
  getOrganisationRequestDetails,
  getResendEligibility,
  resendInitialAdminSetup,
  formatSetupStatus,
  OrganisationRegistrationRequestError,
} from '../../../src/services/platformOrganisation.service.js';
import {
  platformOrganisationDetailSchema,
  platformOrganisationRequestDetailsResponseSchema,
  resendInitialAdminSetupResponseSchema,
} from '@insightful-phish/shared';
import type * as AuthEmailHookModule from '../../../src/services/auth-email-hook.service.js';

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
  findUserForSetupValidation: vi.fn(),
  claimInvitationForResend: vi.fn(),
  revokeActiveActionTokensForInvitation: vi.fn(),
  markActionTokenRevoked: vi.fn(),
  runInTransaction: vi.fn((callback: (tx: unknown) => unknown) => callback({})),
}));

const orgRequestRepoMock = vi.hoisted(() => ({
  findUserWithIpAdminProfile: vi.fn(),
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

vi.mock('../../../src/repositories/organisation.repository.js', () => repositoryMock);
vi.mock(
  '../../../src/repositories/organisation-registration-request.repository.js',
  () => orgRequestRepoMock,
);
vi.mock('../../../src/services/action-token.service.js', () => actionTokenServiceMock);
vi.mock('../../../src/services/auth-email-hook.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthEmailHookModule>();

  return {
    ...actual,
    requestAuthEmailSend: emailHookMock.requestAuthEmailSend,
  };
});
vi.mock('../../../src/services/audit-log.service.js', () => auditLogMock);

const FIXED_NOW = new Date('2026-07-01T08:00:00.000Z');
const actorUserId = '44444444-4444-4444-8444-444444444444';
const requestId = '55555555-5555-4555-8555-555555555555';
const organisationId = '66666666-6666-4666-8666-666666666666';

const acceptedHookResult = {
  status: 'QUEUED' as const,
  queueAccepted: true as const,
  queued: true as const,
  deliveryLogId: 'email-log-1',
  jobId: 'email-job-1',
};

function mockActivePlatformAdmin() {
  orgRequestRepoMock.findUserWithIpAdminProfile.mockImplementation((userId: string) => {
    if (userId === actorUserId) {
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
  orgRequestRepoMock.findUserWithIpAdminProfile.mockImplementation((userId: string) => {
    if (userId === actorUserId) {
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
    repositoryMock.runInTransaction.mockImplementation((callback: (tx: unknown) => unknown) =>
      callback({}),
    );
    repositoryMock.claimInvitationForResend.mockResolvedValue(true);
    repositoryMock.findUserForSetupValidation.mockResolvedValue(null);
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
      orgRequestRepoMock.findUserWithIpAdminProfile.mockResolvedValue(null);

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
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(FIXED_NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns minimal organisation details, count, admin summary, setupStatus, and timeline logs', async () => {
      const activeExpiresAt = new Date(FIXED_NOW.getTime() + 7 * 24 * 60 * 60 * 1000);
      const mockOrg = {
        id: organisationId,
        name: 'Springbok Cyber Solutions',
        status: 'PENDING_ONBOARDING',
        description: 'Cybersecurity services in Gauteng',
        approximateSize: 150,
        website: 'https://springbokcyber.co.za',
        primaryDomain: 'springbokcyber.co.za',
        createdAt: new Date('2026-07-01T08:00:00Z'),
        updatedAt: new Date('2026-07-02T08:00:00Z'),
        _count: { adminProfiles: 1, traineeProfiles: 10 },
      };

      const mockRequest = {
        id: requestId,
        representativeFirstName: 'Rudolph',
        representativeLastName: 'van der Merwe',
        representativeEmail: 'rudolph@springbokcyber.co.za',
        submittedWebsite: 'https://springbokcyber.co.za',
        submittedPrimaryDomain: 'springbokcyber.co.za',
      };

      const mockInvitation = {
        id: '11111111-1111-4111-8111-111111111111',
        status: 'PENDING',
        recipientEmail: 'johan.botha@springbokcyber.co.za',
        recipientFirstName: 'Johan',
        expiresAt: activeExpiresAt,
        actionTokens: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            expiresAt: activeExpiresAt,
            usedAt: null,
            revokedAt: null,
          },
        ],
      };

      const mockLatestEmail = {
        id: '33333333-3333-4333-8333-333333333333',
        deliveryStatus: 'SENT',
        sentAt: new Date('2026-07-01T08:30:00Z'),
        failedAt: null,
        failureReason: null,
      };

      const mockAdmins = [
        {
          id: '44444444-4444-4444-8444-444444444444',
          adminStatus: 'ACTIVE',
          isInitialAdmin: false,
          user: {
            firstName: 'Conner',
            lastName: 'Naidoo',
            email: 'conner.naidoo@springbokcyber.co.za',
          },
        },
      ];

      const mockAuditLogs = [
        {
          id: '55555555-5555-4555-8555-555555555555',
          actionType: 'ENABLED',
          targetType: 'ORGANISATION',
          createdAt: new Date('2026-07-01T08:45:00Z'),
          outcome: 'SUCCESS',
          actorUser: {
            firstName: 'Johan',
            lastName: 'Botha',
          },
        },
        {
          id: '66666666-6666-4666-8666-666666666666',
          actionType: 'COMPLETED',
          targetType: 'INVITATION',
          createdAt: new Date('2026-07-01T08:45:00Z'),
          outcome: 'SUCCESS',
          actorUser: {
            firstName: 'Johan',
            lastName: 'Botha',
          },
        },
        {
          id: '77777777-7777-4777-8777-777777777777',
          actionType: 'APPROVED',
          targetType: 'ORGANISATION_REGISTRATION_REQUEST',
          createdAt: new Date('2026-07-01T08:00:00Z'),
          outcome: 'SUCCESS',
          actorUser: {
            firstName: 'Zanele',
            lastName: 'Khumalo',
          },
        },
      ];

      const mockEmailLogs = [
        {
          id: '33333333-3333-4333-8333-333333333333',
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
      expect(response.name).toBe('Springbok Cyber Solutions');
      expect(response.status).toBe('PENDING_ONBOARDING');
      expect(response.detailType).toBe('onboarding organisation');
      expect(response.description).toBe('Cybersecurity services in Gauteng');
      expect(response.approximateSize).toBe(150);
      expect(response.website).toBe('https://springbokcyber.co.za');
      expect(response.primaryDomain).toBe('springbokcyber.co.za');
      expect(response.createdAt).toBe('2026-07-01T08:00:00.000Z');
      expect(response._count.adminProfiles).toBe(1);
      expect(response.registrationRequest?.representativeEmail).toBe(
        'rudolph@springbokcyber.co.za',
      );
      expect(response.setupStatus?.status).toBe('PENDING');
      expect(response.setupStatus?.latestEmailDelivery?.deliveryStatus).toBe('SENT');
      expect(response.resendEligibility.isEligible).toBe(false);
      expect(response.admins).toHaveLength(1);
      expect(response.admins[0].email).toBe('conner.naidoo@springbokcyber.co.za');
      expect(response.admins[0].isInitialAdmin).toBe(false);
      expect(response.timeline).toHaveLength(4);
      expect(response.timeline.map((event) => event.action)).toEqual([
        'ENABLED',
        'COMPLETED',
        'INITIAL_ORGANISATION_ADMIN_SETUP',
        'APPROVED',
      ]);
      expect(response.timeline[0]).toEqual(
        expect.objectContaining({
          type: 'AUDIT_LOG',
          outcome: 'SUCCESS',
          actor: 'Johan Botha',
          metadata: null,
        }),
      );
      expect(response.timeline[1]).toEqual(
        expect.objectContaining({
          type: 'AUDIT_LOG',
          outcome: 'SUCCESS',
          actor: 'Johan Botha',
          metadata: null,
        }),
      );
      expect(response.timeline[2].type).toBe('EMAIL_DELIVERY');
      expect(response.timeline[2].outcome).toBe('SENT');
      expect(response.timeline[2].actor).toBe('System');
      expect(response.timeline[3].actor).toBe('Zanele Khumalo');
      expect(() => platformOrganisationDetailSchema.parse(response)).not.toThrow();
    });

    it('evaluates resend eligibility as ineligible when action token expires immediately after FIXED_NOW', async () => {
      const expiringJustAfterNow = new Date(FIXED_NOW.getTime() + 1000);
      const mockOrg = {
        id: organisationId,
        name: 'Target Org',
        status: 'PENDING_ONBOARDING',
        createdAt: new Date('2026-07-01T08:00:00Z'),
        updatedAt: new Date('2026-07-01T08:00:00Z'),
        _count: { adminProfiles: 1, traineeProfiles: 10 },
      };
      const mockInvitation = {
        id: '11111111-1111-4111-8111-111111111111',
        status: 'PENDING',
        recipientEmail: 'admin@target.com',
        recipientFirstName: 'Bob',
        expiresAt: expiringJustAfterNow,
        actionTokens: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            expiresAt: expiringJustAfterNow,
            usedAt: null,
            revokedAt: null,
          },
        ],
      };

      repositoryMock.findOrganisationWithCount.mockResolvedValue(mockOrg);
      repositoryMock.findRegistrationRequestByOrganisationId.mockResolvedValue(null);
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(mockInvitation);
      repositoryMock.findLatestEmailLogForInvitation.mockResolvedValue(null);
      repositoryMock.findOrganisationAdmins.mockResolvedValue([]);
      repositoryMock.findAuditLogsForTimeline.mockResolvedValue([]);
      repositoryMock.findEmailLogsForTimeline.mockResolvedValue([]);

      const response = await getPlatformOrganisationDetail(actorUserId, organisationId);

      expect(response.setupStatus?.latestActionToken?.status).toBe('AVAILABLE');
      expect(response.resendEligibility).toEqual({
        isEligible: false,
        reason: 'ACTIVE_SETUP_TOKEN_EXISTS',
      });
    });

    it('evaluates resend eligibility as eligible with SETUP_TOKEN_EXPIRED when action token expires at or immediately before FIXED_NOW', async () => {
      const expiringAtNow = new Date(FIXED_NOW.getTime());
      const mockOrg = {
        id: organisationId,
        name: 'Target Org',
        status: 'PENDING_ONBOARDING',
        createdAt: new Date('2026-07-01T08:00:00Z'),
        updatedAt: new Date('2026-07-01T08:00:00Z'),
        _count: { adminProfiles: 1, traineeProfiles: 10 },
      };
      const mockInvitationAt = {
        id: '11111111-1111-4111-8111-111111111111',
        status: 'PENDING',
        recipientEmail: 'admin@target.com',
        recipientFirstName: 'Bob',
        expiresAt: expiringAtNow,
        actionTokens: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            expiresAt: expiringAtNow,
            usedAt: null,
            revokedAt: null,
          },
        ],
      };

      repositoryMock.findOrganisationWithCount.mockResolvedValue(mockOrg);
      repositoryMock.findRegistrationRequestByOrganisationId.mockResolvedValue(null);
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(mockInvitationAt);
      repositoryMock.findLatestEmailLogForInvitation.mockResolvedValue(null);
      repositoryMock.findOrganisationAdmins.mockResolvedValue([]);
      repositoryMock.findAuditLogsForTimeline.mockResolvedValue([]);
      repositoryMock.findEmailLogsForTimeline.mockResolvedValue([]);

      const responseAt = await getPlatformOrganisationDetail(actorUserId, organisationId);

      expect(responseAt.setupStatus?.latestActionToken?.status).toBe('EXPIRED');
      expect(responseAt.resendEligibility).toEqual({
        isEligible: true,
        reason: 'SETUP_TOKEN_EXPIRED',
      });

      const expiringBeforeNow = new Date(FIXED_NOW.getTime() - 1000);
      const mockInvitationBefore = {
        ...mockInvitationAt,
        expiresAt: expiringBeforeNow,
        actionTokens: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            expiresAt: expiringBeforeNow,
            usedAt: null,
            revokedAt: null,
          },
        ],
      };
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(mockInvitationBefore);

      const responseBefore = await getPlatformOrganisationDetail(actorUserId, organisationId);

      expect(responseBefore.setupStatus?.latestActionToken?.status).toBe('EXPIRED');
      expect(responseBefore.resendEligibility).toEqual({
        isEligible: true,
        reason: 'SETUP_TOKEN_EXPIRED',
      });
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
      expect(response.resendEligibility.isEligible).toBe(false);
      expect(response.timeline).toHaveLength(0);
      expect(() => platformOrganisationRequestDetailsResponseSchema.parse(response)).not.toThrow();
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
          recipientEmail: 'rudolph@capetown-cyber.co.za',
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

    it('does not make invitation resend-eligible when delivery failure was ambiguous', () => {
      const eligibility = getResendEligibility(
        'PENDING_ONBOARDING',
        {
          id: 'invite-za-123',
          status: 'PENDING',
          recipientEmail: 'johan@protea-security.co.za',
          expiresAt: new Date(Date.now() + 100_000),
          actionTokens: [
            {
              id: 'token-za-123',
              expiresAt: new Date(Date.now() + 100_000),
              usedAt: null,
              revokedAt: null,
            },
          ],
        },
        {
          id: 'email-log-za-123',
          deliveryStatus: 'FAILED',
          sentAt: null,
          failedAt: new Date(),
          failureReason: 'SMTP_AMBIGUOUS_TRANSPORT_FAILURE',
          actionTokenId: 'token-za-123',
          deliveryJob: {
            lastProviderOutcome: 'PROVIDER_AMBIGUOUS',
            lastReasonCode: 'SMTP_AMBIGUOUS_TRANSPORT_FAILURE',
          },
        },
      );

      expect(eligibility).toEqual({
        isEligible: false,
        reason: 'ACTIVE_SETUP_TOKEN_EXISTS',
      });
    });

    it('does not make invitation resend-eligible when delivery failed due to expired lease', () => {
      const eligibility = getResendEligibility(
        'PENDING_ONBOARDING',
        {
          id: 'invite-za-456',
          status: 'PENDING',
          recipientEmail: 'conner@springbok-tech.co.za',
          expiresAt: new Date(Date.now() + 100_000),
          actionTokens: [
            {
              id: 'token-za-456',
              expiresAt: new Date(Date.now() + 100_000),
              usedAt: null,
              revokedAt: null,
            },
          ],
        },
        {
          id: 'email-log-za-456',
          deliveryStatus: 'FAILED',
          sentAt: null,
          failedAt: new Date(),
          failureReason: 'EMAIL_PROCESSING_LEASE_EXPIRED',
          actionTokenId: 'token-za-456',
          deliveryJob: {
            lastProviderOutcome: 'PROVIDER_AMBIGUOUS',
            lastReasonCode: 'EMAIL_PROCESSING_LEASE_EXPIRED',
          },
        },
      );

      expect(eligibility).toEqual({
        isEligible: false,
        reason: 'ACTIVE_SETUP_TOKEN_EXISTS',
      });
    });

    it('makes invitation resend-eligible when delivery failure is an authoritative provider rejection', () => {
      const eligibility = getResendEligibility(
        'PENDING_ONBOARDING',
        {
          id: 'invite-za-789',
          status: 'PENDING',
          recipientEmail: 'rudolph@capetown-cyber.co.za',
          expiresAt: new Date(Date.now() + 100_000),
          actionTokens: [
            {
              id: 'token-za-789',
              expiresAt: new Date(Date.now() + 100_000),
              usedAt: null,
              revokedAt: null,
            },
          ],
        },
        {
          id: 'email-log-za-789',
          deliveryStatus: 'FAILED',
          sentAt: null,
          failedAt: new Date(),
          failureReason: 'SMTP_PERMANENT_FAILURE',
          actionTokenId: 'token-za-789',
          deliveryJob: {
            lastProviderOutcome: 'PROVIDER_REJECTED',
            lastReasonCode: 'SMTP_PERMANENT_FAILURE',
          },
        },
      );

      expect(eligibility).toEqual({
        isEligible: true,
        reason: 'SETUP_EMAIL_FAILED',
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
        expiresAt: new Date(Date.now() - 1000),
        organisationRegistrationRequestId: requestId,
        actionTokens: [],
      };

      repositoryMock.findOrganisationById.mockResolvedValue(mockOrg);
      repositoryMock.findRegistrationRequestByOrganisationId.mockResolvedValue(null);
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(mockInvitation);
      repositoryMock.findLatestEmailLogForInvitation.mockResolvedValue(null);
      repositoryMock.claimInvitationForResend.mockResolvedValue(true);

      actionTokenServiceMock.issueActionToken.mockResolvedValue({
        token: { id: 'new-token-id', expiresAt: new Date() },
        rawToken: 'raw-token-string',
      });
      emailHookMock.requestAuthEmailSend.mockResolvedValue(acceptedHookResult);

      const response = await resendInitialAdminSetup(actorUserId, organisationId);

      expect(response.success).toBe(true);
      expect(response.emailQueued).toBe(true);
      expect(response.setupStatus).toBeDefined();
      expect(repositoryMock.claimInvitationForResend).toHaveBeenCalled();
      expect(repositoryMock.revokeActiveActionTokensForInvitation).toHaveBeenCalled();
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
        expiresAt: new Date(Date.now() + 100_000),
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
        deliveryStatus: 'FAILED',
        actionTokenId: 'token-123',
      };

      repositoryMock.findOrganisationById.mockResolvedValue(mockOrg);
      repositoryMock.findRegistrationRequestByOrganisationId.mockResolvedValue(null);
      repositoryMock.findSetupInvitationAndEmailLog.mockResolvedValue(mockInvitation);
      repositoryMock.findLatestEmailLogForInvitation.mockResolvedValue(mockLatestEmail);
      repositoryMock.claimInvitationForResend.mockResolvedValue(true);

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
      const inviteUuid = '11111111-1111-4111-8111-111111111111';
      const tokenUuid = '22222222-2222-4222-8222-222222222222';
      const newTokenUuid = '33333333-3333-4333-8333-333333333333';
      const emailLogUuid = '44444444-4444-4444-8444-444444444444';

      const mockOrg = {
        id: organisationId,
        name: 'Target Org',
        status: 'PENDING_ONBOARDING',
      };

      const mockInvitation = {
        id: inviteUuid,
        status: 'FAILED_TO_SEND',
        recipientEmail: 'admin@target.com',
        recipientFirstName: 'Bob',
        expiresAt: new Date(Date.now() + 100_000),
        organisationRegistrationRequestId: requestId,
        actionTokens: [
          {
            id: tokenUuid,
            expiresAt: new Date(Date.now() + 100_000),
            usedAt: null,
            revokedAt: new Date(),
          },
        ],
      };

      const mockLatestEmail = {
        id: emailLogUuid,
        deliveryStatus: 'FAILED',
        sentAt: null,
        failedAt: new Date(),
        failureReason: 'SMTP_NOT_ACCEPTED',
        actionTokenId: tokenUuid,
      };
      const newTokenExpiresAt = new Date(Date.now() + 200_000);
      const mockUpdatedInvitation = {
        ...mockInvitation,
        status: 'SENT',
        expiresAt: newTokenExpiresAt,
        actionTokens: [
          {
            id: newTokenUuid,
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
      repositoryMock.claimInvitationForResend.mockResolvedValue(true);
      actionTokenServiceMock.issueActionToken.mockResolvedValue({
        token: { id: newTokenUuid, expiresAt: newTokenExpiresAt },
        rawToken: 'raw-token-string',
      });
      emailHookMock.requestAuthEmailSend.mockResolvedValue(acceptedHookResult);

      const response = await resendInitialAdminSetup(actorUserId, organisationId);

      expect(response.success).toBe(true);
      expect(response.emailQueued).toBe(true);
      expect(actionTokenServiceMock.issueActionToken).toHaveBeenCalled();
      expect(emailHookMock.requestAuthEmailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          invitationId: inviteUuid,
          actionTokenId: newTokenUuid,
        }),
        expect.anything(),
      );
      expect(response.setupStatus?.latestActionToken).toEqual(
        expect.objectContaining({
          id: newTokenUuid,
          status: 'AVAILABLE',
        }),
      );
      expect(response.setupStatus?.latestEmailDelivery).toEqual(
        expect.objectContaining({
          deliveryStatus: 'FAILED',
          failureReason: 'SMTP_NOT_ACCEPTED',
        }),
      );
      expect(() => resendInitialAdminSetupResponseSchema.parse(response)).not.toThrow();
    });

    it('does not revoke the replacement setup token when the email is queued', async () => {
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
      repositoryMock.claimInvitationForResend.mockResolvedValue(true);
      actionTokenServiceMock.issueActionToken.mockResolvedValue({
        token: { id: 'new-token-id', expiresAt: new Date() },
        rawToken: 'raw-token-string',
      });
      emailHookMock.requestAuthEmailSend.mockResolvedValue({
        status: 'QUEUED',
        queueAccepted: true,
        queued: true,
        deliveryLogId: 'email-log-1',
        jobId: 'email-job-1',
      });

      const response = await resendInitialAdminSetup(actorUserId, organisationId);

      expect(response.success).toBe(true);
      expect(response.emailQueued).toBe(true);
      expect(repositoryMock.markActionTokenRevoked).not.toHaveBeenCalled();
    });

    it('propagates an unexpected setup email hook failure inside the transaction', async () => {
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
      repositoryMock.claimInvitationForResend.mockResolvedValue(true);
      actionTokenServiceMock.issueActionToken.mockResolvedValue({
        token: { id: 'new-token-id', expiresAt: new Date() },
        rawToken: 'raw-token-string',
      });
      emailHookMock.requestAuthEmailSend.mockRejectedValueOnce(
        new Error('unexpected hook failure'),
      );

      await expect(resendInitialAdminSetup(actorUserId, organisationId)).rejects.toThrow(
        'unexpected hook failure',
      );
      expect(repositoryMock.markActionTokenRevoked).not.toHaveBeenCalled();
    });

    it('rejects the resend transaction when the queue does not accept the setup email', async () => {
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
      repositoryMock.claimInvitationForResend.mockResolvedValue(true);
      actionTokenServiceMock.issueActionToken.mockResolvedValue({
        token: { id: 'new-token-id', expiresAt: new Date() },
        rawToken: 'raw-token-string',
      });
      emailHookMock.requestAuthEmailSend.mockResolvedValue({
        status: 'NOT_QUEUED',
        queueAccepted: false,
        queued: false,
        deliveryLogId: 'email-log-1',
        reason: 'EMAIL_QUEUE_FAILED',
      });

      await expect(resendInitialAdminSetup(actorUserId, organisationId)).rejects.toMatchObject({
        statusCode: 409,
        error: 'EMAIL_QUEUE_FAILED',
      });
      expect(repositoryMock.markActionTokenRevoked).not.toHaveBeenCalled();
    });

    it('throws 409 Conflict if organisation is already active', async () => {
      const mockOrg = {
        id: organisationId,
        name: 'Target Org',
        status: 'ACTIVE',
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
        status: 'COMPLETED',
        recipientEmail: 'admin@target.com',
        actionTokens: [],
      };

      repositoryMock.findOrganisationById.mockResolvedValue(mockOrg);
      repositoryMock.findRegistrationRequestByOrganisationId.mockResolvedValue(null);
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
        deliveryStatus: 'SENT',
      };

      repositoryMock.findOrganisationById.mockResolvedValue(mockOrg);
      repositoryMock.findRegistrationRequestByOrganisationId.mockResolvedValue(null);
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

      await expect(resendInitialAdminSetup(actorUserId, organisationId)).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          409,
          'RESEND_NOT_ELIGIBLE',
          'Setup email is not eligible for resending: ACTIVE_SETUP_TOKEN_EXISTS',
        ),
      );

      expect(repositoryMock.revokeActiveActionTokensForInvitation).not.toHaveBeenCalled();
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

    it('throws 409 Conflict if a concurrent resend won the atomic claim race', async () => {
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
      repositoryMock.claimInvitationForResend.mockResolvedValue(false);

      await expect(resendInitialAdminSetup(actorUserId, organisationId)).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          409,
          'RESEND_NOT_ELIGIBLE',
          'Setup email is not eligible for resending: CONCURRENT_RESEND_IN_PROGRESS',
        ),
      );
    });

    it('throws 409 Conflict if target user account is disabled or already belongs to another organisation', async () => {
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

      repositoryMock.findUserForSetupValidation.mockResolvedValueOnce({
        authStatus: 'DISABLED',
        userType: 'ORGANISATION_ADMIN',
        organisationAdminProfile: { organisationId },
        traineeProfile: null,
      });

      await expect(resendInitialAdminSetup(actorUserId, organisationId)).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          409,
          'SETUP_ROLE_CONFLICT',
          'Target account is disabled or has a conflicting role',
        ),
      );

      repositoryMock.findUserForSetupValidation.mockResolvedValueOnce({
        authStatus: 'ACTIVE',
        userType: 'ORGANISATION_ADMIN',
        organisationAdminProfile: { organisationId: 'different-org-id' },
        traineeProfile: null,
      });

      await expect(resendInitialAdminSetup(actorUserId, organisationId)).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          409,
          'SETUP_ROLE_CONFLICT',
          'Target account is already registered with another organisation',
        ),
      );
    });
  });

  describe('formatSetupStatus token state precedence', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(FIXED_NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('prioritises REVOKED over USED when a token has both revokedAt and usedAt set', () => {
      const activeExpiresAt = new Date(FIXED_NOW.getTime() + 7 * 24 * 60 * 60 * 1000);
      const invitation = {
        id: '11111111-1111-4111-8111-111111111111',
        status: 'PENDING',
        recipientEmail: 'admin@springbokcyber.co.za',
        expiresAt: activeExpiresAt,
        actionTokens: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            expiresAt: activeExpiresAt,
            usedAt: new Date(FIXED_NOW.getTime() - 2 * 24 * 60 * 60 * 1000),
            revokedAt: new Date(FIXED_NOW.getTime() - 1 * 24 * 60 * 60 * 1000),
          },
        ],
      };

      const result = formatSetupStatus(invitation, null);
      expect(result?.latestActionToken?.status).toBe('REVOKED');
    });
  });
});
