import { contentCategories, contentCategorySchema } from '@insightful-phish/shared';
import { z } from 'zod';
import {
  generatedContentDifficultySchema,
  parseReusableContentGenerationRequest,
  type ReusableContentGenerationContext,
} from './ai-content-generation-contracts.js';
import { buildReusableContentGenerationInstructions } from './ai-content-generation-instructions.js';
import { createAiGenerationService, type AiGenerationService } from './ai-generation.service.js';

const answerOptionSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    label: z.string().trim().min(1).max(20),
    text: z.string().trim().min(1).max(1_000),
    position: z.number().int().positive(),
    isCorrect: z.boolean(),
    feedbackText: z.string().trim().min(1).max(1_000).nullable(),
  })
  .strict();

const questionSchema = z
  .object({
    id: z.string().trim().min(1).optional(),
    prompt: z.string().trim().min(1).max(2_000),
    questionType: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE']),
    position: z.number().int().positive(),
    points: z.number().int().positive().max(100),
    shuffleOptions: z.boolean(),
    minSelections: z.number().int().positive().nullable(),
    maxSelections: z.number().int().positive().nullable(),
    categories: z.array(contentCategorySchema).min(1).max(contentCategories.length),
    answerOptions: z.array(answerOptionSchema).min(2).max(8),
  })
  .strict()
  .superRefine((question, context) => {
    const optionPositions = question.answerOptions.map((option) => option.position);
    const correctCount = question.answerOptions.filter((option) => option.isCorrect).length;

    if (new Set(question.categories).size !== question.categories.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['categories'],
        message: 'Categories must be unique',
      });
    }
    if (!areSequential(optionPositions)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['answerOptions'],
        message: 'Option positions must be sequential from 1',
      });
    }
    if (question.questionType === 'SINGLE_CHOICE') {
      if (correctCount !== 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['answerOptions'],
          message: 'Single-choice questions require exactly one correct option',
        });
      }
      if (question.minSelections !== null || question.maxSelections !== null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['minSelections'],
          message: 'Single-choice selection bounds must be null',
        });
      }
      return;
    }

    const { minSelections, maxSelections } = question;
    if (correctCount < 2) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['answerOptions'],
        message: 'Multiple-choice questions require at least two correct options',
      });
    }
    if (
      minSelections === null ||
      maxSelections === null ||
      minSelections > maxSelections ||
      maxSelections > question.answerOptions.length ||
      correctCount < minSelections ||
      correctCount > maxSelections
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minSelections'],
        message: 'Multiple-choice selection bounds must include the correct-option count',
      });
    }
  });

/** Temporary backend-only fixture matching Revision 1's QuizDraftInput. */
export const generatedQuizDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(2_000).nullable(),
    passThresholdPercentage: z.number().min(0).max(100),
    difficultyLevel: generatedContentDifficultySchema,
    questions: z.array(questionSchema).min(1).max(20),
  })
  .strict()
  .superRefine((quiz, context) => {
    if (!areSequential(quiz.questions.map((question) => question.position))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['questions'],
        message: 'Question positions must be sequential from 1',
      });
    }
  });

export type GeneratedQuizDraft = z.infer<typeof generatedQuizDraftSchema>;

function areSequential(positions: number[]): boolean {
  return positions.every((position, index) => position === index + 1);
}

export class QuizGenerationError extends Error {
  constructor(readonly failure: 'DIFFICULTY_MISMATCH' | 'CATEGORY_MISMATCH') {
    super('Generated Quiz did not satisfy the requested generation context');
    this.name = 'QuizGenerationError';
  }
}

function assertRequestedConstraints(
  draft: GeneratedQuizDraft,
  context: ReusableContentGenerationContext,
): void {
  if (draft.difficultyLevel !== context.requestedDifficulty) {
    throw new QuizGenerationError('DIFFICULTY_MISMATCH');
  }

  const requested = new Set(context.requestedCategories);
  const generated = new Set(draft.questions.flatMap((question) => question.categories));
  if (
    generated.size !== requested.size ||
    [...generated].some((category) => !requested.has(category))
  ) {
    throw new QuizGenerationError('CATEGORY_MISMATCH');
  }
}

const answerOptionJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    label: { type: 'string', minLength: 1, maxLength: 20 },
    text: { type: 'string', minLength: 1, maxLength: 1_000 },
    position: { type: 'integer', minimum: 1 },
    isCorrect: { type: 'boolean' },
    feedbackText: { type: 'string', minLength: 1, maxLength: 1_000 },
  },
  required: ['label', 'text', 'position', 'isCorrect', 'feedbackText'],
} as const;

const quizJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 200 },
    description: { type: 'string', minLength: 1, maxLength: 2_000 },
    passThresholdPercentage: { type: 'number', minimum: 0, maximum: 100 },
    difficultyLevel: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD'] },
    questions: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          prompt: { type: 'string', minLength: 1, maxLength: 2_000 },
          questionType: { type: 'string', enum: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE'] },
          position: { type: 'integer', minimum: 1 },
          points: { type: 'integer', minimum: 1, maximum: 100 },
          shuffleOptions: { type: 'boolean' },
          minSelections: { type: ['integer', 'null'], minimum: 1 },
          maxSelections: { type: ['integer', 'null'], minimum: 1 },
          categories: {
            type: 'array',
            minItems: 1,
            maxItems: contentCategories.length,
            items: { type: 'string', enum: contentCategories },
          },
          answerOptions: { type: 'array', minItems: 2, maxItems: 8, items: answerOptionJsonSchema },
        },
        required: [
          'prompt',
          'questionType',
          'position',
          'points',
          'shuffleOptions',
          'minSelections',
          'maxSelections',
          'categories',
          'answerOptions',
        ],
      },
    },
  },
  required: ['title', 'description', 'passThresholdPercentage', 'difficultyLevel', 'questions'],
} as const;

export class AiQuizGenerationService {
  constructor(private readonly generationService: AiGenerationService) {}

  async generateDraft(input: unknown): Promise<GeneratedQuizDraft> {
    const context = parseReusableContentGenerationRequest(input);
    const common = buildReusableContentGenerationInstructions(context);
    const draft = await this.generationService.generateStructured(
      {
        systemInstruction: [
          common.systemInstruction,
          'Create a defensive cybersecurity awareness Quiz with educational answer feedback.',
          'Use only SINGLE_CHOICE and MULTIPLE_CHOICE questions, sequential positions starting at 1, and exactly the requested categories and difficulty.',
          'Single-choice questions have exactly one correct answer and null selection bounds. Multiple-choice questions have at least two correct answers and bounds that include that count.',
          'Do not include provider metadata, answer IDs, lifecycle fields, or operational credential-harvesting instructions.',
        ].join('\n'),
        userInstruction: [
          common.userInstruction,
          'Generate one editable Quiz Draft with 5 questions.',
        ].join('\n'),
        output: {
          name: 'quiz_draft',
          description: 'An editable defensive cybersecurity Quiz Draft.',
          schema: quizJsonSchema,
        },
        options: { temperature: 0.25, maxOutputTokens: 2_500 },
      },
      generatedQuizDraftSchema,
    );

    assertRequestedConstraints(draft, context);
    return draft;
  }
}

export function createAiQuizGenerationService(): AiQuizGenerationService {
  return new AiQuizGenerationService(createAiGenerationService());
}
