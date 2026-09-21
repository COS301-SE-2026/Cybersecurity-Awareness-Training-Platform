import { z } from 'zod';
import { contentCategorySchema, difficultyLevelSchema } from '../categories.js';

const requiredText = (field: string, maximum: number) =>
  z
    .string()
    .trim()
    .min(1, `${field} is required`)
    .max(maximum, `${field} must be ${maximum} characters or fewer`);

export const reusableContentGenerationRequestSchema = z
  .object({
    requestedDifficulty: difficultyLevelSchema,
    requestedCategories: z
      .array(contentCategorySchema)
      .min(1, 'At least one content category is required')
      .max(5, 'At most five content categories may be requested'),
    topic: requiredText('Topic', 200),
    learningObjective: requiredText('Learning objective', 1_000),
    administratorGuidance: z.string().trim().max(2_000).optional(),
  })
  .strict()
  .superRefine((request, context) => {
    if (new Set(request.requestedCategories).size !== request.requestedCategories.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['requestedCategories'],
        message: 'Requested content categories must be unique',
      });
    }
  });

export type ReusableContentGenerationRequestDto = z.infer<
  typeof reusableContentGenerationRequestSchema
>;

const uniqueCategoriesSchema = z
  .array(contentCategorySchema)
  .min(1)
  .max(5)
  .refine((categories) => new Set(categories).size === categories.length, {
    message: 'Content categories must be unique',
  });

export const campaignProposalRequestSchema = z
  .object({
    objective: requiredText('Objective', 1_000),
    categoryFocus: uniqueCategoriesSchema,
    administratorGuidance: z.string().trim().max(2_000).optional(),
  })
  .strict();

export const followUpCampaignProposalRequestSchema = z
  .object({
    traineeProfileId: z.string().uuid(),
    objective: requiredText('Objective', 1_000),
    administratorGuidance: z.string().trim().max(500).optional(),
  })
  .strict();

const campaignProposalSuggestionSchema = z
  .object({
    contentType: z.enum(['TRAINING_DOCUMENT', 'QUIZ', 'ORGANISATION_EMAIL']),
    title: requiredText('Title', 200),
    learningObjective: requiredText('Learning objective', 1_000),
    categories: uniqueCategoriesSchema,
    difficultyLevel: difficultyLevelSchema,
    isRequired: z.boolean(),
  })
  .strict();

const generatedQuizOptionSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    label: requiredText('Option label', 20),
    text: requiredText('Option text', 1_000),
    position: z.number().int().positive(),
    isCorrect: z.boolean(),
    feedbackText: z.string().trim().min(1).max(1_000).nullable(),
  })
  .strict();

const generatedQuizQuestionSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    prompt: requiredText('Question prompt', 2_000),
    questionType: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE']),
    position: z.number().int().positive(),
    points: z.number().int().positive().max(100),
    shuffleOptions: z.boolean(),
    minSelections: z.number().int().positive().nullable(),
    maxSelections: z.number().int().positive().nullable(),
    categories: uniqueCategoriesSchema,
    answerOptions: z.array(generatedQuizOptionSchema).min(2).max(8),
  })
  .strict();

const generatedTrainingDocumentDraftSchema = z
  .object({
    title: requiredText('Title', 200),
    contentSummary: z.string().trim().min(1).max(1_000).nullable(),
    rawMarkdown: z.string().trim().min(500).max(50_000),
    estimatedReadTimeMinutes: z.number().int().min(1).max(120).nullable(),
    categories: uniqueCategoriesSchema,
    difficultyLevel: difficultyLevelSchema,
  })
  .strict();

const generatedQuizDraftSchema = z
  .object({
    title: requiredText('Title', 200),
    description: z.string().trim().min(1).max(2_000).nullable(),
    passThresholdPercentage: z.number().min(0).max(100),
    difficultyLevel: difficultyLevelSchema,
    questions: z.array(generatedQuizQuestionSchema).min(1).max(20),
  })
  .strict();

const generatedOrganisationEmailDraftSchema = z
  .object({
    senderLabel: requiredText('Sender label', 200),
    senderAddress: z.string().trim().email().max(254),
    subject: requiredText('Subject', 300),
    preview: z.string().trim().min(1).max(500).nullable(),
    bodyHtml: z.string().trim().min(1).max(30_000),
    link: z
      .object({ anchorText: requiredText('Anchor text', 200) })
      .strict()
      .nullable(),
    expectedClassification: z.enum(['SAFE', 'SUSPICIOUS', 'PHISHING']),
    redFlags: z.array(
      z
        .object({
          redFlagType: z.enum([
            'SENDER',
            'LINK',
            'LANGUAGE',
            'ATTACHMENT',
            'REQUEST',
            'DOMAIN',
            'OTHER',
          ]),
          label: requiredText('Red flag label', 200),
          description: z.string().trim().min(1).max(1_000).nullable(),
          severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
        })
        .strict(),
    ),
    categories: uniqueCategoriesSchema,
    difficultyLevel: difficultyLevelSchema,
  })
  .strict();

const proposalItemBase = {
  proposalKey: z.string().trim().min(1),
};

export const editableCampaignProposalItemSchema = z.union([
  z
    .object({
      ...proposalItemBase,
      suggestion: campaignProposalSuggestionSchema.extend({
        contentType: z.literal('TRAINING_DOCUMENT'),
      }),
      draft: generatedTrainingDocumentDraftSchema,
    })
    .strict(),
  z
    .object({
      ...proposalItemBase,
      suggestion: campaignProposalSuggestionSchema.extend({ contentType: z.literal('QUIZ') }),
      draft: generatedQuizDraftSchema,
    })
    .strict(),
  z
    .object({
      ...proposalItemBase,
      suggestion: campaignProposalSuggestionSchema.extend({
        contentType: z.literal('ORGANISATION_EMAIL'),
      }),
      draft: generatedOrganisationEmailDraftSchema,
    })
    .strict(),
]);

export const editableCampaignProposalSchema = z
  .object({
    name: requiredText('Name', 200),
    description: requiredText('Description', 2_000),
    rationale: requiredText('Rationale', 1_000),
    items: z.array(editableCampaignProposalItemSchema).min(2).max(4),
  })
  .strict();

const campaignProposalFindingSchema = z
  .object({
    code: z.enum([
      'VAGUE_FILLER',
      'REPEATED_CONTENT',
      'UNSUPPORTED_ORGANISATION_CLAIM',
      'WEAK_QUIZ_DISTRACTOR',
      'INCONSISTENT_DIFFICULTY_VARIANT',
    ]),
    message: z.string(),
    itemKey: z.string().nullable(),
    field: z.string().nullable(),
  })
  .strict();

export const campaignProposalResponseSchema = z
  .object({
    content: editableCampaignProposalSchema,
    findings: z.array(campaignProposalFindingSchema),
    semanticReviewStatus: z.enum(['COMPLETE', 'UNAVAILABLE']),
  })
  .strict();

export const adaptiveCategoryStateSchema = z
  .object({
    category: contentCategorySchema,
    evidenceStatus: z.enum(['SUFFICIENT', 'INSUFFICIENT']),
    evidenceCount: z.number().int().nonnegative(),
    recommendedDifficulty: difficultyLevelSchema,
    resolutionBasis: z.enum(['EVIDENCE', 'FALLBACK']),
    calculatedAt: z.string().datetime(),
  })
  .strict();

export const followUpCampaignProposalResponseSchema = z
  .object({
    categoryStates: z.array(adaptiveCategoryStateSchema).min(1).max(5),
    proposal: editableCampaignProposalSchema,
    findings: z.array(campaignProposalFindingSchema),
    semanticReviewStatus: z.enum(['COMPLETE', 'UNAVAILABLE']),
  })
  .strict();

export type CampaignProposalRequestDto = z.infer<typeof campaignProposalRequestSchema>;
export type FollowUpCampaignProposalRequestDto = z.infer<
  typeof followUpCampaignProposalRequestSchema
>;
export type CampaignProposalResponseDto = z.infer<typeof campaignProposalResponseSchema>;
export type EditableCampaignProposalItemDto = z.infer<typeof editableCampaignProposalItemSchema>;
export type FollowUpCampaignProposalResponseDto = z.infer<
  typeof followUpCampaignProposalResponseSchema
>;
