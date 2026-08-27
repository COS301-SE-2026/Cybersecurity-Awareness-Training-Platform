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

/**
 * Standard rounding helper converting fractional percentage values to a whole integer (0..100).
 * Clamps output within [0, 100] and applies `Math.round`.
 */
export function roundPercentageToInteger(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  const clamped = Math.min(100, Math.max(0, value));
  return Math.round(clamped);
}

/**
 * Calculates a trainee's consumable item progress percentage as a nearest whole integer (0..100).
 *
 * Rules:
 * - All consumable component items count toward denominator, including items whose `isRequired` is false.
 * - Structural/group items do not contribute to totalItemCount.
 * - Training documents require authoritative completed events.
 * - Quizzes require authoritative submitted results.
 * - Simulated inboxes require all constituent emails to be opened/read.
 * - Returns 0 if totalItemCount is 0 or negative.
 */
export function calculateItemProgressPercentage(
  completedItemCount: number,
  totalItemCount: number,
): number {
  if (totalItemCount <= 0) {
    return 0;
  }
  return roundPercentageToInteger((completedItemCount / totalItemCount) * 100);
}

/**
 * Calculates whole-cohort overall progress percentage (0..100) or null if no trainees are assigned.
 *
 * Rounding Order:
 * - Calculated as the arithmetic mean of each assigned trainee's already-rounded integer progress percentage
 *   across the complete cohort.
 * - Returns `null` if the cohort is empty (no qualifying assignments).
 */
export function calculateCampaignOverallProgress(
  traineeProgressPercentages: readonly number[],
): number | null {
  if (traineeProgressPercentages.length === 0) {
    return null;
  }
  const sum = traineeProgressPercentages.reduce((acc, current) => acc + current, 0);
  return roundPercentageToInteger(sum / traineeProgressPercentages.length);
}

/**
 * Calculates a single trainee's average quiz score percentage (0..100) or null if no quizzes submitted.
 *
 * Rules:
 * - Unsubmitted attempts are omitted.
 * - Returns `null` if the trainee has not submitted any quizzes.
 */
export function calculateTraineeAverageQuizScore(
  submittedScores: readonly number[],
): number | null {
  if (submittedScores.length === 0) {
    return null;
  }
  const sum = submittedScores.reduce((acc, current) => acc + current, 0);
  return roundPercentageToInteger(sum / submittedScores.length);
}

/**
 * Calculates whole-cohort average quiz score percentage (0..100) or null if no quiz scores exist.
 *
 * Rounding Order:
 * - Calculated by taking the arithmetic mean of each contributing trainee's already-averaged quiz score percentage.
 * - Raw quiz attempt scores are not averaged directly across all attempts.
 * - Returns `null` if no trainees have contributed submitted quiz scores.
 */
export function calculateCampaignAverageQuizScore(
  contributingTraineeAverages: readonly number[],
): number | null {
  if (contributingTraineeAverages.length === 0) {
    return null;
  }
  const sum = contributingTraineeAverages.reduce((acc, current) => acc + current, 0);
  return roundPercentageToInteger(sum / contributingTraineeAverages.length);
}
