import { describe, expect, it } from 'vitest';
import {
  currentQuizAttemptSummarySchema,
  getQuizRequestParamsSchema,
  getQuizResultRequestParamsSchema,
  quizDraftInputSchema,
  startQuizAttemptRequestSchema,
  submitQuizAttemptRequestParamsSchema,
  submitQuizAttemptRequestSchema,
} from './quizzes.schemas.js';

const draftQuestion = {
  prompt: 'Which answers are correct?',
  position: 0,
  points: 1,
  shuffleOptions: false,
  categories: ['PASSWORDS_AND_AUTHENTICATION'],
  questionType: 'SINGLE_CHOICE',
  answerOptions: Array.from({ length: 5 }, (_, position) => ({
    label: String.fromCharCode(65 + position),
    text: `Answer ${position + 1}`,
    position,
    isCorrect: position === 0,
    feedbackText: null,
  })),
};

const quizDraft = {
  title: 'Quiz draft',
  description: null,
  passThresholdPercentage: 70,
  difficultyLevel: 'EASY',
  questions: [draftQuestion],
};

describe('quiz validation schemas', () => {
  const campaignItemId = '11111111-1111-4111-8111-111111111111';
  const attemptId = '22222222-2222-4222-8222-222222222222';
  const questionId = '33333333-3333-4333-8333-333333333333';
  const optionId = '44444444-4444-4444-8444-444444444444';

  it('validates single-choice draft correctness and rejects selection limits', () => {
    expect(quizDraftInputSchema.safeParse(quizDraft).success).toBe(true);

    for (const correctCount of [0, 2]) {
      const question = {
        ...draftQuestion,
        answerOptions: draftQuestion.answerOptions.map((option, index) => ({
          ...option,
          isCorrect: index < correctCount,
        })),
      };
      expect(quizDraftInputSchema.safeParse({ ...quizDraft, questions: [question] }).success).toBe(
        false,
      );
    }

    for (const limits of [
      { minSelections: 1 },
      { maxSelections: 1 },
      { minSelections: undefined },
      { maxSelections: undefined },
    ]) {
      const question = { ...draftQuestion, ...limits };
      expect(quizDraftInputSchema.safeParse({ ...quizDraft, questions: [question] }).success).toBe(
        false,
      );
    }
  });

  it('accepts UUID quiz route params', () => {
    expect(getQuizRequestParamsSchema.safeParse({ campaignItemId }).success).toBe(true);
    expect(submitQuizAttemptRequestParamsSchema.safeParse({ attemptId }).success).toBe(true);
    expect(getQuizResultRequestParamsSchema.safeParse({ attemptId }).success).toBe(true);
  });

  it.each([
    [1, 3, true],
    [0, 3, false],
    [3, 2, false],
    [1, 6, false],
    [3, 4, false],
    [1, 1, false],
    [1.5, 3, false],
    [1, 2.5, false],
  ])('validates multiple-choice bounds %s..%s', (minSelections, maxSelections, expected) => {
    const question = {
      ...draftQuestion,
      questionType: 'MULTIPLE_CHOICE',
      minSelections,
      maxSelections,
      answerOptions: draftQuestion.answerOptions.map((option, index) => ({
        ...option,
        isCorrect: index < 2,
      })),
    };
    expect(quizDraftInputSchema.safeParse({ ...quizDraft, questions: [question] }).success).toBe(
      expected,
    );
  });

  it('rejects malformed quiz route params', () => {
    expect(getQuizRequestParamsSchema.safeParse({ campaignItemId: 'not-a-uuid' }).success).toBe(
      false,
    );
    expect(
      submitQuizAttemptRequestParamsSchema.safeParse({ attemptId: 'not-a-uuid' }).success,
    ).toBe(false);
  });

  it('validates draft identifiers, categories, difficulty and unique positions', () => {
    expect(quizDraftInputSchema.safeParse({ ...quizDraft, questions: [] }).success).toBe(true);

    const questionWithIds = {
      ...draftQuestion,
      id: questionId,
      answerOptions: draftQuestion.answerOptions.map((option, index) =>
        index === 0 ? { ...option, id: optionId } : option,
      ),
    };
    expect(
      quizDraftInputSchema.safeParse({ ...quizDraft, questions: [questionWithIds] }).success,
    ).toBe(true);

    const invalidQuestions = [
      { ...draftQuestion, id: 'invalid' },
      { ...draftQuestion, categories: ['UNKNOWN_CATEGORY'] },
      {
        ...draftQuestion,
        answerOptions: draftQuestion.answerOptions.map((option) => ({ ...option, position: 0 })),
      },
    ];
    for (const question of invalidQuestions) {
      expect(quizDraftInputSchema.safeParse({ ...quizDraft, questions: [question] }).success).toBe(
        false,
      );
    }

    expect(
      quizDraftInputSchema.safeParse({ ...quizDraft, difficultyLevel: 'BEGINNER' }).success,
    ).toBe(false);
    expect(
      quizDraftInputSchema.safeParse({ ...quizDraft, questions: [draftQuestion, draftQuestion] })
        .success,
    ).toBe(false);
  });

  it('accepts empty quiz attempt start payloads', () => {
    expect(startQuizAttemptRequestSchema.safeParse({}).success).toBe(true);
    expect(startQuizAttemptRequestSchema.safeParse(undefined).success).toBe(true);
  });

  it('rejects quiz attempt start payloads with unexpected fields', () => {
    const result = startQuizAttemptRequestSchema.safeParse({
      startedAt: '2026-05-19T10:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });

  it('accepts a quiz submission with at least one answer', () => {
    const result = submitQuizAttemptRequestSchema.safeParse({
      answers: [
        {
          questionId,
          selectedOptionIds: [optionId],
          responseSummary: '  Chose the suspicious sender option  ',
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.data?.answers[0].responseSummary).toBe('Chose the suspicious sender option');
  });

  it('rejects an empty answers array', () => {
    const result = submitQuizAttemptRequestSchema.safeParse({
      answers: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Please select at least one answer.');
    }
  });

  it('rejects answers missing required identifiers', () => {
    const result = submitQuizAttemptRequestSchema.safeParse({
      answers: [
        {
          questionId,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty selected option arrays', () => {
    const result = submitQuizAttemptRequestSchema.safeParse({
      answers: [
        {
          questionId,
          selectedOptionIds: [],
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Please select at least one answer.');
    }
  });

  it('rejects non-UUID question and option IDs', () => {
    const result = submitQuizAttemptRequestSchema.safeParse({
      answers: [
        {
          questionId: 'not-a-uuid',
          selectedOptionIds: ['also-not-a-uuid'],
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain(
        'Invalid identifier format.',
      );
    }
  });

  it('rejects answer free-text fields over maximum lengths', () => {
    const result = submitQuizAttemptRequestSchema.safeParse({
      answers: [
        {
          questionId,
          selectedOptionIds: [optionId],
          responseSummary: 'A'.repeat(1001),
          typedResponse: 'B'.repeat(4001),
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual(
        expect.arrayContaining([
          'Response summary must be at most 1000 characters.',
          'Typed response must be at most 4000 characters.',
        ]),
      );
    }
  });

  it('rejects quiz submission payloads with unexpected top-level fields', () => {
    const result = submitQuizAttemptRequestSchema.safeParse({
      answers: [{ questionId, selectedOptionIds: [optionId] }],
      score: 100,
    });

    expect(result.success).toBe(false);
  });

  it('rejects quiz answer payloads with unexpected fields', () => {
    const result = submitQuizAttemptRequestSchema.safeParse({
      answers: [
        {
          questionId,
          selectedOptionIds: [optionId],
          isCorrect: true,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('validates currentQuizAttemptSummarySchema payloads', () => {
    const validResult = currentQuizAttemptSummarySchema.safeParse({
      attemptId,
      status: 'IN_PROGRESS',
      hasResult: false,
    });
    expect(validResult.success).toBe(true);

    const invalidResult = currentQuizAttemptSummarySchema.safeParse({
      attemptId: 'not-a-uuid',
      status: 'INVALID_STATUS',
      hasResult: 'not-a-boolean',
    });
    expect(invalidResult.success).toBe(false);
  });
});
