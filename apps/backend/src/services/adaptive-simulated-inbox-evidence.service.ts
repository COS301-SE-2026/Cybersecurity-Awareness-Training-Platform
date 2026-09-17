import {
  findClassificationEvidence,
  findSimulatedInboxLinkClickEvidence,
} from '../repositories/adaptive-simulated-inbox-evidence.repository.js';
import type {
  ClassificationEvidence,
  SimulatedInboxLinkClickEvidence,
} from './adaptive-evidence.types.js';
import { classificationEvidenceValue, linkClickEvidenceValue } from './adaptive-scoring-policy.js';

type CampaignContext = {
  campaignAssignmentId: string | null;
  campaignItemId: string | null;
  campaignAssignment: { campaignId: string; traineeProfileId: string } | null;
  campaignItem: { campaignId: string; simulationId: string | null } | null;
  simulatedEmail: { id: string; inbox: { simulationId: string } } | null;
};

function hasValidOccurrence(record: CampaignContext, traineeProfileId: string): boolean {
  return Boolean(
    record.campaignAssignmentId &&
    record.campaignItemId &&
    record.campaignAssignment?.traineeProfileId === traineeProfileId &&
    record.campaignAssignment?.campaignId === record.campaignItem?.campaignId &&
    record.campaignItem?.simulationId === record.simulatedEmail?.inbox.simulationId,
  );
}

export async function collectSimulatedInboxEvidence(traineeProfileId: string): Promise<{
  classifications: ClassificationEvidence[];
  linkClicks: SimulatedInboxLinkClickEvidence[];
}> {
  const [responses, events] = await Promise.all([
    findClassificationEvidence(traineeProfileId),
    findSimulatedInboxLinkClickEvidence(traineeProfileId),
  ]);

  const classifications: ClassificationEvidence[] = responses.flatMap((response) => {
    if (!hasValidOccurrence(response, traineeProfileId)) return [];
    const { campaignAssignment, campaignAssignmentId, campaignItemId, simulatedEmail } = response;
    if (!campaignAssignment || !campaignAssignmentId || !campaignItemId || !simulatedEmail)
      return [];
    return [
      {
        source: 'CLASSIFICATION',
        campaignId: campaignAssignment.campaignId,
        campaignAssignmentId,
        campaignItemId,
        responseId: response.id,
        simulatedEmailId: simulatedEmail.id,
        sourceDifficulty: simulatedEmail.difficultyLevel,
        categories: [...new Set(simulatedEmail.categories)],
        expectedClassification: simulatedEmail.expectedClassification,
        selectedClassification: response.selectedClassification,
        isCorrect: response.isCorrect,
        normalizedValue: classificationEvidenceValue(response.isCorrect),
        occurredAt: response.submittedAt,
      },
    ];
  });

  const linkClicks: SimulatedInboxLinkClickEvidence[] = events.flatMap((event) => {
    if (
      !hasValidOccurrence(event, traineeProfileId) ||
      event.simulatedEmailId !== event.simulatedEmail?.id ||
      event.targetId !== event.simulatedEmailId
    )
      return [];
    const { campaignAssignment, campaignAssignmentId, campaignItemId, simulatedEmail } = event;
    if (!campaignAssignment || !campaignAssignmentId || !campaignItemId || !simulatedEmail)
      return [];
    return [
      {
        source: 'SIMULATED_INBOX_LINK_CLICK',
        campaignId: campaignAssignment.campaignId,
        campaignAssignmentId,
        campaignItemId,
        eventId: event.id,
        simulatedEmailId: simulatedEmail.id,
        sourceDifficulty: simulatedEmail.difficultyLevel,
        expectedClassification: simulatedEmail.expectedClassification,
        categories: [...new Set(simulatedEmail.categories)],
        normalizedValue: linkClickEvidenceValue(simulatedEmail.expectedClassification),
        occurredAt: event.occurredAt,
      },
    ];
  });

  return { classifications, linkClicks };
}
