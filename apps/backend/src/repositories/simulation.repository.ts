import { createHash } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import type { Prisma, AssignmentStatus, InteractionEventType } from '../generated/prisma/client.js';
import { enforceProgressWriteGuard } from './campaign-progress-guard.repository.js';

type SimulatedEmailInteractionEventType = InteractionEventType;

function computeAdvisoryLockKey(parts: string[]): [number, number] {
  const hash = createHash('sha256').update(parts.join('\0')).digest();
  return [hash.readInt32BE(0), hash.readInt32BE(4)];
}

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

export function hasExistingSimulationEmailHistory(input: {
  traineeProfileId: string;
  campaignAssignmentId: string;
  campaignItemId: string;
  simulatedEmailId: string;
}) {
  return prisma.interactionEvent.findFirst({
    where: {
      traineeProfileId: input.traineeProfileId,
      campaignAssignmentId: input.campaignAssignmentId,
      campaignItemId: input.campaignItemId,
      simulatedEmailId: input.simulatedEmailId,
    },
    select: {
      id: true,
    },
  });
}

export async function recordEmailOpenedEventTx(input: {
  campaignId: string;
  traineeProfileId: string;
  assignmentId: string;
  itemId: string;
  emailId: string;
  lockKeyA?: number;
  lockKeyB?: number;
  checkedAt: Date;
}) {
  const [lockKeyA, lockKeyB] =
    input.lockKeyA !== undefined && input.lockKeyB !== undefined
      ? [input.lockKeyA, input.lockKeyB]
      : computeAdvisoryLockKey([
          'SIMULATED_EMAIL_OPENED',
          input.traineeProfileId,
          input.assignmentId,
          input.itemId,
          input.emailId,
        ]);

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKeyA}, ${lockKeyB})`;

    const guard = await enforceProgressWriteGuard(tx, {
      campaignId: input.campaignId,
      campaignAssignmentId: input.assignmentId,
      campaignItemId: input.itemId,
      traineeProfileId: input.traineeProfileId,
      checkedAt: input.checkedAt,
      requiredStatus: 'ACTIVE',
    });

    if (!guard.allowed) {
      return guard;
    }

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
      return { allowed: true as const, value: undefined };
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

    return { allowed: true as const, value: undefined };
  });
}

export async function createSimulationInteractionEventGuarded(input: {
  campaignId: string;
  traineeProfileId: string;
  campaignAssignmentId: string;
  campaignItemId: string;
  eventType: SimulatedEmailInteractionEventType;
  simulatedEmailId: string;
  checkedAt: Date;
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

    const event = await tx.interactionEvent.create({
      data: {
        traineeProfileId: input.traineeProfileId,
        campaignAssignmentId: input.campaignAssignmentId,
        campaignItemId: input.campaignItemId,
        eventType: input.eventType,
        targetType: 'SIMULATED_EMAIL',
        targetId: input.simulatedEmailId,
        simulatedEmailId: input.simulatedEmailId,
      },
    });

    return {
      allowed: true as const,
      value: event,
    };
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
  campaignId: string;
  traineeProfileId: string;
  simulatedEmailId: string;
  assignmentId: string;
  itemId: string;
  selectedClassification: 'SAFE' | 'SUSPICIOUS' | 'PHISHING';
  freeTextReason?: string;
  isCorrect: boolean;
  selectedRedFlagIds?: string[];
  checkedAt: Date;
}) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const guard = await enforceProgressWriteGuard(tx, {
      campaignId: input.campaignId,
      campaignAssignmentId: input.assignmentId,
      campaignItemId: input.itemId,
      traineeProfileId: input.traineeProfileId,
      checkedAt: input.checkedAt,
      requiredStatus: 'ACTIVE',
    });

    if (!guard.allowed) {
      return guard;
    }

    const existing = await tx.emailClassificationResponse.findFirst({
      where: {
        traineeProfileId: input.traineeProfileId,
        simulatedEmailId: input.simulatedEmailId,
      },
    });

    if (existing) {
      return {
        allowed: false as const,
        reason: 'ALREADY_CLASSIFIED' as const,
      };
    }

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

    return {
      allowed: true as const,
      value: classificationResponse,
    };
  });
}
