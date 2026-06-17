import { z } from 'zod';
import {
  idParamSchema,
  optionalTrimmedStringSchema,
  requiredTrimmedStringSchema,
} from './common.schemas.js';

const titleSchema = requiredTrimmedStringSchema({
  requiredMessage: 'Please enter a title.',
  maxLength: 200,
  maxMessage: 'Title must be at most 200 characters.',
});

const campaignNameSchema = requiredTrimmedStringSchema({
  requiredMessage: 'Please enter a campaign name.',
  maxLength: 200,
  maxMessage: 'Campaign name must be at most 200 characters.',
});

const descriptionSchema = optionalTrimmedStringSchema(
  2000,
  'Description must be at most 2000 characters.',
);

const summarySchema = optionalTrimmedStringSchema(2000, 'Summary must be at most 2000 characters.');

const campaignTypeSchema = z.enum(['PREMADE_GENERAL', 'ORGANISATION_CUSTOM']);

const campaignStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']);

const difficultyLevelSchema = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ADAPTIVE']);

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Accent colour must be a six digit HEX colour.');

const assignmentStatusSchema = z.enum([
  'AVAILABLE',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
]);

const campaignAccessTypeSchema = z.enum(['ASSIGNED', 'SELF_SELECTED']);

const campaignComponentTypeSchema = z.enum(['SIMULATED_INBOX', 'TRAINING_DOCUMENT', 'QUIZ']);

const campaignGroupTypeSchema = z.enum([
  'SECTION',
  'MODULE',
  'REVISION_SET',
  'ASSESSMENT_SET',
  'SIMULATION_SET',
]);

const completionRuleSchema = z.enum(['COMPLETE_ALL', 'COMPLETE_ANY', 'COMPLETE_REQUIRED_ONLY']);

const campaignItemAvailabilityStatusSchema = z.enum([
  'AVAILABLE',
  'LOCKED',
  'UNAVAILABLE',
  'ARCHIVED',
]);

export const traineeCampaignProgressStatusSchema = z.enum([
  'NOT_STARTED',
  'VIEWED',
  'INTERACTED',
  'CLASSIFIED',
  'IN_PROGRESS',
  'COMPLETED',
  'SUBMITTED',
]);

const activityApiPathSchema = z
  .string()
  .trim()
  .min(1, 'Please enter an activity API path.')
  .max(500, 'Activity API path must be at most 500 characters.')
  .regex(
    /^\/trainee\/campaign-items\/[^/]+\/(simulated-inbox|training-document|quiz)$/,
    'Activity API path must reference a supported trainee campaign item activity.',
  );

export const getTraineeCampaignRequestParamsSchema = z
  .object({
    campaignId: idParamSchema,
  })
  .strict();

export const listTraineeCampaignsRequestSchema = z.preprocess(
  (value) => value ?? {},
  z.object({}).strict(),
);

export const traineeCampaignItemRequestParamsSchema = z
  .object({
    campaignItemId: idParamSchema,
  })
  .strict();

export const traineeCampaignAssignmentSummarySchema = z
  .object({
    assignmentId: idParamSchema,
    assignmentStatus: assignmentStatusSchema,
    accessType: campaignAccessTypeSchema,
    currentCampaignItemId: idParamSchema.nullish(),
    assignedAt: z.string().datetime(),
    dueDate: z.string().datetime().nullish(),
    startedAt: z.string().datetime().nullish(),
    completedAt: z.string().datetime().nullish(),
  })
  .strict();

export const traineeCampaignSummarySchema = z
  .object({
    campaignId: idParamSchema,
    name: campaignNameSchema,
    description: descriptionSchema.nullish(),
    accentColor: hexColorSchema.nullish(),
    campaignType: campaignTypeSchema,
    difficultyLevel: difficultyLevelSchema,
    status: campaignStatusSchema,
    startDate: z.string().datetime().nullish(),
    endDate: z.string().datetime().nullish(),
    assignment: traineeCampaignAssignmentSummarySchema.nullish(),
    accessType: campaignAccessTypeSchema.nullish(),
    progressStatus: traineeCampaignProgressStatusSchema.nullish(),
  })
  .strict();

const campaignTrainingDocumentSummarySchema = z
  .object({
    id: idParamSchema,
    title: titleSchema,
    contentSummary: summarySchema.nullish(),
    estimatedReadTimeMinutes: z.number().int().positive().nullish(),
    difficultyLevel: difficultyLevelSchema,
    status: z.enum(['DRAFT', 'AVAILABLE', 'UNAVAILABLE', 'ARCHIVED']),
  })
  .strict();

const campaignQuizSummarySchema = z
  .object({
    id: idParamSchema,
    title: titleSchema,
    description: descriptionSchema.nullish(),
    passThresholdPercentage: z.number().min(0).max(100),
    difficultyLevel: difficultyLevelSchema,
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
    questionCount: z.number().int().nonnegative().optional(),
  })
  .strict();

const campaignSimulationSummarySchema = z
  .object({
    id: idParamSchema,
    title: titleSchema,
    description: descriptionSchema.nullish(),
    difficultyLevel: difficultyLevelSchema,
  })
  .strict();

const traineeCampaignItemSummaryBaseSchema = z
  .object({
    campaignItemId: idParamSchema,
    campaignId: idParamSchema,
    parentGroupId: idParamSchema.nullish(),
    title: titleSchema,
    description: descriptionSchema.nullish(),
    position: z.number().int().nonnegative(),
    isRequired: z.boolean(),
    availabilityStatus: campaignItemAvailabilityStatusSchema,
    isOpenable: z.boolean(),
    progressStatus: traineeCampaignProgressStatusSchema.nullish(),
  })
  .strict();

export const traineeCampaignComponentItemSummarySchema = traineeCampaignItemSummaryBaseSchema
  .extend({
    itemType: z.literal('COMPONENT'),
    componentType: campaignComponentTypeSchema,
    groupType: z.null().optional(),
    completionRule: z.null().optional(),
    isOpenable: z.boolean(),
    activityApiPath: activityApiPathSchema,
    trainingDocument: campaignTrainingDocumentSummarySchema.nullish(),
    quiz: campaignQuizSummarySchema.nullish(),
    simulation: campaignSimulationSummarySchema.nullish(),
  })
  .strict();

export type TraineeCampaignItemSummarySchema = z.ZodType<unknown>;

export const traineeCampaignItemSummarySchema: TraineeCampaignItemSummarySchema = z.lazy(() =>
  z.union([
    traineeCampaignComponentItemSummarySchema,
    traineeCampaignItemSummaryBaseSchema
      .extend({
        itemType: z.literal('GROUP'),
        componentType: z.null().optional(),
        groupType: campaignGroupTypeSchema,
        completionRule: completionRuleSchema,
        isOpenable: z.literal(false),
        activityApiPath: z.null().optional(),
        children: z.array(
          traineeCampaignItemSummarySchema.refine(
            (item) =>
              typeof item === 'object' &&
              item !== null &&
              'parentGroupId' in item &&
              typeof item.parentGroupId === 'string',
            'Child campaign items must include parentGroupId',
          ),
        ),
      })
      .strict(),
  ]),
);

export const getTraineeCampaignsResponseSchema = z
  .object({
    campaigns: z.array(traineeCampaignSummarySchema),
  })
  .strict();

export const getTraineeCampaignDetailResponseSchema = traineeCampaignSummarySchema
  .extend({
    items: z.array(traineeCampaignItemSummarySchema),
  })
  .strict();
