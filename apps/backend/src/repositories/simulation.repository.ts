import { prisma } from '../lib/prisma.js';
import type { Prisma, AssignmentStatus, InteractionEventType } from '../generated/prisma/client.js';
type SimulatedEmailInteractionEventType = InteractionEventType;

export async function findTraineeProfileByUserId(userId: string) {
  return prisma.traineeProfile.findUnique({
    where: { userId },
  });
}

export async function findSimulatedInboxCampaignItem(
  campaignItemId: string,
  traineeProfileId: string,
) {
  return prisma.campaignItem.findUnique({
    where: { id: campaignItemId },
    include: {
      simulation: {
        include: {
          simulatedInbox: {
            include: {
              emails: {
                orderBy: { receivedAt: 'desc' },
              },
            },
          },
        },
      },
      campaign: {
        include: {
          assignments: {
            where: {
              traineeProfileId,
              assignmentStatus: {
                in: [
                  'AVAILABLE',
                  'ASSIGNED',
                  'IN_PROGRESS',
                  'COMPLETED',
                ] satisfies AssignmentStatus[],
              },
            },
          },
        },
      },
    },
  });
}

export async function findOpenedEmailIds(input: {
  traineeProfileId: string;
  campaignAssignmentId: string;
  campaignItemId: string;
  emailIds: string[];
}): Promise<Set<string>> {
  if (input.emailIds.length === 0) {
    return new Set<string>();
  }

  const events = await prisma.interactionEvent.findMany({
    where: {
      traineeProfileId: input.traineeProfileId,
      campaignAssignmentId: input.campaignAssignmentId,
      campaignItemId: input.campaignItemId,
      eventType: 'SIMULATED_EMAIL_OPENED',
      targetType: 'SIMULATED_EMAIL',
      targetId: { in: input.emailIds },
      simulatedEmailId: { in: input.emailIds },
    },
    select: {
      simulatedEmailId: true,
    },
  });

  return new Set(
    events.map((event) => event.simulatedEmailId).filter((id): id is string => Boolean(id)),
  );
}

export async function findSimulatedEmailWithAccess(
  emailId: string,
  traineeProfileId: string,
  includeRedFlags = false,
) {
  return prisma.simulatedEmail.findUnique({
    where: { id: emailId },
    include: {
      redFlags: includeRedFlags,
      inbox: {
        include: {
          simulation: {
            include: {
              campaignItems: {
                include: {
                  simulation: {
                    include: {
                      simulatedInbox: true,
                    },
                  },
                  campaign: {
                    include: {
                      assignments: {
                        where: {
                          traineeProfileId,
                          assignmentStatus: {
                            in: [
                              'AVAILABLE',
                              'ASSIGNED',
                              'IN_PROGRESS',
                              'COMPLETED',
                            ] as AssignmentStatus[],
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function recordEmailOpenedEventTx(input: {
  traineeProfileId: string;
  assignmentId: string;
  itemId: string;
  emailId: string;
  lockKeyA: number;
  lockKeyB: number;
}) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${input.lockKeyA}, ${input.lockKeyB})`;

    const existingOpenEvent = await tx.interactionEvent.findFirst({
      where: {
        traineeProfileId: input.traineeProfileId,
        campaignAssignmentId: input.assignmentId,
        campaignItemId: input.itemId,
        eventType: 'SIMULATED_EMAIL_OPENED',
        targetType: 'SIMULATED_EMAIL',
        targetId: input.emailId,
        simulatedEmailId: input.emailId,
      },
      select: {
        id: true,
      },
    });

    if (existingOpenEvent) {
      return;
    }

    await tx.interactionEvent.create({
      data: {
        traineeProfileId: input.traineeProfileId,
        campaignAssignmentId: input.assignmentId,
        campaignItemId: input.itemId,
        eventType: 'SIMULATED_EMAIL_OPENED',
        targetType: 'SIMULATED_EMAIL',
        targetId: input.emailId,
        simulatedEmailId: input.emailId,
      },
    });
  });
}

export async function createSimulationInteractionEvent(input: {
  traineeProfileId: string;
  assignmentId: string;
  itemId: string;
  eventType: SimulatedEmailInteractionEventType;
  emailId: string;
}) {
  return prisma.interactionEvent.create({
    data: {
      traineeProfileId: input.traineeProfileId,
      campaignAssignmentId: input.assignmentId,
      campaignItemId: input.itemId,
      eventType: input.eventType,
      targetType: 'SIMULATED_EMAIL',
      targetId: input.emailId,
      simulatedEmailId: input.emailId,
    },
  });
}

export async function findExistingClassificationResponse(
  traineeProfileId: string,
  simulatedEmailId: string,
) {
  return prisma.emailClassificationResponse.findFirst({
    where: {
      traineeProfileId,
      simulatedEmailId,
    },
  });
}

export async function createClassificationResponseTx(input: {
  traineeProfileId: string;
  simulatedEmailId: string;
  assignmentId: string;
  itemId: string;
  selectedClassification: 'SAFE' | 'SUSPICIOUS' | 'PHISHING';
  freeTextReason?: string;
  isCorrect: boolean;
  selectedRedFlagIds?: string[];
}) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const classificationResponse = await tx.emailClassificationResponse.create({
      data: {
        traineeProfileId: input.traineeProfileId,
        simulatedEmailId: input.simulatedEmailId,
        campaignAssignmentId: input.assignmentId,
        campaignItemId: input.itemId,
        selectedClassification: input.selectedClassification,
        freeTextReason: input.freeTextReason,
        isCorrect: input.isCorrect,
        ...(input.selectedRedFlagIds && input.selectedRedFlagIds.length > 0
          ? {
              selectedRedFlags: {
                create: input.selectedRedFlagIds.map((redFlagId: string) => ({
                  emailRedFlagId: redFlagId,
                })),
              },
            }
          : {}),
      },
    });

    await tx.interactionEvent.create({
      data: {
        traineeProfileId: input.traineeProfileId,
        campaignAssignmentId: input.assignmentId,
        campaignItemId: input.itemId,
        eventType: 'SIMULATED_EMAIL_CLASSIFIED',
        targetType: 'SIMULATED_EMAIL',
        targetId: input.simulatedEmailId,
        simulatedEmailId: input.simulatedEmailId,
        emailClassificationResponseId: classificationResponse.id,
      },
    });

    return classificationResponse;
  });
}
