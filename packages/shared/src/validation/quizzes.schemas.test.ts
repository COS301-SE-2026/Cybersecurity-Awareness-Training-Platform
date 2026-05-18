import { describe, expect, it } from 'vitest';
import { submitQuizAttemptRequestSchema } from './quizzes.schemas.js';

describe('quiz validation schemas', () => {
  it('accepts a quiz submission with at least one answer', () => {
    const result = submitQuizAttemptRequestSchema.safeParse({
      answers: [
        {
          questionId: '33333333-3333-3333-3333-333333333333',
          selectedOptionIds: ['44444444-4444-4444-4444-444444444444'],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects an empty answers array', () => {
    const result = submitQuizAttemptRequestSchema.safeParse({
      answers: [],
    });

    expect(result.success).toBe(false);
  });

  it('rejects answers missing required identifiers', () => {
    const result = submitQuizAttemptRequestSchema.safeParse({
      answers: [
        {
          questionId: '33333333-3333-3333-3333-333333333333',
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
