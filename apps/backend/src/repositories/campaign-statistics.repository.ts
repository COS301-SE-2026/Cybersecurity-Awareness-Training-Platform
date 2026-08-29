import { prisma } from '../lib/prisma.js';
import type { PrismaClient, Prisma } from '../generated/prisma/client.js';

type DBClient = PrismaClient | Prisma.TransactionClient;

export type CampaignItemFact = {
  id: string;
  itemType: 'COMPONENT' | 'GROUP';
  componentType: 'TRAINING_DOCUMENT' | 'QUIZ' | 'SIMULATED_INBOX' | null;
  isRequired: boolean;
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
  items: CampaignItemFact[];
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
  campaignAssignmentId: string;
  campaignItemId: string;
  trainingDocumentId: string | null;
  eventType: 'TRAINING_VIEWED' | 'TRAINING_COMPLETED';
};

export type QuizProgressFact = {
  traineeProfileId: string;
  campaignAssignmentId: string;
  campaignItemId: string;
  quizId: string | null;
  status: 'IN_PROGRESS' | 'SUBMITTED';
  hasResult: boolean;
  scorePercentage: number | null;
};

export type SimulationProgressFact = {
  traineeProfileId: string;
  campaignAssignmentId: string;
  campaignItemId: string;
  simulatedEmailId: string | null;
  targetId: string;
};

export type CampaignProgressFactsResult = {
  trainingEvents: TrainingProgressFact[];
  quizAttempts: QuizProgressFact[];
  simulatedEmailEvents: SimulationProgressFact[];
};

/**
 * Loads campaign identity and all persisted campaign items with their component configurations.
 * Isolation: Scoped to the organisation's custom campaign or platform premade campaigns.
 */
export async function findCampaignWithItems(
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
        select: {
          id: true,
          itemType: true,
          componentType: true,
          isRequired: true,
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

  const items: CampaignItemFact[] = campaign.items.map((item) => ({
    id: item.id,
    itemType: item.itemType,
    componentType: item.componentType,
    isRequired: item.isRequired,
    trainingDocumentId: item.trainingDocumentId,
    quizId: item.quizId,
    simulationId: item.simulationId,
    simulatedInboxEmailIds: item.simulation?.simulatedInbox?.emails.map((email) => email.id) ?? [],
  }));

  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    campaignType: campaign.campaignType,
    status: campaign.status,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    items,
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
 * Loads interaction events, quiz attempts, and simulation open events strictly scoped
 * to the specified assignments and campaign items to prevent cross-campaign content bleed.
 */
export async function findCampaignProgressFacts(
  input: {
    traineeProfileIds: string[];
    assignmentIds: string[];
    trainingItemIds: string[];
    quizItemIds: string[];
    simulationItemIds: string[];
  },
  client: DBClient = prisma,
): Promise<CampaignProgressFactsResult> {
  if (
    input.traineeProfileIds.length === 0 ||
    input.assignmentIds.length === 0 ||
    (input.trainingItemIds.length === 0 &&
      input.quizItemIds.length === 0 &&
      input.simulationItemIds.length === 0)
  ) {
    return {
      trainingEvents: [],
      quizAttempts: [],
      simulatedEmailEvents: [],
    };
  }

  const [rawTrainingEvents, rawQuizAttempts, rawSimulatedEmailEvents] = await Promise.all([
    // Training Events strictly scoped to cohort assignment and campaign item
    input.trainingItemIds.length > 0
      ? client.interactionEvent.findMany({
          where: {
            traineeProfileId: { in: input.traineeProfileIds },
            campaignAssignmentId: { in: input.assignmentIds },
            campaignItemId: { in: input.trainingItemIds },
            eventType: { in: ['TRAINING_VIEWED', 'TRAINING_COMPLETED'] },
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

    // Quiz Attempts strictly scoped to cohort assignment and campaign item
    input.quizItemIds.length > 0
      ? client.quizAttempt.findMany({
          where: {
            traineeProfileId: { in: input.traineeProfileIds },
            campaignAssignmentId: { in: input.assignmentIds },
            campaignItemId: { in: input.quizItemIds },
            status: { in: ['IN_PROGRESS', 'SUBMITTED'] },
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

    // Simulation Email Open Events strictly scoped to cohort assignment and campaign item
    input.simulationItemIds.length > 0
      ? client.interactionEvent.findMany({
          where: {
            traineeProfileId: { in: input.traineeProfileIds },
            campaignAssignmentId: { in: input.assignmentIds },
            campaignItemId: { in: input.simulationItemIds },
            eventType: 'SIMULATED_EMAIL_OPENED',
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
    .filter(
      (e) =>
        e.campaignAssignmentId !== null &&
        e.campaignItemId !== null &&
        (e.eventType === 'TRAINING_VIEWED' || e.eventType === 'TRAINING_COMPLETED'),
    )
    .map((e) => ({
      traineeProfileId: e.traineeProfileId,
      campaignAssignmentId: e.campaignAssignmentId as string,
      campaignItemId: e.campaignItemId as string,
      trainingDocumentId: e.trainingDocumentId,
      eventType: e.eventType as 'TRAINING_VIEWED' | 'TRAINING_COMPLETED',
    }));

  const quizAttempts: QuizProgressFact[] = rawQuizAttempts
    .filter(
      (a) =>
        a.campaignAssignmentId !== null &&
        a.campaignItemId !== null &&
        (a.status === 'IN_PROGRESS' || a.status === 'SUBMITTED'),
    )
    .map((a) => ({
      traineeProfileId: a.traineeProfileId,
      campaignAssignmentId: a.campaignAssignmentId as string,
      campaignItemId: a.campaignItemId as string,
      quizId: a.quizId,
      status: a.status,
      hasResult: a.quizResult !== null,
      scorePercentage: a.quizResult?.scorePercentage ?? null,
    }));

  const simulatedEmailEvents: SimulationProgressFact[] = rawSimulatedEmailEvents
    .filter((e) => e.campaignAssignmentId !== null && e.campaignItemId !== null)
    .map((e) => ({
      traineeProfileId: e.traineeProfileId,
      campaignAssignmentId: e.campaignAssignmentId as string,
      campaignItemId: e.campaignItemId as string,
      simulatedEmailId: e.simulatedEmailId,
      targetId: e.targetId,
    }));

  return {
    trainingEvents,
    quizAttempts,
    simulatedEmailEvents,
  };
}
