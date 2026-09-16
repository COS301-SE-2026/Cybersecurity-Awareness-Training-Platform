import {
  contentCategories,
  contentCategorySchema,
  difficultyLevelSchema,
  type ContentCategoryDto,
  type DifficultyLevelDto,
} from '@insightful-phish/shared';
import { z } from 'zod';
import {
  createAiContentQualityService,
  type AiContentQualityReview,
  type AiContentQualityService,
} from './ai-content-quality.service.js';
import {
  createAiOrganisationEmailGenerationService,
  type AiOrganisationEmailGenerationService,
  type GeneratedOrganisationEmailDraft,
} from './ai-organisation-email-generation.service.js';
import { getApprovedOrganisationContextForAi } from './ai-organisation-context.service.js';
import {
  createAiQuizGenerationService,
  type AiQuizGenerationService,
  type GeneratedQuizDraft,
} from './ai-quiz-generation.service.js';
import {
  createAiTrainingDocumentGenerationService,
  type AiTrainingDocumentGenerationService,
  type GeneratedTrainingDocumentDraft,
} from './ai-training-document-generation.service.js';

const variantContentTypeSchema = z.enum(['TRAINING_DOCUMENT', 'QUIZ', 'ORGANISATION_EMAIL']);

const sourceConceptSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    summary: z.string().trim().min(1).max(1_000).nullable(),
  })
  .strict();

const contentVariantGenerationRequestSchema = z
  .object({
    actorUserId: z.string().uuid(),
    organisationId: z.string().uuid(),
    contentType: variantContentTypeSchema,
    targetDifficulty: difficultyLevelSchema,
    requestedCategories: z
      .array(contentCategorySchema)
      .min(1)
      .max(contentCategories.length)
      .refine((categories) => new Set(categories).size === categories.length, {
        message: 'Requested content categories must be unique',
      }),
    topic: z.string().trim().min(1).max(200),
    learningObjective: z.string().trim().min(1).max(1_000),
    sourceConcept: sourceConceptSchema,
    administratorGuidance: z.string().trim().min(1).max(500).optional(),
  })
  .strict();

type ContentVariantGenerationRequest = z.infer<typeof contentVariantGenerationRequestSchema>;

export type ContentVariantGenerationResult =
  | { contentType: 'TRAINING_DOCUMENT'; draft: GeneratedTrainingDocumentDraft }
  | { contentType: 'QUIZ'; draft: GeneratedQuizDraft }
  | { contentType: 'ORGANISATION_EMAIL'; draft: GeneratedOrganisationEmailDraft };

export type ReviewedContentVariantGenerationResult = ContentVariantGenerationResult &
  Pick<AiContentQualityReview<ContentVariantGenerationResult>, 'findings' | 'semanticReviewStatus'>;

export class ContentVariantGenerationInputError extends Error {
  constructor(readonly issues: Array<{ path: Array<string | number>; message: string }>) {
    super('Content variant generation request is invalid');
    this.name = 'ContentVariantGenerationInputError';
  }
}

function parseRequest(input: unknown): ContentVariantGenerationRequest {
  const parsed = contentVariantGenerationRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new ContentVariantGenerationInputError(
      parsed.error.issues.map((issue) => ({
        path: [...issue.path],
        message: issue.message,
      })),
    );
  }
  return parsed.data;
}

function buildGenerationRequest(request: ContentVariantGenerationRequest): {
  requestedDifficulty: DifficultyLevelDto;
  requestedCategories: ContentCategoryDto[];
  topic: string;
  learningObjective: string;
  administratorGuidance?: string;
} {
  return {
    requestedDifficulty: request.targetDifficulty,
    requestedCategories: request.requestedCategories,
    topic: request.topic,
    learningObjective: request.learningObjective,
    ...(request.administratorGuidance
      ? { administratorGuidance: request.administratorGuidance }
      : {}),
  };
}

export class AiContentVariantGenerationService {
  constructor(
    private readonly trainingDocumentGenerator: AiTrainingDocumentGenerationService,
    private readonly quizGenerator: AiQuizGenerationService,
    private readonly organisationEmailGenerator: AiOrganisationEmailGenerationService,
    private readonly qualityService: AiContentQualityService,
  ) {}

  async generateMissingVariant(input: unknown): Promise<ReviewedContentVariantGenerationResult> {
    const request = parseRequest(input);
    const organisationContext = await getApprovedOrganisationContextForAi({
      actorUserId: request.actorUserId,
      organisationId: request.organisationId,
    });
    const generationRequest = buildGenerationRequest(request);
    const promptContext = {
      organisationContext,
      sourceConcept: request.sourceConcept,
    };

    let result: ContentVariantGenerationResult;
    switch (request.contentType) {
      case 'TRAINING_DOCUMENT':
        result = {
          contentType: request.contentType,
          draft: await this.trainingDocumentGenerator.generateDraft(
            generationRequest,
            promptContext,
          ),
        };
        break;
      case 'QUIZ':
        result = {
          contentType: request.contentType,
          draft: await this.quizGenerator.generateDraft(generationRequest, promptContext),
        };
        break;
      case 'ORGANISATION_EMAIL':
        result = {
          contentType: request.contentType,
          draft: await this.organisationEmailGenerator.generateDraft(
            generationRequest,
            promptContext,
          ),
        };
        break;
    }
    const review = await this.qualityService.reviewDrafts({
      actorUserId: request.actorUserId,
      organisationId: request.organisationId,
      drafts: [{ key: 'variant', result }],
    });
    return {
      ...result,
      findings: review.findings,
      semanticReviewStatus: review.semanticReviewStatus,
    };
  }
}

export function createAiContentVariantGenerationService(): AiContentVariantGenerationService {
  return new AiContentVariantGenerationService(
    createAiTrainingDocumentGenerationService(),
    createAiQuizGenerationService(),
    createAiOrganisationEmailGenerationService(),
    createAiContentQualityService(),
  );
}
