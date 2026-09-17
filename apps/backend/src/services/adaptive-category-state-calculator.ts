import { contentCategories, type ContentCategoryDto } from '@insightful-phish/shared';
import { evidenceOccurrenceKey } from './adaptive-evidence.types.js';
import type {
  AdaptiveCategoryState,
  ScorableAdaptiveEvidenceFact,
} from './adaptive-evidence.types.js';
import {
  ADAPTIVE_SCORING_POLICY,
  adjustForSourceDifficulty,
  classificationEvidenceValue,
  evidenceSourceWeight,
  linkClickEvidenceValue,
  quizCategoryPercentage,
  recencyMultiplier,
} from './adaptive-scoring-policy.js';

function categoryValue(
  fact: ScorableAdaptiveEvidenceFact,
  category: ContentCategoryDto,
): number | null {
  switch (fact.source) {
    case 'QUIZ_CATEGORY':
      return fact.category === category
        ? quizCategoryPercentage(fact.awardedPoints, fact.possiblePoints)
        : null;
    case 'CLASSIFICATION':
      return fact.categories.includes(category)
        ? classificationEvidenceValue(fact.isCorrect)
        : null;
    case 'SIMULATED_INBOX_LINK_CLICK':
      return fact.categories.includes(category)
        ? linkClickEvidenceValue(fact.expectedClassification)
        : null;
  }
}

export function calculateAdaptiveCategoryStates(
  facts: readonly ScorableAdaptiveEvidenceFact[],
  asOf: Date,
): AdaptiveCategoryState[] {
  if (!Number.isFinite(asOf.getTime())) throw new RangeError('Calculation timestamp must be valid');
  const calculatedAt = asOf.toISOString();

  return contentCategories.map((category) => {
    let evidenceCount = 0;
    let weightedTotal = 0;
    let totalWeight = 0;
    const occurrences = new Set<string>();

    for (const fact of facts) {
      const value = categoryValue(fact, category);
      const occurredAt = fact.occurredAt.getTime();
      if (value === null || !Number.isFinite(occurredAt) || occurredAt > asOf.getTime()) {
        continue;
      }

      const weight = evidenceSourceWeight(fact.source) * recencyMultiplier(fact.occurredAt, asOf);
      evidenceCount += 1;
      occurrences.add(evidenceOccurrenceKey(fact));
      weightedTotal += adjustForSourceDifficulty(value, fact.sourceDifficulty) * weight;
      totalWeight += weight;
    }

    const sufficient =
      evidenceCount >= ADAPTIVE_SCORING_POLICY.minimumObservations &&
      occurrences.size >= ADAPTIVE_SCORING_POLICY.minimumDistinctOccurrences;
    if (!sufficient || totalWeight === 0) {
      return {
        category,
        evidenceStatus: 'INSUFFICIENT',
        evidenceCount,
        recommendedDifficulty: ADAPTIVE_SCORING_POLICY.fallbackDifficulty,
        resolutionBasis: 'FALLBACK',
        calculatedAt,
      };
    }

    const mastery = weightedTotal / totalWeight;
    const recommendedDifficulty =
      mastery < ADAPTIVE_SCORING_POLICY.mediumThreshold
        ? 'EASY'
        : mastery < ADAPTIVE_SCORING_POLICY.hardThreshold
          ? 'MEDIUM'
          : 'HARD';
    return {
      category,
      evidenceStatus: 'SUFFICIENT',
      evidenceCount,
      recommendedDifficulty,
      resolutionBasis: 'EVIDENCE',
      calculatedAt,
    };
  });
}
