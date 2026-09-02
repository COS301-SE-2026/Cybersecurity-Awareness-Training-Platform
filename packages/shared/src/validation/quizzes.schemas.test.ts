import { describe, expect, it } from 'vitest';
import {
  currentQuizAttemptSummarySchema,
  getQuizRequestParamsSchema,
  getQuizResultRequestParamsSchema,
  startQuizAttemptRequestSchema,
  submitQuizAttemptRequestParamsSchema,
  submitQuizAttemptRequestSchema,
} from './quizzes.schemas.js';

describe('quiz validation schemas', () => {
  const campaignItemId = '11111111-1111-4111-8111-111111111111';
  const attemptId = '22222222-2222-4222-8222-222222222222';
  const questionId = '33333333-3333-4333-8333-333333333333';
  const optionId = '44444444-4444-4444-8444-444444444444';

  it('accepts UUID quiz route params', () => {
    expect(getQuizRequestParamsSchema.safeParse({ campaignItemId }).success).toBe(true);
    expect(submitQuizAttemptRequestParamsSchema.safeParse({ attemptId }).success).toBe(true);
    expect(getQuizResultRequestParamsSchema.safeParse({ attemptId }).success).toBe(true);
  });

  it('rejects malformed quiz route params', () => {
    expect(getQuizRequestParamsSchema.safeParse({ campaignItemId: 'not-a-uuid' }).success).toBe(
      false,
    );
    expect(
      submitQuizAttemptRequestParamsSchema.safeParse({ attemptId: 'not-a-uuid' }).success,
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
