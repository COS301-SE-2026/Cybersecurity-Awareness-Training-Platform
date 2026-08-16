import type { CreateOrganisationRegistrationRequestDto } from '@insightful-phish/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  approveOrganisationRequest,
  createOrganisationRegistrationRequest,
  deleteOrganisationRequest,
  getOrganisationRequest,
  listOrganisationRequests,
  markRequestContacted,
  OrganisationRegistrationRequestError,
  rejectOrganisationRequest,
  requirePlatformAdminUser,
} from '../../src/services/organisation-registration-request.service.js';

const repositoryMock = vi.hoisted(() => ({
  findUserWithIpAdminProfile: vi.fn(),
  findUserByEmail: vi.fn(),
  findOrganisationRegistrationRequestById: vi.fn(),
  findOrganisationRegistrationRequestWithReviewers: vi.fn(),
  findOrganisationRegistrationRequestsForPlatform: vi.fn(),
  findOrganisationByName: vi.fn(),
  findActiveRequestByOrganisationName: vi.fn(),
  findActiveRequestByWebsiteOrDomain: vi.fn(),
  findActiveRequestByRepresentativeEmail: vi.fn(),
  createOrganisationRegistrationRequest: vi.fn(),
  markOrganisationRegistrationRequestContacted: vi.fn(),
  rejectOrganisationRegistrationRequest: vi.fn(),
  deleteOrganisationRegistrationRequest: vi.fn(),
  approveOrganisationRegistrationRequestTx: vi.fn(),
  OrganisationRegistrationRequestRepositoryError: class OrganisationRegistrationRequestRepositoryError extends Error {
    constructor(
      public readonly statusCode: 403 | 404 | 409 | 422,
      public readonly errorKey: string,
      message: string,
    ) {
      super(message);
      this.name = 'OrganisationRegistrationRequestRepositoryError';
    }
  },
}));

const userRepositoryMock = vi.hoisted(() => ({
  findAuthSubjectByEmail: vi.fn(),
}));

const emailHookMock = vi.hoisted(() => ({
  requestAuthEmailSend: vi.fn(),
}));

const auditLogMock = vi.hoisted(() => ({
  recordAuditLog: vi.fn(),
}));

vi.mock(
  '../../src/repositories/organisation-registration-request.repository.js',
  () => repositoryMock,
);
vi.mock('../../src/repositories/user.repository.js', () => userRepositoryMock);
vi.mock('../../src/services/auth-email-hook.service.js', () => emailHookMock);
vi.mock('../../src/services/audit-log.service.js', () => auditLogMock);

function validInput(): CreateOrganisationRegistrationRequestDto {
  return {
    organisationName: 'Example Consulting',
    organisationDescription: 'A fake consulting organisation for tests.',
    organisationSize: 75,
    organisationWebsiteUrl: 'https://www.example-consulting.test/contact?ref=test',
    representativeFirstName: 'Adriano',
    representativeLastName: 'Jorge',
    representativeEmail: 'adriano@example.test',
  };
}

function mockNoExistingConflicts() {
  repositoryMock.findOrganisationByName.mockResolvedValue(null);
  repositoryMock.findActiveRequestByOrganisationName.mockResolvedValue(null);
  repositoryMock.findActiveRequestByWebsiteOrDomain.mockResolvedValue(null);
  repositoryMock.findActiveRequestByRepresentativeEmail.mockResolvedValue(null);
  userRepositoryMock.findAuthSubjectByEmail.mockResolvedValue({ user: null });
}

function mockCreatedRequest() {
  repositoryMock.createOrganisationRegistrationRequest.mockResolvedValue({
    id: 'request-1',
    submittedOrganisationName: 'Example Consulting',
    submittedWebsite: 'https://www.example-consulting.test/contact',
    submittedPrimaryDomain: 'example-consulting.test',
    representativeEmail: 'adriano@example.test',
    status: 'PENDING_REVIEW',
  });
}

function mockPlatformAdminUser(userId = 'admin-user-1') {
  repositoryMock.findUserWithIpAdminProfile.mockResolvedValue({
    id: userId,
    userType: 'IP_ADMIN',
    ipAdminProfile: { id: 'admin-prof-1', adminStatus: 'ACTIVE' },
  });
}

describe('organisation-registration-request service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNoExistingConflicts();
    mockCreatedRequest();
    mockPlatformAdminUser();
    emailHookMock.requestAuthEmailSend.mockResolvedValue({
      status: 'QUEUED',
      queueAccepted: true,
      queued: true,
      deliveryLogId: 'email-log-1',
      jobId: 'email-job-1',
    });
    auditLogMock.recordAuditLog.mockResolvedValue({ id: 'audit-1' });
  });

  describe('requirePlatformAdminUser', () => {
    it('returns ipAdminProfile when user is active platform admin', async () => {
      const profile = await requirePlatformAdminUser('admin-user-1');
      expect(profile).toEqual({ id: 'admin-prof-1', adminStatus: 'ACTIVE' });
    });

    it('throws 403 when user is not IP_ADMIN', async () => {
      repositoryMock.findUserWithIpAdminProfile.mockResolvedValue({
        id: 'user-2',
        userType: 'GENERAL_TRAINEE',
        ipAdminProfile: null,
      });

      await expect(requirePlatformAdminUser('user-2')).rejects.toMatchObject({
        statusCode: 403,
        error: 'FORBIDDEN',
      });
    });

    it('throws 403 when adminStatus is not ACTIVE', async () => {
      repositoryMock.findUserWithIpAdminProfile.mockResolvedValue({
        id: 'user-3',
        userType: 'IP_ADMIN',
        ipAdminProfile: { id: 'admin-prof-3', adminStatus: 'DISABLED' },
      });

      await expect(requirePlatformAdminUser('user-3')).rejects.toMatchObject({
        statusCode: 403,
        error: 'FORBIDDEN',
      });
    });
  });

  describe('listOrganisationRequests', () => {
    it('returns formatted request list with derived statuses and pagination', async () => {
      repositoryMock.findOrganisationRegistrationRequestsForPlatform.mockResolvedValue({
        requests: [
          {
            id: 'req-1',
            submittedOrganisationName: 'Acme Corp',
            submittedWebsite: 'https://acme.test',
            submittedOrganisationDescription: null,
            submittedOrganisationSize: 50,
            submittedPrimaryDomain: 'acme.test',
            representativeFirstName: 'John',
            representativeLastName: 'Doe',
            representativeEmail: 'john@acme.test',
            representativePhone: null,
            status: 'APPROVED',
            contactedByIpAdminId: null,
            approvedByIpAdminId: 'admin-1',
            rejectedByIpAdminId: null,
            approvedOrganisationId: 'org-1',
            contactedAt: null,
            approvedAt: new Date('2026-07-01'),
            rejectedAt: null,
            rejectionReason: null,
            createdAt: new Date('2026-06-01'),
            updatedAt: new Date('2026-07-01'),
            approvedOrganisation: { status: 'PENDING_ONBOARDING' },
            initialAdminInvitations: [],
          },
        ],
        total: 1,
      });

      const result = await listOrganisationRequests('admin-user-1', { page: 1, limit: 10 });

      expect(result.requests).toHaveLength(1);
      expect(result.requests[0]?.derivedStatus).toBe('APPROVED_PENDING_SETUP');
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('getOrganisationRequest', () => {
    it('returns request with mapped reviewer profiles on success', async () => {
      repositoryMock.findOrganisationRegistrationRequestWithReviewers.mockResolvedValue({
        id: 'req-1',
        submittedOrganisationName: 'Acme Corp',
        submittedWebsite: null,
        submittedOrganisationDescription: null,
        submittedOrganisationSize: 50,
        submittedPrimaryDomain: null,
        representativeFirstName: 'John',
        representativeLastName: 'Doe',
        representativeEmail: 'john@acme.test',
        representativePhone: null,
        status: 'PENDING_REVIEW',
        contactedByIpAdminId: null,
        approvedByIpAdminId: null,
        rejectedByIpAdminId: null,
        approvedOrganisationId: null,
        contactedAt: null,
        approvedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        createdAt: new Date('2026-06-01'),
        updatedAt: new Date('2026-06-01'),
        contactedBy: null,
        approvedBy: null,
        rejectedBy: null,
      });

      const result = await getOrganisationRequest('admin-user-1', 'req-1');

      expect(result.id).toBe('req-1');
      expect(result.contactedBy).toBeNull();
    });

    it('throws 404 when request is not found', async () => {
      repositoryMock.findOrganisationRegistrationRequestWithReviewers.mockResolvedValue(null);

      await expect(getOrganisationRequest('admin-user-1', 'req-1')).rejects.toMatchObject({
        statusCode: 404,
        error: 'REQUEST_NOT_FOUND',
      });
    });
  });

  describe('markRequestContacted', () => {
    it('delegates to repository and records audit log', async () => {
      repositoryMock.markOrganisationRegistrationRequestContacted.mockResolvedValue({
        id: 'req-1',
        status: 'CONTACTED',
        createdAt: new Date('2026-06-01'),
        updatedAt: new Date('2026-06-01'),
        contactedAt: new Date('2026-06-02'),
        approvedAt: null,
        rejectedAt: null,
      });

      const result = await markRequestContacted('admin-user-1', 'req-1');

      expect(result.status).toBe('CONTACTED');
      expect(auditLogMock.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'CONTACTED',
          targetId: 'req-1',
        }),
      );
    });

    it('rethrows repository errors as service errors', async () => {
      repositoryMock.markOrganisationRegistrationRequestContacted.mockRejectedValue(
        new repositoryMock.OrganisationRegistrationRequestRepositoryError(
          409,
          'REQUEST_ALREADY_RESOLVED',
          'Request has already been processed',
        ),
      );

      await expect(markRequestContacted('admin-user-1', 'req-1')).rejects.toMatchObject({
        statusCode: 409,
        error: 'REQUEST_ALREADY_RESOLVED',
      });
    });
  });

  describe('rejectOrganisationRequest', () => {
    it('delegates to repository, logs audit and queues rejection email', async () => {
      repositoryMock.rejectOrganisationRegistrationRequest.mockResolvedValue({
        id: 'req-1',
        status: 'REJECTED',
        representativeEmail: 'rep@acme.test',
        submittedOrganisationName: 'Acme Corp',
        createdAt: new Date('2026-06-01'),
        updatedAt: new Date('2026-06-01'),
        contactedAt: null,
        approvedAt: null,
        rejectedAt: new Date('2026-06-02'),
      });

      const result = await rejectOrganisationRequest('admin-user-1', 'req-1', {
        rejectionReason: 'Invalid organisation',
      });

      expect(result.status).toBe('REJECTED');
      expect(result.rejectionEmailQueued).toBe(true);
      expect(auditLogMock.recordAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'REJECTED',
          targetId: 'req-1',
        }),
      );
    });
  });

  describe('approveOrganisationRequest', () => {
    const input = {
      initialAdminEmail: 'rep@acme.test',
      organisationName: 'Acme Corp',
    };

    const mockFreshRequest = {
      id: 'req-1',
      status: 'PENDING_REVIEW',
      submittedOrganisationName: 'Acme Corp',
      submittedWebsite: 'https://acme.test',
      submittedOrganisationDescription: 'Desc',
      submittedOrganisationSize: 50,
      submittedPrimaryDomain: 'acme.test',
      representativeFirstName: 'John',
      representativeLastName: 'Doe',
      representativeEmail: 'rep@acme.test',
    };

    it('delegates to repository transaction and returns formatted approved organisation', async () => {
      repositoryMock.findOrganisationRegistrationRequestById.mockResolvedValue(mockFreshRequest);
      repositoryMock.findOrganisationByName.mockResolvedValue(null);
      repositoryMock.findUserByEmail.mockResolvedValue(null);
      repositoryMock.approveOrganisationRegistrationRequestTx.mockResolvedValue({
        updatedRequest: {
          ...mockFreshRequest,
          status: 'APPROVED',
          createdAt: new Date('2026-06-01'),
          updatedAt: new Date('2026-06-02'),
          contactedAt: null,
          approvedAt: new Date('2026-06-02'),
          rejectedAt: null,
        },
        organisation: { id: 'org-1', name: 'Acme Corp' },
        invitation: { id: 'inv-1' },
        emailResult: { queued: true },
      });

      const result = await approveOrganisationRequest('admin-user-1', 'req-1', input);

      expect(result.approvedOrganisation).toEqual({ id: 'org-1', name: 'Acme Corp' });
      expect(result.setupEmailQueued).toBe(true);
      expect(repositoryMock.approveOrganisationRegistrationRequestTx).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'admin-user-1',
          requestId: 'req-1',
          ipAdminProfileId: 'admin-prof-1',
          orgName: 'Acme Corp',
          initialAdminEmail: 'rep@acme.test',
          request: mockFreshRequest,
          actionTokenData: expect.any(Object),
          emailDeliveryData: expect.any(Object),
          auditLogEntries: expect.any(Array),
        }),
      );
    });

    it('throws 404 when request is not found', async () => {
      repositoryMock.findOrganisationRegistrationRequestById.mockResolvedValue(null);

      await expect(
        approveOrganisationRequest('admin-user-1', 'req-1', input),
      ).rejects.toMatchObject({
        statusCode: 404,
        error: 'REQUEST_NOT_FOUND',
      });
    });

    it('throws 409 when request is already approved or resolved', async () => {
      repositoryMock.findOrganisationRegistrationRequestById.mockResolvedValue({
        ...mockFreshRequest,
        status: 'APPROVED',
      });

      await expect(
        approveOrganisationRequest('admin-user-1', 'req-1', input),
      ).rejects.toMatchObject({
        statusCode: 409,
        error: 'REQUEST_ALREADY_RESOLVED',
      });
    });

    it('throws 409 when organisation name already exists', async () => {
      repositoryMock.findOrganisationRegistrationRequestById.mockResolvedValue(mockFreshRequest);
      repositoryMock.findOrganisationByName.mockResolvedValue({ id: 'org-existing' });

      await expect(
        approveOrganisationRequest('admin-user-1', 'req-1', input),
      ).rejects.toMatchObject({
        statusCode: 409,
        error: 'ORGANISATION_ALREADY_EXISTS',
      });
    });

    it('throws 409 when initial admin email does not match representative email', async () => {
      repositoryMock.findOrganisationRegistrationRequestById.mockResolvedValue(mockFreshRequest);
      repositoryMock.findOrganisationByName.mockResolvedValue(null);

      await expect(
        approveOrganisationRequest('admin-user-1', 'req-1', {
          ...input,
          initialAdminEmail: 'other@example.com',
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        error: 'SETUP_EMAIL_MISMATCH',
      });
    });

    it('throws 409 when user already exists with initial admin email', async () => {
      repositoryMock.findOrganisationRegistrationRequestById.mockResolvedValue(mockFreshRequest);
      repositoryMock.findOrganisationByName.mockResolvedValue(null);
      repositoryMock.findUserByEmail.mockResolvedValue({ id: 'user-existing' });

      await expect(
        approveOrganisationRequest('admin-user-1', 'req-1', input),
      ).rejects.toMatchObject({
        statusCode: 409,
        error: 'REPRESENTATIVE_CONFLICT',
      });
    });

    it('rethrows repository transaction errors', async () => {
      repositoryMock.findOrganisationRegistrationRequestById.mockResolvedValue(mockFreshRequest);
      repositoryMock.findOrganisationByName.mockResolvedValue(null);
      repositoryMock.findUserByEmail.mockResolvedValue(null);
      repositoryMock.approveOrganisationRegistrationRequestTx.mockRejectedValue(
        new repositoryMock.OrganisationRegistrationRequestRepositoryError(
          409,
          'EMAIL_QUEUE_FAILED',
          'Required email could not be queued',
        ),
      );

      await expect(
        approveOrganisationRequest('admin-user-1', 'req-1', input),
      ).rejects.toMatchObject({
        statusCode: 409,
        error: 'EMAIL_QUEUE_FAILED',
      });
    });
  });

  describe('deleteOrganisationRequest', () => {
    it('deletes rejected or cancelled request on success', async () => {
      repositoryMock.findOrganisationRegistrationRequestById.mockResolvedValue({
        id: 'req-1',
        status: 'REJECTED',
      });
      repositoryMock.deleteOrganisationRegistrationRequest.mockResolvedValue({ id: 'req-1' });

      const result = await deleteOrganisationRequest('admin-user-1', 'req-1');

      expect(result).toEqual({ success: true });
      expect(repositoryMock.deleteOrganisationRegistrationRequest).toHaveBeenCalledWith('req-1');
    });

    it('throws 404 when request is not found', async () => {
      repositoryMock.findOrganisationRegistrationRequestById.mockResolvedValue(null);

      await expect(deleteOrganisationRequest('admin-user-1', 'req-1')).rejects.toMatchObject({
        statusCode: 404,
        error: 'REQUEST_NOT_FOUND',
      });
    });

    it('throws 409 when request is not in a deletable state', async () => {
      repositoryMock.findOrganisationRegistrationRequestById.mockResolvedValue({
        id: 'req-1',
        status: 'PENDING_REVIEW',
      });

      await expect(deleteOrganisationRequest('admin-user-1', 'req-1')).rejects.toMatchObject({
        statusCode: 409,
        error: 'REQUEST_NOT_DELETABLE',
      });
    });
  });

  describe('createOrganisationRegistrationRequest', () => {
    it('creates a pending request with only fields supported by the current schema', async () => {
      const response = await createOrganisationRegistrationRequest(validInput());

      expect(repositoryMock.findOrganisationByName).toHaveBeenCalledWith('Example Consulting');
      expect(repositoryMock.findActiveRequestByWebsiteOrDomain).toHaveBeenCalledWith({
        website: 'https://www.example-consulting.test/contact',
        primaryDomain: 'example-consulting.test',
      });
      expect(repositoryMock.createOrganisationRegistrationRequest).toHaveBeenCalledWith({
        submittedOrganisationName: 'Example Consulting',
        submittedWebsite: 'https://www.example-consulting.test/contact',
        submittedOrganisationDescription: 'A fake consulting organisation for tests.',
        submittedOrganisationSize: 75,
        submittedPrimaryDomain: 'example-consulting.test',
        representativeFirstName: 'Adriano',
        representativeLastName: 'Jorge',
        representativeEmail: 'adriano@example.test',
      });
      expect(response).toEqual({
        requestId: 'request-1',
        status: 'PENDING_REVIEW',
        confirmationEmailQueued: true,
      });
    });

    it('normalises website domains before duplicate checks and persistence', async () => {
      await createOrganisationRegistrationRequest({
        ...validInput(),
        organisationWebsiteUrl: 'https://Example-Consulting.test/',
      });

      expect(repositoryMock.findActiveRequestByWebsiteOrDomain).toHaveBeenCalledWith({
        website: 'https://example-consulting.test',
        primaryDomain: 'example-consulting.test',
      });
      expect(repositoryMock.createOrganisationRegistrationRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          submittedWebsite: 'https://example-consulting.test',
          submittedPrimaryDomain: 'example-consulting.test',
        }),
      );
    });

    it('uses the primary domain to catch protocol variants during duplicate checks', async () => {
      await createOrganisationRegistrationRequest({
        ...validInput(),
        organisationWebsiteUrl: 'http://example-consulting.test',
      });

      expect(repositoryMock.findActiveRequestByWebsiteOrDomain).toHaveBeenCalledWith({
        website: 'http://example-consulting.test',
        primaryDomain: 'example-consulting.test',
      });
    });

    it('sends the request received email after persistence through the central hook', async () => {
      await createOrganisationRegistrationRequest(validInput());

      expect(emailHookMock.requestAuthEmailSend).toHaveBeenCalledWith({
        emailType: 'ORGANISATION_REQUEST_RECEIVED',
        recipientEmail: 'adriano@example.test',
        organisationRegistrationRequestId: 'request-1',
        templateData: {
          organisationName: 'Example Consulting',
        },
      });
    });

    it('records a non-sensitive system audit entry after persistence', async () => {
      await createOrganisationRegistrationRequest(validInput());

      expect(auditLogMock.recordAuditLog).toHaveBeenCalledWith({
        actorType: 'SYSTEM',
        targetType: 'ORGANISATION_REGISTRATION_REQUEST',
        targetId: 'request-1',
        actionType: 'CREATED',
        metadata: {
          source: 'public_organisation_registration_request',
        },
      });
    });

    it('does not fail public submission when the confirmation email hook reports failure', async () => {
      emailHookMock.requestAuthEmailSend.mockResolvedValue({
        status: 'NOT_QUEUED',
        queueAccepted: false,
        queued: false,
        reason: 'EMAIL_QUEUE_FAILED',
        deliveryLogId: 'email-log-1',
      });

      await expect(createOrganisationRegistrationRequest(validInput())).resolves.toEqual({
        requestId: 'request-1',
        status: 'PENDING_REVIEW',
        confirmationEmailQueued: false,
      });
    });

    it('does not fail submission when audit logging fails', async () => {
      auditLogMock.recordAuditLog.mockRejectedValue(new Error('audit unavailable'));

      await expect(createOrganisationRegistrationRequest(validInput())).resolves.toEqual({
        requestId: 'request-1',
        status: 'PENDING_REVIEW',
        confirmationEmailQueued: true,
      });
    });

    it('returns a safe conflict for existing organisations', async () => {
      repositoryMock.findOrganisationByName.mockResolvedValue({ id: 'org-1' });

      await expect(createOrganisationRegistrationRequest(validInput())).rejects.toMatchObject({
        statusCode: 409,
        error: 'ORGANISATION_REQUEST_CONFLICT',
      });
      expect(repositoryMock.createOrganisationRegistrationRequest).not.toHaveBeenCalled();
    });

    it('returns a safe conflict for duplicate organisation request names', async () => {
      repositoryMock.findActiveRequestByOrganisationName.mockResolvedValue({ id: 'request-2' });

      await expect(createOrganisationRegistrationRequest(validInput())).rejects.toBeInstanceOf(
        OrganisationRegistrationRequestError,
      );
      expect(repositoryMock.createOrganisationRegistrationRequest).not.toHaveBeenCalled();
    });

    it('returns a safe conflict for duplicate request websites or domains', async () => {
      repositoryMock.findActiveRequestByWebsiteOrDomain.mockResolvedValue({ id: 'request-2' });

      await expect(createOrganisationRegistrationRequest(validInput())).rejects.toMatchObject({
        statusCode: 409,
        error: 'ORGANISATION_REQUEST_CONFLICT',
      });
      expect(repositoryMock.createOrganisationRegistrationRequest).not.toHaveBeenCalled();
    });

    it('returns a safe conflict for duplicate representative request emails', async () => {
      repositoryMock.findActiveRequestByRepresentativeEmail.mockResolvedValue({ id: 'request-2' });

      await expect(createOrganisationRegistrationRequest(validInput())).rejects.toMatchObject({
        statusCode: 409,
        error: 'ORGANISATION_REQUEST_CONFLICT',
      });
      expect(repositoryMock.createOrganisationRegistrationRequest).not.toHaveBeenCalled();
    });

    it('returns a safe conflict for representative role conflicts', async () => {
      userRepositoryMock.findAuthSubjectByEmail.mockResolvedValue({
        user: {
          id: 'user-1',
          userType: 'IP_ADMIN',
        },
      });

      await expect(createOrganisationRegistrationRequest(validInput())).rejects.toMatchObject({
        statusCode: 409,
        error: 'ORGANISATION_REQUEST_CONFLICT',
        message: 'The organisation registration request conflicts with existing records.',
      });
      expect(repositoryMock.createOrganisationRegistrationRequest).not.toHaveBeenCalled();
    });

    it('checks mixed-case representative email duplicates through repository lookup', async () => {
      repositoryMock.findActiveRequestByRepresentativeEmail.mockResolvedValue({
        id: 'request-2',
        representativeEmail: 'Adriano@Example.test',
      });

      await expect(createOrganisationRegistrationRequest(validInput())).rejects.toMatchObject({
        statusCode: 409,
        error: 'ORGANISATION_REQUEST_CONFLICT',
      });
      expect(repositoryMock.findActiveRequestByRepresentativeEmail).toHaveBeenCalledWith(
        'adriano@example.test',
      );
    });
  });
});
