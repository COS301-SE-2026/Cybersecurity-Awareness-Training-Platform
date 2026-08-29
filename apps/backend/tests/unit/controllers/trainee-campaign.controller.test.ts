import type { Request, Response } from 'express';
import type {
  GetPlatformCampaignsResponseDto,
  GetTraineeCampaignDetailResponseDto,
  TraineeCampaignSummaryDto,
} from '@insightful-phish/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enrolPlatformCampaignController,
  getTraineeCampaign,
  listPlatformCampaignsController,
  listTraineeCampaigns,
} from '../../../src/controllers/trainee-campaign.controller.js';
import * as traineeCampaignService from '../../../src/services/trainee-campaign.service.js';
import {
  TraineeCampaignForbiddenError,
  TraineeCampaignNotFoundError,
} from '../../../src/services/trainee-campaign.service.js';
import { CampaignEligibilityDenialError } from '../../../src/services/campaign-eligibility.service.js';

vi.mock('../../../src/services/trainee-campaign.service.js', () => ({
  listTraineeCampaigns: vi.fn(),
  getTraineeCampaignDetail: vi.fn(),
  getTraineeCampaigns: vi.fn(),
  listPlatformCampaigns: vi.fn(),
  enrolPlatformCampaign: vi.fn(),
  TraineeCampaignForbiddenError: class TraineeCampaignForbiddenError extends Error {
    public readonly statusCode = 403;
    public readonly errorCode = 'FORBIDDEN';
    constructor(message = 'Only active general trainees can access this resource') {
      super(message);
      this.name = 'TraineeCampaignForbiddenError';
    }
  },
  TraineeCampaignNotFoundError: class TraineeCampaignNotFoundError extends Error {
    constructor(message = 'Trainee campaign not found') {
      super(message);
      this.name = 'TraineeCampaignNotFoundError';
    }
  },
}));

function createMockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

describe('trainee campaign controller unit tests', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const campaignId = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listTraineeCampaigns', () => {
    it('returns 401 when req.auth is missing', async () => {
      const req = { auth: undefined } as unknown as Request;
      const res = createMockResponse();

      await listTraineeCampaigns(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'AUTH_REQUIRED',
        message: 'Authentication credentials are required',
      });
    });

    it('returns 200 with campaigns list when service succeeds', async () => {
      const req = { auth: { userId } } as unknown as Request;
      const res = createMockResponse();
      const mockResult = { campaigns: [] };

      vi.mocked(traineeCampaignService.getTraineeCampaigns).mockResolvedValueOnce(mockResult);

      await listTraineeCampaigns(req, res);

      expect(traineeCampaignService.getTraineeCampaigns).toHaveBeenCalledWith(userId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it('returns 403 on TraineeCampaignForbiddenError', async () => {
      const req = { auth: { userId } } as unknown as Request;
      const res = createMockResponse();

      vi.mocked(traineeCampaignService.getTraineeCampaigns).mockRejectedValueOnce(
        new TraineeCampaignForbiddenError('Trainee profile is inactive'),
      );

      await listTraineeCampaigns(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'FORBIDDEN',
        message: 'Trainee profile is inactive',
      });
    });

    it('returns 404 on TraineeCampaignNotFoundError', async () => {
      const req = { auth: { userId } } as unknown as Request;
      const res = createMockResponse();

      vi.mocked(traineeCampaignService.getTraineeCampaigns).mockRejectedValueOnce(
        new TraineeCampaignNotFoundError('Campaign was not found'),
      );

      await listTraineeCampaigns(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'CAMPAIGN_NOT_FOUND',
        message: 'Campaign was not found',
      });
    });

    it('returns 409 on CampaignEligibilityDenialError', async () => {
      const req = { auth: { userId } } as unknown as Request;
      const res = createMockResponse();

      vi.mocked(traineeCampaignService.getTraineeCampaigns).mockRejectedValueOnce(
        new CampaignEligibilityDenialError('CAMPAIGN_ARCHIVED', 'Campaign has been archived'),
      );

      await listTraineeCampaigns(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: 'CAMPAIGN_ARCHIVED',
        message: 'Campaign has been archived',
      });
    });

    it('returns 500 on unexpected error', async () => {
      const req = { auth: { userId } } as unknown as Request;
      const res = createMockResponse();

      vi.mocked(traineeCampaignService.getTraineeCampaigns).mockRejectedValueOnce(
        new Error('Database disk failure'),
      );

      await listTraineeCampaigns(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      });
    });
  });

  describe('getTraineeCampaign', () => {
    it('returns 401 when unauthenticated', async () => {
      const req = { auth: undefined, params: { campaignId } } as unknown as Request;
      const res = createMockResponse();

      await getTraineeCampaign(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 200 with campaign detail for string campaignId param', async () => {
      const req = { auth: { userId }, params: { campaignId } } as unknown as Request;
      const res = createMockResponse();
      const mockDetail = {
        campaignId,
        name: 'Phishing Campaign',
      } as unknown as GetTraineeCampaignDetailResponseDto;

      vi.mocked(traineeCampaignService.getTraineeCampaignDetail).mockResolvedValueOnce(mockDetail);

      await getTraineeCampaign(req, res);

      expect(traineeCampaignService.getTraineeCampaignDetail).toHaveBeenCalledWith(
        userId,
        campaignId,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockDetail);
    });

    it('extracts first element when campaignId is passed as an array', async () => {
      const req = {
        auth: { userId },
        params: { campaignId: [campaignId, 'extra'] },
      } as unknown as Request;
      const res = createMockResponse();

      vi.mocked(traineeCampaignService.getTraineeCampaignDetail).mockResolvedValueOnce(
        {} as unknown as GetTraineeCampaignDetailResponseDto,
      );

      await getTraineeCampaign(req, res);

      expect(traineeCampaignService.getTraineeCampaignDetail).toHaveBeenCalledWith(
        userId,
        campaignId,
      );
    });

    it('handles empty array campaignId param by falling back to empty string', async () => {
      const req = { auth: { userId }, params: { campaignId: [] } } as unknown as Request;
      const res = createMockResponse();

      vi.mocked(traineeCampaignService.getTraineeCampaignDetail).mockResolvedValueOnce(
        {} as unknown as GetTraineeCampaignDetailResponseDto,
      );

      await getTraineeCampaign(req, res);

      expect(traineeCampaignService.getTraineeCampaignDetail).toHaveBeenCalledWith(userId, '');
    });

    it('maps TraineeCampaignNotFoundError to 404', async () => {
      const req = { auth: { userId }, params: { campaignId } } as unknown as Request;
      const res = createMockResponse();

      vi.mocked(traineeCampaignService.getTraineeCampaignDetail).mockRejectedValueOnce(
        new TraineeCampaignNotFoundError(),
      );

      await getTraineeCampaign(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'CAMPAIGN_NOT_FOUND',
        message: 'Campaign was not found',
      });
    });
  });

  describe('listPlatformCampaignsController', () => {
    it('returns 401 when unauthenticated', async () => {
      const req = { auth: undefined, query: {} } as unknown as Request;
      const res = createMockResponse();

      await listPlatformCampaignsController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('parses page, limit, and search query parameters with defaults', async () => {
      const req = {
        auth: { userId },
        query: { page: 2, limit: 20, search: 'phish' },
      } as unknown as Request;
      const res = createMockResponse();
      const mockResult = {
        items: [],
        pagination: {},
      } as unknown as GetPlatformCampaignsResponseDto;

      vi.mocked(traineeCampaignService.listPlatformCampaigns).mockResolvedValueOnce(mockResult);

      await listPlatformCampaignsController(req, res);

      expect(traineeCampaignService.listPlatformCampaigns).toHaveBeenCalledWith(userId, {
        page: 2,
        limit: 20,
        search: 'phish',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it('defaults page to 1 and limit to 10 when omitted from query', async () => {
      const req = {
        auth: { userId },
        query: {},
      } as unknown as Request;
      const res = createMockResponse();

      vi.mocked(traineeCampaignService.listPlatformCampaigns).mockResolvedValueOnce(
        {} as unknown as GetPlatformCampaignsResponseDto,
      );

      await listPlatformCampaignsController(req, res);

      expect(traineeCampaignService.listPlatformCampaigns).toHaveBeenCalledWith(userId, {
        page: 1,
        limit: 10,
        search: undefined,
      });
    });

    it('handles service errors through error handler', async () => {
      const req = {
        auth: { userId },
        query: {},
      } as unknown as Request;
      const res = createMockResponse();

      vi.mocked(traineeCampaignService.listPlatformCampaigns).mockRejectedValueOnce(
        new TraineeCampaignForbiddenError('Forbidden'),
      );

      await listPlatformCampaignsController(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('enrolPlatformCampaignController', () => {
    it('returns 401 when unauthenticated', async () => {
      const req = { auth: undefined, params: { campaignId } } as unknown as Request;
      const res = createMockResponse();

      await enrolPlatformCampaignController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 200 with enrolled campaign summary on success', async () => {
      const req = { auth: { userId }, params: { campaignId } } as unknown as Request;
      const res = createMockResponse();
      const mockResult = {
        campaignId,
        accessType: 'SELF_SELECTED',
      } as unknown as TraineeCampaignSummaryDto;

      vi.mocked(traineeCampaignService.enrolPlatformCampaign).mockResolvedValueOnce(mockResult);

      await enrolPlatformCampaignController(req, res);

      expect(traineeCampaignService.enrolPlatformCampaign).toHaveBeenCalledWith(userId, campaignId);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResult);
    });

    it('handles service errors through error handler', async () => {
      const req = { auth: { userId }, params: { campaignId } } as unknown as Request;
      const res = createMockResponse();

      vi.mocked(traineeCampaignService.enrolPlatformCampaign).mockRejectedValueOnce(
        new CampaignEligibilityDenialError('CAMPAIGN_NOT_STARTED', 'Campaign has not started'),
      );

      await enrolPlatformCampaignController(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: 'CAMPAIGN_NOT_STARTED',
        message: 'Campaign has not started',
      });
    });
  });
});
