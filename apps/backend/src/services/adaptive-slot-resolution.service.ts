import {
  contentCategories,
  type ContentCategoryDto,
  type DifficultyLevelDto,
} from '@insightful-phish/shared';
import * as ResolutionRepository from '../repositories/adaptive-campaign-resolution.repository.js';
import { getAdaptiveCategoryStates } from './adaptive-category-state.service.js';
import type { AdaptiveCategoryState } from './adaptive-evidence.types.js';

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
const DIFFICULTY_RANK: Record<DifficultyLevelDto, number> = {
  EASY: 0,
  MEDIUM: 1,
  HARD: 2,
};

export class AdaptiveSlotResolutionError extends Error {
  constructor(readonly code: 'SLOT_NOT_FOUND' | 'INVALID_SLOT_STRUCTURE') {
    super(code);
    this.name = 'AdaptiveSlotResolutionError';
  }
}

function canonicalCategories(categories: readonly ContentCategoryDto[]): ContentCategoryDto[] {
  const values = new Set(categories);
  return contentCategories.filter((category) => values.has(category));
}

function sharedSlotCategories(
  alternatives: ResolutionRepository.AdaptiveSlotAlternativeRecord[],
): ContentCategoryDto[] {
  if (
    alternatives.length !== DIFFICULTIES.length ||
    !DIFFICULTIES.every(
      (difficulty) => alternatives.filter((item) => item.difficulty === difficulty).length === 1,
    ) ||
    alternatives.some((alternative) => !alternative.contentId)
  ) {
    throw new AdaptiveSlotResolutionError('INVALID_SLOT_STRUCTURE');
  }
  const categorySets = alternatives.map((alternative) =>
    canonicalCategories(alternative.categories),
  );
  const expected = categorySets[0];
  if (
    expected.length === 0 ||
    categorySets.some(
      (categories) =>
        categories.length !== expected.length ||
        categories.some((category, index) => category !== expected[index]),
    )
  ) {
    throw new AdaptiveSlotResolutionError('INVALID_SLOT_STRUCTURE');
  }
  return expected;
}

function selectDrivingState(
  states: AdaptiveCategoryState[],
  relevantCategories: ContentCategoryDto[],
): AdaptiveCategoryState {
  const relevantStates = relevantCategories.map((category) =>
    states.find((state) => state.category === category),
  );
  if (relevantStates.some((state) => !state)) {
    throw new AdaptiveSlotResolutionError('INVALID_SLOT_STRUCTURE');
  }
  return (relevantStates as AdaptiveCategoryState[]).reduce((driving, candidate) => {
    const candidateRank = DIFFICULTY_RANK[candidate.recommendedDifficulty];
    const drivingRank = DIFFICULTY_RANK[driving.recommendedDifficulty];
    if (candidateRank < drivingRank) return candidate;
    if (
      candidateRank === drivingRank &&
      candidate.resolutionBasis === 'FALLBACK' &&
      driving.resolutionBasis !== 'FALLBACK'
    ) {
      return candidate;
    }
    return driving;
  });
}

export async function resolveAdaptiveSlot(input: {
  campaignAssignmentId: string;
  campaignItemId: string;
  traineeProfileId: string;
}): Promise<ResolutionRepository.AdaptiveResolutionRecord> {
  const existing = await ResolutionRepository.findAdaptiveResolutionForTrainee(
    input.campaignAssignmentId,
    input.campaignItemId,
    input.traineeProfileId,
  );
  if (existing) return existing;

  const context = await ResolutionRepository.findAdaptiveSlotContext(input);
  if (!context) throw new AdaptiveSlotResolutionError('SLOT_NOT_FOUND');

  const categories = sharedSlotCategories(context.alternatives);
  const states = await getAdaptiveCategoryStates(input.traineeProfileId);
  const drivingState = selectDrivingState(states, categories);
  const selectedAlternative = context.alternatives.find(
    (alternative) => alternative.difficulty === drivingState.recommendedDifficulty,
  );
  if (!selectedAlternative) {
    throw new AdaptiveSlotResolutionError('INVALID_SLOT_STRUCTURE');
  }

  const { resolution } = await ResolutionRepository.createOrReadAdaptiveResolution({
    campaignAssignmentId: input.campaignAssignmentId,
    campaignItemId: input.campaignItemId,
    selectedAlternativeId: selectedAlternative.id,
    evidenceStatus: drivingState.evidenceStatus,
    resolutionBasis: drivingState.resolutionBasis,
  });
  return resolution;
}
