import { prisma } from '../lib/prisma.js';

export function findActiveTraineeProfileByUserId(userId: string) {
  return prisma.traineeProfile.findFirst({
    where: {
      userId,
      traineeStatus: 'ACTIVE',
    },
    select: {
      id: true,
    },
  });
}

export function findTrainingCampaignItemById(campaignItemId: string) {
  return prisma.campaignItem.findUnique({
    where: {
      id: campaignItemId,
    },
    include: {
      trainingDocument: true,
    },
  });
}

export function findAccessibleCampaignAssignment(input: {
  campaignId: string;
  traineeProfileId: string;
}) {
  return prisma.campaignAssignment.findFirst({
    where: {
      campaignId: input.campaignId,
      traineeProfileId: input.traineeProfileId,
      assignmentStatus: {
        in: ['AVAILABLE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'],
      },
    },
    select: {
      id: true,
    },
  });
}

export function createTrainingInteractionEvent(input: {
  traineeProfileId: string;
  campaignAssignmentId: string;
  campaignItemId: string;
  trainingDocumentId: string;
  eventType: 'TRAINING_VIEWED' | 'TRAINING_COMPLETED';
}) {
  return prisma.interactionEvent.create({
    data: {
      traineeProfileId: input.traineeProfileId,
      campaignAssignmentId: input.campaignAssignmentId,
      campaignItemId: input.campaignItemId,
      eventType: input.eventType,
      targetType: 'TRAINING_DOCUMENT',
      targetId: input.trainingDocumentId,
      trainingDocumentId: input.trainingDocumentId,
    },
    select: {
      id: true,
      eventType: true,
      occurredAt: true,
    },
  });
}
