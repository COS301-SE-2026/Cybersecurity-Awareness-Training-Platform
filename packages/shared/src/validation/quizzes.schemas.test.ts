import { describe, expect, it } from 'vitest';
import { submitQuizAttemptRequestSchema } from './quizzes.schemas.js';

describe('quiz validation schemas', () => {
  it('accepts a quiz submission with at least one answer', () => {
    const result = submitQuizAttemptRequestSchema.safeParse({
      answers: [
        {
          questionId: 'question-1',
          answerValue: 'option-1',
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
          questionId: 'question-1',
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
