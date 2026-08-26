import { z } from 'zod';
import {
  createNumericPreprocessor,
  idParamSchema,
  optionalTrimmedStringSchema,
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

const descriptionSchema = optionalTrimmedStringSchema(
  2000,
  'Description must be at most 2000 characters.',
);

export const campaignStatisticsCampaignSchema = z
  .object({
    id: idParamSchema,
    name: campaignNameSchema,
    description: descriptionSchema.nullable(),
    campaignType: z.enum(['PREMADE_GENERAL', 'ORGANISATION_CUSTOM']),
    status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']),
    startDate: z.string().datetime().nullable(),
    endDate: z.string().datetime().nullable(),
    itemCount: z.number().int().min(0),
    quizCount: z.number().int().min(0),
  })
  .strict();

export const campaignStatisticsSummarySchema = z
  .object({
    assignedTraineeCount: z.number().int().min(0),
    startedTraineeCount: z.number().int().min(0),
    completedTraineeCount: z.number().int().min(0),
    overallProgressPercentage: z.number().int().min(0).max(100).nullable(),
    averageQuizScorePercentage: z.number().int().min(0).max(100).nullable(),
  })
  .strict();

export const campaignStatisticsTraineeProgressSchema = z
  .object({
    completedItemCount: z.number().int().min(0),
    totalItemCount: z.number().int().min(0),
    progressPercentage: z.number().int().min(0).max(100),
  })
  .strict();

export const campaignStatisticsTraineeActionsSchema = z
  .object({
    canUnassign: z.boolean(),
  })
  .strict();

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

export const getCampaignStatisticsResponseSchema = z
  .object({
    campaign: campaignStatisticsCampaignSchema,
    summary: campaignStatisticsSummarySchema,
    trainees: z.array(campaignStatisticsTraineeRowSchema),
    pagination: paginationMetaSchema,
  })
  .strict();

export const getOrganisationCampaignStatisticsResponseSchema = getCampaignStatisticsResponseSchema;
