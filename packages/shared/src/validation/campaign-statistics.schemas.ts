import { z } from 'zod';
import {
  createNumericPreprocessor,
  idParamSchema,
  requiredTrimmedStringSchema,
} from './common.schemas.js';
import { paginationMetaSchema } from './campaign-assignment.schemas.js';

const pageQueryPreprocessor = createNumericPreprocessor(1, 'Page', 100000);
const limitQueryPreprocessor = createNumericPreprocessor(20, 'Limit', 100);

export const campaignStatisticsParamsSchema = z
  .object({
    organisationId: idParamSchema,
    campaignId: idParamSchema,
  })
  .strict();

export const campaignStatisticsQuerySchema = z
  .object({
    page: pageQueryPreprocessor,
    limit: limitQueryPreprocessor,
  })
  .strict();

const campaignNameSchema = requiredTrimmedStringSchema({
  requiredMessage: 'Please enter a campaign name.',
  maxLength: 200,
  maxMessage: 'Campaign name must be at most 200 characters.',
});

/**
 * Required-but-nullable description field (must be present as a string or null).
 */
const nullableDescriptionSchema = z
  .string({
    invalid_type_error: 'Description must be a string or null.',
  })
  .trim()
  .max(2000, 'Description must be at most 2000 characters.')
  .nullable();

/**
 * Campaign identity and metadata schema for statistics.
 *
 * Semantic rules:
 * - `itemCount`: Number of consumable component items in the campaign. Training Documents, Quizzes,
 *   and Simulated Inboxes count; structural/group records do not. All consumable items count regardless of isRequired.
 * - `quizCount`: Number of Quiz component items in the campaign.
 */
export const campaignStatisticsCampaignSchema = z
  .object({
    id: idParamSchema,
    name: campaignNameSchema,
    description: nullableDescriptionSchema,
    campaignType: z.enum(['PREMADE_GENERAL', 'ORGANISATION_CUSTOM']),
    status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']),
    startDate: z.string().datetime().nullable(),
    endDate: z.string().datetime().nullable(),
    itemCount: z.number().int().min(0),
    quizCount: z.number().int().min(0),
  })
  .strict();

/**
 * Whole-cohort summary statistics schema across all assigned trainees.
 *
 * Semantic rules:
 * - `assignedTraineeCount`: Total qualifying campaign assignments for this campaign. Disabled organisation
 *   trainees remain included in the cohort and all metrics until explicitly unassigned.
 * - `startedTraineeCount`: Number of assigned trainees with at least one authoritative persisted progress fact:
 *   a TRAINING_VIEWED or TRAINING_COMPLETED event, an IN_PROGRESS or SUBMITTED QuizAttempt, or a SIMULATED_EMAIL_OPENED event.
 *   CampaignAssignment.startedAt is not used.
 * - `completedTraineeCount`: Number of assigned trainees who completed every consumable campaign item.
 *   A Training Document requires TRAINING_COMPLETED; a Quiz requires a SUBMITTED attempt with its completed result;
 *   a Simulated Inbox requires every email in that inbox to have a SIMULATED_EMAIL_OPENED progress fact.
 * - `overallProgressPercentage`: Arithmetic mean of the already-rounded integer progressPercentage values for every assigned
 *   trainee in the complete cohort, rounded again to the nearest whole integer. Returns null when no trainees are assigned.
 * - `averageQuizScorePercentage`: Arithmetic mean of the already-rounded per-trainee averageQuizScorePercentage values for
 *   contributing trainees, rounded again to the nearest whole integer. Raw Quiz results are not averaged directly across the cohort.
 *   Returns null when no trainee has a qualifying submitted score.
 */
export const campaignStatisticsSummarySchema = z
  .object({
    assignedTraineeCount: z.number().int().min(0),
    startedTraineeCount: z.number().int().min(0),
    completedTraineeCount: z.number().int().min(0),
    overallProgressPercentage: z.number().int().min(0).max(100).nullable(),
    averageQuizScorePercentage: z.number().int().min(0).max(100).nullable(),
  })
  .strict();

/**
 * Per-trainee consumable item progress schema.
 *
 * Completion rules:
 * - `progressPercentage`: Completed consumable items divided by total consumable items, rounded to the nearest whole percentage.
 *   Partial Quiz attempts and partially opened Simulated Inboxes make the trainee started but do not partially complete an item.
 *   Returns 0 when totalItemCount is 0.
 */
export const campaignStatisticsTraineeProgressSchema = z
  .object({
    completedItemCount: z.number().int().min(0),
    totalItemCount: z.number().int().min(0),
    progressPercentage: z.number().int().min(0).max(100),
  })
  .strict();

/**
 * Explicit action capability schema for a trainee assignment row.
 *
 * Capability rules:
 * - `canUnassign`: `true` only if requesting admin has `ASSIGN_CAMPAIGNS` permission AND assignment `accessType` is `ASSIGNED`.
 * - For `accessType: 'SELF_SELECTED'`, organisation admins cannot unassign the trainee, so `canUnassign` is `false`.
 */
export const campaignStatisticsTraineeActionsSchema = z
  .object({
    canUnassign: z.boolean(),
  })
  .strict();

/**
 * Paginated trainee row schema for campaign statistics.
 */
export const campaignStatisticsTraineeRowSchema = z
  .object({
    assignmentId: idParamSchema,
    traineeProfileId: idParamSchema,
    displayName: requiredTrimmedStringSchema({
      requiredMessage: 'Please enter a display name.',
      maxLength: 200,
      maxMessage: 'Display name must be at most 200 characters.',
    }),
    email: z.string().trim().email('Invalid email format.'),
    // Organisation membership status derived from
    // OrganisationTraineeProfile.membershipStatus.
    // DISABLED trainees remain in the cohort while their assignment exists.
    traineeStatus: z.enum(['ACTIVE', 'INACTIVE', 'DISABLED']),
    assignmentStatus: z.enum([
      'AVAILABLE',
      'ASSIGNED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
      'EXPIRED',
    ]),
    accessType: z.enum(['ASSIGNED', 'SELF_SELECTED']),
    assignedAt: z.string().datetime(),
    progress: campaignStatisticsTraineeProgressSchema,
    completedQuizCount: z.number().int().min(0),
    totalQuizCount: z.number().int().min(0),
    averageQuizScorePercentage: z.number().int().min(0).max(100).nullable(),
    allowedActions: campaignStatisticsTraineeActionsSchema,
  })
  .strict();

/**
 * Full GET /organisations/:organisationId/campaigns/:campaignId/statistics response schema.
 */
export const getCampaignStatisticsResponseSchema = z
  .object({
    campaign: campaignStatisticsCampaignSchema,
    summary: campaignStatisticsSummarySchema,
    trainees: z.array(campaignStatisticsTraineeRowSchema),
    pagination: paginationMetaSchema,
  })
  .strict();

export const getOrganisationCampaignStatisticsResponseSchema = getCampaignStatisticsResponseSchema;
