import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

export const ACCESSIBLE_ASSIGNMENT_STATUSES = [
  'AVAILABLE',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
] as const;

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

const campaignItemSelect = {
  id: true,
  campaignId: true,
  parentGroupId: true,
  itemType: true,
  componentType: true,
  groupType: true,
  completionRule: true,
  title: true,
  description: true,
  position: true,
  isRequired: true,
  availabilityStatus: true,
  trainingDocument: {
    select: {
      id: true,
      title: true,
      contentSummary: true,
      estimatedReadTimeMinutes: true,
      difficultyLevel: true,
      status: true,
    },
  },
  quiz: {
    select: {
      id: true,
      title: true,
      description: true,
      passThresholdPercentage: true,
      difficultyLevel: true,
      status: true,
      _count: {
        select: {
          questions: true,
        },
      },
    },
  },
  simulation: {
    select: {
      id: true,
      title: true,
      description: true,
      difficultyLevel: true,
      safetyStatus: true,
      simulatedInbox: {
        select: {
          status: true,
          emails: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CampaignItemSelect;

const campaignSummarySelect = {
  id: true,
  name: true,
  description: true,
  accentColor: true,
  campaignType: true,
  difficultyLevel: true,
  status: true,
  startDate: true,
  endDate: true,
  items: {
    where: {
      availabilityStatus: {
        not: 'ARCHIVED',
      },
    },
    select: campaignItemSelect,
    orderBy: [{ parentGroupId: 'asc' }, { position: 'asc' }],
  },
} satisfies Prisma.CampaignSelect;

export function findAccessibleCampaignAssignments(traineeProfileId: string) {
  return prisma.campaignAssignment.findMany({
    where: {
      traineeProfileId,
      assignmentStatus: {
        in: [...ACCESSIBLE_ASSIGNMENT_STATUSES],
      },
      campaign: {
        status: { in: ['ACTIVE', 'ARCHIVED'] },
      },
    },
    orderBy: {
      assignedAt: 'desc',
    },
    select: {
      id: true,
      currentCampaignItemId: true,
      assignedAt: true,
      dueDate: true,
      startedAt: true,
      completedAt: true,
      assignmentStatus: true,
      accessType: true,
      campaign: {
        select: campaignSummarySelect,
      },
    },
  });
}

export function findAccessibleCampaignAssignment(input: {
  traineeProfileId: string;
  campaignId: string;
}) {
  return prisma.campaignAssignment.findFirst({
    where: {
      traineeProfileId: input.traineeProfileId,
      campaignId: input.campaignId,
      assignmentStatus: {
        in: [...ACCESSIBLE_ASSIGNMENT_STATUSES],
      },
      campaign: {
        status: { in: ['ACTIVE', 'ARCHIVED'] },
      },
    },
    select: {
      id: true,
      currentCampaignItemId: true,
      assignedAt: true,
      dueDate: true,
      startedAt: true,
      completedAt: true,
      assignmentStatus: true,
      accessType: true,
      campaign: {
        select: campaignSummarySelect,
      },
    },
  });
}

export function findTrainingInteractionEvents(input: {
  traineeProfileId: string;
  campaignAssignmentId: string;
  campaignItemIds: string[];
}) {
  return prisma.interactionEvent.findMany({
    where: {
      traineeProfileId: input.traineeProfileId,
      campaignAssignmentId: input.campaignAssignmentId,
      campaignItemId: {
        in: input.campaignItemIds,
      },
      eventType: {
        in: ['TRAINING_VIEWED', 'TRAINING_COMPLETED'],
      },
    },
    select: {
      campaignItemId: true,
      eventType: true,
    },
  });
}

export function findQuizAttempts(input: {
  traineeProfileId: string;
  campaignItemIds: string[];
  campaignAssignmentId?: string;
}) {
  return prisma.quizAttempt.findMany({
    where: {
      traineeProfileId: input.traineeProfileId,
      ...(input.campaignAssignmentId ? { campaignAssignmentId: input.campaignAssignmentId } : {}),
      campaignItemId: {
        in: input.campaignItemIds,
      },
    },
    select: {
      campaignItemId: true,
      status: true,
      quizResult: {
        select: {
          id: true,
          scorePercentage: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export function findSimulationInteractionEvents(input: {
  traineeProfileId: string;
  campaignAssignmentId: string;
  campaignItemIds: string[];
}) {
  return prisma.interactionEvent.findMany({
    where: {
      traineeProfileId: input.traineeProfileId,
      campaignAssignmentId: input.campaignAssignmentId,
      campaignItemId: {
        in: input.campaignItemIds,
      },
      eventType: {
        in: [
          'SIMULATED_EMAIL_OPENED',
          'SIMULATED_EMAIL_LINK_CLICKED',
          'CREDENTIAL_SUBMISSION_ATTEMPTED',
          'SIMULATED_EMAIL_CLASSIFIED',
        ],
      },
    },
    select: {
      campaignItemId: true,
      eventType: true,
      simulatedEmailId: true,
      targetId: true,
    },
  });
}

export function findEmailClassificationResponses(input: {
  traineeProfileId: string;
  campaignItemIds: string[];
}) {
  return prisma.emailClassificationResponse.findMany({
    where: {
      traineeProfileId: input.traineeProfileId,
      campaignItemId: {
        in: input.campaignItemIds,
      },
    },
    select: {
      campaignItemId: true,
    },
  });
}
