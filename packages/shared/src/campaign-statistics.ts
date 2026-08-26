import type { z } from 'zod';
import type {
  campaignStatisticsCampaignSchema,
  campaignStatisticsParamsSchema,
  campaignStatisticsQuerySchema,
  campaignStatisticsSummarySchema,
  campaignStatisticsTraineeActionsSchema,
  campaignStatisticsTraineeProgressSchema,
  campaignStatisticsTraineeRowSchema,
  getCampaignStatisticsResponseSchema,
  getOrganisationCampaignStatisticsResponseSchema,
} from './validation/campaign-statistics.schemas.js';

export type CampaignStatisticsParamsDto = z.infer<typeof campaignStatisticsParamsSchema>;

export type CampaignStatisticsQueryDto = z.infer<typeof campaignStatisticsQuerySchema>;

export type CampaignStatisticsCampaignDto = z.infer<typeof campaignStatisticsCampaignSchema>;

export type CampaignStatisticsIdentityDto = CampaignStatisticsCampaignDto;

export type CampaignStatisticsSummaryDto = z.infer<typeof campaignStatisticsSummarySchema>;

export type CampaignStatisticsTraineeProgressDto = z.infer<
  typeof campaignStatisticsTraineeProgressSchema
>;

export type CampaignStatisticsTraineeActionsDto = z.infer<
  typeof campaignStatisticsTraineeActionsSchema
>;

export type CampaignStatisticsTraineeRowDto = z.infer<typeof campaignStatisticsTraineeRowSchema>;

export type GetCampaignStatisticsResponseDto = z.infer<typeof getCampaignStatisticsResponseSchema>;

export type GetOrganisationCampaignStatisticsResponseDto = z.infer<
  typeof getOrganisationCampaignStatisticsResponseSchema
>;

export function roundPercentageToInteger(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  const clamped = Math.min(100, Math.max(0, value));
  return Math.round(clamped);
}

export function calculateItemProgressPercentage(
  completedItemCount: number,
  totalItemCount: number,
): number {
  if (totalItemCount <= 0) {
    return 0;
  }
  return roundPercentageToInteger((completedItemCount / totalItemCount) * 100);
}

export function calculateCampaignOverallProgress(
  traineeProgressPercentages: readonly number[],
): number | null {
  if (traineeProgressPercentages.length === 0) {
    return null;
  }
  const sum = traineeProgressPercentages.reduce((acc, current) => acc + current, 0);
  return roundPercentageToInteger(sum / traineeProgressPercentages.length);
}

export function calculateTraineeAverageQuizScore(
  submittedScores: readonly number[],
): number | null {
  if (submittedScores.length === 0) {
    return null;
  }
  const sum = submittedScores.reduce((acc, current) => acc + current, 0);
  return roundPercentageToInteger(sum / submittedScores.length);
}

export function calculateCampaignAverageQuizScore(
  contributingTraineeAverages: readonly number[],
): number | null {
  if (contributingTraineeAverages.length === 0) {
    return null;
  }
  const sum = contributingTraineeAverages.reduce((acc, current) => acc + current, 0);
  return roundPercentageToInteger(sum / contributingTraineeAverages.length);
}
