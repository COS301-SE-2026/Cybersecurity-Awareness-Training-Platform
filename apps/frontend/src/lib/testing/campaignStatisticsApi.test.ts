import type { GetOrganisationCampaignStatisticsResponseDto } from '@insightful-phish/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../apiClient';
import { getOrganisationCampaignStatistics } from '../campaignsApi';

const ORGANISATION_ID = '11111111-1111-4111-8111-111111111111';
const CAMPAIGN_ID = '22222222-2222-4222-8222-222222222222';

const RESPONSE: GetOrganisationCampaignStatisticsResponseDto = {
  campaign: {
    id: CAMPAIGN_ID,
    name: 'Security Awareness',
    description: 'Organisation security training.',
    campaignType: 'ORGANISATION_CUSTOM',
    status: 'ACTIVE',
    startDate: '2026-09-01T08:00:00.000Z',
    endDate: '2026-09-30T17:00:00.000Z',
    itemCount: 8,
    quizCount: 2,
  },
  summary: {
    assignedTraineeCount: 14,
    startedTraineeCount: 9,
    completedTraineeCount: 4,
    overallProgressPercentage: 63,
    averageQuizScorePercentage: 87,
  },
  trainees: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 14,
    totalPages: 1,
  },
};

describe('getOrganisationCampaignStatistics', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requests the selected campaign page and validates the response', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue(RESPONSE);

    await expect(
      getOrganisationCampaignStatistics(ORGANISATION_ID, CAMPAIGN_ID, {
        page: 1,
        limit: 20,
      }),
    ).resolves.toEqual(RESPONSE);

    expect(get).toHaveBeenCalledWith(
      `/organisations/${ORGANISATION_ID}/campaigns/${CAMPAIGN_ID}/statistics?page=1&limit=20`,
    );
  });

  it('rejects a response that violates the shared statistics schema', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      ...RESPONSE,
      summary: {
        ...RESPONSE.summary,
        overallProgressPercentage: 101,
      },
    });

    await expect(
      getOrganisationCampaignStatistics(ORGANISATION_ID, CAMPAIGN_ID, {
        page: 1,
        limit: 20,
      }),
    ).rejects.toMatchObject({ name: 'ZodError' });
  });
});
