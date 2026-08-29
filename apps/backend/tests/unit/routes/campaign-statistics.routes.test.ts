import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../../src/app.js';
import { clearCampaignManagementRateLimitStores } from '../../../src/routes/campaign-management.routes.js';
import { getCampaignStatisticsResponseSchema } from '@insightful-phish/shared';

const actorUserId = '22222222-2222-4222-8222-222222222222';
const organisationId = '11111111-1111-4111-8111-111111111111';
const campaignId = '33333333-3333-4333-8333-333333333333';
const traineeProfileId = '44444444-4444-4444-8444-444444444444';
const assignmentId = '55555555-5555-4555-8555-555555555555';

const serviceMock = vi.hoisted(() => {
  class MockCampaignManagementServiceError extends Error {
    constructor(
      public readonly statusCode: number,
      public readonly error: string,
      message: string,
    ) {
      super(message);
      this.name = 'CampaignManagementServiceError';
    }
  }

  return {
    CampaignManagementServiceError: MockCampaignManagementServiceError,
    getOrganisationCampaignStatistics: vi.fn(),
    getOrganisationCampaignCatalogue: vi.fn(),
    getPlatformCampaignCatalogue: vi.fn(),
    getOrganisationCampaigns: vi.fn(),
    getPlatformCampaigns: vi.fn(),
    getOrganisationCampaignDetail: vi.fn(),
    getPlatformCampaignDetail: vi.fn(),
    createOrganisationCampaignDraft: vi.fn(),
    createPlatformCampaignDraft: vi.fn(),
    updateOrganisationCampaignDraft: vi.fn(),
    updatePlatformCampaignDraft: vi.fn(),
    activateOrganisationCampaign: vi.fn(),
    activatePlatformCampaign: vi.fn(),
    archiveOrganisationCampaign: vi.fn(),
    archivePlatformCampaign: vi.fn(),
    reactivateOrganisationCampaign: vi.fn(),
    reactivatePlatformCampaign: vi.fn(),
  };
});

vi.mock('../../../src/services/campaign-management.service.js', () => serviceMock);

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

describe('Campaign Statistics Route Contract (GET /organisations/:organisationId/campaigns/:campaignId/statistics)', () => {
  const app = createApp();

  beforeEach(async () => {
    vi.resetAllMocks();
    authenticated = true;
    await clearCampaignManagementRateLimitStores();
  });

  it('returns 401 when user is unauthenticated', async () => {
    authenticated = false;
    const res = await request(app).get(
      `/organisations/${organisationId}/campaigns/${campaignId}/statistics`,
    );
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('UNAUTHENTICATED');
  });

  it('returns 422 when organisationId is not a valid UUID', async () => {
    const res = await request(app).get(
      `/organisations/invalid-uuid/campaigns/${campaignId}/statistics`,
    );
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 422 when campaignId is not a valid UUID', async () => {
    const res = await request(app).get(
      `/organisations/${organisationId}/campaigns/invalid-uuid/statistics`,
    );
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it.each([
    ['page=0', 'page less than 1'],
    ['limit=101', 'limit exceeds 100'],
    ['page=invalid', 'non-numeric page'],
    ['page=1.5', 'floating point page'],
    ['unexpectedParam=value', 'unexpected query param on strict schema'],
  ])('returns 422 for invalid query params: %s (%s)', async (queryString) => {
    const res = await request(app).get(
      `/organisations/${organisationId}/campaigns/${campaignId}/statistics?${queryString}`,
    );
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 403 when user lacks campaign view permission', async () => {
    serviceMock.getOrganisationCampaignStatistics.mockRejectedValue(
      new serviceMock.CampaignManagementServiceError(
        403,
        'FORBIDDEN',
        'Missing required permission: VIEW_CAMPAIGNS',
      ),
    );

    const res = await request(app).get(
      `/organisations/${organisationId}/campaigns/${campaignId}/statistics`,
    );
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it('returns 404 when campaign is not found or is cross-organisation', async () => {
    serviceMock.getOrganisationCampaignStatistics.mockRejectedValue(
      new serviceMock.CampaignManagementServiceError(
        404,
        'CAMPAIGN_NOT_FOUND',
        'Campaign was not found in this organisation',
      ),
    );

    const res = await request(app).get(
      `/organisations/${organisationId}/campaigns/${campaignId}/statistics`,
    );
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('CAMPAIGN_NOT_FOUND');
  });

  it('returns 200 with structured statistics and passes schema validation', async () => {
    const mockResult = {
      campaign: {
        id: campaignId,
        name: 'Checkers Sixty60 Phishing Awareness',
        description: 'South African retail security awareness training',
        campaignType: 'ORGANISATION_CUSTOM' as const,
        status: 'ACTIVE' as const,
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-09-30T23:59:59.000Z',
        itemCount: 4,
        quizCount: 2,
      },
      summary: {
        assignedTraineeCount: 1,
        startedTraineeCount: 1,
        completedTraineeCount: 0,
        overallProgressPercentage: 50,
        averageQuizScorePercentage: 85,
      },
      trainees: [
        {
          assignmentId,
          traineeProfileId,
          displayName: 'Sipho Ndlovu',
          email: 'sipho.ndlovu@rustenburg-cyber.co.za',
          traineeStatus: 'ACTIVE' as const,
          assignmentStatus: 'IN_PROGRESS' as const,
          accessType: 'ASSIGNED' as const,
          assignedAt: '2026-08-07T12:00:00.000Z',
          progress: {
            completedItemCount: 2,
            totalItemCount: 4,
            progressPercentage: 50,
          },
          completedQuizCount: 1,
          totalQuizCount: 2,
          averageQuizScorePercentage: 85,
          allowedActions: {
            canUnassign: true,
          },
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    };

    serviceMock.getOrganisationCampaignStatistics.mockResolvedValue(mockResult);

    const res = await request(app).get(
      `/organisations/${organisationId}/campaigns/${campaignId}/statistics?page=1&limit=20`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockResult);

    // Verify response adheres to shared contract schema
    const schemaValidation = getCampaignStatisticsResponseSchema.safeParse(res.body);
    expect(schemaValidation.success).toBe(true);

    expect(serviceMock.getOrganisationCampaignStatistics).toHaveBeenCalledWith(
      { userId: actorUserId, userType: 'ORGANISATION_ADMIN' },
      organisationId,
      campaignId,
      { page: 1, limit: 20 },
    );
  });

  it('returns 200 with nullable score and empty cohort representations', async () => {
    const emptyResult = {
      campaign: {
        id: campaignId,
        name: 'New Custom Campaign',
        description: null,
        campaignType: 'ORGANISATION_CUSTOM' as const,
        status: 'DRAFT' as const,
        startDate: null,
        endDate: null,
        itemCount: 3,
        quizCount: 1,
      },
      summary: {
        assignedTraineeCount: 0,
        startedTraineeCount: 0,
        completedTraineeCount: 0,
        overallProgressPercentage: null,
        averageQuizScorePercentage: null,
      },
      trainees: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    };

    serviceMock.getOrganisationCampaignStatistics.mockResolvedValue(emptyResult);

    const res = await request(app).get(
      `/organisations/${organisationId}/campaigns/${campaignId}/statistics`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual(emptyResult);

    const schemaValidation = getCampaignStatisticsResponseSchema.safeParse(res.body);
    expect(schemaValidation.success).toBe(true);
  });

  it('delegates unexpected errors to central error handling returning safe 500 without leaking exception details', async () => {
    serviceMock.getOrganisationCampaignStatistics.mockRejectedValue(
      new Error('Secret database connection string failure: postgresql://root:pass@secret'),
    );

    const res = await request(app).get(
      `/organisations/${organisationId}/campaigns/${campaignId}/statistics`,
    );

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    });
  });
});
