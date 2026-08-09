import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../../src/app.js';
import { clearCampaignAssignmentRateLimitStores } from '../../../src/routes/campaign-assignment.routes.js';

const actorUserId = '22222222-2222-4222-8222-222222222222';
const organisationId = '11111111-1111-4111-8111-111111111111';
const campaignId = '33333333-3333-4333-8333-333333333333';
const traineeProfileId = '44444444-4444-4444-8444-444444444444';

const serviceMock = vi.hoisted(() => {
  class MockCampaignAssignmentServiceError extends Error {
    constructor(
      public readonly statusCode: 401 | 403 | 404 | 422,
      public readonly error: string,
      message: string,
    ) {
      super(message);
      this.name = 'CampaignAssignmentServiceError';
    }
  }

  return {
    CampaignAssignmentServiceError: MockCampaignAssignmentServiceError,
    getAssignableCampaigns: vi.fn(),
    getAssignmentCandidates: vi.fn(),
    createCampaignAssignments: vi.fn(),
    deleteCampaignAssignment: vi.fn(),
    getCampaignAssignmentsByCampaign: vi.fn(),
    getCampaignAssignmentsByTrainee: vi.fn(),
  };
});

vi.mock('../../../src/services/campaign-assignment.service.js', () => serviceMock);

let authenticated = true;

vi.mock('../../../src/middleware/requireAuth.js', () => ({
  requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!authenticated) {
      res.status(401).json({
        error: 'UNAUTHENTICATED',
        message: 'Authentication credentials are required',
      });
      return;
    }
    req.auth = {
      userId: actorUserId,
      user: {
        id: actorUserId,
        firstName: 'Thabo',
        lastName: 'Mbeki',
        email: 'thabo.mbeki@pretoria-tech.co.za',
        userType: 'ORGANISATION_ADMIN',
        authStatus: 'ACTIVE',
        createdAt: '2026-07-01T08:00:00.000Z',
      },
    };
    next();
  },
}));

describe('Campaign Assignment Routes', () => {
  const app = createApp();

  beforeEach(async () => {
    vi.resetAllMocks();
    authenticated = true;
    await clearCampaignAssignmentRateLimitStores();
  });

  describe('GET /organisations/:organisationId/campaigns/assignable', () => {
    it('returns 401 when user is not authenticated', async () => {
      authenticated = false;
      const res = await request(app).get(`/organisations/${organisationId}/campaigns/assignable`);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHENTICATED');
    });

    it('returns 400 for invalid organisationId UUID format', async () => {
      const res = await request(app).get('/organisations/not-a-uuid/campaigns/assignable');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 422 for invalid query parameters', async () => {
      const res = await request(app).get(
        `/organisations/${organisationId}/campaigns/assignable?page=invalid`,
      );
      expect(res.status).toBe(422);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 403 when service throws forbidden error', async () => {
      serviceMock.getAssignableCampaigns.mockRejectedValue(
        new serviceMock.CampaignAssignmentServiceError(
          403,
          'MISSING_ASSIGN_CAMPAIGNS_PERMISSION',
          'Assign campaigns permission is required',
        ),
      );

      const res = await request(app).get(`/organisations/${organisationId}/campaigns/assignable`);
      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: 'MISSING_ASSIGN_CAMPAIGNS_PERMISSION',
        message: 'Assign campaigns permission is required',
      });
    });

    it('returns 200 with campaign options on success', async () => {
      const mockResult = {
        items: [
          {
            campaignId,
            name: 'Checkers Sixty60 Phishing Awareness',
            description: 'South African retail security training',
            status: 'ACTIVE',
            type: 'ORGANISATION_CUSTOM',
            itemCount: 3,
            startDate: '2026-09-01T00:00:00.000Z',
            endDate: null,
            assignmentCount: 5,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      serviceMock.getAssignableCampaigns.mockResolvedValue(mockResult);

      const res = await request(app).get(
        `/organisations/${organisationId}/campaigns/assignable?page=1&limit=20&search=Checkers`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockResult);
      expect(serviceMock.getAssignableCampaigns).toHaveBeenCalledWith(actorUserId, organisationId, {
        page: 1,
        limit: 20,
        search: 'Checkers',
      });
    });
  });

  describe('GET /organisations/:organisationId/campaign-assignment-candidates', () => {
    it('returns 200 with candidate options on success', async () => {
      const mockResult = {
        items: [
          {
            traineeProfileId,
            organisationTraineeProfileId: 'b2c3d4e5-f6a7-48b9-c0d1-e2f3a4b5c6d7',
            userId: 'c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8',
            displayName: 'Sipho Ndlovu',
            email: 'sipho.ndlovu@rustenburg-cyber.co.za',
            active: true,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      serviceMock.getAssignmentCandidates.mockResolvedValue(mockResult);

      const res = await request(app).get(
        `/organisations/${organisationId}/campaign-assignment-candidates`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockResult);
      expect(serviceMock.getAssignmentCandidates).toHaveBeenCalledWith(
        actorUserId,
        organisationId,
        {
          page: 1,
          limit: 20,
          search: undefined,
        },
      );
    });
  });

  describe('POST /organisations/:organisationId/campaign-assignments', () => {
    it('returns 422 for malformed request body', async () => {
      const res = await request(app)
        .post(`/organisations/${organisationId}/campaign-assignments`)
        .send({ campaignIds: [], traineeProfileIds: [] });

      expect(res.status).toBe(422);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 200 with created and summary on success', async () => {
      const mockResult = {
        created: [
          {
            assignmentId: 'assign-1',
            campaignId,
            traineeProfileId,
          },
        ],
        alreadyAssigned: [],
        summary: {
          requestedCampaigns: 1,
          requestedTrainees: 1,
          requestedPairs: 1,
          createdCount: 1,
          alreadyAssignedCount: 0,
        },
      };

      serviceMock.createCampaignAssignments.mockResolvedValue(mockResult);

      const res = await request(app)
        .post(`/organisations/${organisationId}/campaign-assignments`)
        .send({
          campaignIds: [campaignId],
          traineeProfileIds: [traineeProfileId],
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockResult);
      expect(serviceMock.createCampaignAssignments).toHaveBeenCalledWith(
        actorUserId,
        organisationId,
        {
          campaignIds: [campaignId],
          traineeProfileIds: [traineeProfileId],
        },
      );
    });
  });

  describe('GET /organisations/:organisationId/campaigns/:campaignId/assignments', () => {
    it('returns 200 with paginated assignments for campaign', async () => {
      const mockResult = {
        items: [
          {
            assignmentId: 'assign-1',
            campaignId,
            campaignName: 'Checkers Sixty60 Phishing Awareness',
            campaignStatus: 'ACTIVE',
            campaignType: 'ORGANISATION_CUSTOM',
            traineeProfileId,
            displayName: 'Anika van der Merwe',
            email: 'anika.vdmerwe@pretoria-tech.co.za',
            traineeStatus: 'ACTIVE',
            assignmentStatus: 'ASSIGNED',
            accessType: 'ASSIGNED',
            assignedAt: '2026-08-07T12:00:00.000Z',
            startedAt: null,
            completedAt: null,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      serviceMock.getCampaignAssignmentsByCampaign.mockResolvedValue(mockResult);

      const res = await request(app).get(
        `/organisations/${organisationId}/campaigns/${campaignId}/assignments`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockResult);
    });
  });

  describe('GET /organisations/:organisationId/trainees/:traineeProfileId/campaign-assignments', () => {
    it('returns 200 with paginated assignments for trainee profile', async () => {
      const mockResult = {
        items: [
          {
            assignmentId: 'assign-1',
            campaignId,
            campaignName: 'Checkers Sixty60 Phishing Awareness',
            campaignStatus: 'ACTIVE',
            campaignType: 'ORGANISATION_CUSTOM',
            traineeProfileId,
            displayName: 'Sipho Ndlovu',
            email: 'sipho.ndlovu@rustenburg-cyber.co.za',
            traineeStatus: 'ACTIVE',
            assignmentStatus: 'ASSIGNED',
            accessType: 'ASSIGNED',
            assignedAt: '2026-08-07T12:00:00.000Z',
            startedAt: null,
            completedAt: null,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      serviceMock.getCampaignAssignmentsByTrainee.mockResolvedValue(mockResult);

      const res = await request(app).get(
        `/organisations/${organisationId}/trainees/${traineeProfileId}/campaign-assignments`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockResult);
    });
  });

  describe('DELETE /organisations/:organisationId/campaign-assignments/:assignmentId', () => {
    const assignmentId = '55555555-5555-4555-8555-555555555555';

    it('returns 401 when user is not authenticated', async () => {
      authenticated = false;
      const res = await request(app).delete(
        `/organisations/${organisationId}/campaign-assignments/${assignmentId}`,
      );
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('UNAUTHENTICATED');
    });

    it('returns 400 when organisationId or assignmentId is not a valid UUID', async () => {
      const res = await request(app).delete(
        `/organisations/${organisationId}/campaign-assignments/not-a-uuid`,
      );
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when assignment is missing or cross-organisation', async () => {
      serviceMock.deleteCampaignAssignment.mockRejectedValue(
        new serviceMock.CampaignAssignmentServiceError(
          404,
          'ASSIGNMENT_NOT_FOUND',
          'Campaign assignment was not found in this organisation',
        ),
      );

      const res = await request(app).delete(
        `/organisations/${organisationId}/campaign-assignments/${assignmentId}`,
      );
      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        error: 'ASSIGNMENT_NOT_FOUND',
        message: 'Campaign assignment was not found in this organisation',
      });
    });

    it('returns 200 with deletion summary on successful unassignment', async () => {
      const mockResult = {
        assignmentId,
        campaignId,
        traineeProfileId,
        unassigned: true,
        deletedProgress: {
          quizAttempts: 1,
          emailClassificationResponses: 2,
          interactionEvents: 5,
        },
      };

      serviceMock.deleteCampaignAssignment.mockResolvedValue(mockResult);

      const res = await request(app).delete(
        `/organisations/${organisationId}/campaign-assignments/${assignmentId}`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockResult);
      expect(serviceMock.deleteCampaignAssignment).toHaveBeenCalledWith(
        actorUserId,
        organisationId,
        assignmentId,
      );
    });
  });
});
