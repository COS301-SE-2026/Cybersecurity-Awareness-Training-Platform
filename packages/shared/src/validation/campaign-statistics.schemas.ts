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
 * - `itemCount`: Count of all consumable campaign items (Training Documents, Quizzes, Simulated Inboxes).
 *   Structural/folder groups do not contribute to itemCount. All consumable items count toward denominator,
 *   including items where `isRequired` is false in Sprint 8 reporting definitions.
 * - `quizCount`: Total number of Quiz component items in the campaign.
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
 * - `startedTraineeCount`: Trainees with at least 1 persisted interaction on any consumable campaign item
 *   (viewing a Training Document, beginning a Quiz attempt, opening at least 1 Simulated Inbox email).
 *   Does not use `CampaignAssignment.startedAt`.
 * - `completedTraineeCount`: Trainees who have completed all consumable campaign items (100% item progress).
 * - `overallProgressPercentage`: Arithmetic mean of all assigned trainees' already-rounded integer progress
 *   percentages (0..100). Returns `null` if assignedTraineeCount is 0 (no cohort).
 * - `averageQuizScorePercentage`: Arithmetic mean of contributing trainees' average quiz scores (0..100).
 *   Calculated by first averaging each contributing trainee's submitted quiz scores and then averaging those
 *   per-trainee averages. Returns `null` if no trainees have submitted any quiz scores.
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
 * - Training Document: Requires authoritative completed progress event.
 * - Quiz: Requires authoritative submitted/completed attempt/result.
 * - Simulated Inbox: Requires every simulated email in the inbox to have an authoritative read/open event.
 * - Partial quiz attempts or partial inbox reads make a trainee started, but do not grant fractional item completion.
 * - `progressPercentage`: Integer 0..100 calculated as `Math.round((completedItemCount / totalItemCount) * 100)`.
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
    traineeStatus: z.enum(['ACTIVE', 'INACTIVE']),
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
