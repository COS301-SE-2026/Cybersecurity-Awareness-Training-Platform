import type { QuizScorePolicyDto } from '@insightful-phish/shared';
import { roundPercentageToInteger } from '@insightful-phish/shared';

export type SubmittedQuizScore = {
  id: string;
  submittedAt: Date | null;
  scorePercentage: number;
};

export function calculatedEffectiveQuizScore(
  policy: QuizScorePolicyDto,
  scores: readonly SubmittedQuizScore[],
): number | null {
  if (scores.length === 0) return null;

  if (policy === 'BEST') {
    return Math.max(...scores.map((score) => score.scorePercentage));
  }

  if (policy === 'AVERAGE') {
    const total = scores.reduce((sum, score) => sum + score.scorePercentage, 0);
    return roundPercentageToInteger(total / scores.length);
  }

  const latest = scores.reduce((current, candidate) => {
    const currentTime = current.submittedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    const candidateTime = candidate.submittedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    return candidateTime > currentTime ||
      (candidateTime === currentTime && candidate.id > current.id)
      ? candidate
      : current;
  });

  return latest.scorePercentage;
}
