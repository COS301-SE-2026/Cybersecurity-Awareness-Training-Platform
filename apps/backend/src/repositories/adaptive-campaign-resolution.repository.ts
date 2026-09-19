import type { ContentCategoryDto, DifficultyLevelDto } from '@insightful-phish/shared';
import { prisma } from '../lib/prisma.js';

export type AdaptiveResolutionRecord = {
  id: string;
  campaignId: string;
  campaignAssignmentId: string;
  campaignItemId: string;
  selectedAlternativeId: string | null;
  selectedDifficulty: DifficultyLevelDto;
  selectedContentId: string;
  evidenceStatus: 'SUFFICIENT' | 'INSUFFICIENT';
  resolutionBasis: 'EVIDENCE' | 'FALLBACK';
  resolvedAt: Date;
};

export type CreateAdaptiveResolutionInput = {
  campaignAssignmentId: string;
  campaignItemId: string;
  selectedAlternativeId: string;
  evidenceStatus: AdaptiveResolutionRecord['evidenceStatus'];
  resolutionBasis: AdaptiveResolutionRecord['resolutionBasis'];
  resolvedAt?: Date;
};

export class AdaptiveResolutionInvariantError extends Error {
  constructor() {
    super('Adaptive resolution candidate does not match its Campaign occurrence.');
    this.name = 'AdaptiveResolutionInvariantError';
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

function selectedContentId(alternative: {
  trainingDocumentId: string | null;
  quizId: string | null;
  simulationId: string | null;
}): string | null {
  return alternative.trainingDocumentId ?? alternative.quizId ?? alternative.simulationId;
}

export async function findAdaptiveResolution(
  campaignAssignmentId: string,
  campaignItemId: string,
): Promise<AdaptiveResolutionRecord | null> {
  return prisma.adaptiveCampaignResolution.findUnique({
    where: {
      campaignAssignmentId_campaignItemId: { campaignAssignmentId, campaignItemId },
    },
  });
}

export async function findAdaptiveResolutionForTrainee(
  campaignAssignmentId: string,
  campaignItemId: string,
  traineeProfileId: string,
): Promise<AdaptiveResolutionRecord | null> {
  return prisma.adaptiveCampaignResolution.findFirst({
    where: {
      campaignAssignmentId,
      campaignItemId,
      campaignAssignment: { traineeProfileId },
    },
  });
}

export type AdaptiveSlotAlternativeRecord = {
  id: string;
  difficulty: DifficultyLevelDto;
  contentId: string;
  categories: ContentCategoryDto[];
};

export async function findAdaptiveSlotContext(input: {
  campaignAssignmentId: string;
  campaignItemId: string;
  traineeProfileId: string;
}): Promise<{ alternatives: AdaptiveSlotAlternativeRecord[] } | null> {
  const assignment = await prisma.campaignAssignment.findFirst({
    where: {
      id: input.campaignAssignmentId,
      traineeProfileId: input.traineeProfileId,
      campaign: {
        items: {
          some: { id: input.campaignItemId, itemType: 'ADAPTIVE' },
        },
      },
    },
    select: { id: true },
  });
  if (!assignment) return null;

  const alternatives = await prisma.campaignAdaptiveAlternative.findMany({
    where: { campaignItemId: input.campaignItemId },
    select: {
      id: true,
      difficulty: true,
      trainingDocumentId: true,
      quizId: true,
      simulationId: true,
      trainingDocument: { select: { categories: true } },
      quiz: { select: { questions: { select: { categories: true } } } },
      simulation: {
        select: {
          simulatedInbox: {
            select: { emails: { select: { categories: true } } },
          },
        },
      },
    },
  });

  return {
    alternatives: alternatives.map((alternative) => ({
      id: alternative.id,
      difficulty: alternative.difficulty,
      contentId: selectedContentId(alternative) ?? '',
      categories: [
        ...(alternative.trainingDocument?.categories ?? []),
        ...(alternative.quiz?.questions.flatMap((question) => question.categories) ?? []),
        ...(alternative.simulation?.simulatedInbox?.emails.flatMap((email) => email.categories) ??
          []),
      ],
    })),
  };
}

async function loadResolutionCandidate(input: CreateAdaptiveResolutionInput) {
  const [assignment, alternative] = await Promise.all([
    prisma.campaignAssignment.findUnique({
      where: { id: input.campaignAssignmentId },
      select: { campaignId: true },
    }),
    prisma.campaignAdaptiveAlternative.findFirst({
      where: {
        id: input.selectedAlternativeId,
        campaignItemId: input.campaignItemId,
      },
      select: {
        id: true,
        difficulty: true,
        trainingDocumentId: true,
        quizId: true,
        simulationId: true,
        campaignItem: { select: { campaignId: true } },
      },
    }),
  ]);
  const contentId = alternative ? selectedContentId(alternative) : null;
  if (
    !assignment ||
    !alternative ||
    !contentId ||
    assignment.campaignId !== alternative.campaignItem.campaignId
  ) {
    throw new AdaptiveResolutionInvariantError();
  }
  return {
    campaignId: assignment.campaignId,
    selectedAlternativeId: alternative.id,
    selectedDifficulty: alternative.difficulty,
    selectedContentId: contentId,
  };
}

export async function createOrReadAdaptiveResolution(
  input: CreateAdaptiveResolutionInput,
): Promise<{ resolution: AdaptiveResolutionRecord; created: boolean }> {
  const existing = await findAdaptiveResolution(input.campaignAssignmentId, input.campaignItemId);
  if (existing) {
    return { resolution: existing, created: false };
  }

  const candidate = await loadResolutionCandidate(input);
  try {
    const resolution = await prisma.adaptiveCampaignResolution.create({
      data: {
        ...candidate,
        campaignAssignmentId: input.campaignAssignmentId,
        campaignItemId: input.campaignItemId,
        evidenceStatus: input.evidenceStatus,
        resolutionBasis: input.resolutionBasis,
        resolvedAt: input.resolvedAt,
      },
    });
    return { resolution, created: true };
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }
    const winner = await findAdaptiveResolution(input.campaignAssignmentId, input.campaignItemId);
    if (!winner) {
      throw error;
    }
    return { resolution: winner, created: false };
  }
}
