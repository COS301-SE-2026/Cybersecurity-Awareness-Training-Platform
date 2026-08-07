import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../../src/app.js';
import { clearCampaignAssignmentRateLimitStores } from '../../../src/routes/campaign-assignment.routes.js';

const actorUserId = '22222222-2222-4222-8222-222222222222';
const organisationId = '11111111-1111-4111-8111-111111111111';

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
        firstName: 'Alice',
        lastName: 'Admin',
        email: 'alice@example.test',
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

    it('returns 404 when service throws inaccessible organisation error', async () => {
      serviceMock.getAssignableCampaigns.mockRejectedValue(
        new serviceMock.CampaignAssignmentServiceError(
          404,
          'INACCESSIBLE_ORGANISATION',
          'Inaccessible organisation',
        ),
      );

      const res = await request(app).get(`/organisations/${organisationId}/campaigns/assignable`);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        error: 'INACCESSIBLE_ORGANISATION',
        message: 'Inaccessible organisation',
      });
    });

    it('returns 200 with campaign options on success', async () => {
      const mockResult = {
        items: [
          {
            campaignId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
            name: 'Q3 Phishing Awareness',
            description: 'Quarterly training',
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
        `/organisations/${organisationId}/campaigns/assignable?page=1&limit=20&search=Q3`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual(mockResult);
      expect(serviceMock.getAssignableCampaigns).toHaveBeenCalledWith(actorUserId, organisationId, {
        page: 1,
        limit: 20,
        search: 'Q3',
      });
    });
  });

  describe('GET /organisations/:organisationId/campaign-assignment-candidates', () => {
    it('returns 200 with candidate options on success', async () => {
      const mockResult = {
        items: [
          {
            traineeProfileId: 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6',
            organisationTraineeProfileId: 'b2c3d4e5-f6a7-48b9-c0d1-e2f3a4b5c6d7',
            userId: 'c3d4e5f6-a7b8-49c0-d1e2-f3a4b5c6d7e8',
            displayName: 'Jane Doe',
            email: 'jane.doe@example.com',
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
});
