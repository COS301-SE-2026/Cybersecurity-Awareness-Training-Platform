import { describe, expect, it } from 'vitest';
import { submitQuizAttemptRequestSchema } from './quizzes.schemas.js';

describe('quiz validation schemas', () => {
  it('accepts a quiz submission with at least one answer', () => {
    const result = submitQuizAttemptRequestSchema.safeParse({
      answers: [
        {
          questionId: '11111111-1111-1111-1111-111111111111',
          selectedOptionIds: ['22222222-2222-2222-2222-222222222222'],
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
          questionId: '11111111-1111-1111-1111-111111111111',
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
