import { describe, expect, it } from 'vitest';
import { calculatedEffectiveQuizScore } from '../../src/services/quiz-score-policy.js';

describe('calculateEffectiveQuizScore', () => {
  const scores = [
    { id: 'a', submittedAt: new Date('2026-09-01T10:00:00Z'), scorePercentage: 40 },
    { id: 'b', submittedAt: new Date('2026-09-02T10:00:00Z'), scorePercentage: 80 },
    { id: 'c', submittedAt: new Date('2026-09-02T10:00:00Z'), scorePercentage: 60 },
  ];

  it('returns null without scored submissions', () => {
    expect(calculatedEffectiveQuizScore('BEST', [])).toBeNull();
  });

  it('uses the highest score for BEST', () => {
    expect(calculatedEffectiveQuizScore('BEST', scores)).toBe(80);
  });

  it('uses submitted time then attempt ID for LATEST', () => {
    expect(calculatedEffectiveQuizScore('LATEST', scores)).toBe(60);
    expect(
      calculatedEffectiveQuizScore('LATEST', [
        { id: 'z', submittedAt: null, scorePercentage: 100 },
        scores[0],
      ]),
    ).toBe(40);
  });

  it('rounds the mean for AVERAGE', () => {
    expect(
      calculatedEffectiveQuizScore('AVERAGE', [
        { id: 'a', submittedAt: null, scorePercentage: 40 },
        { id: 'b', submittedAt: null, scorePercentage: 81 },
      ]),
    ).toBe(61);
  });
});
