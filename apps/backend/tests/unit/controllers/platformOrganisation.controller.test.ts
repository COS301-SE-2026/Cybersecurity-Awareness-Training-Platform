import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../../src/app.js';

const actorUserId = '44444444-4444-4444-8444-444444444444';
const requestId = '55555555-5555-4555-8555-555555555555';
const organisationId = '66666666-6666-4666-8666-666666666666';

let mockUserType = 'IP_ADMIN';
let mockHasAuth = true;

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
    getPlatformOrganisationDetail: vi.fn(),
    getOrganisationRequestDetails: vi.fn(),
    resendInitialAdminSetup: vi.fn(),
  };
});

vi.mock('../../../src/services/platformOrganisation.service.js', () => serviceMock);

vi.mock('../../../src/middleware/requireAuth.js', () => ({
  requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!mockHasAuth) {
      return res.status(401).json({
        error: 'AUTH_REQUIRED',
        message: 'Authentication credentials are required',
      });
    }
    req.auth = {
      userId: actorUserId,
      user: {
        id: actorUserId,
        firstName: 'Patricia',
        lastName: 'Platform',
        email: 'patricia@example.test',
        userType: mockUserType as 'IP_ADMIN',
        authStatus: 'ACTIVE',
        createdAt: '2026-07-01T08:00:00.000Z',
      },
    };
    next();
  },
}));

describe('platformOrganisation controller and routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserType = 'IP_ADMIN';
    mockHasAuth = true;
  });

  describe('access control & middleware', () => {
    it('returns 401 Unauthorized if auth session is missing', async () => {
      mockHasAuth = false;

      const response = await request(createApp()).get(`/platform/organisations/${organisationId}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('AUTH_REQUIRED');
      expect(serviceMock.getPlatformOrganisationDetail).not.toHaveBeenCalled();
    });

    it('returns 403 Forbidden for non-IP_ADMIN users', async () => {
      mockUserType = 'ORGANISATION_ADMIN';

      const response = await request(createApp()).get(`/platform/organisations/${organisationId}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('FORBIDDEN');
      expect(serviceMock.getPlatformOrganisationDetail).not.toHaveBeenCalled();
    });
  });

  describe('GET /platform/organisations/:organisationId', () => {
    it('gets organisation surface details successfully', async () => {
      serviceMock.getPlatformOrganisationDetail.mockResolvedValue({
        id: organisationId,
        name: 'Target Org',
        status: 'ACTIVE',
        detailType: 'active organisation',
      });

      const response = await request(createApp()).get(`/platform/organisations/${organisationId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(organisationId);
      expect(serviceMock.getPlatformOrganisationDetail).toHaveBeenCalledWith(
        actorUserId,
        organisationId,
      );
    });

    it('returns 400 validation error for invalid UUID parameter', async () => {
      const response = await request(createApp()).get('/platform/organisations/not-a-uuid');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 404 Not Found if service throws not found', async () => {
      serviceMock.getPlatformOrganisationDetail.mockRejectedValue(
        new serviceMock.OrganisationRegistrationRequestError(
          404,
          'ORGANISATION_NOT_FOUND',
          'Organisation not found',
        ),
      );

      const response = await request(createApp()).get(`/platform/organisations/${organisationId}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('ORGANISATION_NOT_FOUND');
    });
  });

  describe('GET /platform/organisation-requests/:requestId/details', () => {
    it('gets request details successfully', async () => {
      serviceMock.getOrganisationRequestDetails.mockResolvedValue({
        id: requestId,
        submittedOrganisationName: 'Target Request',
        detailType: 'request-only',
      });

      const response = await request(createApp()).get(
        `/platform/organisation-requests/${requestId}/details`,
      );

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(requestId);
      expect(serviceMock.getOrganisationRequestDetails).toHaveBeenCalledWith(
        actorUserId,
        requestId,
      );
    });

    it('returns 400 validation error for invalid request ID parameter', async () => {
      const response = await request(createApp()).get(
        '/platform/organisation-requests/invalid-uuid/details',
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 404 Not Found if request does not exist', async () => {
      serviceMock.getOrganisationRequestDetails.mockRejectedValue(
        new serviceMock.OrganisationRegistrationRequestError(
          404,
          'REQUEST_NOT_FOUND',
          'Organisation registration request not found',
        ),
      );

      const response = await request(createApp()).get(
        `/platform/organisation-requests/${requestId}/details`,
      );

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('REQUEST_NOT_FOUND');
    });
  });

  describe('POST /platform/organisations/:organisationId/resend-initial-admin-setup', () => {
    it('resends initial setup email successfully', async () => {
      serviceMock.resendInitialAdminSetup.mockResolvedValue({
        success: true,
        emailQueued: true,
        setupStatus: {
          id: 'invite-123',
          status: 'PENDING',
          recipientEmail: 'admin@acme.com',
          expiresAt: '2026-07-20T08:00:00Z',
          latestActionToken: null,
          latestEmailDelivery: null,
        },
      });

      const response = await request(createApp()).post(
        `/platform/organisations/${organisationId}/resend-initial-admin-setup`,
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        emailQueued: true,
        setupStatus: {
          id: 'invite-123',
          status: 'PENDING',
          recipientEmail: 'admin@acme.com',
          expiresAt: '2026-07-20T08:00:00Z',
          latestActionToken: null,
          latestEmailDelivery: null,
        },
      });
      expect(serviceMock.resendInitialAdminSetup).toHaveBeenCalledWith(actorUserId, organisationId);
    });

    it('returns 409 Conflict if resend is not eligible', async () => {
      serviceMock.resendInitialAdminSetup.mockRejectedValue(
        new serviceMock.OrganisationRegistrationRequestError(
          409,
          'RESEND_NOT_ELIGIBLE',
          'Setup email is not eligible for resending',
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
