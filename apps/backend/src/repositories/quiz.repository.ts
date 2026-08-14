import { prisma } from '../lib/prisma.js';
import type { Prisma } from '../generated/prisma/client.js';
import { enforceProgressWriteGuard } from './campaign-progress-guard.repository.js';

export async function findActiveTraineeProfileByUserId(userId: string) {
  return prisma.traineeProfile.findFirst({
    where: { userId, traineeStatus: 'ACTIVE' },
  });
}

export async function findQuizCampaignItem(campaignItemId: string, traineeProfileId: string) {
  return prisma.campaignItem.findFirst({
    where: {
      id: campaignItemId,
      itemType: 'COMPONENT',
      componentType: 'QUIZ',
      availabilityStatus: 'AVAILABLE',
      quizId: { not: null },
      campaign: {
        assignments: {
          some: {
            traineeProfileId,
            assignmentStatus: { in: ['AVAILABLE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] },
          },
        },
      },
    },
    include: {
      campaign: {
        include: {
          assignments: {
            where: {
              traineeProfileId,
              assignmentStatus: { in: ['AVAILABLE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] },
            },
          },
        },
      },
      quiz: {
        include: {
          questions: {
            include: { answerOptions: true },
          },
        },
      },
    },
  });
}

export async function findLatestQuizAttempt(input: {
  quizId: string;
  traineeProfileId: string;
  campaignItemId: string;
}) {
  return prisma.quizAttempt.findFirst({
    where: {
      quizId: input.quizId,
      traineeProfileId: input.traineeProfileId,
      campaignItemId: input.campaignItemId,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export function findExistingQuizAttemptForRead(input: {
  quizId: string;
  traineeProfileId: string;
  campaignItemId: string;
}) {
  return prisma.quizAttempt.findFirst({
    where: {
      quizId: input.quizId,
      traineeProfileId: input.traineeProfileId,
      campaignItemId: input.campaignItemId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      status: true,
    },
  });
}

export async function createQuizAttempt(input: {
  campaignId: string;
  quizId: string;
  traineeProfileId: string;
  campaignItemId: string;
  campaignAssignmentId: string;
  checkedAt: Date;
}) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const guard = await enforceProgressWriteGuard(tx, {
      campaignId: input.campaignId,
      campaignAssignmentId: input.campaignAssignmentId,
      campaignItemId: input.campaignItemId,
      traineeProfileId: input.traineeProfileId,
      checkedAt: input.checkedAt,
      requiredStatus: 'ACTIVE',
    });

    if (!guard.allowed) {
      return guard;
    }

    const attempt = await tx.quizAttempt.create({
      data: {
        quizId: input.quizId,
        traineeProfileId: input.traineeProfileId,
        campaignItemId: input.campaignItemId,
        campaignAssignmentId: input.campaignAssignmentId,
        status: 'IN_PROGRESS',
      },
    });

    return {
      allowed: true as const,
      value: attempt,
    };
  });
}

export async function findQuizAttemptWithQuiz(attemptId: string, traineeProfileId: string) {
  return prisma.quizAttempt.findFirst({
    where: { id: attemptId, traineeProfileId },
    include: {
      quiz: {
        include: {
          questions: {
            include: { answerOptions: true },
          },
        },
      },
      campaignItem: {
        include: {
          campaign: true,
        },
      },
      campaignAssignment: {
        include: {
          campaign: true,
        },
      },
    },
  });
}

export async function saveSubmittedQuizAttemptTx(input: {
  campaignId: string;
  campaignAssignmentId: string;
  campaignItemId: string;
  traineeProfileId: string;
  checkedAt: Date;
  attemptId: string;
  scorePercentage: number;
  passed: boolean;
  createdAnswers: Array<{
    questionId: string;
    selectedOptionIds: string[];
    isCorrect: boolean;
    awardedPoints: number;
    responseSummary?: string;
    typedResponse?: string;
  }>;
}) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const guard = await enforceProgressWriteGuard(tx, {
      campaignId: input.campaignId,
      campaignAssignmentId: input.campaignAssignmentId,
      campaignItemId: input.campaignItemId,
      traineeProfileId: input.traineeProfileId,
      checkedAt: input.checkedAt,
      requiredStatus: 'ACTIVE',
    });

    if (!guard.allowed) {
      return guard;
    }

    const claimedAttempt = await tx.quizAttempt.updateMany({
      where: {
        id: input.attemptId,
        traineeProfileId: input.traineeProfileId,
        status: 'IN_PROGRESS',
      },
      data: {
        status: 'SUBMITTED',
        submittedAt: input.checkedAt,
      },
    });

    if (claimedAttempt.count !== 1) {
      return {
        allowed: false as const,
        reason: 'ATTEMPT_CONFLICT' as const,
      };
    }

    for (const answer of input.createdAnswers) {
      const createdAnswer = await tx.attemptAnswer.create({
        data: {
          attemptId: input.attemptId,
          questionId: answer.questionId,
          isCorrect: answer.isCorrect,
          awardedPoints: answer.awardedPoints,
          responseSummary: answer.responseSummary,
          typedResponse: answer.typedResponse,
        },
      });

      await tx.attemptAnswerOption.createMany({
        data: answer.selectedOptionIds.map((optId: string) => ({
          attemptAnswerId: createdAnswer.id,
          answerOptionId: optId,
        })),
      });
    }

    await tx.quizResult.create({
      data: {
        attemptId: input.attemptId,
        scorePercentage: input.scorePercentage,
        passed: input.passed,
      },
    });

    const updatedAttempt =
      typeof tx.quizAttempt.findUniqueOrThrow === 'function'
        ? await tx.quizAttempt.findUniqueOrThrow({
            where: { id: input.attemptId },
          })
        : {
            id: input.attemptId,
            status: 'SUBMITTED',
            submittedAt: input.checkedAt,
            scorePercentage: input.scorePercentage,
            passed: input.passed,
          };

    return {
      allowed: true as const,
      value: updatedAttempt,
    };
  });
}

export async function findQuizResultByAttemptId(attemptId: string, traineeProfileId: string) {
  return prisma.quizAttempt.findFirst({
    where: { id: attemptId, traineeProfileId },
    include: {
      quizResult: true,
      quiz: true,
      answers: {
        include: {
          selectedOptions: {
            include: { answerOption: true },
          },
        },
      },
    },
  });
}
