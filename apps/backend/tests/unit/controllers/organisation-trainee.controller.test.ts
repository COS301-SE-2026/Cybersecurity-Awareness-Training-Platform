import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTraineeInvitation,
  disableTrainee,
  getOrganisationTrainees,
  resendInvitation,
  revokeInvitation,
} from '../../../src/controllers/organisation-trainee.controller.js';
import { OrganisationAdminServiceError } from '../../../src/services/organisation-admin.service.js';
import {
  mockActorUserId,
  mockInvitationId,
  mockOrgId,
  mockTraineeId,
} from '../helpers/organisation-trainee.fixtures.js';

const traineeServiceMock = vi.hoisted(() => {
  class MockOrganisationTraineeServiceError extends Error {
    constructor(
      public readonly statusCode: number,
      public readonly errorKey: string,
      message: string,
    ) {
      super(message);
      this.name = 'OrganisationTraineeServiceError';
    }

    get error(): string {
      return this.errorKey;
    }
  }

  return {
    listOrganisationTrainees: vi.fn(),
    createOrganisationTraineeInvitation: vi.fn(),
    resendTraineeInvitation: vi.fn(),
    revokeTraineeInvitation: vi.fn(),
    disableOrganisationTrainee: vi.fn(),
    OrganisationTraineeServiceError: MockOrganisationTraineeServiceError,
  };
});

vi.mock('../../../src/services/organisation-trainee.service.js', () => traineeServiceMock);

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('OrganisationTraineeController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrganisationTrainees', () => {
    it('returns 401 AUTH_REQUIRED when auth userId is missing', async () => {
      const req = { params: { organisationId: mockOrgId } } as unknown as Request;
      const res = mockResponse();

      await getOrganisationTrainees(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'AUTH_REQUIRED',
        message: 'Authentication credentials are required',
      });
    });

    it('returns 404 ROUTE_PARAM_MISSING when organisationId is not provided', async () => {
      const req = { auth: { userId: mockActorUserId }, params: {} } as unknown as Request;
      const res = mockResponse();

      await getOrganisationTrainees(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'ROUTE_PARAM_MISSING',
        message: 'Route parameter is missing',
      });
    });

    it('calls service and returns 200 with trainees list on success', async () => {
      const req = {
        auth: { userId: mockActorUserId },
        params: { organisationId: mockOrgId },
      } as unknown as Request;
      const res = mockResponse();

      const serviceResponse = { trainees: [], pendingInvitations: [] };
      traineeServiceMock.listOrganisationTrainees.mockResolvedValue(serviceResponse);

      await getOrganisationTrainees(req, res);

      expect(traineeServiceMock.listOrganisationTrainees).toHaveBeenCalledWith(
        mockActorUserId,
        mockOrgId,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(serviceResponse);
    });

    it('formats OrganisationAdminServiceError cleanly', async () => {
      const req = {
        auth: { userId: mockActorUserId },
        params: { organisationId: mockOrgId },
      } as unknown as Request;
      const res = mockResponse();

      traineeServiceMock.listOrganisationTrainees.mockRejectedValue(
        new OrganisationAdminServiceError(
          403,
          'ORG_ADMIN_PERMISSION_REQUIRED',
          'Permission denied',
        ),
      );

      await getOrganisationTrainees(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'ORG_ADMIN_PERMISSION_REQUIRED',
        message: 'Permission denied',
      });
    });
  });

  describe('createTraineeInvitation', () => {
    const body = { email: 'trainee@example.com', firstName: 'Alex', lastName: 'Trainee' };

    it('returns 401 when auth is missing', async () => {
      const req = { params: { organisationId: mockOrgId }, body } as unknown as Request;
      const res = mockResponse();

      await createTraineeInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('calls service with body and returns 201 on success', async () => {
      const req = {
        auth: { userId: mockActorUserId },
        params: { organisationId: mockOrgId },
        body,
      } as unknown as Request;
      const res = mockResponse();

      const serviceResult = { success: true, message: 'Invited' };
      traineeServiceMock.createOrganisationTraineeInvitation.mockResolvedValue(serviceResult);

      await createTraineeInvitation(req, res);

      expect(traineeServiceMock.createOrganisationTraineeInvitation).toHaveBeenCalledWith(
        mockActorUserId,
        mockOrgId,
        body,
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(serviceResult);
    });

    it('handles 409 CANNOT_INVITE_USER generic error for zero-leak architecture', async () => {
      const req = {
        auth: { userId: mockActorUserId },
        params: { organisationId: mockOrgId },
        body,
      } as unknown as Request;
      const res = mockResponse();

      traineeServiceMock.createOrganisationTraineeInvitation.mockRejectedValue(
        new traineeServiceMock.OrganisationTraineeServiceError(
          409,
          'CANNOT_INVITE_USER',
          'The user cannot be invited to the organisation as a trainee at this time.',
        ),
      );

      await createTraineeInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: 'CANNOT_INVITE_USER',
        message: 'The user cannot be invited to the organisation as a trainee at this time.',
      });
      // Zero-leak assertion
      expect(res.json).not.toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(/platform admin/i),
        }),
      );
    });
  });

  describe('resendInvitation', () => {
    it('returns 401 when auth is missing', async () => {
      const req = {
        params: { organisationId: mockOrgId, invitationId: mockInvitationId },
      } as unknown as Request;
      const res = mockResponse();

      await resendInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('calls service and returns 200 on success', async () => {
      const req = {
        auth: { userId: mockActorUserId },
        params: { organisationId: mockOrgId, invitationId: mockInvitationId },
      } as unknown as Request;
      const res = mockResponse();

      const serviceResult = { success: true, status: 'SENT' };
      traineeServiceMock.resendTraineeInvitation.mockResolvedValue(serviceResult);

      await resendInvitation(req, res);

      expect(traineeServiceMock.resendTraineeInvitation).toHaveBeenCalledWith(
        mockActorUserId,
        mockOrgId,
        mockInvitationId,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(serviceResult);
    });

    it('handles 404 INVITATION_NOT_FOUND error', async () => {
      const req = {
        auth: { userId: mockActorUserId },
        params: { organisationId: mockOrgId, invitationId: mockInvitationId },
      } as unknown as Request;
      const res = mockResponse();

      traineeServiceMock.resendTraineeInvitation.mockRejectedValue(
        new traineeServiceMock.OrganisationTraineeServiceError(
          404,
          'INVITATION_NOT_FOUND',
          'Not found',
        ),
      );

      await resendInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'INVITATION_NOT_FOUND',
        message: 'Not found',
      });
    });
  });

  describe('revokeInvitation', () => {
    it('returns 401 when auth is missing', async () => {
      const req = {
        params: { organisationId: mockOrgId, invitationId: mockInvitationId },
      } as unknown as Request;
      const res = mockResponse();

      await revokeInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('calls service and returns 200 on success', async () => {
      const req = {
        auth: { userId: mockActorUserId },
        params: { organisationId: mockOrgId, invitationId: mockInvitationId },
      } as unknown as Request;
      const res = mockResponse();

      const serviceResult = { success: true, status: 'REVOKED' };
      traineeServiceMock.revokeTraineeInvitation.mockResolvedValue(serviceResult);

      await revokeInvitation(req, res);

      expect(traineeServiceMock.revokeTraineeInvitation).toHaveBeenCalledWith(
        mockActorUserId,
        mockOrgId,
        mockInvitationId,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(serviceResult);
    });
  });

  describe('disableTrainee', () => {
    const body = {
      password: 'password123',
      confirmation: true as const,
    };

    it('returns 401 when auth is missing', async () => {
      const req = {
        params: { organisationId: mockOrgId, traineeId: mockTraineeId },
        body,
      } as unknown as Request;
      const res = mockResponse();

      await disableTrainee(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 404 ROUTE_PARAM_MISSING when traineeId is missing', async () => {
      const req = {
        auth: { userId: mockActorUserId },
        params: { organisationId: mockOrgId },
        body,
      } as unknown as Request;
      const res = mockResponse();

      await disableTrainee(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('calls service with params and body and returns 200 on success', async () => {
      const req = {
        auth: { userId: mockActorUserId },
        params: { organisationId: mockOrgId, traineeId: mockTraineeId },
        body,
      } as unknown as Request;
      const res = mockResponse();

      const serviceResult = { success: true, status: 'DISABLED' };
      traineeServiceMock.disableOrganisationTrainee.mockResolvedValue(serviceResult);

      await disableTrainee(req, res);

      expect(traineeServiceMock.disableOrganisationTrainee).toHaveBeenCalledWith(
        mockActorUserId,
        mockOrgId,
        mockTraineeId,
        body,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(serviceResult);
    });

    it('handles 403 ORG_TRAINEE_PASSWORD_INVALID error cleanly', async () => {
      const req = {
        auth: { userId: mockActorUserId },
        params: { organisationId: mockOrgId, traineeId: mockTraineeId },
        body,
      } as unknown as Request;
      const res = mockResponse();

      traineeServiceMock.disableOrganisationTrainee.mockRejectedValue(
        new traineeServiceMock.OrganisationTraineeServiceError(
          403,
          'ORG_TRAINEE_PASSWORD_INVALID',
          'Invalid pass',
        ),
      );

      await disableTrainee(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'ORG_TRAINEE_PASSWORD_INVALID',
        message: 'Invalid pass',
      });
    });
  });
});
