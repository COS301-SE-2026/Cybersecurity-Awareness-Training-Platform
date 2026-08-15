import { z } from 'zod';
import { createNumericPreprocessor } from './common.schemas.js';

const pageQueryPreprocessor = createNumericPreprocessor(1, 'Page', 100000);
const limitQueryPreprocessor = createNumericPreprocessor(20, 'Limit', 100);

export const campaignAssignmentOptionsQuerySchema = z
  .object({
    page: pageQueryPreprocessor,
    limit: limitQueryPreprocessor,
    search: z.string().trim().optional(),
  })
  .strict();

export const organisationAndCampaignIdParamsSchema = z
  .object({
    organisationId: z.string().uuid('Organisation ID must be a valid UUID'),
    campaignId: z.string().uuid('Campaign ID must be a valid UUID'),
  })
  .strict();

export const organisationAndTraineeProfileIdParamsSchema = z
  .object({
    organisationId: z.string().uuid('Organisation ID must be a valid UUID'),
    traineeProfileId: z.string().uuid('Trainee profile ID must be a valid UUID'),
  })
  .strict();

export const organisationAndAssignmentIdParamsSchema = z
  .object({
    organisationId: z.string().uuid('Organisation ID must be a valid UUID'),
    assignmentId: z.string().uuid('Assignment ID must be a valid UUID'),
  })
  .strict();

export const deletedProgressCountsSchema = z
  .object({
    quizAttempts: z.number().int().min(0),
    emailClassificationResponses: z.number().int().min(0),
    interactionEvents: z.number().int().min(0),
  })
  .strict();

export const deleteCampaignAssignmentResponseSchema = z
  .object({
    assignmentId: z.string().uuid(),
    campaignId: z.string().uuid(),
    traineeProfileId: z.string().uuid(),
    unassigned: z.literal(true),
    deletedProgress: deletedProgressCountsSchema,
  })
  .strict();

export const paginationMetaSchema = z
  .object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  })
  .strict();

export const assignableCampaignOptionSchema = z
  .object({
    campaignId: z.string().uuid(),
    name: z.string().min(1),
    description: z.string().nullable(),
    status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']),
    type: z.enum(['PREMADE_GENERAL', 'ORGANISATION_CUSTOM']),
    itemCount: z.number().int().min(0),
    startDate: z.string().datetime().nullable(),
    endDate: z.string().datetime().nullable(),
    assignmentCount: z.number().int().min(0),
  })
  .strict();

export const getAssignableCampaignsResponseSchema = z
  .object({
    items: z.array(assignableCampaignOptionSchema),
    pagination: paginationMetaSchema,
  })
  .strict();

export const campaignAssignmentCandidateOptionSchema = z
  .object({
    traineeProfileId: z.string().uuid(),
    organisationTraineeProfileId: z.string().uuid(),
    userId: z.string().uuid(),
    displayName: z.string().min(1),
    email: z.string().email(),
    active: z.literal(true),
  })
  .strict();

export const getCampaignAssignmentCandidatesResponseSchema = z
  .object({
    items: z.array(campaignAssignmentCandidateOptionSchema),
    pagination: paginationMetaSchema,
  })
  .strict();

export const createCampaignAssignmentsSchema = z
  .object({
    campaignIds: z
      .array(z.string().uuid('Campaign ID must be a valid UUID'))
      .min(1, 'At least one campaign ID is required')
      .max(100, 'Cannot specify more than 100 campaign IDs'),
    traineeProfileIds: z
      .array(z.string().uuid('Trainee profile ID must be a valid UUID'))
      .min(1, 'At least one trainee profile ID is required')
      .max(100, 'Cannot specify more than 100 trainee profile IDs'),
  })
  .strict();

export const campaignAssignmentResultRowSchema = z
  .object({
    assignmentId: z.string().uuid(),
    campaignId: z.string().uuid(),
    traineeProfileId: z.string().uuid(),
  })
  .strict();

export const campaignAssignmentSummarySchema = z
  .object({
    requestedCampaigns: z.number().int().min(0),
    requestedTrainees: z.number().int().min(0),
    requestedPairs: z.number().int().min(0),
    createdCount: z.number().int().min(0),
    alreadyAssignedCount: z.number().int().min(0),
  })
  .strict();

export const createCampaignAssignmentsResponseSchema = z
  .object({
    created: z.array(campaignAssignmentResultRowSchema),
    alreadyAssigned: z.array(campaignAssignmentResultRowSchema),
    summary: campaignAssignmentSummarySchema,
  })
  .strict();

export const campaignAssignmentsReadQuerySchema = z
  .object({
    page: pageQueryPreprocessor,
    limit: limitQueryPreprocessor,
    search: z.string().trim().optional(),
    status: z
      .enum(['AVAILABLE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED'])
      .optional(),
  })
  .strict();

export const campaignAssignmentReadRowSchema = z
  .object({
    assignmentId: z.string().uuid(),
    campaignId: z.string().uuid(),
    campaignName: z.string().min(1),
    campaignStatus: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']),
    campaignType: z.enum(['PREMADE_GENERAL', 'ORGANISATION_CUSTOM']),
    traineeProfileId: z.string().uuid(),
    displayName: z.string().min(1),
    email: z.string().email(),
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
    startedAt: z.string().datetime().nullable(),
    completedAt: z.string().datetime().nullable(),
  })
  .strict();

export const getCampaignAssignmentsResponseSchema = z
  .object({
    items: z.array(campaignAssignmentReadRowSchema),
    pagination: paginationMetaSchema,
  })
  .strict();
