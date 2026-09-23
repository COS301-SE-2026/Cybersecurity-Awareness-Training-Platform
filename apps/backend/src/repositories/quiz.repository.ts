import { prisma } from '../lib/prisma.js';
import type { Prisma, QuizAttempt } from '../generated/prisma/client.js';
import { enforceProgressWriteGuard } from './campaign-progress-guard.repository.js';

export async function findActiveTraineeProfileByUserId(userId: string) {
  return prisma.traineeProfile.findFirst({
    where: { userId, traineeStatus: 'ACTIVE' },
  });
}

export async function findQuizCampaignItem(
  campaignItemId: string,
  traineeProfileId: string,
  quizId?: string,
) {
  const item = await prisma.campaignItem.findFirst({
    where: {
      id: campaignItemId,
      itemType: { in: ['COMPONENT', 'ADAPTIVE'] },
      componentType: 'QUIZ',
      availabilityStatus: 'AVAILABLE',
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
  if (!item || !quizId || item.quiz?.id === quizId) return item;
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { include: { answerOptions: true } } },
  });
  return { ...item, quizId, quiz };
}

export async function findLatestQuizAttempt(input: {
  quizId: string;
  traineeProfileId: string;
  campaignItemId: string;
  campaignAssignmentId?: string;
}) {
  return prisma.quizAttempt.findFirst({
    where: {
      quizId: input.quizId,
      traineeProfileId: input.traineeProfileId,
      campaignItemId: input.campaignItemId,
      ...(input.campaignAssignmentId ? { campaignAssignmentId: input.campaignAssignmentId } : {}),
    },
    include: {
      quizResult: {
        select: {
          id: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
}

export function findSubmittedQuizAttemptSummaries(input: {
  quizId: string;
  traineeProfileId: string;
  campaignAssignmentId: string;
  campaignItemId: string;
}) {
  return prisma.quizAttempt.findMany({
    where: {
      quizId: input.quizId,
      traineeProfileId: input.traineeProfileId,
      campaignAssignmentId: input.campaignAssignmentId,
      campaignItemId: input.campaignItemId,
      status: 'SUBMITTED',
    },
    select: {
      id: true,
      submittedAt: true,
      quizResult: {
        select: { scorePercentage: true },
      },
    },
    orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
  });
}

export function findExistingQuizAttemptForRead(input: {
  quizId: string;
  traineeProfileId: string;
  campaignItemId: string;
  campaignAssignmentId?: string;
}) {
  return prisma.quizAttempt.findFirst({
    where: {
      quizId: input.quizId,
      traineeProfileId: input.traineeProfileId,
      campaignItemId: input.campaignItemId,
      ...(input.campaignAssignmentId ? { campaignAssignmentId: input.campaignAssignmentId } : {}),
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

type ProgressGaurdFailure = Extract<
  Awaited<ReturnType<typeof enforceProgressWriteGuard>>,
  { allowed: false }
>;

export type StartOrResumeQuizAttemptResult =
  | ProgressGaurdFailure
  | { allowed: false; reason: 'ATTEMPT_LIMIT_REACHED' }
  | {
      allowed: true;
      outcome: 'RESUMED' | 'CREATED';
      value: QuizAttempt;
    };

export async function StartOrResumeQuizAttempt(input: {
  campaignId: string;
  quizId: string;
  traineeProfileId: string;
  campaignItemId: string;
  campaignAssignmentId: string;
  checkedAt: Date;
}): Promise<StartOrResumeQuizAttemptResult> {
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

    const campaignItem = await tx.campaignItem.findFirst({
      where: {
        id: input.campaignItemId,
        campaignId: input.campaignId,
        componentType: 'QUIZ',
        availabilityStatus: 'AVAILABLE',
        OR: [
          {
            itemType: 'COMPONENT',
            quizId: input.quizId,
            quiz: { is: { status: 'PUBLISHED' } },
          },
          {
            itemType: 'ADAPTIVE',
            adaptiveResolutions: {
              some: {
                campaignAssignmentId: input.campaignAssignmentId,
                selectedContentId: input.quizId,
                selectedAlternative: { is: { quiz: { is: { status: 'PUBLISHED' } } } },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        quizId: true,
        quizMaxAttempts: true,
      },
    });

    if (!campaignItem) {
      return { allowed: false as const, reason: 'NOT_FOUND' as const };
    }

    const occurence = {
      quizId: input.quizId,
      traineeProfileId: input.traineeProfileId,
      campaignAssignmentId: input.campaignAssignmentId,
      campaignItemId: input.campaignItemId,
    };

    const inProgress = await tx.quizAttempt.findFirst({
      where: { ...occurence, status: 'IN_PROGRESS' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    if (inProgress) {
      return { allowed: true as const, outcome: 'RESUMED' as const, value: inProgress };
    }

    const submittedCount = await tx.quizAttempt.count({
      where: { ...occurence, status: 'SUBMITTED' },
    });

    if (submittedCount >= campaignItem.quizMaxAttempts) {
      return { allowed: false as const, reason: 'ATTEMPT_LIMIT_REACHED' as const };
    }

    const attempt = await tx.quizAttempt.create({
      data: { ...occurence, status: 'IN_PROGRESS' },
    });

    return { allowed: true as const, outcome: 'CREATED' as const, value: attempt };
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
