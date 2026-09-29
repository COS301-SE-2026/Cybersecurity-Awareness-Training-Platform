import type { ContentCategoryDto } from '@insightful-phish/shared';
import { findSubmittedQuizEvidence } from '../repositories/adaptive-quiz-evidence.repository.js';
import type { QuizCategoryEvidence } from './adaptive-evidence.types.js';
import { quizCategoryPercentage } from './adaptive-scoring-policy.js';

type ScoredQuestionAnswer = {
  awardedPoints: number | null;
  question: {
    points: number;
    categories: readonly ContentCategoryDto[];
  };
};

export type QuizCategoryPerformance = {
  category: ContentCategoryDto;
  awardedPoints: number;
  possiblePoints: number;
  percentage: number;
};

function matchesCampaignContent(
  quizId: string,
  campaignItemId: string,
  campaignItemQuizId: string | null,
  adaptiveResolutions: readonly { campaignItemId: string; selectedContentId: string }[],
): boolean {
  return (
    campaignItemQuizId === quizId ||
    adaptiveResolutions.some(
      (resolution) =>
        resolution.campaignItemId === campaignItemId && resolution.selectedContentId === quizId,
    )
  );
}

export function calculateQuizCategoryPerformance(
  answers: readonly ScoredQuestionAnswer[],
): QuizCategoryPerformance[] {
  const totals = new Map<ContentCategoryDto, { awardedPoints: number; possiblePoints: number }>();

  for (const answer of answers) {
    const { awardedPoints, question } = answer;
    if (
      awardedPoints === null ||
      !Number.isFinite(awardedPoints) ||
      awardedPoints < 0 ||
      !Number.isFinite(question.points) ||
      question.points <= 0
    ) {
      continue;
    }

    for (const category of new Set(question.categories)) {
      const total = totals.get(category) ?? { awardedPoints: 0, possiblePoints: 0 };
      total.awardedPoints += awardedPoints;
      total.possiblePoints += question.points;
      totals.set(category, total);
    }
  }

  return [...totals].flatMap(([category, { awardedPoints, possiblePoints }]) => {
    const percentage = quizCategoryPercentage(awardedPoints, possiblePoints);
    return percentage === null ? [] : [{ category, awardedPoints, possiblePoints, percentage }];
  });
}

export async function collectQuizCategoryEvidence(
  traineeProfileId: string,
): Promise<QuizCategoryEvidence[]> {
  const results = await findSubmittedQuizEvidence(traineeProfileId);
  return results.flatMap(({ id, scorePercentage, attempt }) => {
    const { campaignAssignmentId, campaignItemId, campaignAssignment, campaignItem, submittedAt } =
      attempt;
    if (
      !campaignAssignmentId ||
      !campaignItemId ||
      !campaignAssignment ||
      !campaignItem ||
      !submittedAt ||
      campaignAssignment.traineeProfileId !== traineeProfileId ||
      campaignAssignment.campaignId !== campaignItem.campaignId ||
      !matchesCampaignContent(
        attempt.quizId,
        campaignItemId,
        campaignItem.quizId,
        campaignAssignment.adaptiveResolutions,
      )
    ) {
      return [];
    }

    return calculateQuizCategoryPerformance(attempt.answers).map((performance) => ({
      source: 'QUIZ_CATEGORY' as const,
      campaignId: campaignAssignment.campaignId,
      campaignAssignmentId,
      campaignItemId,
      quizResultId: id,
      attemptId: attempt.id,
      quizId: attempt.quizId,
      sourceDifficulty: attempt.quiz.difficultyLevel,
      occurredAt: submittedAt,
      wholeQuizScorePercentage: scorePercentage,
      ...performance,
    }));
  });
}
