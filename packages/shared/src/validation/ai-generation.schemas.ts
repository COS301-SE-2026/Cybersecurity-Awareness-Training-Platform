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
