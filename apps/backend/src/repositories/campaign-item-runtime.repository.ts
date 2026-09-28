import { prisma } from '../lib/prisma.js';

export function findCampaignItemRuntimeContext(
  campaignItemId: string,
  traineeProfileId: string,
  campaignAssignmentId?: string,
) {
  return prisma.campaignItem.findFirst({
    where: {
      id: campaignItemId,
      availabilityStatus: 'AVAILABLE',
      campaign: {
        assignments: {
          some: {
            ...(campaignAssignmentId === undefined ? {} : { id: campaignAssignmentId }),
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
              ...(campaignAssignmentId === undefined ? {} : { id: campaignAssignmentId }),
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
