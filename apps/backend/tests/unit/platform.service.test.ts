import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listOrganisationRequests,
  getOrganisationRequest,
  markRequestContacted,
  rejectOrganisationRequest,
  approveOrganisationRequest,
  deleteOrganisationRequest,
  getPlatformOrganisationDetail,
  getOrganisationRequestDetails,
  resendInitialAdminSetup,
  OrganisationRegistrationRequestError,
} from '../../src/services/organisation-registration-request.service.js';

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
  },
  organisationRegistrationRequest: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
  },
  organisation: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  organisationPermission: {
    createMany: vi.fn(),
  },
  invitation: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  actionToken: {
    updateMany: vi.fn(),
  },
  emailDeliveryLog: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  organisationAdminProfile: {
    findMany: vi.fn(),
  },
  auditLogEntry: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn((callback) => callback(prismaMock)),
}));

const repositoryMock = vi.hoisted(() => ({
  findOrganisationByName: vi.fn(),
  findActiveRequestByOrganisationName: vi.fn(),
  findActiveRequestByWebsiteOrDomain: vi.fn(),
  findActiveRequestByRepresentativeEmail: vi.fn(),
  createOrganisationRegistrationRequest: vi.fn(),
}));

const actionTokenServiceMock = vi.hoisted(() => ({
  issueActionToken: vi.fn(),
}));

const securitySettingsMock = vi.hoisted(() => ({
  ensureDefaultOrganisationSecuritySettings: vi.fn(),
}));

const auditLogMock = vi.hoisted(() => ({
  recordAuditLog: vi.fn(),
}));

const emailHookMock = vi.hoisted(() => ({
  requestAuthEmailSend: vi.fn(),
}));

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock(
  '../../src/repositories/organisation-registration-request.repository.js',
  () => repositoryMock,
);

vi.mock('../../src/services/action-token.service.js', () => actionTokenServiceMock);
vi.mock('../../src/repositories/security-settings.repository.js', () => securitySettingsMock);
vi.mock('../../src/services/audit-log.service.js', () => auditLogMock);
vi.mock('../../src/services/auth-email-hook.service.js', () => emailHookMock);

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

describe('platform organisation registration request service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActivePlatformAdmin();
  });

  describe('requirePlatformAdminUser', () => {
    it('throws Forbidden if actor is not an active platform admin', async () => {
      mockInactivePlatformAdmin();

      await expect(
        listOrganisationRequests(actorUserId, { page: 1, limit: 10 }),
      ).rejects.toThrowError(
        new OrganisationRegistrationRequestError(403, 'FORBIDDEN', 'Platform admin access is required'),
      );
    });
  });

  describe('listOrganisationRequests', () => {
    it('lists requests matching filter and search options', async () => {
      prismaMock.organisationRegistrationRequest.findMany.mockResolvedValue([
        {
          id: requestId,
          submittedOrganisationName: 'Acme',
          representativeFirstName: 'John',
          representativeLastName: 'Doe',
          representativeEmail: 'john@acme.com',
          status: 'PENDING_REVIEW',
          createdAt: new Date(),
          updatedAt: new Date(),
          contactedAt: null,
          approvedAt: null,
          rejectedAt: null,
        },
      ]);
      prismaMock.organisationRegistrationRequest.count.mockResolvedValue(1);

      const response = await listOrganisationRequests(actorUserId, {
        status: 'PENDING_REVIEW',
        search: 'Acme',
        sort: 'createdAt:desc',
        page: 1,
        limit: 10,
      });

      expect(response.requests).toHaveLength(1);
      expect(response.pagination).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
      expect(prismaMock.organisationRegistrationRequest.findMany).toHaveBeenCalled();
    });
  });

  describe('getOrganisationRequest', () => {
    it('returns detail request matching ID', async () => {
      prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue({
        id: requestId,
        submittedOrganisationName: 'Acme',
        representativeFirstName: 'John',
        representativeLastName: 'Doe',
        representativeEmail: 'john@acme.com',
        status: 'PENDING_REVIEW',
        createdAt: new Date(),
        updatedAt: new Date(),
        contactedAt: null,
        approvedAt: null,
        rejectedAt: null,
        contactedBy: null,
        approvedBy: null,
        rejectedBy: null,
      });

      const response = await getOrganisationRequest(actorUserId, requestId);
      expect(response.id).toBe(requestId);
    });

    it('throws 404 if request is not found', async () => {
      prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue(null);

      await expect(getOrganisationRequest(actorUserId, requestId)).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          404,
          'REQUEST_NOT_FOUND',
          'Organisation registration request not found',
        ),
      );
    });
  });

  describe('markRequestContacted', () => {
    it('updates request status and records audit log', async () => {
      prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'PENDING_REVIEW',
      });
      prismaMock.organisationRegistrationRequest.update.mockResolvedValue({
        id: requestId,
        status: 'CONTACTED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await markRequestContacted(actorUserId, requestId);

      expect(response.status).toBe('CONTACTED');
      expect(prismaMock.organisationRegistrationRequest.update).toHaveBeenCalled();
      expect(auditLogMock.recordAuditLog).toHaveBeenCalled();
    });

    it('throws 409 Conflict if request is already resolved', async () => {
      prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'APPROVED',
      });

      await expect(markRequestContacted(actorUserId, requestId)).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          409,
          'REQUEST_ALREADY_RESOLVED',
          'Request is already approved, rejected, or cancelled',
        ),
      );
    });
  });

  describe('rejectOrganisationRequest', () => {
    it('marks request rejected, records audit, and sends email', async () => {
      prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'PENDING_REVIEW',
        representativeEmail: 'john@acme.com',
        submittedOrganisationName: 'Acme',
      });
      prismaMock.organisationRegistrationRequest.update.mockResolvedValue({
        id: requestId,
        status: 'REJECTED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      emailHookMock.requestAuthEmailSend.mockResolvedValue({ queued: true });

      const response = await rejectOrganisationRequest(actorUserId, requestId, {
        rejectionReason: 'Not eligible',
      });

      expect(response.status).toBe('REJECTED');
      expect(emailHookMock.requestAuthEmailSend).toHaveBeenCalledWith({
        emailType: 'ORGANISATION_REQUEST_REJECTED',
        recipientEmail: 'john@acme.com',
        organisationRegistrationRequestId: requestId,
        templateData: {
          organisationName: 'Acme',
          rejectionReason: 'Not eligible',
        },
      });
    });
  });

  describe('approveOrganisationRequest', () => {
    beforeEach(() => {
      repositoryMock.findOrganisationByName.mockResolvedValue(null);
      prismaMock.user.findUnique.mockImplementation(async (args) => {
        // mock requirePlatformAdmin check
        if (args.where.id === actorUserId) {
          return {
            id: actorUserId,
            userType: 'IP_ADMIN',
            ipAdminProfile: { id: 'admin-profile-1', adminStatus: 'ACTIVE' },
          };
        }
        // mock initialAdminEmail check (representing user doesn't exist)
        return null;
      });
    });

    it('runs approval onboarding transaction and sends setup email', async () => {
      prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'PENDING_REVIEW',
        representativeFirstName: 'John',
        representativeLastName: 'Doe',
        representativeEmail: 'john@acme.com',
        submittedOrganisationName: 'Acme',
      });

      prismaMock.organisation.create.mockResolvedValue({ id: organisationId, name: 'Acme' });
      prismaMock.invitation.create.mockResolvedValue({
        id: 'invitation-1',
        recipientFirstName: 'John',
        expiresAt: new Date(),
      });
      actionTokenServiceMock.issueActionToken.mockResolvedValue({
        rawToken: 'token123',
        token: { id: 'token-id-1', expiresAt: new Date() },
      });
      prismaMock.organisationRegistrationRequest.update.mockResolvedValue({
        id: requestId,
        status: 'APPROVED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      emailHookMock.requestAuthEmailSend.mockResolvedValue({ queued: true });

      const response = await approveOrganisationRequest(actorUserId, requestId, {
        organisationName: 'Acme Corp',
        initialAdminEmail: 'john@acme.com',
      });

      expect(response.status).toBe('APPROVED');
      expect(prismaMock.organisation.create).toHaveBeenCalledWith({
        data: { name: 'Acme Corp', status: 'PENDING_ONBOARDING' },
      });
      expect(prismaMock.organisationPermission.createMany).toHaveBeenCalled();
      expect(securitySettingsMock.ensureDefaultOrganisationSecuritySettings).toHaveBeenCalled();
      expect(prismaMock.invitation.create).toHaveBeenCalled();
      expect(actionTokenServiceMock.issueActionToken).toHaveBeenCalled();
      expect(emailHookMock.requestAuthEmailSend).toHaveBeenCalled();
    });

    it('throws 409 Conflict if organisation already exists', async () => {
      prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'PENDING_REVIEW',
        submittedOrganisationName: 'Acme',
      });
      repositoryMock.findOrganisationByName.mockResolvedValue({ id: 'org-1' });

      await expect(
        approveOrganisationRequest(actorUserId, requestId, {
          initialAdminEmail: 'john@acme.com',
        }),
      ).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          409,
          'ORGANISATION_ALREADY_EXISTS',
          'An organisation with this name already exists',
        ),
      );
    });

    it('throws 409 Conflict if representative already has a user account', async () => {
      prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'PENDING_REVIEW',
        submittedOrganisationName: 'Acme',
      });
      // Mock existing user conflict
      prismaMock.user.findUnique.mockImplementation(async (args) => {
        if (args.where.id === actorUserId) {
          return {
            id: actorUserId,
            userType: 'IP_ADMIN',
            ipAdminProfile: { id: 'admin-profile-1', adminStatus: 'ACTIVE' },
          };
        }
        return { id: 'existing-user-id', email: 'john@acme.com' };
      });

      await expect(
        approveOrganisationRequest(actorUserId, requestId, {
          initialAdminEmail: 'john@acme.com',
        }),
      ).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          409,
          'REPRESENTATIVE_CONFLICT',
          'A user with this email address already exists',
        ),
      );
    });
  });

  describe('deleteOrganisationRequest', () => {
    it('deletes request successfully if rejected or cancelled', async () => {
      prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'REJECTED',
      });

      const response = await deleteOrganisationRequest(actorUserId, requestId);
      expect(response.success).toBe(true);
      expect(prismaMock.organisationRegistrationRequest.delete).toHaveBeenCalled();
    });

    it('throws 409 if status is pending', async () => {
      prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'PENDING_REVIEW',
      });

      await expect(deleteOrganisationRequest(actorUserId, requestId)).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          409,
          'REQUEST_NOT_DELETABLE',
          'Only rejected or cancelled requests can be deleted',
        ),
      );
    });
  });

  describe('getPlatformOrganisationDetail', () => {
    it('returns expanded details, setup status, resend eligibility, admins, and timeline', async () => {
      prismaMock.organisation.findUnique.mockResolvedValue({
        id: organisationId,
        name: 'Acme Corp',
        status: 'PENDING_ONBOARDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { adminProfiles: 1, traineeProfiles: 12 },
      });
      prismaMock.organisationRegistrationRequest.findFirst.mockResolvedValue({ id: requestId });
      prismaMock.invitation.findFirst.mockResolvedValue({
        id: 'invitation-1',
        status: 'PENDING',
        recipientEmail: 'admin@acme.com',
        expiresAt: new Date(),
        actionTokens: [{ id: 'tok-1', expiresAt: new Date() }],
      });
      prismaMock.emailDeliveryLog.findFirst.mockResolvedValue({
        id: 'log-1',
        deliveryStatus: 'SENT',
      });
      prismaMock.organisationAdminProfile.findMany.mockResolvedValue([]);
      prismaMock.auditLogEntry.findMany.mockResolvedValue([]);
      prismaMock.emailDeliveryLog.findMany.mockResolvedValue([]);

      const response = await getPlatformOrganisationDetail(actorUserId, organisationId);

      expect(response.id).toBe(organisationId);
      expect(response.resendEligibility.isEligible).toBe(true);
      expect(response.setupStatus?.id).toBe('invitation-1');
      expect(response.timeline).toBeDefined();
    });
  });

  describe('getOrganisationRequestDetails', () => {
    it('returns detailed request fallback details and timeline', async () => {
      prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'PENDING_REVIEW',
        submittedOrganisationName: 'Acme Corp',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prismaMock.invitation.findFirst.mockResolvedValue(null);
      prismaMock.auditLogEntry.findMany.mockResolvedValue([]);
      prismaMock.emailDeliveryLog.findMany.mockResolvedValue([]);

      const response = await getOrganisationRequestDetails(actorUserId, requestId);

      expect(response.id).toBe(requestId);
      expect(response.submittedOrganisationName).toBe('Acme Corp');
      expect(response.resendEligibility.isEligible).toBe(false);
      expect(response.timeline).toHaveLength(0);
    });
  });

  describe('resendInitialAdminSetup', () => {
    it('resends invitation successfully, revokes old tokens, creates new token, and logs audit', async () => {
      prismaMock.organisation.findUnique.mockResolvedValue({
        id: organisationId,
        status: 'PENDING_ONBOARDING',
      });
      prismaMock.invitation.findFirst.mockResolvedValue({
        id: 'invitation-1',
        recipientEmail: 'admin@acme.com',
        recipientFirstName: 'John',
      });
      prismaMock.emailDeliveryLog.findFirst.mockResolvedValue(null);
      prismaMock.invitation.update.mockResolvedValue({ id: 'invitation-1' });
      actionTokenServiceMock.issueActionToken.mockResolvedValue({
        token: { id: 'tok-2', expiresAt: new Date() },
        rawToken: 'rawtokenabc',
      });
      emailHookMock.requestAuthEmailSend.mockResolvedValue({ queued: true });

      const response = await resendInitialAdminSetup(actorUserId, organisationId);

      expect(response.success).toBe(true);
      expect(response.emailQueued).toBe(true);
      expect(prismaMock.actionToken.updateMany).toHaveBeenCalled();
      expect(actionTokenServiceMock.issueActionToken).toHaveBeenCalled();
      expect(emailHookMock.requestAuthEmailSend).toHaveBeenCalled();
    });
  });
});
