import { contentCategorySchema, type ContentCategoryDto } from '@insightful-phish/shared';
import { z } from 'zod';

/**
 * Temporary backend-only compatibility fixture for AI generation.
 * Replace this with #562's canonical shared difficulty schema when it lands.
 */
export const generatedContentDifficultyLevels = ['EASY', 'MEDIUM', 'HARD'] as const;

export const generatedContentDifficultySchema = z.enum(generatedContentDifficultyLevels);

export type GeneratedContentDifficulty = z.infer<typeof generatedContentDifficultySchema>;

const trimmedRequiredText = (fieldName: string, maximumLength: number) =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} is required`)
    .max(maximumLength, `${fieldName} must be ${maximumLength} characters or fewer`);

export const reusableContentGenerationRequestSchema = z
  .object({
    requestedDifficulty: generatedContentDifficultySchema,
    requestedCategories: z
      .array(contentCategorySchema)
      .min(1, 'At least one content category is required')
      .max(5, 'At most five content categories may be requested'),
    topic: trimmedRequiredText('Topic', 200),
    learningObjective: trimmedRequiredText('Learning objective', 1_000),
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

export type ReusableContentGenerationRequest = z.infer<
  typeof reusableContentGenerationRequestSchema
>;

export type ReusableContentGenerationContext = {
  requestedDifficulty: GeneratedContentDifficulty;
  requestedCategories: ContentCategoryDto[];
  topic: string;
  learningObjective: string;
  administratorGuidance?: string;
};

export type ReusableContentGenerationValidationIssue = {
  path: Array<string | number>;
  message: string;
};

export class ReusableContentGenerationInputError extends Error {
  constructor(readonly issues: ReusableContentGenerationValidationIssue[]) {
    super('Reusable content generation request is invalid');
    this.name = 'ReusableContentGenerationInputError';
  }
}

export function parseReusableContentGenerationRequest(
  input: unknown,
): ReusableContentGenerationContext {
  const result = reusableContentGenerationRequestSchema.safeParse(input);

  if (!result.success) {
    throw new ReusableContentGenerationInputError(
      result.error.issues.map((issue) => ({
        path: [...issue.path],
        message: issue.message,
      })),
    );
  }

  return {
    ...result.data,
    ...(result.data.administratorGuidance
      ? { administratorGuidance: result.data.administratorGuidance }
      : {}),
  };
}
