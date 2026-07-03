import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';

const actorUserId = '44444444-4444-4444-8444-444444444444';
const requestId = '55555555-5555-4555-8555-555555555555';
const organisationId = '66666666-6666-4666-8666-666666666666';

let mockUserType = 'IP_ADMIN';

const serviceMock = vi.hoisted(() => {
  class MockOrganisationRegistrationRequestError extends Error {
    constructor(
      public readonly statusCode: any,
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

vi.mock('../../src/services/organisation-registration-request.service.js', () => serviceMock);

vi.mock('../../src/middleware/requireAuth.js', () => ({
  requireAuth(req: Request, _res: Response, next: NextFunction) {
    req.auth = {
      userId: actorUserId,
      user: {
        id: actorUserId,
        firstName: 'Patricia',
        lastName: 'Platform',
        email: 'patricia@example.test',
        userType: mockUserType as any,
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

      const response = await request(createApp()).get(`/platform/organisation-requests/${requestId}`);

      expect(response.status).toBe(200);
      expect(serviceMock.getOrganisationRequest).toHaveBeenCalledWith(actorUserId, requestId);
    });

    it('returns 400 validation error for invalid request ID parameter', async () => {
      const response = await request(createApp()).get('/platform/organisation-requests/invalid-uuid');

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

      const response = await request(createApp()).get(`/platform/organisation-requests/${requestId}`);

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
      serviceMock.rejectOrganisationRequest.mockResolvedValue({ id: requestId, status: 'REJECTED' });

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

  describe('GET /platform/organisations/:organisationId', () => {
    it('gets organisation surface details successfully', async () => {
      serviceMock.getPlatformOrganisationDetail.mockResolvedValue({
        id: organisationId,
        name: 'Target Org',
        status: 'ACTIVE',
      });

      const response = await request(createApp()).get(`/platform/organisations/${organisationId}`);

      expect(response.status).toBe(200);
      expect(serviceMock.getPlatformOrganisationDetail).toHaveBeenCalledWith(
        actorUserId,
        organisationId,
      );
    });
  });

  describe('GET /platform/organisation-requests/:requestId/details', () => {
    it('gets request details fallback successfully', async () => {
      serviceMock.getOrganisationRequestDetails.mockResolvedValue({
        id: requestId,
        status: 'PENDING_REVIEW',
      });

      const response = await request(createApp()).get(
        `/platform/organisation-requests/${requestId}/details`,
      );

      expect(response.status).toBe(200);
      expect(serviceMock.getOrganisationRequestDetails).toHaveBeenCalledWith(actorUserId, requestId);
    });
  });

  describe('POST /platform/organisations/:organisationId/resend-initial-admin-setup', () => {
    it('resends initial setup email successfully', async () => {
      serviceMock.resendInitialAdminSetup.mockResolvedValue({
        success: true,
        emailQueued: true,
      });

      const response = await request(createApp()).post(
        `/platform/organisations/${organisationId}/resend-initial-admin-setup`,
      );

      expect(response.status).toBe(200);
      expect(serviceMock.resendInitialAdminSetup).toHaveBeenCalledWith(actorUserId, organisationId);
    });

    it('returns 409 Conflict if resend is not eligible', async () => {
      serviceMock.resendInitialAdminSetup.mockRejectedValue(
        new serviceMock.OrganisationRegistrationRequestError(
          409,
          'RESEND_NOT_ELIGIBLE',
          'Setup email is not eligible for resending: ORGANISATION_ALREADY_ACTIVE',
        ),
      );

      const response = await request(createApp()).post(
        `/platform/organisations/${organisationId}/resend-initial-admin-setup`,
      );

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('RESEND_NOT_ELIGIBLE');
    });
  });
});
