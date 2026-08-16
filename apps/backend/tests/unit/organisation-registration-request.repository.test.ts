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
import { createActionToken } from '../../src/repositories/action-token.repository.js';
import { createAuditLogEntry } from '../../src/repositories/audit-log.repository.js';
import { enqueueEmailDelivery } from '../../src/repositories/email-delivery.repository.js';

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

vi.mock('../../src/repositories/action-token.repository.js', () => ({
  createActionToken: vi.fn(),
}));

vi.mock('../../src/repositories/audit-log.repository.js', () => ({
  createAuditLogEntry: vi.fn(),
}));

vi.mock('../../src/repositories/email-delivery.repository.js', () => ({
  enqueueEmailDelivery: vi.fn(),
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
    it('queries registration request by id', async () => {
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
    it('queries registration request with reviewers included', async () => {
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

  describe('findActiveRequestByOrganisationName', () => {
    it('queries active requests with case insensitive organisation name', async () => {
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

  describe('findActiveRequestByWebsiteOrDomain', () => {
    it('queries active requests matching website or domain', async () => {
      vi.mocked(prisma.organisationRegistrationRequest.findFirst).mockResolvedValue({
        id: 'req-1',
      } as never);
      const res = await findActiveRequestByWebsiteOrDomain({
        website: 'https://acme.test',
        primaryDomain: 'acme.test',
      });
      expect(prisma.organisationRegistrationRequest.findFirst).toHaveBeenCalledWith({
        where: {
          status: { in: ['PENDING_REVIEW', 'CONTACTED', 'APPROVED'] },
          OR: [
            { submittedWebsite: { equals: 'https://acme.test', mode: 'insensitive' } },
            { submittedPrimaryDomain: { equals: 'acme.test', mode: 'insensitive' } },
          ],
        },
      });
      expect(res).toEqual({ id: 'req-1' });
    });
  });

  describe('findActiveRequestByRepresentativeEmail', () => {
    it('queries active requests matching representative email', async () => {
      vi.mocked(prisma.organisationRegistrationRequest.findFirst).mockResolvedValue({
        id: 'req-1',
      } as never);
      const res = await findActiveRequestByRepresentativeEmail('rep@example.com');
      expect(prisma.organisationRegistrationRequest.findFirst).toHaveBeenCalledWith({
        where: {
          status: { in: ['PENDING_REVIEW', 'CONTACTED', 'APPROVED'] },
          representativeEmail: { equals: 'rep@example.com', mode: 'insensitive' },
        },
      });
      expect(res).toEqual({ id: 'req-1' });
    });
  });

  describe('findOrganisationByName', () => {
    it('queries organisation by name in active statuses', async () => {
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

  describe('createOrganisationRegistrationRequest', () => {
    it('creates a new registration request record', async () => {
      const record = {
        submittedOrganisationName: 'Acme Corp',
        submittedWebsite: 'https://acme.test',
        submittedOrganisationDescription: 'Tech company',
        submittedOrganisationSize: 50,
        submittedPrimaryDomain: 'acme.test',
        representativeFirstName: 'John',
        representativeLastName: 'Doe',
        representativeEmail: 'rep@example.com',
      };
      vi.mocked(prisma.organisationRegistrationRequest.create).mockResolvedValue({
        id: 'req-1',
        ...record,
        status: 'PENDING_REVIEW',
      } as never);

      const res = await createOrganisationRegistrationRequest(record);
      expect(prisma.organisationRegistrationRequest.create).toHaveBeenCalledWith({
        data: {
          ...record,
          status: 'PENDING_REVIEW',
        },
      });
      expect(res).toEqual({ id: 'req-1', ...record, status: 'PENDING_REVIEW' });
    });
  });

  describe('findOrganisationRegistrationRequestsForPlatform', () => {
    it('applies filters, search, sorting and pagination correctly', async () => {
      vi.mocked(prisma.organisationRegistrationRequest.findMany).mockResolvedValue([
        { id: 'req-1' },
      ] as never);
      vi.mocked(prisma.organisationRegistrationRequest.count).mockResolvedValue(1);

      const res = await findOrganisationRegistrationRequestsForPlatform({
        status: 'PENDING_REVIEW',
        search: 'acme',
        sort: 'organisationName:asc',
        page: 2,
        limit: 5,
      });

      expect(prisma.organisationRegistrationRequest.findMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING_REVIEW',
          OR: [
            { submittedOrganisationName: { contains: 'acme', mode: 'insensitive' } },
            { representativeEmail: { contains: 'acme', mode: 'insensitive' } },
            { representativeFirstName: { contains: 'acme', mode: 'insensitive' } },
            { representativeLastName: { contains: 'acme', mode: 'insensitive' } },
          ],
        },
        orderBy: { submittedOrganisationName: 'asc' },
        skip: 5,
        take: 5,
        include: expect.any(Object),
      });
      expect(res).toEqual({ requests: [{ id: 'req-1' }], total: 1 });
    });
  });

  describe('markOrganisationRegistrationRequestContacted', () => {
    it('updates status to CONTACTED and returns updated request', async () => {
      vi.mocked(prisma.organisationRegistrationRequest.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.organisationRegistrationRequest.findUnique).mockResolvedValue({
        id: 'req-1',
        status: 'CONTACTED',
      } as never);

      const result = await markOrganisationRegistrationRequestContacted({
        requestId: 'req-1',
        ipAdminProfileId: 'admin-prof-1',
      });

      expect(prisma.organisationRegistrationRequest.updateMany).toHaveBeenCalledWith({
        where: { id: 'req-1', status: 'PENDING_REVIEW' },
        data: {
          status: 'CONTACTED',
          contactedByIpAdminId: 'admin-prof-1',
          contactedAt: expect.any(Date),
        },
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
    it('updates status to REJECTED with reason and returns updated request', async () => {
      vi.mocked(prisma.organisationRegistrationRequest.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.organisationRegistrationRequest.findUnique).mockResolvedValue({
        id: 'req-1',
        status: 'REJECTED',
        rejectionReason: 'Invalid domain',
      } as never);

      const result = await rejectOrganisationRegistrationRequest({
        requestId: 'req-1',
        ipAdminProfileId: 'admin-prof-1',
        rejectionReason: 'Invalid domain',
      });

      expect(prisma.organisationRegistrationRequest.updateMany).toHaveBeenCalledWith({
        where: { id: 'req-1', status: { in: ['PENDING_REVIEW', 'CONTACTED'] } },
        data: {
          status: 'REJECTED',
          rejectedByIpAdminId: 'admin-prof-1',
          rejectedAt: expect.any(Date),
          rejectionReason: 'Invalid domain',
        },
      });
      expect(result).toEqual({
        id: 'req-1',
        status: 'REJECTED',
        rejectionReason: 'Invalid domain',
      });
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
      actionTokenData: {
        tokenHash: 'token-hash-123',
        expiresAt: new Date('2026-07-22T08:00:00.000Z'),
      },
      emailDeliveryData: {
        emailType: 'INITIAL_ORGANISATION_ADMIN_SETUP' as const,
        recipientEmail: 'rep@example.com',
        subject: 'Setup Org',
        text: 'Setup org',
        maxAttempts: 3,
      },
      auditLogEntries: [
        {
          actorUserId: 'user-admin',
          actorType: 'IP_ADMIN' as const,
          targetType: 'ORGANISATION_REGISTRATION_REQUEST' as const,
          targetId: 'req-1',
          actionType: 'APPROVED' as const,
          outcome: 'SUCCESS' as const,
        },
      ],
    };

    it('creates organisation, permissions, settings, invitation, tokens, audits and queues email atomically', async () => {
      txMock.organisationRegistrationRequest.updateMany.mockResolvedValue({ count: 1 });
      txMock.organisation.create.mockResolvedValue({ id: 'org-1', name: 'Acme Corp' });
      txMock.organisationPermission.createMany.mockResolvedValue({ count: 4 });
      txMock.invitation.create.mockResolvedValue({ id: 'inv-1', recipientFirstName: 'John' });
      vi.mocked(createActionToken).mockResolvedValue({
        id: 'token-1',
        expiresAt: new Date(),
      } as never);
      txMock.organisationRegistrationRequest.update.mockResolvedValue({
        id: 'req-1',
        status: 'APPROVED',
      });
      vi.mocked(enqueueEmailDelivery).mockResolvedValue({
        deliveryLogId: 'dl-1',
        jobId: 'job-1',
      });

      const result = await approveOrganisationRegistrationRequestTx(input);

      expect(result).toEqual({
        updatedRequest: { id: 'req-1', status: 'APPROVED' },
        organisation: { id: 'org-1', name: 'Acme Corp' },
        invitation: { id: 'inv-1', recipientFirstName: 'John' },
        actionToken: {
          id: 'token-1',
          expiresAt: expect.any(Date),
        },
        pendingDelivery: { deliveryLogId: 'dl-1', jobId: 'job-1' },
      });
      expect(createAuditLogEntry).toHaveBeenCalled();
      expect(enqueueEmailDelivery).toHaveBeenCalled();
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
