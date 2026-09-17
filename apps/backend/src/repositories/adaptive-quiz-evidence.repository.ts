import { prisma } from '../lib/prisma.js';

export function findSubmittedQuizEvidence(traineeProfileId: string) {
  return prisma.quizResult.findMany({
    where: {
      attempt: {
        traineeProfileId,
        status: 'SUBMITTED',
        submittedAt: { not: null },
        campaignAssignmentId: { not: null },
        campaignItemId: { not: null },
      },
    },
    select: {
      id: true,
      scorePercentage: true,
      attempt: {
        select: {
          id: true,
          quizId: true,
          submittedAt: true,
          campaignAssignmentId: true,
          campaignItemId: true,
          campaignAssignment: {
            select: { campaignId: true, traineeProfileId: true },
          },
          campaignItem: {
            select: { campaignId: true, quizId: true },
          },
          quiz: { select: { difficultyLevel: true } },
          answers: {
            select: {
              awardedPoints: true,
              question: {
                select: { points: true, categories: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
