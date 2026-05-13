import type {
  GetAssignedTrainingResponseDto,
  GetTrainingDocumentResponseDto,
  RecordTrainingProgressRequestDto,
  RecordTrainingProgressResponseDto,
} from '@insightful-phish/shared';
import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import {
  toGetTrainingDocumentResponseDto,
  toTrainingProgressResultDto,
  toTrainingDocumentSummaryDto,
} from '../mappers/training.mapper.js';

export class TrainingDocumentNotFoundError extends Error {
  constructor(message = 'Training document was not found') {
    super(message);
    this.name = 'TrainingDocumentNotFoundError';
  }
}

const assignedCampaignWhere = (userId: string) => ({
  status: 'ACTIVE' as const,
  assignments: {
    some: {
      userId,
      assignmentStatus: {
        not: 'CANCELLED' as const,
      },
    },
  },
});

const assignedTrainingWhere = (userId: string) => ({
  status: 'AVAILABLE' as const,
  module: {
    learningPath: {
      status: 'ACTIVE' as const,
      campaign: assignedCampaignWhere(userId),
    },
  },
});

const generalTrainingWhere = () => ({
  status: 'AVAILABLE' as const,
  module: {
    learningPath: {
      status: 'ACTIVE' as const,
      campaign: {
        status: 'ACTIVE' as const,
        campaignType: 'PREMADE_GENERAL' as const,
      },
    },
  },
});

async function userHasGeneralLearningAccess(userId: string) {
  const access = await prisma.generalLearningAccess.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
    },
  });

  return Boolean(access);
}

async function getAccessibleTrainingDocument(userId: string, trainingDocumentId: string) {
  const whereClauses: Prisma.TrainingDocumentWhereInput[] = [assignedTrainingWhere(userId)];

  if (await userHasGeneralLearningAccess(userId)) {
    whereClauses.push(generalTrainingWhere());
  }

  return prisma.trainingDocument.findFirst({
    where: {
      id: trainingDocumentId,
      OR: whereClauses,
    },
    include: {
      quizzes: {
        where: {
          status: 'PUBLISHED',
        },
        select: {
          id: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      module: {
        select: {
          learningPath: {
            select: {
              campaign: {
                select: {
                  assignments: {
                    where: {
                      userId,
                      assignmentStatus: {
                        not: 'CANCELLED',
                      },
                    },
                    select: {
                      id: true,
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getAssignedTraining(userId: string): Promise<GetAssignedTrainingResponseDto> {
  const whereClauses: Prisma.TrainingDocumentWhereInput[] = [assignedTrainingWhere(userId)];

  if (await userHasGeneralLearningAccess(userId)) {
    whereClauses.push(generalTrainingWhere());
  }

  const trainingDocuments = await prisma.trainingDocument.findMany({
    where: {
      OR: whereClauses,
    },
    include: {
      module: {
        select: {
          description: true,
        },
      },
      trainingProgress: {
        where: {
          userId,
        },
        select: {
          status: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 1,
      },
    },
    orderBy: [
      {
        module: {
          order: 'asc',
        },
      },
      {
        createdAt: 'asc',
      },
    ],
  });

  return {
    trainingDocuments: trainingDocuments.map(toTrainingDocumentSummaryDto),
  };
}

export async function getTrainingDocument(
  userId: string,
  trainingDocumentId: string,
): Promise<GetTrainingDocumentResponseDto> {
  const document = await getAccessibleTrainingDocument(userId, trainingDocumentId);

  if (!document) {
    throw new TrainingDocumentNotFoundError();
  }

  return toGetTrainingDocumentResponseDto(document);
}

function toStoredProgressStatus(status: RecordTrainingProgressRequestDto['status']) {
  return status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS';
}

function toTrainingInteractionEventType(status: RecordTrainingProgressRequestDto['status']) {
  return status === 'COMPLETED' ? 'TRAINING_COMPLETED' : 'TRAINING_VIEWED';
}

export async function recordTrainingProgress(
  userId: string,
  trainingDocumentId: string,
  input: RecordTrainingProgressRequestDto,
): Promise<RecordTrainingProgressResponseDto> {
  const document = await getAccessibleTrainingDocument(userId, trainingDocumentId);

  if (!document) {
    throw new TrainingDocumentNotFoundError();
  }

  const campaignAssignmentId = document.module.learningPath?.campaign.assignments[0]?.id ?? null;
  const existingProgress = await prisma.trainingProgress.findFirst({
    where: {
      userId,
      trainingDocumentId,
      campaignAssignmentId,
    },
    select: {
      id: true,
      startedAt: true,
    },
  });
  const storedStatus = toStoredProgressStatus(input.status);
  const now = new Date();

  const progress = existingProgress
    ? await prisma.trainingProgress.update({
        where: {
          id: existingProgress.id,
        },
        data: {
          status: storedStatus,
          startedAt: existingProgress.startedAt ?? now,
          ...(storedStatus === 'COMPLETED' ? { completedAt: now } : {}),
        },
      })
    : await prisma.trainingProgress.create({
        data: {
          userId,
          trainingDocumentId,
          campaignAssignmentId,
          status: storedStatus,
          startedAt: now,
          ...(storedStatus === 'COMPLETED' ? { completedAt: now } : {}),
        },
      });

  await prisma.interactionEvent.create({
    data: {
      userId,
      eventType: toTrainingInteractionEventType(input.status),
      targetType: 'TRAINING_DOCUMENT',
      targetId: trainingDocumentId,
      trainingDocumentId,
      metadata: {
        requestedStatus: input.status,
      },
    },
  });

  return {
    success: true,
    progress: toTrainingProgressResultDto(progress),
  };
}
