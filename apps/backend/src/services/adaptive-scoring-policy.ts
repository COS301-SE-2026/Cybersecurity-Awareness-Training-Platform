import type { DifficultyLevelDto, EmailClassificationDto } from '@insightful-phish/shared';
import type { AdaptiveEvidenceFact } from './adaptive-evidence.types.js';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

export const ADAPTIVE_SCORING_POLICY = {
  sourceWeights: {
    QUIZ_CATEGORY: 2,
    CLASSIFICATION: 1.5,
    SIMULATED_INBOX_LINK_CLICK: 2,
    REAL_EMAIL_LINK_CLICK: 2.5,
  },
  difficultyAdjustments: { EASY: -10, MEDIUM: 0, HARD: 10 },
  recencyBands: [
    { maxAgeDays: 30, multiplier: 1 },
    { maxAgeDays: 90, multiplier: 0.75 },
    { maxAgeDays: 180, multiplier: 0.5 },
    { maxAgeDays: Infinity, multiplier: 0.25 },
  ],
  minimumObservations: 4,
  minimumDistinctOccurrences: 2,
  mediumThreshold: 60,
  hardThreshold: 80,
  fallbackDifficulty: 'MEDIUM',
} as const;

export function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError('Percentage must be finite');
  return Math.max(0, Math.min(100, value));
}

export function quizCategoryPercentage(
  awardedPoints: number,
  possiblePoints: number,
): number | null {
  if (!Number.isFinite(awardedPoints) || !Number.isFinite(possiblePoints) || possiblePoints <= 0) {
    return null;
  }
  return clampPercentage((awardedPoints / possiblePoints) * 100);
}

export function classificationEvidenceValue(isCorrect: boolean): number {
  return isCorrect ? 100 : 0;
}

export function linkClickEvidenceValue(expected: EmailClassificationDto): number {
  return expected === 'SAFE' ? 100 : 0;
}

export function adjustForSourceDifficulty(value: number, difficulty: DifficultyLevelDto): number {
  return clampPercentage(value + ADAPTIVE_SCORING_POLICY.difficultyAdjustments[difficulty]);
}

export function recencyMultiplier(occurredAt: Date, asOf: Date): number {
  const ageMilliseconds = asOf.getTime() - occurredAt.getTime();
  if (!Number.isFinite(ageMilliseconds) || ageMilliseconds < 0) {
    throw new RangeError('Evidence timestamp must be valid and not in the future');
  }
  const ageDays = Math.floor(ageMilliseconds / MILLISECONDS_PER_DAY);
  return (
    ADAPTIVE_SCORING_POLICY.recencyBands.find((band) => ageDays <= band.maxAgeDays)?.multiplier ??
    0.25
  );
}

export function evidenceSourceWeight(source: AdaptiveEvidenceFact['source']): number {
  return ADAPTIVE_SCORING_POLICY.sourceWeights[source];
}
