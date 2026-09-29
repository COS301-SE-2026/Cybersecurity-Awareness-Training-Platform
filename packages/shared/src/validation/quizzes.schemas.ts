import { z } from 'zod';
import { contentCategorySchema } from '../categories.js';
import { idParamSchema, optionalTrimmedStringSchema } from './common.schemas.js';

export const quizDraftDifficultySchema = z.enum(['EASY', 'MEDIUM', 'HARD']);

export const quizAnswerOptionDraftInputSchema = z
  .object({
    id: idParamSchema.optional(),
    label: z.string().trim().min(1, 'Answer label is required.'),
    text: z.string().trim().min(1, 'Answer text is required.'),
    position: z.number().int().nonnegative(),
    isCorrect: z.boolean(),
    feedbackText: z.string().trim().nullable(),
  })
  .strict();

export const getQuizRequestParamsSchema = z
  .object({
    campaignItemId: idParamSchema,
  })
  .strict();

const quizQuestionDraftBaseShape = {
  id: idParamSchema.optional(),
  prompt: z.string().trim().min(1, 'Question prompt is required.'),
  position: z.number().int().nonnegative(),
  points: z.number().int().positive(),
  shuffleOptions: z.boolean(),
  categories: z.array(contentCategorySchema),
  answerOptions: z
    .array(quizAnswerOptionDraftInputSchema)
    .refine(
      (options) => new Set(options.map((option) => option.position)).size === options.length,
      { message: 'Answer option positions must be unique within each question.' },
    ),
};

export const startQuizAttemptRequestParamsSchema = getQuizRequestParamsSchema;

export const quizQuestionDraftInputSchema = z
  .discriminatedUnion('questionType', [
    z
      .object({
        ...quizQuestionDraftBaseShape,
        questionType: z.literal('SINGLE_CHOICE'),
      })
      .strict(),
    z
      .object({
        ...quizQuestionDraftBaseShape,
        questionType: z.literal('MULTIPLE_CHOICE'),
        minSelections: z.number().int().min(1),
        maxSelections: z.number().int().min(1),
      })
      .strict(),
  ])
  .superRefine((question, context) => {
    const correctAnswerCount = question.answerOptions.filter((option) => option.isCorrect).length;

    if (question.questionType === 'SINGLE_CHOICE') {
      if (correctAnswerCount !== 1) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['answerOptions'],
          message: 'Single-choice questions must have exactly one correct answer.',
        });
      }
      return;
    }

    if (question.minSelections > question.maxSelections) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minSelections'],
        message: 'Minimum selections must not exceed maximum selections.',
      });
    }

    if (question.maxSelections > question.answerOptions.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxSelections'],
        message: 'Maximum selections must not exceed the number of answer options.',
      });
    }

    if (
      correctAnswerCount < question.minSelections ||
      correctAnswerCount > question.maxSelections
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['answerOptions'],
        message: 'The correct-answer count must be within the selection limits.',
      });
    }
  });

export const startQuizAttemptRequestSchema = z.preprocess(
  (value) => value ?? {},
  z.object({}).strict(),
);

export const quizDraftInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Quiz title is required.'),
    description: z.string().trim().nullable(),
    passThresholdPercentage: z.number().int().min(0).max(100),
    difficultyLevel: quizDraftDifficultySchema,
    questions: z
      .array(quizQuestionDraftInputSchema)
      .refine(
        (questions) =>
          new Set(questions.map((question) => question.position)).size === questions.length,
        { message: 'Question positions must be unique within the quiz.' },
      ),
  })
  .strict();

export const submitQuizAttemptRequestParamsSchema = z
  .object({
    attemptId: idParamSchema,
  })
  .strict();

export const getQuizResultRequestParamsSchema = submitQuizAttemptRequestParamsSchema;

export const quizAnswerInputSchema = z
  .object({
    questionId: idParamSchema,
    selectedOptionIds: z.array(idParamSchema).min(1, 'Please select at least one answer.'),
    responseSummary: optionalTrimmedStringSchema(
      1000,
      'Response summary must be at most 1000 characters.',
    ).optional(),
    typedResponse: optionalTrimmedStringSchema(
      4000,
      'Typed response must be at most 4000 characters.',
    ).optional(),
  })
  .strict();

export const submitQuizAttemptRequestSchema = z
  .object({
    answers: z.array(quizAnswerInputSchema).min(1, 'Please select at least one answer.'),
  })
  .strict();

export const currentQuizAttemptSummarySchema = z
  .object({
    attemptId: idParamSchema,
    status: z.enum(['IN_PROGRESS', 'SUBMITTED']),
    hasResult: z.boolean(),
  })
  .strict();
