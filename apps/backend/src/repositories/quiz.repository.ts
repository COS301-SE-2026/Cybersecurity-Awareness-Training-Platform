import { prisma } from '../lib/prisma.js';
import type { Prisma } from '../generated/prisma/client.js';

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

export async function createQuizAttempt(input: {
  quizId: string;
  traineeProfileId: string;
  campaignItemId: string;
  campaignAssignmentId: string;
}) {
  return prisma.quizAttempt.create({
    data: {
      quizId: input.quizId,
      traineeProfileId: input.traineeProfileId,
      campaignItemId: input.campaignItemId,
      campaignAssignmentId: input.campaignAssignmentId,
      status: 'IN_PROGRESS',
    },
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

    return tx.quizAttempt.update({
      where: { id: input.attemptId },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });
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
