import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as ResolutionRepository from '../../../src/repositories/adaptive-campaign-resolution.repository.js';
import { getAdaptiveCategoryStates } from '../../../src/services/adaptive-category-state.service.js';
import {
  AdaptiveSlotResolutionError,
  resolveAdaptiveSlot,
} from '../../../src/services/adaptive-slot-resolution.service.js';

vi.mock('../../../src/repositories/adaptive-campaign-resolution.repository.js', () => ({
  findAdaptiveResolutionForTrainee: vi.fn(),
  findAdaptiveSlotContext: vi.fn(),
  createOrReadAdaptiveResolution: vi.fn(),
}));
vi.mock('../../../src/services/adaptive-category-state.service.js', () => ({
  getAdaptiveCategoryStates: vi.fn(),
}));

const input = {
  campaignAssignmentId: 'assignment-1',
  campaignItemId: 'item-1',
  traineeProfileId: 'trainee-1',
};
const alternatives = ['EASY', 'MEDIUM', 'HARD'].map((difficulty) => ({
  id: `alternative-${difficulty.toLowerCase()}`,
  difficulty: difficulty as 'EASY' | 'MEDIUM' | 'HARD',
  contentId: `content-${difficulty.toLowerCase()}`,
  categories: ['PHISHING_AND_SUSPICIOUS_MESSAGES' as const],
}));

function resolution(difficulty: 'EASY' | 'MEDIUM' | 'HARD') {
  return {
    id: 'resolution-1',
    campaignId: 'campaign-1',
    campaignAssignmentId: input.campaignAssignmentId,
    campaignItemId: input.campaignItemId,
    selectedAlternativeId: `alternative-${difficulty.toLowerCase()}`,
    selectedDifficulty: difficulty,
    selectedContentId: `content-${difficulty.toLowerCase()}`,
    evidenceStatus: difficulty === 'MEDIUM' ? ('INSUFFICIENT' as const) : ('SUFFICIENT' as const),
    resolutionBasis: difficulty === 'MEDIUM' ? ('FALLBACK' as const) : ('EVIDENCE' as const),
    resolvedAt: new Date('2026-09-19T12:00:00.000Z'),
  };
}

describe('adaptive slot resolution service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ResolutionRepository.findAdaptiveResolutionForTrainee).mockResolvedValue(null);
    vi.mocked(ResolutionRepository.findAdaptiveSlotContext).mockResolvedValue({ alternatives });
  });

  it('returns the persisted winner without recalculating category state', async () => {
    const persisted = resolution('HARD');
    vi.mocked(ResolutionRepository.findAdaptiveResolutionForTrainee).mockResolvedValue(persisted);

    await expect(resolveAdaptiveSlot(input)).resolves.toEqual(persisted);
    expect(getAdaptiveCategoryStates).not.toHaveBeenCalled();
    expect(ResolutionRepository.findAdaptiveSlotContext).not.toHaveBeenCalled();
    expect(ResolutionRepository.createOrReadAdaptiveResolution).not.toHaveBeenCalled();
  });

  it.each(['EASY', 'MEDIUM', 'HARD'] as const)(
    'selects the persisted %s alternative from the weakest relevant category',
    async (difficulty) => {
      const persisted = resolution(difficulty);
      const fallback = difficulty === 'MEDIUM';
      vi.mocked(getAdaptiveCategoryStates).mockResolvedValue([
        {
          category: 'PHISHING_AND_SUSPICIOUS_MESSAGES',
          evidenceStatus: fallback ? 'INSUFFICIENT' : 'SUFFICIENT',
          evidenceCount: fallback ? 0 : 4,
          recommendedDifficulty: difficulty,
          resolutionBasis: fallback ? 'FALLBACK' : 'EVIDENCE',
          calculatedAt: '2026-09-19T12:00:00.000Z',
        },
      ]);
      vi.mocked(ResolutionRepository.createOrReadAdaptiveResolution).mockResolvedValue({
        resolution: persisted,
        created: true,
      });

      await expect(resolveAdaptiveSlot(input)).resolves.toEqual(persisted);
      expect(ResolutionRepository.createOrReadAdaptiveResolution).toHaveBeenCalledWith({
        campaignAssignmentId: input.campaignAssignmentId,
        campaignItemId: input.campaignItemId,
        selectedAlternativeId: `alternative-${difficulty.toLowerCase()}`,
        evidenceStatus: fallback ? 'INSUFFICIENT' : 'SUFFICIENT',
        resolutionBasis: fallback ? 'FALLBACK' : 'EVIDENCE',
      });
    },
  );

  it('uses the weakest recommendation across the shared slot categories', async () => {
    const multiCategoryAlternatives = alternatives.map((alternative) => ({
      ...alternative,
      categories: [
        'PHISHING_AND_SUSPICIOUS_MESSAGES' as const,
        'PASSWORDS_AND_AUTHENTICATION' as const,
      ],
    }));
    vi.mocked(ResolutionRepository.findAdaptiveSlotContext).mockResolvedValue({
      alternatives: multiCategoryAlternatives,
    });
    vi.mocked(getAdaptiveCategoryStates).mockResolvedValue([
      {
        category: 'PHISHING_AND_SUSPICIOUS_MESSAGES',
        evidenceStatus: 'SUFFICIENT',
        evidenceCount: 4,
        recommendedDifficulty: 'HARD',
        resolutionBasis: 'EVIDENCE',
        calculatedAt: '2026-09-19T12:00:00.000Z',
      },
      {
        category: 'PASSWORDS_AND_AUTHENTICATION',
        evidenceStatus: 'SUFFICIENT',
        evidenceCount: 4,
        recommendedDifficulty: 'EASY',
        resolutionBasis: 'EVIDENCE',
        calculatedAt: '2026-09-19T12:00:00.000Z',
      },
    ]);
    vi.mocked(ResolutionRepository.createOrReadAdaptiveResolution).mockResolvedValue({
      resolution: resolution('EASY'),
      created: true,
    });

    await resolveAdaptiveSlot(input);

    expect(ResolutionRepository.createOrReadAdaptiveResolution).toHaveBeenCalledWith(
      expect.objectContaining({ selectedAlternativeId: 'alternative-easy' }),
    );
  });

  it('defensively rejects a persisted slot whose alternative category sets differ', async () => {
    vi.mocked(ResolutionRepository.findAdaptiveSlotContext).mockResolvedValue({
      alternatives: alternatives.map((alternative, index) => ({
        ...alternative,
        categories: [
          index === 1
            ? ('PASSWORDS_AND_AUTHENTICATION' as const)
            : ('PHISHING_AND_SUSPICIOUS_MESSAGES' as const),
        ],
      })),
    });

    await expect(resolveAdaptiveSlot(input)).rejects.toEqual(
      new AdaptiveSlotResolutionError('INVALID_SLOT_STRUCTURE'),
    );
    expect(getAdaptiveCategoryStates).not.toHaveBeenCalled();
    expect(ResolutionRepository.createOrReadAdaptiveResolution).not.toHaveBeenCalled();
  });
});
