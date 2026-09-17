import { describe, expect, it } from 'vitest';
import type { ContentCategoryDto, DifficultyLevelDto } from '@insightful-phish/shared';
import { calculateAdaptiveCategoryStates } from '../../../src/services/adaptive-category-state-calculator.js';
import type {
  ClassificationEvidence,
  QuizCategoryEvidence,
  SimulatedInboxLinkClickEvidence,
} from '../../../src/services/adaptive-evidence.types.js';

const asOf = new Date('2026-09-17T12:00:00.000Z');
const phishing: ContentCategoryDto = 'PHISHING_AND_SUSPICIOUS_MESSAGES';

function quizFact(
  resultId: string,
  percentage: number,
  options: {
    attemptId?: string;
    difficulty?: DifficultyLevelDto;
    occurredAt?: Date;
    category?: ContentCategoryDto;
  } = {},
): QuizCategoryEvidence {
  return {
    source: 'QUIZ_CATEGORY',
    campaignId: 'campaign',
    campaignAssignmentId: 'assignment',
    campaignItemId: 'item',
    quizResultId: resultId,
    attemptId: options.attemptId ?? resultId,
    quizId: 'quiz',
    category: options.category ?? phishing,
    awardedPoints: percentage,
    possiblePoints: 100,
    percentage,
    wholeQuizScorePercentage: percentage,
    sourceDifficulty: options.difficulty ?? 'MEDIUM',
    occurredAt: options.occurredAt ?? asOf,
  };
}

function state(facts: readonly QuizCategoryEvidence[]) {
  return calculateAdaptiveCategoryStates(facts, asOf).find((item) => item.category === phishing)!;
}

describe('adaptive category state calculation', () => {
  it('uses MEDIUM fallback for no evidence or three observations', () => {
    expect(state([])).toMatchObject({
      evidenceCount: 0,
      evidenceStatus: 'INSUFFICIENT',
      recommendedDifficulty: 'MEDIUM',
      resolutionBasis: 'FALLBACK',
    });
    expect(state([quizFact('1', 100), quizFact('2', 100), quizFact('3', 100)])).toMatchObject({
      evidenceCount: 3,
      evidenceStatus: 'INSUFFICIENT',
    });
  });

  it('requires two occurrences, even with four observations', () => {
    const facts = [1, 2, 3, 4].map(() => quizFact('same', 100, { attemptId: 'same' }));
    expect(state(facts)).toMatchObject({
      evidenceCount: 4,
      evidenceStatus: 'INSUFFICIENT',
    });
  });

  it.each([
    [0, 'EASY'],
    [70, 'MEDIUM'],
    [100, 'HARD'],
  ] as const)('uses four Quiz observations for %s%% -> %s', (percentage, difficulty) => {
    const facts = [1, 2, 3, 4].map((n) => quizFact(String(n), percentage));
    expect(state(facts)).toMatchObject({
      evidenceCount: 4,
      evidenceStatus: 'SUFFICIENT',
      recommendedDifficulty: difficulty,
      resolutionBasis: 'EVIDENCE',
      calculatedAt: asOf.toISOString(),
    });
  });

  it('weights recent evidence more than old evidence without a real-email placeholder', () => {
    const old = new Date('2025-09-17T12:00:00.000Z');
    const recentWins = [
      quizFact('1', 100),
      quizFact('2', 100),
      quizFact('3', 0, { occurredAt: old }),
      quizFact('4', 0, { occurredAt: old }),
    ];
    expect(state(recentWins).recommendedDifficulty).toBe('HARD');
    expect(
      state(
        recentWins.map((fact) => ({
          ...fact,
          occurredAt: fact.occurredAt === old ? asOf : old,
        })),
      ).recommendedDifficulty,
    ).toBe('EASY');
  });

  it('applies HARD success and EASY failure adjustments before averaging', () => {
    const facts = [
      quizFact('1', 75, { difficulty: 'HARD' }),
      quizFact('2', 75, { difficulty: 'HARD' }),
      quizFact('3', 65, { difficulty: 'EASY' }),
      quizFact('4', 65, { difficulty: 'EASY' }),
    ];
    expect(state(facts).recommendedDifficulty).toBe('MEDIUM');
    expect(state(facts.slice(0, 2).concat(facts.slice(0, 2)))).toMatchObject({
      evidenceStatus: 'SUFFICIENT',
      recommendedDifficulty: 'HARD',
    });
    expect(state(facts.slice(2).concat(facts.slice(2)))).toMatchObject({
      evidenceStatus: 'SUFFICIENT',
      recommendedDifficulty: 'EASY',
    });
  });

  it('combines classification and simulated clicks across every tagged category', () => {
    const categories: ContentCategoryDto[] = [phishing, 'PASSWORDS_AND_AUTHENTICATION'];
    const shared = {
      campaignId: 'campaign',
      campaignAssignmentId: 'assignment',
      campaignItemId: 'item',
      sourceDifficulty: 'MEDIUM' as const,
      occurredAt: asOf,
      categories,
      expectedClassification: 'PHISHING' as const,
      simulatedEmailId: 'email',
    };
    const classification: ClassificationEvidence = {
      ...shared,
      source: 'CLASSIFICATION',
      responseId: 'response',
      selectedClassification: 'SAFE',
      isCorrect: false,
      normalizedValue: 0,
    };
    const click: SimulatedInboxLinkClickEvidence = {
      ...shared,
      source: 'SIMULATED_INBOX_LINK_CLICK',
      eventId: 'event',
      normalizedValue: 0,
    };
    const facts = [quizFact('1', 0), quizFact('2', 0), classification, click];
    const states = calculateAdaptiveCategoryStates(facts, asOf);
    expect(states.find((item) => item.category === phishing)).toMatchObject({
      evidenceCount: 4,
      evidenceStatus: 'SUFFICIENT',
      recommendedDifficulty: 'EASY',
    });
    expect(states.find((item) => item.category === 'PASSWORDS_AND_AUTHENTICATION')).toMatchObject({
      evidenceCount: 2,
      evidenceStatus: 'INSUFFICIENT',
    });
  });
});
