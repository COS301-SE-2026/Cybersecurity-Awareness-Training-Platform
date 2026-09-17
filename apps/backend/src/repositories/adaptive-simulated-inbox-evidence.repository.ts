import { prisma } from '../lib/prisma.js';

const childEmailEvidenceSelection = {
  id: true,
  difficultyLevel: true,
  categories: true,
  expectedClassification: true,
  inbox: { select: { simulationId: true } },
} as const;

export function findClassificationEvidence(traineeProfileId: string) {
  return prisma.emailClassificationResponse.findMany({
    where: {
      traineeProfileId,
      campaignAssignmentId: { not: null },
      campaignItemId: { not: null },
    },
    select: {
      id: true,
      campaignAssignmentId: true,
      campaignItemId: true,
      selectedClassification: true,
      isCorrect: true,
      submittedAt: true,
      campaignAssignment: { select: { campaignId: true, traineeProfileId: true } },
      campaignItem: { select: { campaignId: true, simulationId: true } },
      simulatedEmail: { select: childEmailEvidenceSelection },
    },
    orderBy: { submittedAt: 'desc' },
  });
}

export function findSimulatedInboxLinkClickEvidence(traineeProfileId: string) {
  return prisma.interactionEvent.findMany({
    where: {
      traineeProfileId,
      eventType: 'SIMULATED_EMAIL_LINK_CLICKED',
      targetType: 'SIMULATED_EMAIL',
      campaignAssignmentId: { not: null },
      campaignItemId: { not: null },
      simulatedEmailId: { not: null },
    },
    select: {
      id: true,
      targetId: true,
      simulatedEmailId: true,
      campaignAssignmentId: true,
      campaignItemId: true,
      occurredAt: true,
      campaignAssignment: { select: { campaignId: true, traineeProfileId: true } },
      campaignItem: { select: { campaignId: true, simulationId: true } },
      simulatedEmail: { select: childEmailEvidenceSelection },
    },
    orderBy: { occurredAt: 'desc' },
  });
}
