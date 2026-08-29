import { describe, expect, it } from 'vitest';
import {
  calculateCampaignAverageQuizScore,
  calculateCampaignOverallProgress,
  calculateItemProgressPercentage,
  calculateTraineeAverageQuizScore,
  roundPercentageToInteger,
} from '../campaign-statistics.js';
import {
  campaignStatisticsCampaignSchema,
  campaignStatisticsParamsSchema,
  campaignStatisticsQuerySchema,
  campaignStatisticsSummarySchema,
  campaignStatisticsTraineeActionsSchema,
  campaignStatisticsTraineeProgressSchema,
  campaignStatisticsTraineeRowSchema,
  getCampaignStatisticsResponseSchema,
  getOrganisationCampaignStatisticsResponseSchema,
} from './campaign-statistics.schemas.js';

describe('campaignStatisticsParamsSchema', () => {
  const validOrgId = '11111111-1111-4111-8111-111111111111';
  const validCampaignId = '22222222-2222-4222-8222-222222222222';

  it('accepts valid UUID path parameters', () => {
    const result = campaignStatisticsParamsSchema.safeParse({
      organisationId: validOrgId,
      campaignId: validCampaignId,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        organisationId: validOrgId,
        campaignId: validCampaignId,
      });
    }
  });

  it('rejects invalid organisationId or campaignId UUIDs', () => {
    expect(
      campaignStatisticsParamsSchema.safeParse({
        organisationId: 'not-a-uuid',
        campaignId: validCampaignId,
      }).success,
    ).toBe(false);

    expect(
      campaignStatisticsParamsSchema.safeParse({
        organisationId: validOrgId,
        campaignId: 'not-a-uuid',
      }).success,
    ).toBe(false);
  });

  it('rejects unknown properties due to strict schema', () => {
    expect(
      campaignStatisticsParamsSchema.safeParse({
        organisationId: validOrgId,
        campaignId: validCampaignId,
        extra: 'value',
      }).success,
    ).toBe(false);
  });
});

describe('campaignStatisticsQuerySchema', () => {
  it('parses empty query with default page=1 and limit=20', () => {
    const result = campaignStatisticsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        page: 1,
        limit: 20,
      });
    }
  });

  it('coerces string page and limit parameters', () => {
    const result = campaignStatisticsQuerySchema.safeParse({
      page: '3',
      limit: '50',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        page: 3,
        limit: 50,
      });
    }
  });

  it.each([
    [{ page: '0' }, 'page < 1'],
    [{ page: '-5' }, 'negative page'],
    [{ page: '100001' }, 'page > 100000'],
    [{ limit: '0' }, 'limit < 1'],
    [{ limit: '101' }, 'limit > 100'],
    [{ page: '1.5' }, 'fractional page'],
    [{ page: 'abc' }, 'non-numeric page'],
    [{ unknownParam: '123' }, 'unknown query params'],
  ])('rejects invalid query %j (%s)', (input: Record<string, unknown>, _label: string) => {
    expect(campaignStatisticsQuerySchema.safeParse(input).success).toBe(false);
  });
});

describe('campaignStatisticsCampaignSchema', () => {
  const validCampaign = {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Checkers Sixty60 Phishing Awareness Training',
    description: 'Simulated e-commerce awareness training',
    campaignType: 'ORGANISATION_CUSTOM' as const,
    status: 'ACTIVE' as const,
    startDate: '2026-09-01T00:00:00.000Z',
    endDate: '2026-09-30T23:59:59.000Z',
    itemCount: 5,
    quizCount: 2,
  };

  it('accepts valid campaign identity data', () => {
    const result = campaignStatisticsCampaignSchema.safeParse(validCampaign);
    expect(result.success).toBe(true);
  });

  it('allows nullable description and nullable start/end dates', () => {
    const withNulls = {
      ...validCampaign,
      description: null,
      startDate: null,
      endDate: null,
    };
    const result = campaignStatisticsCampaignSchema.safeParse(withNulls);
    expect(result.success).toBe(true);
  });

  it('requires description to be explicitly provided as a string or null (rejects omitted or undefined description)', () => {
    const { description: _omitted, ...missingDescription } = validCampaign;
    expect(campaignStatisticsCampaignSchema.safeParse(missingDescription).success).toBe(false);

    expect(
      campaignStatisticsCampaignSchema.safeParse({
        ...validCampaign,
        description: undefined,
      }).success,
    ).toBe(false);
  });

  it('rejects negative itemCount or quizCount', () => {
    expect(
      campaignStatisticsCampaignSchema.safeParse({
        ...validCampaign,
        itemCount: -1,
      }).success,
    ).toBe(false);

    expect(
      campaignStatisticsCampaignSchema.safeParse({
        ...validCampaign,
        quizCount: -1,
      }).success,
    ).toBe(false);
  });

  it('rejects invalid enum values for campaignType or status', () => {
    expect(
      campaignStatisticsCampaignSchema.safeParse({
        ...validCampaign,
        campaignType: 'INVALID_TYPE',
      }).success,
    ).toBe(false);

    expect(
      campaignStatisticsCampaignSchema.safeParse({
        ...validCampaign,
        status: 'INVALID_STATUS',
      }).success,
    ).toBe(false);
  });

  it('rejects invalid datetime format for dates', () => {
    expect(
      campaignStatisticsCampaignSchema.safeParse({
        ...validCampaign,
        startDate: '2026-09-01',
      }).success,
    ).toBe(false);
  });
});

describe('campaignStatisticsSummarySchema', () => {
  const validSummary = {
    assignedTraineeCount: 30,
    startedTraineeCount: 20,
    completedTraineeCount: 15,
    overallProgressPercentage: 75,
    averageQuizScorePercentage: 85,
  };

  it('accepts valid summary statistics', () => {
    const result = campaignStatisticsSummarySchema.safeParse(validSummary);
    expect(result.success).toBe(true);
  });

  it('allows nullable percentages when no trainees are assigned or no scores exist', () => {
    const emptyCohortSummary = {
      assignedTraineeCount: 0,
      startedTraineeCount: 0,
      completedTraineeCount: 0,
      overallProgressPercentage: null,
      averageQuizScorePercentage: null,
    };
    const result = campaignStatisticsSummarySchema.safeParse(emptyCohortSummary);
    expect(result.success).toBe(true);
  });

  it('rejects percentages outside 0..100 or non-integer percentages', () => {
    expect(
      campaignStatisticsSummarySchema.safeParse({
        ...validSummary,
        overallProgressPercentage: -1,
      }).success,
    ).toBe(false);

    expect(
      campaignStatisticsSummarySchema.safeParse({
        ...validSummary,
        overallProgressPercentage: 101,
      }).success,
    ).toBe(false);

    expect(
      campaignStatisticsSummarySchema.safeParse({
        ...validSummary,
        averageQuizScorePercentage: 85.5,
      }).success,
    ).toBe(false);
  });

  it('rejects negative trainee counts', () => {
    expect(
      campaignStatisticsSummarySchema.safeParse({
        ...validSummary,
        assignedTraineeCount: -1,
      }).success,
    ).toBe(false);
  });
});

describe('campaignStatisticsTraineeProgressSchema', () => {
  it('accepts valid progress object', () => {
    const result = campaignStatisticsTraineeProgressSchema.safeParse({
      completedItemCount: 3,
      totalItemCount: 4,
      progressPercentage: 75,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid progress values', () => {
    expect(
      campaignStatisticsTraineeProgressSchema.safeParse({
        completedItemCount: -1,
        totalItemCount: 4,
        progressPercentage: 75,
      }).success,
    ).toBe(false);

    expect(
      campaignStatisticsTraineeProgressSchema.safeParse({
        completedItemCount: 3,
        totalItemCount: 4,
        progressPercentage: 101,
      }).success,
    ).toBe(false);
  });
});

describe('campaignStatisticsTraineeActionsSchema', () => {
  it('accepts valid action capability boolean', () => {
    expect(campaignStatisticsTraineeActionsSchema.safeParse({ canUnassign: true }).success).toBe(
      true,
    );

    expect(campaignStatisticsTraineeActionsSchema.safeParse({ canUnassign: false }).success).toBe(
      true,
    );
  });

  it('rejects non-boolean canUnassign', () => {
    expect(campaignStatisticsTraineeActionsSchema.safeParse({ canUnassign: 'true' }).success).toBe(
      false,
    );
  });
});

describe('campaignStatisticsTraineeRowSchema', () => {
  const validRow = {
    assignmentId: '55555555-5555-4555-8555-555555555555',
    traineeProfileId: '44444444-4444-4444-8444-444444444444',
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
    averageQuizScorePercentage: 90,
    allowedActions: {
      canUnassign: true,
    },
  };

  it('accepts valid trainee statistics row', () => {
    const result = campaignStatisticsTraineeRowSchema.safeParse(validRow);
    expect(result.success).toBe(true);
  });

  it('allows null for averageQuizScorePercentage when trainee has no submitted quiz scores', () => {
    const withNullScore = {
      ...validRow,
      averageQuizScorePercentage: null,
      completedQuizCount: 0,
    };
    const result = campaignStatisticsTraineeRowSchema.safeParse(withNullScore);
    expect(result.success).toBe(true);
  });

  it('accepts ACTIVE, INACTIVE, and DISABLED traineeStatus values', () => {
    for (const status of ['ACTIVE', 'INACTIVE', 'DISABLED'] as const) {
      const result = campaignStatisticsTraineeRowSchema.safeParse({
        ...validRow,
        traineeStatus: status,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid email, invalid UUID, or invalid enums', () => {
    expect(
      campaignStatisticsTraineeRowSchema.safeParse({
        ...validRow,
        email: 'invalid-email',
      }).success,
    ).toBe(false);

    expect(
      campaignStatisticsTraineeRowSchema.safeParse({
        ...validRow,
        assignmentId: 'not-a-uuid',
      }).success,
    ).toBe(false);

    expect(
      campaignStatisticsTraineeRowSchema.safeParse({
        ...validRow,
        traineeStatus: 'UNKNOWN_STATUS',
      }).success,
    ).toBe(false);

    expect(
      campaignStatisticsTraineeRowSchema.safeParse({
        ...validRow,
        assignmentStatus: 'UNKNOWN_STATUS',
      }).success,
    ).toBe(false);
  });
});

describe('getCampaignStatisticsResponseSchema', () => {
  const validFullResponse = {
    campaign: {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Checkers Sixty60 Phishing Awareness Training',
      description: 'South African retail security awareness',
      campaignType: 'ORGANISATION_CUSTOM' as const,
      status: 'ACTIVE' as const,
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: null,
      itemCount: 4,
      quizCount: 2,
    },
    summary: {
      assignedTraineeCount: 1,
      startedTraineeCount: 1,
      completedTraineeCount: 0,
      overallProgressPercentage: 50,
      averageQuizScorePercentage: 90,
    },
    trainees: [
      {
        assignmentId: '55555555-5555-4555-8555-555555555555',
        traineeProfileId: '44444444-4444-4444-8444-444444444444',
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
        averageQuizScorePercentage: 90,
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

  it('validates full campaign statistics response', () => {
    const result = getCampaignStatisticsResponseSchema.safeParse(validFullResponse);
    expect(result.success).toBe(true);
  });

  it('validates response with getOrganisationCampaignStatisticsResponseSchema alias', () => {
    const result = getOrganisationCampaignStatisticsResponseSchema.safeParse(validFullResponse);
    expect(result.success).toBe(true);
  });

  it('validates empty cohort response with null percentages and empty trainees list', () => {
    const emptyResponse = {
      ...validFullResponse,
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
    const result = getCampaignStatisticsResponseSchema.safeParse(emptyResponse);
    expect(result.success).toBe(true);
  });
});

describe('campaign statistics calculation utility functions', () => {
  it('roundPercentageToInteger rounds numbers to nearest whole integer and clamps between 0 and 100', () => {
    expect(roundPercentageToInteger(66.4)).toBe(66);
    expect(roundPercentageToInteger(66.5)).toBe(67);
    expect(roundPercentageToInteger(66.6)).toBe(67);
    expect(roundPercentageToInteger(0)).toBe(0);
    expect(roundPercentageToInteger(100)).toBe(100);
    expect(roundPercentageToInteger(-10)).toBe(0);
    expect(roundPercentageToInteger(150)).toBe(100);
    expect(roundPercentageToInteger(Number.NaN)).toBe(0);
    expect(roundPercentageToInteger(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('calculateItemProgressPercentage calculates integer percentage from completed / total items', () => {
    expect(calculateItemProgressPercentage(0, 4)).toBe(0);
    expect(calculateItemProgressPercentage(1, 4)).toBe(25);
    expect(calculateItemProgressPercentage(2, 3)).toBe(67);
    expect(calculateItemProgressPercentage(3, 4)).toBe(75);
    expect(calculateItemProgressPercentage(4, 4)).toBe(100);
    expect(calculateItemProgressPercentage(0, 0)).toBe(0);
    expect(calculateItemProgressPercentage(2, -1)).toBe(0);
  });

  it('calculateCampaignOverallProgress calculates arithmetic mean of trainee progress percentages or null for empty cohort', () => {
    expect(calculateCampaignOverallProgress([])).toBeNull();
    expect(calculateCampaignOverallProgress([0, 50, 100])).toBe(50);
    expect(calculateCampaignOverallProgress([33, 67])).toBe(50);
    expect(calculateCampaignOverallProgress([100, 100, 100])).toBe(100);
    expect(calculateCampaignOverallProgress([33, 33, 34])).toBe(33);
  });

  it('calculateTraineeAverageQuizScore averages submitted quiz scores or returns null if none submitted', () => {
    expect(calculateTraineeAverageQuizScore([])).toBeNull();
    expect(calculateTraineeAverageQuizScore([80, 90])).toBe(85);
    expect(calculateTraineeAverageQuizScore([75])).toBe(75);
    expect(calculateTraineeAverageQuizScore([70, 75, 80])).toBe(75);
  });

  it('calculateCampaignAverageQuizScore calculates mean of contributing trainee averages or null if no scores', () => {
    expect(calculateCampaignAverageQuizScore([])).toBeNull();
    expect(calculateCampaignAverageQuizScore([80, 90])).toBe(85);
    expect(calculateCampaignAverageQuizScore([85])).toBe(85);
    expect(calculateCampaignAverageQuizScore([70, 80, 95])).toBe(82);
  });
});
