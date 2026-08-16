import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  approveOrganisationRegistrationRequestTx,
  createOrganisationRegistrationRequest,
  deleteOrganisationRegistrationRequest,
  findActiveRequestByOrganisationName,
  findActiveRequestByRepresentativeEmail,
  findActiveRequestByWebsiteOrDomain,
  findOrganisationByName,
  findOrganisationRegistrationRequestById,
  findOrganisationRegistrationRequestsForPlatform,
  findOrganisationRegistrationRequestWithReviewers,
  findUserByEmail,
  findUserWithIpAdminProfile,
  markOrganisationRegistrationRequestContacted,
  rejectOrganisationRegistrationRequest,
} from '../../src/repositories/organisation-registration-request.repository.js';
import { prisma } from '../../src/lib/prisma.js';
import { issueActionToken } from '../../src/services/action-token.service.js';
import { recordAuditLog } from '../../src/services/audit-log.service.js';
import { requestAuthEmailSend } from '../../src/services/auth-email-hook.service.js';

const txMock = {
  organisationRegistrationRequest: {
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  organisation: {
    create: vi.fn(),
  },
  organisationPermission: {
    createMany: vi.fn(),
  },
  invitation: {
    create: vi.fn(),
  },
  securitySettings: {
    upsert: vi.fn(),
  },
};

vi.mock('../../src/lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(async (cb: (tx: typeof txMock) => unknown) => cb(txMock)),
    user: {
      findUnique: vi.fn(),
    },
    organisationRegistrationRequest: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    organisation: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../../src/services/action-token.service.js', () => ({
  issueActionToken: vi.fn(),
}));

vi.mock('../../src/services/audit-log.service.js', () => ({
  recordAuditLog: vi.fn(),
}));

vi.mock('../../src/services/auth-email-hook.service.js', () => ({
  requestAuthEmailSend: vi.fn(),
}));

vi.mock('../../src/repositories/security-settings.repository.js', () => ({
  ensureDefaultOrganisationSecuritySettings: vi.fn().mockResolvedValue({}),
}));

describe('organisation registration request repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findUserWithIpAdminProfile', () => {
    it('queries user with ipAdminProfile included', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1' } as never);
      const res = await findUserWithIpAdminProfile('user-1');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { ipAdminProfile: true },
      });
      expect(res).toEqual({ id: 'user-1' });
    });
  });

  describe('findUserByEmail', () => {
    it('queries user by email', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1' } as never);
      const res = await findUserByEmail('test@example.com');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(res).toEqual({ id: 'user-1' });
    });
  });

  describe('findOrganisationRegistrationRequestById', () => {
    it('queries request by id', async () => {
      vi.mocked(prisma.organisationRegistrationRequest.findUnique).mockResolvedValue({
        id: 'req-1',
      } as never);
      const res = await findOrganisationRegistrationRequestById('req-1');
      expect(prisma.organisationRegistrationRequest.findUnique).toHaveBeenCalledWith({
        where: { id: 'req-1' },
      });
      expect(res).toEqual({ id: 'req-1' });
    });
  });

  describe('findOrganisationRegistrationRequestWithReviewers', () => {
    it('queries request with reviewers included', async () => {
      vi.mocked(prisma.organisationRegistrationRequest.findUnique).mockResolvedValue({
        id: 'req-1',
      } as never);
      const res = await findOrganisationRegistrationRequestWithReviewers('req-1');
      expect(prisma.organisationRegistrationRequest.findUnique).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        include: {
          contactedBy: { include: { user: true } },
          approvedBy: { include: { user: true } },
          rejectedBy: { include: { user: true } },
        },
      });
      expect(res).toEqual({ id: 'req-1' });
    });
  });

  describe('findOrganisationByName', () => {
    it('queries organisation by name case-insensitively', async () => {
      vi.mocked(prisma.organisation.findFirst).mockResolvedValue({ id: 'org-1' } as never);
      const res = await findOrganisationByName('Acme Corp');
      expect(prisma.organisation.findFirst).toHaveBeenCalledWith({
        where: {
          status: { in: ['PENDING_ONBOARDING', 'ACTIVE'] },
          name: { equals: 'Acme Corp', mode: 'insensitive' },
        },
      });
      expect(res).toEqual({ id: 'org-1' });
    });
  });

  describe('findActiveRequestByOrganisationName', () => {
    it('queries active request by organisation name', async () => {
      vi.mocked(prisma.organisationRegistrationRequest.findFirst).mockResolvedValue({
        id: 'req-1',
      } as never);
      const res = await findActiveRequestByOrganisationName('Acme Corp');
      expect(prisma.organisationRegistrationRequest.findFirst).toHaveBeenCalledWith({
        where: {
          status: { in: ['PENDING_REVIEW', 'CONTACTED', 'APPROVED'] },
          submittedOrganisationName: { equals: 'Acme Corp', mode: 'insensitive' },
        },
      });
      expect(res).toEqual({ id: 'req-1' });
    });
  });

  describe('findActiveRequestByRepresentativeEmail', () => {
    it('checks representative email duplicates case-insensitively', async () => {
      await findActiveRequestByRepresentativeEmail('representative@example.test');

      expect(prisma.organisationRegistrationRequest.findFirst).toHaveBeenCalledWith({
        where: {
          status: {
            in: ['PENDING_REVIEW', 'CONTACTED', 'APPROVED'],
          },
          representativeEmail: {
            equals: 'representative@example.test',
            mode: 'insensitive',
          },
        },
      });
    });
  });

  describe('findActiveRequestByWebsiteOrDomain', () => {
    it('checks website and primary domain duplicates case-insensitively', async () => {
      await findActiveRequestByWebsiteOrDomain({
        website: 'https://example.test',
        primaryDomain: 'example.test',
      });

      expect(prisma.organisationRegistrationRequest.findFirst).toHaveBeenCalledWith({
        where: {
          status: {
            in: ['PENDING_REVIEW', 'CONTACTED', 'APPROVED'],
          },
          OR: [
            {
              submittedWebsite: {
                equals: 'https://example.test',
                mode: 'insensitive',
              },
            },
            {
              submittedPrimaryDomain: {
                equals: 'example.test',
                mode: 'insensitive',
              },
            },
          ],
        },
      });
    });
  });

  describe('createOrganisationRegistrationRequest', () => {
    it('persists required request fields through existing onboarding columns', async () => {
      await createOrganisationRegistrationRequest({
        submittedOrganisationName: 'Example Consulting',
        submittedWebsite: 'https://example.test',
        submittedOrganisationDescription: 'Security awareness consulting team.',
        submittedOrganisationSize: 75,
        submittedPrimaryDomain: 'example.test',
        representativeFirstName: 'Adriano',
        representativeLastName: 'Jorge',
        representativeEmail: 'adriano@example.test',
      });

      expect(prisma.organisationRegistrationRequest.create).toHaveBeenCalledWith({
        data: {
          submittedOrganisationName: 'Example Consulting',
          submittedWebsite: 'https://example.test',
          submittedOrganisationDescription: 'Security awareness consulting team.',
          submittedOrganisationSize: 75,
          submittedPrimaryDomain: 'example.test',
          representativeFirstName: 'Adriano',
          representativeLastName: 'Jorge',
          representativeEmail: 'adriano@example.test',
          status: 'PENDING_REVIEW',
        },
      });
    });
  });

  describe('findOrganisationRegistrationRequestsForPlatform', () => {
    it('executes pagination and filtering with relations', async () => {
      vi.mocked(prisma.organisationRegistrationRequest.findMany).mockResolvedValue([
        { id: 'req-1' },
      ] as never);
      vi.mocked(prisma.organisationRegistrationRequest.count).mockResolvedValue(1);

      const result = await findOrganisationRegistrationRequestsForPlatform({
        status: 'PENDING_REVIEW',
        search: 'Acme',
        sort: 'organisationName:asc',
        page: 2,
        limit: 5,
      });

      expect(prisma.organisationRegistrationRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
          where: expect.objectContaining({
            status: 'PENDING_REVIEW',
          }),
          orderBy: { submittedOrganisationName: 'asc' },
        }),
      );
      expect(result).toEqual({ requests: [{ id: 'req-1' }], total: 1 });
    });
  });

  describe('markOrganisationRegistrationRequestContacted', () => {
    it('updates request status and returns updated record', async () => {
      vi.mocked(prisma.organisationRegistrationRequest.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.organisationRegistrationRequest.findUnique).mockResolvedValue({
        id: 'req-1',
        status: 'CONTACTED',
      } as never);

      const result = await markOrganisationRegistrationRequestContacted({
        requestId: 'req-1',
        ipAdminProfileId: 'admin-prof-1',
      });

      expect(result).toEqual({ id: 'req-1', status: 'CONTACTED' });
    });

    it('throws 404 when request does not exist', async () => {
      vi.mocked(prisma.organisationRegistrationRequest.updateMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.organisationRegistrationRequest.findUnique).mockResolvedValue(null);

      await expect(
        markOrganisationRegistrationRequestContacted({
          requestId: 'req-1',
          ipAdminProfileId: 'admin-prof-1',
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        errorKey: 'REQUEST_NOT_FOUND',
      });
    });

    it('throws 409 when request is already resolved', async () => {
      vi.mocked(prisma.organisationRegistrationRequest.updateMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.organisationRegistrationRequest.findUnique).mockResolvedValue({
        id: 'req-1',
        status: 'APPROVED',
      } as never);

      await expect(
        markOrganisationRegistrationRequestContacted({
          requestId: 'req-1',
          ipAdminProfileId: 'admin-prof-1',
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        errorKey: 'REQUEST_ALREADY_RESOLVED',
      });
    });
  });

  describe('rejectOrganisationRegistrationRequest', () => {
    it('updates request status to REJECTED and returns updated record', async () => {
      vi.mocked(prisma.organisationRegistrationRequest.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.organisationRegistrationRequest.findUnique).mockResolvedValue({
        id: 'req-1',
        status: 'REJECTED',
      } as never);

      const result = await rejectOrganisationRegistrationRequest({
        requestId: 'req-1',
        ipAdminProfileId: 'admin-prof-1',
        rejectionReason: 'Invalid organisation details',
      });

      expect(result).toEqual({ id: 'req-1', status: 'REJECTED' });
    });

    it('throws 404 when request does not exist', async () => {
      vi.mocked(prisma.organisationRegistrationRequest.updateMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.organisationRegistrationRequest.findUnique).mockResolvedValue(null);

      await expect(
        rejectOrganisationRegistrationRequest({
          requestId: 'req-1',
          ipAdminProfileId: 'admin-prof-1',
          rejectionReason: 'Invalid',
        }),
      ).rejects.toMatchObject({
        statusCode: 404,
        errorKey: 'REQUEST_NOT_FOUND',
      });
    });

    it('throws 409 when request is already resolved', async () => {
      vi.mocked(prisma.organisationRegistrationRequest.updateMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.organisationRegistrationRequest.findUnique).mockResolvedValue({
        id: 'req-1',
        status: 'APPROVED',
      } as never);

      await expect(
        rejectOrganisationRegistrationRequest({
          requestId: 'req-1',
          ipAdminProfileId: 'admin-prof-1',
          rejectionReason: 'Invalid',
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        errorKey: 'REQUEST_ALREADY_RESOLVED',
      });
    });
  });

  describe('deleteOrganisationRegistrationRequest', () => {
    it('deletes request by id', async () => {
      vi.mocked(prisma.organisationRegistrationRequest.delete).mockResolvedValue({
        id: 'req-1',
      } as never);

      const result = await deleteOrganisationRegistrationRequest('req-1');

      expect(prisma.organisationRegistrationRequest.delete).toHaveBeenCalledWith({
        where: { id: 'req-1' },
      });
      expect(result).toEqual({ id: 'req-1' });
    });
  });

  describe('approveOrganisationRegistrationRequestTx', () => {
    const input = {
      actorUserId: 'user-admin',
      requestId: 'req-1',
      ipAdminProfileId: 'ip-admin-1',
      orgName: 'Acme Corp',
      initialAdminEmail: 'rep@example.com',
      request: {
        submittedOrganisationDescription: 'Acme desc',
        submittedOrganisationSize: 50,
        submittedWebsite: 'https://acme.test',
        submittedPrimaryDomain: 'acme.test',
        representativeFirstName: 'John',
        representativeLastName: 'Doe',
      },
    };

    it('creates organisation, permissions, settings, invitation, tokens, audits and queues email atomically', async () => {
      txMock.organisationRegistrationRequest.updateMany.mockResolvedValue({ count: 1 });
      txMock.organisation.create.mockResolvedValue({ id: 'org-1', name: 'Acme Corp' });
      txMock.organisationPermission.createMany.mockResolvedValue({ count: 4 });
      txMock.invitation.create.mockResolvedValue({ id: 'inv-1', recipientFirstName: 'John' });
      vi.mocked(issueActionToken).mockResolvedValue({
        token: { id: 'token-1', expiresAt: new Date() },
        rawToken: 'raw-token-123',
      } as never);
      txMock.organisationRegistrationRequest.update.mockResolvedValue({
        id: 'req-1',
        status: 'APPROVED',
      });
      vi.mocked(requestAuthEmailSend).mockResolvedValue({
        status: 'QUEUED',
        queued: true,
      } as never);

      const result = await approveOrganisationRegistrationRequestTx(input);

      expect(result).toEqual({
        updatedRequest: { id: 'req-1', status: 'APPROVED' },
        organisation: { id: 'org-1', name: 'Acme Corp' },
        invitation: { id: 'inv-1', recipientFirstName: 'John' },
        actionToken: {
          token: expect.objectContaining({ id: 'token-1' }),
          rawToken: 'raw-token-123',
        },
        emailResult: { status: 'QUEUED', queued: true },
      });
      expect(recordAuditLog).toHaveBeenCalledTimes(3);
    });

    it('throws 404 when request is not found', async () => {
      txMock.organisationRegistrationRequest.updateMany.mockResolvedValue({ count: 0 });
      txMock.organisationRegistrationRequest.findUnique.mockResolvedValue(null);

      await expect(approveOrganisationRegistrationRequestTx(input)).rejects.toMatchObject({
        statusCode: 404,
        errorKey: 'REQUEST_NOT_FOUND',
      });
    });

    it('throws 409 when request is already resolved', async () => {
      txMock.organisationRegistrationRequest.updateMany.mockResolvedValue({ count: 0 });
      txMock.organisationRegistrationRequest.findUnique.mockResolvedValue({ id: 'req-1' });

      await expect(approveOrganisationRegistrationRequestTx(input)).rejects.toMatchObject({
        statusCode: 409,
        errorKey: 'REQUEST_ALREADY_RESOLVED',
      });
    });

    it('throws 409 EMAIL_QUEUE_FAILED when email fails to queue', async () => {
      txMock.organisationRegistrationRequest.updateMany.mockResolvedValue({ count: 1 });
      txMock.organisation.create.mockResolvedValue({ id: 'org-1', name: 'Acme Corp' });
      txMock.organisationPermission.createMany.mockResolvedValue({ count: 4 });
      txMock.invitation.create.mockResolvedValue({ id: 'inv-1', recipientFirstName: 'John' });
      vi.mocked(issueActionToken).mockResolvedValue({
        token: { id: 'token-1', expiresAt: new Date() },
        rawToken: 'raw-token-123',
      } as never);
      txMock.organisationRegistrationRequest.update.mockResolvedValue({
        id: 'req-1',
        status: 'APPROVED',
      });
      vi.mocked(requestAuthEmailSend).mockResolvedValue({
        status: 'NOT_QUEUED',
        queued: false,
      } as never);

      await expect(approveOrganisationRegistrationRequestTx(input)).rejects.toMatchObject({
        statusCode: 409,
        errorKey: 'EMAIL_QUEUE_FAILED',
      });
    });

    it('translates P2002 organisation name conflict to 409 ORGANISATION_ALREADY_EXISTS', async () => {
      const p2002 = new Error('Unique constraint failed on Organisation_name_key');
      (p2002 as unknown as { code: string }).code = 'P2002';
      (p2002 as unknown as { meta: { target: string[] } }).meta = { target: ['name'] };

      txMock.organisationRegistrationRequest.updateMany.mockRejectedValue(p2002);

      await expect(approveOrganisationRegistrationRequestTx(input)).rejects.toMatchObject({
        statusCode: 409,
        errorKey: 'ORGANISATION_ALREADY_EXISTS',
      });
    });

    it('translates P2002 user email conflict to 409 REPRESENTATIVE_CONFLICT', async () => {
      const p2002 = new Error('Unique constraint failed on User_email_key');
      (p2002 as unknown as { code: string }).code = 'P2002';
      (p2002 as unknown as { meta: { target: string[] } }).meta = { target: ['email'] };

      txMock.organisationRegistrationRequest.updateMany.mockRejectedValue(p2002);

      await expect(approveOrganisationRegistrationRequestTx(input)).rejects.toMatchObject({
        statusCode: 409,
        errorKey: 'REPRESENTATIVE_CONFLICT',
      });
    });
  });
});
