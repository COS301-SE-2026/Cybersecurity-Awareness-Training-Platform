import { contentCategories, type ContentCategoryDto } from '@insightful-phish/shared';
import { evidenceOccurrenceKey } from './adaptive-evidence.types.js';
import type {
  AdaptiveCategoryState,
  ScorableAdaptiveEvidenceFact,
  SimulatedInboxLinkClickEvidence,
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

function collapseRepeatedClicks(
  facts: readonly ScorableAdaptiveEvidenceFact[],
  asOf: Date,
): ScorableAdaptiveEvidenceFact[] {
  const firstClicks = new Map<string, SimulatedInboxLinkClickEvidence>();
  const otherFacts: ScorableAdaptiveEvidenceFact[] = [];

  for (const fact of facts) {
    if (fact.source !== 'SIMULATED_INBOX_LINK_CLICK') {
      otherFacts.push(fact);
      continue;
    }

    const timestamp = fact.occurredAt.getTime();
    if (!Number.isFinite(timestamp) || timestamp > asOf.getTime()) continue;
    const key = evidenceOccurrenceKey(fact);
    const previous = firstClicks.get(key);
    if (
      !previous ||
      timestamp < previous.occurredAt.getTime() ||
      (timestamp === previous.occurredAt.getTime() && fact.eventId < previous.eventId)
    ) {
      firstClicks.set(key, fact);
    }
  }

  return [...otherFacts, ...firstClicks.values()];
}

export function calculateAdaptiveCategoryStates(
  facts: readonly ScorableAdaptiveEvidenceFact[],
  asOf: Date,
): AdaptiveCategoryState[] {
  if (!Number.isFinite(asOf.getTime())) throw new RangeError('Calculation timestamp must be valid');
  const calculatedAt = asOf.toISOString();
  const observations = collapseRepeatedClicks(facts, asOf);

  return contentCategories.map((category) => {
    let evidenceCount = 0;
    let weightedTotal = 0;
    let totalWeight = 0;
    const occurrences = new Set<string>();

    for (const fact of observations) {
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
