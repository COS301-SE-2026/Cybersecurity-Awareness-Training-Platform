import { prisma } from '../lib/prisma.js';
import type { PrismaClient, Prisma } from '../generated/prisma/client.js';

type DBClient = PrismaClient | Prisma.TransactionClient;

export type CampaignConsumableItemSummary = {
  id: string;
  componentType: 'TRAINING_DOCUMENT' | 'QUIZ' | 'SIMULATED_INBOX';
  trainingDocumentId: string | null;
  quizId: string | null;
  simulationId: string | null;
  simulatedInboxEmailIds: string[];
};

export type CampaignStatisticsCampaignEntity = {
  id: string;
  name: string;
  description: string | null;
  campaignType: 'PREMADE_GENERAL' | 'ORGANISATION_CUSTOM';
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  startDate: Date | null;
  endDate: Date | null;
  consumableItems: CampaignConsumableItemSummary[];
};

export type CampaignStatisticsAssignmentEntity = {
  assignmentId: string;
  traineeProfileId: string;
  firstName: string;
  lastName: string;
  email: string;
  traineeStatus: 'ACTIVE' | 'INACTIVE' | 'DISABLED';
  assignmentStatus:
    | 'AVAILABLE'
    | 'ASSIGNED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'EXPIRED';
  accessType: 'ASSIGNED' | 'SELF_SELECTED';
  assignedAt: Date;
};

export type TrainingProgressFact = {
  traineeProfileId: string;
  campaignAssignmentId: string | null;
  campaignItemId: string | null;
  trainingDocumentId: string | null;
  eventType: 'TRAINING_VIEWED' | 'TRAINING_COMPLETED';
};

export type QuizProgressFact = {
  traineeProfileId: string;
  campaignAssignmentId: string | null;
  campaignItemId: string | null;
  quizId: string | null;
  status: 'IN_PROGRESS' | 'SUBMITTED';
  scorePercentage: number | null;
};

export type SimulationProgressFact = {
  traineeProfileId: string;
  campaignAssignmentId: string | null;
  campaignItemId: string | null;
  simulatedEmailId: string | null;
  targetId: string;
};

export type CampaignProgressFactsResult = {
  trainingEvents: TrainingProgressFact[];
  quizAttempts: QuizProgressFact[];
  simulatedEmailEvents: SimulationProgressFact[];
};

/**
 * Loads campaign identity and all consumable component items with their constituent definitions.
 * Safe organisation isolation: Only matches custom campaigns for the organisation or premade platform campaigns.
 */
export async function findCampaignWithConsumableItems(
  organisationId: string,
  campaignId: string,
  client: DBClient = prisma,
): Promise<CampaignStatisticsCampaignEntity | null> {
  const campaign = await client.campaign.findFirst({
    where: {
      id: campaignId,
      OR: [{ organisationId }, { organisationId: null, campaignType: 'PREMADE_GENERAL' }],
    },
    select: {
      id: true,
      name: true,
      description: true,
      campaignType: true,
      status: true,
      startDate: true,
      endDate: true,
      items: {
        where: {
          itemType: 'COMPONENT',
        },
        select: {
          id: true,
          componentType: true,
          trainingDocumentId: true,
          quizId: true,
          simulationId: true,
          simulation: {
            select: {
              simulatedInbox: {
                select: {
                  emails: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          position: 'asc',
        },
      },
    },
  });

  if (!campaign) {
    return null;
  }

  const consumableItems: CampaignConsumableItemSummary[] = campaign.items
    .filter(
      (
        item,
      ): item is typeof item & {
        componentType: 'TRAINING_DOCUMENT' | 'QUIZ' | 'SIMULATED_INBOX';
      } =>
        item.componentType === 'TRAINING_DOCUMENT' ||
        item.componentType === 'QUIZ' ||
        item.componentType === 'SIMULATED_INBOX',
    )
    .map((item) => ({
      id: item.id,
      componentType: item.componentType,
      trainingDocumentId: item.trainingDocumentId,
      quizId: item.quizId,
      simulationId: item.simulationId,
      simulatedInboxEmailIds:
        item.simulation?.simulatedInbox?.emails.map((email) => email.id) ?? [],
    }));

  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    campaignType: campaign.campaignType,
    status: campaign.status,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    consumableItems,
  };
}

/**
 * Loads the complete qualifying campaign assignment cohort for the organisation.
 * Includes disabled Organisation Trainees when their assignment exists.
 */
export async function findCampaignCohortAssignments(
  organisationId: string,
  campaignId: string,
  client: DBClient = prisma,
): Promise<CampaignStatisticsAssignmentEntity[]> {
  const assignments = await client.campaignAssignment.findMany({
    where: {
      campaignId,
      campaign: {
        OR: [{ organisationId }, { organisationId: null, campaignType: 'PREMADE_GENERAL' }],
      },
      traineeProfile: {
        organisationTraineeProfile: {
          organisationId,
        },
      },
    },
    orderBy: [{ assignedAt: 'desc' }, { id: 'asc' }],
    select: {
      id: true,
      traineeProfileId: true,
      assignmentStatus: true,
      accessType: true,
      assignedAt: true,
      traineeProfile: {
        select: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          organisationTraineeProfile: {
            select: {
              membershipStatus: true,
            },
          },
        },
      },
    },
  });

  return assignments.map((a) => {
    const rawMembership = a.traineeProfile.organisationTraineeProfile?.membershipStatus;
    const traineeStatus =
      rawMembership === 'DISABLED'
        ? 'DISABLED'
        : rawMembership === 'INACTIVE'
          ? 'INACTIVE'
          : 'ACTIVE';

    return {
      assignmentId: a.id,
      traineeProfileId: a.traineeProfileId,
      firstName: a.traineeProfile.user.firstName,
      lastName: a.traineeProfile.user.lastName,
      email: a.traineeProfile.user.email,
      traineeStatus,
      assignmentStatus: a.assignmentStatus,
      accessType: a.accessType,
      assignedAt: a.assignedAt,
    };
  });
}

/**
 * Loads interaction events, quiz attempts, and simulation open events for the complete cohort
 * in bounded bulk queries without per-trainee N+1 calls.
 */
export async function findCampaignProgressFacts(
  input: {
    traineeProfileIds: string[];
    assignmentIds: string[];
    consumableItems: CampaignConsumableItemSummary[];
  },
  client: DBClient = prisma,
): Promise<CampaignProgressFactsResult> {
  if (input.traineeProfileIds.length === 0 || input.consumableItems.length === 0) {
    return {
      trainingEvents: [],
      quizAttempts: [],
      simulatedEmailEvents: [],
    };
  }

  const trainingDocIds = input.consumableItems
    .filter((i) => i.componentType === 'TRAINING_DOCUMENT' && Boolean(i.trainingDocumentId))
    .map((i) => i.trainingDocumentId as string);

  const trainingItemIds = input.consumableItems
    .filter((i) => i.componentType === 'TRAINING_DOCUMENT')
    .map((i) => i.id);

  const quizIds = input.consumableItems
    .filter((i) => i.componentType === 'QUIZ' && Boolean(i.quizId))
    .map((i) => i.quizId as string);

  const quizItemIds = input.consumableItems
    .filter((i) => i.componentType === 'QUIZ')
    .map((i) => i.id);

  const simulationItemIds = input.consumableItems
    .filter((i) => i.componentType === 'SIMULATED_INBOX')
    .map((i) => i.id);

  const simulatedEmailIds = input.consumableItems
    .filter((i) => i.componentType === 'SIMULATED_INBOX')
    .flatMap((i) => i.simulatedInboxEmailIds);

  const [rawTrainingEvents, rawQuizAttempts, rawSimulatedEmailEvents] = await Promise.all([
    // Training Events
    trainingItemIds.length > 0 || trainingDocIds.length > 0
      ? client.interactionEvent.findMany({
          where: {
            traineeProfileId: { in: input.traineeProfileIds },
            eventType: { in: ['TRAINING_VIEWED', 'TRAINING_COMPLETED'] },
            OR: [
              { campaignAssignmentId: { in: input.assignmentIds } },
              { campaignItemId: { in: trainingItemIds } },
              ...(trainingDocIds.length > 0
                ? [{ trainingDocumentId: { in: trainingDocIds } }]
                : []),
            ],
          },
          select: {
            traineeProfileId: true,
            campaignAssignmentId: true,
            campaignItemId: true,
            trainingDocumentId: true,
            eventType: true,
          },
        })
      : Promise.resolve([]),

    // Quiz Attempts
    quizItemIds.length > 0 || quizIds.length > 0
      ? client.quizAttempt.findMany({
          where: {
            traineeProfileId: { in: input.traineeProfileIds },
            status: { in: ['IN_PROGRESS', 'SUBMITTED'] },
            OR: [
              { campaignAssignmentId: { in: input.assignmentIds } },
              { campaignItemId: { in: quizItemIds } },
              ...(quizIds.length > 0 ? [{ quizId: { in: quizIds } }] : []),
            ],
          },
          select: {
            traineeProfileId: true,
            campaignAssignmentId: true,
            campaignItemId: true,
            quizId: true,
            status: true,
            quizResult: {
              select: {
                scorePercentage: true,
              },
            },
          },
        })
      : Promise.resolve([]),

    // Simulation Email Open Events
    simulationItemIds.length > 0 || simulatedEmailIds.length > 0
      ? client.interactionEvent.findMany({
          where: {
            traineeProfileId: { in: input.traineeProfileIds },
            eventType: 'SIMULATED_EMAIL_OPENED',
            OR: [
              { campaignAssignmentId: { in: input.assignmentIds } },
              { campaignItemId: { in: simulationItemIds } },
              ...(simulatedEmailIds.length > 0
                ? [{ simulatedEmailId: { in: simulatedEmailIds } }]
                : []),
            ],
          },
          select: {
            traineeProfileId: true,
            campaignAssignmentId: true,
            campaignItemId: true,
            simulatedEmailId: true,
            targetId: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const trainingEvents: TrainingProgressFact[] = rawTrainingEvents
    .filter((e) => e.eventType === 'TRAINING_VIEWED' || e.eventType === 'TRAINING_COMPLETED')
    .map((e) => ({
      traineeProfileId: e.traineeProfileId,
      campaignAssignmentId: e.campaignAssignmentId,
      campaignItemId: e.campaignItemId,
      trainingDocumentId: e.trainingDocumentId,
      eventType: e.eventType as 'TRAINING_VIEWED' | 'TRAINING_COMPLETED',
    }));

  const quizAttempts: QuizProgressFact[] = rawQuizAttempts
    .filter((a) => a.status === 'IN_PROGRESS' || a.status === 'SUBMITTED')
    .map((a) => ({
      traineeProfileId: a.traineeProfileId,
      campaignAssignmentId: a.campaignAssignmentId,
      campaignItemId: a.campaignItemId,
      quizId: a.quizId,
      status: a.status,
      scorePercentage: a.quizResult?.scorePercentage ?? null,
    }));

  const simulatedEmailEvents: SimulationProgressFact[] = rawSimulatedEmailEvents.map((e) => ({
    traineeProfileId: e.traineeProfileId,
    campaignAssignmentId: e.campaignAssignmentId,
    campaignItemId: e.campaignItemId,
    simulatedEmailId: e.simulatedEmailId,
    targetId: e.targetId,
  }));

  return {
    trainingEvents,
    quizAttempts,
    simulatedEmailEvents,
  };
}
