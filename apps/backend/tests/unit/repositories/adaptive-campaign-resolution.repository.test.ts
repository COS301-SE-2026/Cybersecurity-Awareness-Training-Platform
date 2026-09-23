import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../src/lib/prisma.js';
import * as ResolutionRepository from '../../../src/repositories/adaptive-campaign-resolution.repository.js';

vi.mock('../../../src/lib/prisma.js', () => ({
  prisma: {
    adaptiveCampaignResolution: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    campaignAssignment: { findUnique: vi.fn() },
    campaignAdaptiveAlternative: { findFirst: vi.fn() },
  },
}));

const input = {
  campaignAssignmentId: 'assignment-1',
  campaignItemId: 'item-1',
  selectedAlternativeId: 'alternative-medium',
  evidenceStatus: 'INSUFFICIENT' as const,
  resolutionBasis: 'FALLBACK' as const,
  resolvedAt: new Date('2026-09-19T10:00:00.000Z'),
};

const winner = {
  id: 'resolution-1',
  campaignId: 'campaign-1',
  campaignAssignmentId: input.campaignAssignmentId,
  campaignItemId: input.campaignItemId,
  selectedAlternativeId: input.selectedAlternativeId,
  selectedDifficulty: 'MEDIUM' as const,
  selectedContentId: 'quiz-medium',
  evidenceStatus: input.evidenceStatus,
  resolutionBasis: input.resolutionBasis,
  resolvedAt: input.resolvedAt,
};

describe('adaptive Campaign resolution repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists immutable provenance derived from the selected alternative', async () => {
    vi.mocked(prisma.adaptiveCampaignResolution.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.campaignAssignment.findUnique).mockResolvedValue({
      campaignId: winner.campaignId,
    } as never);
    vi.mocked(prisma.campaignAdaptiveAlternative.findFirst).mockResolvedValue({
      id: input.selectedAlternativeId,
      difficulty: winner.selectedDifficulty,
      trainingDocumentId: null,
      quizId: winner.selectedContentId,
      simulationId: null,
      campaignItem: { campaignId: winner.campaignId },
    } as never);
    vi.mocked(prisma.adaptiveCampaignResolution.create).mockResolvedValue(winner);

    await expect(ResolutionRepository.createOrReadAdaptiveResolution(input)).resolves.toEqual({
      resolution: winner,
      created: true,
    });
    expect(prisma.adaptiveCampaignResolution.create).toHaveBeenCalledWith({
      data: {
        campaignId: winner.campaignId,
        campaignAssignmentId: input.campaignAssignmentId,
        campaignItemId: input.campaignItemId,
        selectedAlternativeId: input.selectedAlternativeId,
        selectedDifficulty: winner.selectedDifficulty,
        selectedContentId: winner.selectedContentId,
        evidenceStatus: input.evidenceStatus,
        resolutionBasis: input.resolutionBasis,
        resolvedAt: input.resolvedAt,
      },
    });
  });

  it('returns an existing resolution without recalculating or replacing it', async () => {
    vi.mocked(prisma.adaptiveCampaignResolution.findUnique).mockResolvedValue(winner);

    await expect(ResolutionRepository.createOrReadAdaptiveResolution(input)).resolves.toEqual({
      resolution: winner,
      created: false,
    });
    expect(prisma.campaignAdaptiveAlternative.findFirst).not.toHaveBeenCalled();
    expect(prisma.adaptiveCampaignResolution.create).not.toHaveBeenCalled();
  });

  it('re-reads the persisted winner after a concurrent unique conflict', async () => {
    vi.mocked(prisma.adaptiveCampaignResolution.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(winner);
    vi.mocked(prisma.campaignAssignment.findUnique).mockResolvedValue({
      campaignId: winner.campaignId,
    } as never);
    vi.mocked(prisma.campaignAdaptiveAlternative.findFirst).mockResolvedValue({
      id: 'alternative-hard',
      difficulty: 'HARD',
      trainingDocumentId: null,
      quizId: 'quiz-hard',
      simulationId: null,
      campaignItem: { campaignId: winner.campaignId },
    } as never);
    vi.mocked(prisma.adaptiveCampaignResolution.create).mockRejectedValue({ code: 'P2002' });

    await expect(
      ResolutionRepository.createOrReadAdaptiveResolution({
        ...input,
        selectedAlternativeId: 'alternative-hard',
      }),
    ).resolves.toEqual({ resolution: winner, created: false });
  });
});
