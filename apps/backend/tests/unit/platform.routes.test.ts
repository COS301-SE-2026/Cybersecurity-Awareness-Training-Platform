import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';

const actorUserId = '44444444-4444-4444-8444-444444444444';
const requestId = '55555555-5555-4555-8555-555555555555';

let mockUserType = 'IP_ADMIN';

const serviceMock = vi.hoisted(() => {
  class MockOrganisationRegistrationRequestError extends Error {
    constructor(
      public readonly statusCode: number,
      public readonly error: string,
      message: string,
    ) {
      super(message);
      this.name = 'OrganisationRegistrationRequestError';
    }
  }

  return {
    OrganisationRegistrationRequestError: MockOrganisationRegistrationRequestError,
    listOrganisationRequests: vi.fn(),
    getOrganisationRequest: vi.fn(),
    markRequestContacted: vi.fn(),
    approveOrganisationRequest: vi.fn(),
    rejectOrganisationRequest: vi.fn(),
    deleteOrganisationRequest: vi.fn(),
    getPlatformOrganisationDetail: vi.fn(),
    getOrganisationRequestDetails: vi.fn(),
    resendInitialAdminSetup: vi.fn(),
  };
});

const platformAdminServiceMock = vi.hoisted(() => {
  class MockPlatformAdminServiceError extends Error {
    constructor(
      public readonly statusCode: number,
      public readonly error: string,
      message: string,
    ) {
      super(message);
      this.name = 'PlatformAdminServiceError';
    }
  }

  return {
    PlatformAdminServiceError: MockPlatformAdminServiceError,
    listPlatformAdmins: vi.fn(),
    invitePlatformAdmin: vi.fn(),
    resendPlatformAdminInvite: vi.fn(),
    transferSuperAdmin: vi.fn(),
    demotePlatformAdmin: vi.fn(),
  };
});

vi.mock('../../src/services/organisation-registration-request.service.js', () => serviceMock);
vi.mock('../../src/services/platformOrganisation.service.js', () => serviceMock);
vi.mock('../../src/services/platform-admin.service.js', () => platformAdminServiceMock);

vi.mock('../../src/middleware/requireAuth.js', () => ({
  requireAuth(req: Request, _res: Response, next: NextFunction) {
    req.auth = {
      userId: actorUserId,
      user: {
        id: actorUserId,
        firstName: 'Patricia',
        lastName: 'Platform',
        email: 'patricia@example.test',
        userType: mockUserType as
          | 'IP_ADMIN'
          | 'ORGANISATION_ADMIN'
          | 'ORGANISATION_TRAINEE'
          | 'GENERAL_TRAINEE',
        authStatus: 'ACTIVE',
        createdAt: '2026-07-01T08:00:00.000Z',
      },
    };
    next();
  },
}));

describe('platform admin routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserType = 'IP_ADMIN';
  });

  describe('access control', () => {
    it('returns 403 Forbidden for non-IP_ADMIN users', async () => {
      mockUserType = 'ORGANISATION_ADMIN';

      const response = await request(createApp()).get('/platform/organisation-requests');

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: 'FORBIDDEN',
        message: 'Platform admin access is required',
      });
      expect(serviceMock.listOrganisationRequests).not.toHaveBeenCalled();
    });
  });

  describe('GET /platform/organisation-requests', () => {
    it('lists requests with pagination and query options', async () => {
      serviceMock.listOrganisationRequests.mockResolvedValue({
        requests: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      const response = await request(createApp())
        .get('/platform/organisation-requests')
        .query({ status: 'PENDING_REVIEW', page: 2, limit: 20 });

      expect(response.status).toBe(200);
      expect(serviceMock.listOrganisationRequests).toHaveBeenCalledWith(actorUserId, {
        status: 'PENDING_REVIEW',
        page: 2,
        limit: 20,
      });
    });

    it('returns 400 validation error for invalid query params', async () => {
      const response = await request(createApp())
        .get('/platform/organisation-requests')
        .query({ status: 'INVALID_STATUS' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /platform/organisation-requests/:requestId', () => {
    it('gets request details successfully', async () => {
      serviceMock.getOrganisationRequest.mockResolvedValue({ id: requestId });

      const response = await request(createApp()).get(
        `/platform/organisation-requests/${requestId}`,
      );

      expect(response.status).toBe(200);
      expect(serviceMock.getOrganisationRequest).toHaveBeenCalledWith(actorUserId, requestId);
    });

    it('returns 400 validation error for invalid request ID parameter', async () => {
      const response = await request(createApp()).get(
        '/platform/organisation-requests/invalid-uuid',
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 404 Not Found if request does not exist', async () => {
      serviceMock.getOrganisationRequest.mockRejectedValue(
        new serviceMock.OrganisationRegistrationRequestError(
          404,
          'REQUEST_NOT_FOUND',
          'Organisation registration request not found',
        ),
      );

      const response = await request(createApp()).get(
        `/platform/organisation-requests/${requestId}`,
      );

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('REQUEST_NOT_FOUND');
    });
  });

  describe('PATCH /platform/organisation-requests/:requestId/contacted', () => {
    it('marks request contacted successfully', async () => {
      serviceMock.markRequestContacted.mockResolvedValue({ id: requestId, status: 'CONTACTED' });

      const response = await request(createApp()).patch(
        `/platform/organisation-requests/${requestId}/contacted`,
      );

      expect(response.status).toBe(200);
      expect(serviceMock.markRequestContacted).toHaveBeenCalledWith(actorUserId, requestId);
    });
  });

  describe('POST /platform/organisation-requests/:requestId/approve', () => {
    const payload = {
      organisationName: 'Approved Org Name',
      initialAdminEmail: 'admin@approved.org',
    };

    it('approves request successfully', async () => {
      serviceMock.approveOrganisationRequest.mockResolvedValue({
        id: requestId,
        status: 'APPROVED',
        setupEmailQueued: true,
      });

      const response = await request(createApp())
        .post(`/platform/organisation-requests/${requestId}/approve`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(serviceMock.approveOrganisationRequest).toHaveBeenCalledWith(
        actorUserId,
        requestId,
        payload,
      );
    });

    it('returns 422 for missing initialAdminEmail in payload', async () => {
      const response = await request(createApp())
        .post(`/platform/organisation-requests/${requestId}/approve`)
        .send({ organisationName: 'No Email' });

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /platform/organisation-requests/:requestId/reject', () => {
    const payload = { rejectionReason: 'Invalid domain' };

    it('rejects request successfully', async () => {
      serviceMock.rejectOrganisationRequest.mockResolvedValue({
        id: requestId,
        status: 'REJECTED',
      });

      const response = await request(createApp())
        .post(`/platform/organisation-requests/${requestId}/reject`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(serviceMock.rejectOrganisationRequest).toHaveBeenCalledWith(
        actorUserId,
        requestId,
        payload,
      );
    });

    it('returns 422 for empty rejectionReason in payload', async () => {
      const response = await request(createApp())
        .post(`/platform/organisation-requests/${requestId}/reject`)
        .send({ rejectionReason: ' ' });

      expect(response.status).toBe(422);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /platform/organisation-requests/:requestId', () => {
    it('deletes request successfully', async () => {
      serviceMock.deleteOrganisationRequest.mockResolvedValue({ success: true });

      const response = await request(createApp()).delete(
        `/platform/organisation-requests/${requestId}`,
      );

      expect(response.status).toBe(200);
      expect(serviceMock.deleteOrganisationRequest).toHaveBeenCalledWith(actorUserId, requestId);
    });

    it('returns 409 Conflict if request cannot be deleted', async () => {
      serviceMock.deleteOrganisationRequest.mockRejectedValue(
        new serviceMock.OrganisationRegistrationRequestError(
          409,
          'REQUEST_NOT_DELETABLE',
          'Only rejected or cancelled requests can be deleted',
        ),
      );

      const response = await request(createApp()).delete(
        `/platform/organisation-requests/${requestId}`,
      );

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('REQUEST_NOT_DELETABLE');
    });
  });

  // Platform admin API route testng
  describe('Platform Admins Routes', () => {
    describe('GET /platform/admins', () => {
      it('returns list of platform administrators successfully', async () => {
        platformAdminServiceMock.listPlatformAdmins.mockResolvedValue({
          admins: [],
          allowedToInvite: true,
        });

        const response = await request(createApp()).get('/platform/admins');

        expect(response.status).toBe(200);
        expect(platformAdminServiceMock.listPlatformAdmins).toHaveBeenCalledWith(actorUserId);
      });
    });

    describe('POST /platform/admin-invitations', () => {
      const payload = { email: 'newadmin@ip.com', firstName: 'Jane', lastName: 'Doe' };

      it('invites platform admin successfully', async () => {
        platformAdminServiceMock.invitePlatformAdmin.mockResolvedValue({
          type: 'new-invite',
          userId: 'user-id-123',
          email: 'newadmin@ip.com',
        });

        const response = await request(createApp())
          .post('/platform/admin-invitations')
          .send(payload);

        expect(response.status).toBe(201);
        expect(platformAdminServiceMock.invitePlatformAdmin).toHaveBeenCalledWith(
          actorUserId,
          payload,
        );
      });

      it('returns 422 for validation error on empty or invalid email', async () => {
        const response = await request(createApp())
          .post('/platform/admin-invitations')
          .send({ email: 'invalid-email' });

        expect(response.status).toBe(422);
        expect(response.body.error).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /platform/admin-invitations/:id/resend', () => {
      const inviteId = 'e0000000-e000-e000-e000-e00000000000';

      it('resends invitation successfully', async () => {
        platformAdminServiceMock.resendPlatformAdminInvite.mockResolvedValue({
          success: true,
          emailQueued: true,
        });

        const response = await request(createApp()).post(
          `/platform/admin-invitations/${inviteId}/resend`,
        );

        expect(response.status).toBe(200);
        expect(platformAdminServiceMock.resendPlatformAdminInvite).toHaveBeenCalledWith(
          actorUserId,
          inviteId,
        );
      });

      it('returns 400 validation error for invalid invite ID parameter', async () => {
        const response = await request(createApp()).post(
          '/platform/admin-invitations/invalid-uuid/resend',
        );

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /platform/admins/transfer-super-admin', () => {
      const payload = {
        targetUserId: 'd0000000-d000-d000-d000-d00000000000',
        password: 'correct-password',
        confirmation: 'TRANSFER',
      };

      it('transfers super admin successfully', async () => {
        platformAdminServiceMock.transferSuperAdmin.mockResolvedValue({ user: {} });

        const response = await request(createApp())
          .post('/platform/admins/transfer-super-admin')
          .send(payload);

        expect(response.status).toBe(200);
        expect(platformAdminServiceMock.transferSuperAdmin).toHaveBeenCalledWith(
          actorUserId,
          payload,
        );
      });

      it('returns 422 validation error for incorrect confirmation literal', async () => {
        const response = await request(createApp())
          .post('/platform/admins/transfer-super-admin')
          .send({ ...payload, confirmation: 'WRONG' });

        expect(response.status).toBe(422);
        expect(response.body.error).toBe('VALIDATION_ERROR');
      });
    });

    describe('POST /platform/admins/:userId/demote', () => {
      const targetUserId = 'f0000000-f000-f000-f000-f00000000000';
      const payload = { password: 'correct-password', confirmation: 'DEMOTE' };

      it('demotes platfrom admin successfully', async () => {
        platformAdminServiceMock.demotePlatformAdmin.mockResolvedValue({
          userId: targetUserId,
          adminStatus: 'DISABLED',
        });

        const response = await request(createApp())
          .post(`/platform/admins/${targetUserId}/demote`)
          .send(payload);

        expect(response.status).toBe(200);
        expect(platformAdminServiceMock.demotePlatformAdmin).toHaveBeenCalledWith(
          actorUserId,
          targetUserId,
          payload,
        );
      });

      it('returns 422 validation error for incorrect confirmation literal', async () => {
        const response = await request(createApp())
          .post(`/platform/admins/${targetUserId}/demote`)
          .send({ ...payload, confirmation: 'WRONG' });

        expect(response.status).toBe(422);
        expect(response.body.error).toBe('VALIDATION_ERROR');
      });

      it('returns 409 Conflict if demotion service throws PlatformAdminServiceError', async () => {
        platformAdminServiceMock.demotePlatformAdmin.mockRejectedValue(
          new platformAdminServiceMock.PlatformAdminServiceError(
            409,
            'SELF_DEMOTION_CONFLICT',
            'You cannot demote yourself',
          ),
        );

        const response = await request(createApp())
          .post(`/platform/admins/${targetUserId}/demote`)
          .send(payload);

        expect(response.status).toBe(409);
        expect(response.body.error).toBe('SELF_DEMOTION_CONFLICT');
      });
    });
  });
});
