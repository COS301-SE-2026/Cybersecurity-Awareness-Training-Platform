import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../src/generated/prisma/client.js';
import {
  listOrganisationRequests,
  getOrganisationRequest,
  markRequestContacted,
  rejectOrganisationRequest,
  approveOrganisationRequest,
  deleteOrganisationRequest,
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
    updateMany: vi.fn(),
    delete: vi.fn(),
    findFirst: vi.fn(),
  },
  organisation: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  organisationPermission: {
    createMany: vi.fn(),
  },
  invitation: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  actionToken: {
    findUnique: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  emailDeliveryLog: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  emailDeliveryJob: {
    create: vi.fn(),
    update: vi.fn(),
  },
  organisationAdminProfile: {
    findMany: vi.fn(),
  },
  auditLogEntry: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn((callback) => callback(prismaMock)),
}));

const actionTokenServiceMock = vi.hoisted(() => ({
  issueActionToken: vi.fn(),
  revokeActionTokenById: vi.fn(),
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

const notificationFailureEventMock = vi.hoisted(() => ({
  recordNotificationFailureEvent: vi.fn(),
}));

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../../src/services/action-token.service.js', () => actionTokenServiceMock);
vi.mock('../../src/repositories/security-settings.repository.js', () => securitySettingsMock);
vi.mock('../../src/services/audit-log.service.js', () => auditLogMock);
vi.mock('../../src/services/auth-email-hook.service.js', () => emailHookMock);
vi.mock(
  '../../src/services/notification-failure-event.service.js',
  () => notificationFailureEventMock,
);

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
        new OrganisationRegistrationRequestError(
          403,
          'FORBIDDEN',
          'Platform admin access is required',
        ),
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
          approvedOrganisation: null,
          initialAdminInvitations: [],
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
      expect(response.requests[0]).toHaveProperty('setupStatus', null);
      expect(response.requests[0]).toHaveProperty('resendEligibility');
      expect(prismaMock.organisationRegistrationRequest.findMany).toHaveBeenCalled();
    });

    it('correctly derives expired setup status when token/invitation has expired by time', async () => {
      const pastDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
      prismaMock.organisationRegistrationRequest.findMany.mockResolvedValue([
        {
          id: requestId,
          submittedOrganisationName: 'Acme',
          representativeFirstName: 'John',
          representativeLastName: 'Doe',
          representativeEmail: 'john@acme.com',
          status: 'APPROVED',
          createdAt: new Date(),
          updatedAt: new Date(),
          contactedAt: null,
          approvedAt: new Date(),
          rejectedAt: null,
          approvedOrganisation: {
            status: 'PENDING_ONBOARDING',
          },
          initialAdminInvitations: [
            {
              id: 'inv-1',
              status: 'PENDING',
              recipientEmail: 'john@acme.com',
              expiresAt: pastDate,
              actionTokens: [
                {
                  id: 'tok-1',
                  expiresAt: pastDate,
                  usedAt: null,
                  revokedAt: null,
                },
              ],
              emailDeliveryLogs: [],
            },
          ],
        },
      ]);
      prismaMock.organisationRegistrationRequest.count.mockResolvedValue(1);

      const response = await listOrganisationRequests(actorUserId, {
        page: 1,
        limit: 10,
      });

      expect(response.requests[0].derivedStatus).toBe('SETUP_TOKEN_EXPIRED');
      expect(response.requests[0].setupStatus?.status).toBe('PENDING');
      expect(response.requests[0].resendEligibility.isEligible).toBe(true);
      expect(response.requests[0].resendEligibility.reason).toBe('SETUP_TOKEN_EXPIRED');
    });

    it('does not derive setup email failed from an older failed log when a newer active token exists', async () => {
      const futureDate = new Date(Date.now() + 3600 * 1000);
      prismaMock.organisationRegistrationRequest.findMany.mockResolvedValue([
        {
          id: requestId,
          submittedOrganisationName: 'Acme',
          representativeFirstName: 'John',
          representativeLastName: 'Doe',
          representativeEmail: 'john@acme.com',
          status: 'APPROVED',
          createdAt: new Date(),
          updatedAt: new Date(),
          contactedAt: null,
          approvedAt: new Date(),
          rejectedAt: null,
          approvedOrganisation: {
            status: 'PENDING_ONBOARDING',
          },
          initialAdminInvitations: [
            {
              id: 'inv-1',
              status: 'PENDING',
              recipientEmail: 'john@acme.com',
              expiresAt: futureDate,
              actionTokens: [
                {
                  id: 'token-new',
                  expiresAt: futureDate,
                  usedAt: null,
                  revokedAt: null,
                },
              ],
              emailDeliveryLogs: [
                {
                  id: 'email-log-old',
                  deliveryStatus: 'FAILED',
                  sentAt: null,
                  failedAt: new Date(),
                  failureReason: 'SMTP_NOT_ACCEPTED',
                  actionTokenId: 'token-old',
                },
              ],
            },
          ],
        },
      ]);
      prismaMock.organisationRegistrationRequest.count.mockResolvedValue(1);

      const response = await listOrganisationRequests(actorUserId, {
        page: 1,
        limit: 10,
      });

      expect(response.requests[0].derivedStatus).toBe('PENDING_ONBOARDING');
      expect(response.requests[0].resendEligibility).toEqual({
        isEligible: false,
        reason: 'ACTIVE_SETUP_TOKEN_EXISTS',
      });
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
      prismaMock.organisationRegistrationRequest.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'CONTACTED',
        createdAt: new Date(),
        updatedAt: new Date(),
        contactedAt: new Date(),
        approvedAt: null,
        rejectedAt: null,
        contactedBy: null,
        approvedBy: null,
        rejectedBy: null,
      });

      const response = await markRequestContacted(actorUserId, requestId);

      expect(response.status).toBe('CONTACTED');
      expect(prismaMock.organisationRegistrationRequest.updateMany).toHaveBeenCalled();
      expect(auditLogMock.recordAuditLog).toHaveBeenCalled();
    });

    it('throws 409 Conflict if request is already resolved', async () => {
      prismaMock.organisationRegistrationRequest.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'APPROVED',
      });

      await expect(markRequestContacted(actorUserId, requestId)).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          409,
          'REQUEST_ALREADY_RESOLVED',
          'Request has already been processed or status has changed',
        ),
      );
    });
  });

  describe('rejectOrganisationRequest', () => {
    it('marks request rejected, records audit, and sends email', async () => {
      prismaMock.organisationRegistrationRequest.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'REJECTED',
        createdAt: new Date(),
        updatedAt: new Date(),
        contactedAt: null,
        approvedAt: null,
        rejectedAt: new Date(),
        contactedBy: null,
        approvedBy: null,
        rejectedBy: null,
        representativeEmail: 'john@acme.com',
        submittedOrganisationName: 'Acme',
      });
      emailHookMock.requestAuthEmailSend.mockResolvedValue({
        status: 'QUEUED',
        queueAccepted: true,
        queued: true,
        deliveryLogId: 'email-log-1',
        jobId: 'email-job-1',
      });

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
      prismaMock.organisation.findFirst.mockResolvedValue(null);
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

    const mockApprovalPersistence = () => {
      prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'PENDING_REVIEW',
        representativeFirstName: 'John',
        representativeLastName: 'Doe',
        representativeEmail: 'john@acme.com',
        submittedOrganisationName: 'Acme',
      });
      prismaMock.organisationRegistrationRequest.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.organisation.create.mockResolvedValue({ id: organisationId, name: 'Acme' });
      prismaMock.invitation.create.mockResolvedValue({
        id: 'invitation-1',
        recipientFirstName: 'John',
        expiresAt: new Date(),
      });
      prismaMock.actionToken.create.mockResolvedValue({
        id: 'token-id-1',
        expiresAt: new Date(),
      });
      prismaMock.emailDeliveryLog.create.mockResolvedValue({ id: 'email-log-1' });
      prismaMock.emailDeliveryJob.create.mockResolvedValue({ id: 'email-job-1' });
      prismaMock.auditLogEntry.create.mockResolvedValue({ id: 'audit-1' });
      prismaMock.invitation.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.invitation.findUnique.mockResolvedValue({ status: 'FAILED_TO_SEND' });
      prismaMock.actionToken.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.actionToken.findUnique.mockResolvedValue({
        usedAt: null,
        revokedAt: new Date(),
        revokedReason: 'EMAIL_SEND_FAILED',
      });
      prismaMock.organisationRegistrationRequest.update.mockResolvedValue({
        id: requestId,
        status: 'APPROVED',
        createdAt: new Date(),
        updatedAt: new Date(),
        contactedAt: null,
        approvedAt: new Date(),
        rejectedAt: null,
        contactedBy: null,
        approvedBy: null,
        rejectedBy: null,
        representativeFirstName: 'John',
        representativeLastName: 'Doe',
        representativeEmail: 'john@acme.com',
        submittedOrganisationName: 'Acme',
      });
    };

    it('runs approval onboarding transaction and queues setup email', async () => {
      prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'PENDING_REVIEW',
        representativeFirstName: 'John',
        representativeLastName: 'Doe',
        representativeEmail: 'john@acme.com',
        submittedOrganisationName: 'Acme',
      });
      prismaMock.organisationRegistrationRequest.updateMany.mockResolvedValue({ count: 1 });

      prismaMock.organisation.create.mockResolvedValue({ id: organisationId, name: 'Acme' });
      prismaMock.invitation.create.mockResolvedValue({
        id: 'invitation-1',
        recipientFirstName: 'John',
        expiresAt: new Date(),
      });
      prismaMock.actionToken.create.mockResolvedValue({
        id: 'token-id-1',
        expiresAt: new Date(),
      });
      prismaMock.emailDeliveryLog.create.mockResolvedValue({ id: 'email-log-1' });
      prismaMock.emailDeliveryJob.create.mockResolvedValue({ id: 'email-job-1' });
      prismaMock.auditLogEntry.create.mockResolvedValue({ id: 'audit-1' });
      prismaMock.organisationRegistrationRequest.update.mockResolvedValue({
        id: requestId,
        status: 'APPROVED',
        createdAt: new Date(),
        updatedAt: new Date(),
        contactedAt: null,
        approvedAt: new Date(),
        rejectedAt: null,
        contactedBy: null,
        approvedBy: null,
        rejectedBy: null,
        representativeFirstName: 'John',
        representativeLastName: 'Doe',
        representativeEmail: 'john@acme.com',
        submittedOrganisationName: 'Acme',
      });

      const response = await approveOrganisationRequest(actorUserId, requestId, {
        organisationName: 'Acme Corp',
        initialAdminEmail: 'john@acme.com',
      });

      expect(response.status).toBe('APPROVED');
      expect(prismaMock.organisation.create).toHaveBeenCalledWith({
        data: {
          name: 'Acme Corp',
          status: 'PENDING_ONBOARDING',
          approximateSize: undefined,
          description: undefined,
          primaryDomain: undefined,
          website: undefined,
        },
      });
      expect(prismaMock.organisationPermission.createMany).toHaveBeenCalled();
      expect(securitySettingsMock.ensureDefaultOrganisationSecuritySettings).toHaveBeenCalled();
      expect(prismaMock.invitation.create).toHaveBeenCalled();
      expect(prismaMock.actionToken.create).toHaveBeenCalled();
      expect(prismaMock.emailDeliveryLog.create).toHaveBeenCalled();
      expect(prismaMock.emailDeliveryJob.create).toHaveBeenCalled();
      expect(response.setupEmailQueued).toBe(true);
      expect(actionTokenServiceMock.revokeActionTokenById).not.toHaveBeenCalled();
    });

    it('rejects approval when the required setup email cannot be queued', async () => {
      mockApprovalPersistence();
      prismaMock.emailDeliveryJob.create.mockRejectedValue(
        new Error('Required email could not be queued for delivery'),
      );

      await expect(
        approveOrganisationRequest(actorUserId, requestId, {
          organisationName: 'Acme Corp',
          initialAdminEmail: 'john@acme.com',
        }),
      ).rejects.toThrowError('Required email could not be queued for delivery');

      expect(prismaMock.organisation.create).toHaveBeenCalled();
      expect(prismaMock.invitation.create).toHaveBeenCalled();
      expect(prismaMock.actionToken.create).toHaveBeenCalled();
      expect(prismaMock.invitation.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.actionToken.updateMany).not.toHaveBeenCalled();
      expect(notificationFailureEventMock.recordNotificationFailureEvent).not.toHaveBeenCalled();
      expect(auditLogMock.recordAuditLog).not.toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            reason: expect.stringContaining('SMTP broke'),
          }),
        }),
      );
    });

    it('does not run setup email recovery when transactional queueing fails', async () => {
      mockApprovalPersistence();
      prismaMock.actionToken.findUnique.mockResolvedValue({
        usedAt: null,
        revokedAt: null,
        revokedReason: null,
      });
      prismaMock.emailDeliveryJob.create.mockRejectedValue(
        new Error('Required email could not be queued for delivery'),
      );

      await expect(
        approveOrganisationRequest(actorUserId, requestId, {
          organisationName: 'Acme Corp',
          initialAdminEmail: 'john@acme.com',
        }),
      ).rejects.toThrowError('Required email could not be queued for delivery');

      expect(notificationFailureEventMock.recordNotificationFailureEvent).not.toHaveBeenCalled();
      expect(actionTokenServiceMock.revokeActionTokenById).not.toHaveBeenCalled();
    });

    it('preserves the first setup token when SMTP acceptance is persisted successfully', async () => {
      mockApprovalPersistence();

      const response = await approveOrganisationRequest(actorUserId, requestId, {
        organisationName: 'Acme Corp',
        initialAdminEmail: 'john@acme.com',
      });

      expect(response.setupEmailQueued).toBe(true);
      expect(actionTokenServiceMock.revokeActionTokenById).not.toHaveBeenCalled();
    });

    it('throws 409 Conflict if organisation already exists', async () => {
      prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'PENDING_REVIEW',
        submittedOrganisationName: 'Acme',
        representativeEmail: 'john@acme.com',
      });
      prismaMock.organisation.findFirst.mockResolvedValue({ id: 'org-1' });

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
        representativeEmail: 'john@acme.com',
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

    it('throws 409 Conflict if state changes concurrently during transaction', async () => {
      prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'PENDING_REVIEW',
        submittedOrganisationName: 'Acme',
        representativeFirstName: 'John',
        representativeLastName: 'Doe',
        representativeEmail: 'john@acme.com',
      });
      prismaMock.organisationRegistrationRequest.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        approveOrganisationRequest(actorUserId, requestId, {
          initialAdminEmail: 'john@acme.com',
        }),
      ).rejects.toThrowError(
        new OrganisationRegistrationRequestError(
          409,
          'REQUEST_ALREADY_RESOLVED',
          'Request has already been processed or status has changed',
        ),
      );
    });

    it('maps Prisma unique conflict for organisation name to stable 409 ORGANISATION_ALREADY_EXISTS', async () => {
      prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'PENDING_REVIEW',
        submittedOrganisationName: 'Acme',
        representativeFirstName: 'John',
        representativeLastName: 'Doe',
        representativeEmail: 'john@acme.com',
      });
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.0.0',
        meta: { target: ['name'] },
      });
      prismaMock.$transaction.mockRejectedValueOnce(error);

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

    it('maps Prisma unique conflict for user email to stable 409 REPRESENTATIVE_CONFLICT', async () => {
      prismaMock.organisationRegistrationRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: 'PENDING_REVIEW',
        submittedOrganisationName: 'Acme',
        representativeFirstName: 'John',
        representativeLastName: 'Doe',
        representativeEmail: 'john@acme.com',
      });
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '7.0.0',
        meta: { target: ['email'] },
      });
      prismaMock.$transaction.mockRejectedValueOnce(error);

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
});
