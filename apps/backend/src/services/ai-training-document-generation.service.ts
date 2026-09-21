import { contentCategories, contentCategorySchema } from '@insightful-phish/shared';
import { z } from 'zod';
import {
  buildReusableContentGenerationInstructions,
  type ReusableContentGenerationPromptContext,
  type ReusableContentGenerationInstructions,
} from './ai-content-generation-instructions.js';
import {
  generatedContentDifficultySchema,
  parseReusableContentGenerationRequest,
  type ReusableContentGenerationContext,
} from './ai-content-generation-contracts.js';
import { createAiGenerationService, type AiGenerationService } from './ai-generation.service.js';

/**
 * Temporary backend-only fixture matching Revision 1's TrainingDocumentDraftInput.
 * Replace it with #564's canonical shared authoring schema when that contract lands.
 */
export const generatedTrainingDocumentDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    contentSummary: z.string().trim().min(1).max(1_000).nullable(),
    rawMarkdown: z.string().trim().min(500).max(50_000),
    estimatedReadTimeMinutes: z.number().int().min(1).max(120).nullable(),
    categories: z
      .array(contentCategorySchema)
      .min(1)
      .max(contentCategories.length)
      .refine((categories) => new Set(categories).size === categories.length, {
        message: 'Training Document categories must be unique',
      }),
    difficultyLevel: generatedContentDifficultySchema,
  })
  .strict();

export type GeneratedTrainingDocumentDraft = z.infer<typeof generatedTrainingDocumentDraftSchema>;

export type TrainingDocumentGenerationFailure = 'DIFFICULTY_MISMATCH' | 'CATEGORY_MISMATCH';

export class TrainingDocumentGenerationError extends Error {
  constructor(readonly failure: TrainingDocumentGenerationFailure) {
    super('Generated Training Document did not satisfy the requested generation context');
    this.name = 'TrainingDocumentGenerationError';
  }
}

function buildTrainingDocumentInstructions(
  context: ReusableContentGenerationContext,
  common = buildReusableContentGenerationInstructions(context),
): ReusableContentGenerationInstructions {
  return {
    systemInstruction: [
      common.systemInstruction,
      'Create a meaningful Training Document for defensive cybersecurity awareness education.',
      'Write the complete lesson in rawMarkdown using clear headings, short sections, and practical defensive guidance.',
      'Keep contentSummary concise and set a reasonable whole-number reading-time estimate.',
      'Use exactly the requested categories and requested difficulty.',
      'Do not include provider metadata, generation commentary, approval status, or lifecycle fields.',
    ].join('\n'),
    userInstruction: [
      common.userInstruction,
      'Generate one editable Training Document Draft from this context.',
      'Return title, contentSummary, rawMarkdown, estimatedReadTimeMinutes, categories, and difficultyLevel only.',
    ].join('\n'),
  };
}

function hasSameCategories(
  actual: GeneratedTrainingDocumentDraft['categories'],
  requested: ReusableContentGenerationContext['requestedCategories'],
): boolean {
  if (actual.length !== requested.length) {
    return false;
  }

  const requestedCategories = new Set(requested);
  return actual.every((category) => requestedCategories.has(category));
}

function assertRequestedConstraints(
  draft: GeneratedTrainingDocumentDraft,
  context: ReusableContentGenerationContext,
): void {
  if (draft.difficultyLevel !== context.requestedDifficulty) {
    throw new TrainingDocumentGenerationError('DIFFICULTY_MISMATCH');
  }

  if (!hasSameCategories(draft.categories, context.requestedCategories)) {
    throw new TrainingDocumentGenerationError('CATEGORY_MISMATCH');
  }
}

const trainingDocumentJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 200 },
    contentSummary: {
      type: 'string',
      minLength: 1,
      maxLength: 1_000,
    },
    rawMarkdown: { type: 'string', minLength: 500, maxLength: 50_000 },
    estimatedReadTimeMinutes: {
      type: 'integer',
      minimum: 1,
      maximum: 120,
    },
    categories: {
      type: 'array',
      minItems: 1,
      maxItems: contentCategories.length,
      items: { type: 'string', enum: contentCategories },
    },
    difficultyLevel: {
      type: 'string',
      enum: ['EASY', 'MEDIUM', 'HARD'],
    },
  },
  required: [
    'title',
    'contentSummary',
    'rawMarkdown',
    'estimatedReadTimeMinutes',
    'categories',
    'difficultyLevel',
  ],
} as const;

export class AiTrainingDocumentGenerationService {
  constructor(private readonly generationService: AiGenerationService) {}

  async generateDraft(
    input: unknown,
    promptContext?: ReusableContentGenerationPromptContext,
  ): Promise<GeneratedTrainingDocumentDraft> {
    const context = parseReusableContentGenerationRequest(input);
    const common = buildReusableContentGenerationInstructions(context, promptContext);
    const instructions = buildTrainingDocumentInstructions(context, common);
    const draft = await this.generationService.generateStructured(
      {
        ...instructions,
        output: {
          name: 'training_document_draft',
          description: 'An editable defensive cybersecurity Training Document Draft.',
          schema: trainingDocumentJsonSchema,
        },
        options: {
          temperature: 0.3,
          maxOutputTokens: 1_500,
        },
      },
      generatedTrainingDocumentDraftSchema,
    );

    assertRequestedConstraints(draft, context);
    return draft;
  }
}

export function createAiTrainingDocumentGenerationService(): AiTrainingDocumentGenerationService {
  return new AiTrainingDocumentGenerationService(createAiGenerationService());
}
