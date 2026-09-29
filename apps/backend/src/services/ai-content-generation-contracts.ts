import {
  reusableContentGenerationRequestSchema,
  difficultyLevelSchema,
  type ContentCategoryDto,
  type ReusableContentGenerationRequestDto,
} from '@insightful-phish/shared';

export const generatedContentDifficultyLevels = ['EASY', 'MEDIUM', 'HARD'] as const;
export const generatedContentDifficultySchema = difficultyLevelSchema;
export { reusableContentGenerationRequestSchema };
export type ReusableContentGenerationRequest = ReusableContentGenerationRequestDto;
export type GeneratedContentDifficulty = ReusableContentGenerationRequestDto['requestedDifficulty'];

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
