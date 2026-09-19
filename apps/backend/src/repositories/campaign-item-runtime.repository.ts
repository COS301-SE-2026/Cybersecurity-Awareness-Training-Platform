import { prisma } from '../lib/prisma.js';

export function findCampaignItemRuntimeContext(campaignItemId: string, traineeProfileId: string) {
  return prisma.campaignItem.findFirst({
    where: {
      id: campaignItemId,
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
    select: {
      id: true,
      campaignId: true,
      itemType: true,
      componentType: true,
      trainingDocumentId: true,
      quizId: true,
      simulationId: true,
      campaign: {
        select: {
          assignments: {
            where: {
              traineeProfileId,
              assignmentStatus: { in: ['AVAILABLE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] },
            },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });
}
