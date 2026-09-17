import type {
  ContentCategoryDto,
  DifficultyLevelDto,
  EmailClassificationDto,
} from '@insightful-phish/shared';

type EvidenceBase = {
  sourceDifficulty: DifficultyLevelDto;
  occurredAt: Date;
};

type CampaignOccurrence = {
  campaignId: string;
  campaignAssignmentId: string;
  campaignItemId: string;
};

export type QuizCategoryEvidence = EvidenceBase &
  CampaignOccurrence & {
    source: 'QUIZ_CATEGORY';
    quizResultId: string;
    attemptId: string;
    quizId: string;
    category: ContentCategoryDto;
    awardedPoints: number;
    possiblePoints: number;
  };

export type ClassificationEvidence = EvidenceBase &
  CampaignOccurrence & {
    source: 'CLASSIFICATION';
    responseId: string;
    simulatedEmailId: string;
    categories: readonly ContentCategoryDto[];
    expectedClassification: EmailClassificationDto;
    selectedClassification: EmailClassificationDto;
    isCorrect: boolean;
  };

export type SimulatedInboxLinkClickEvidence = EvidenceBase &
  CampaignOccurrence & {
    source: 'SIMULATED_INBOX_LINK_CLICK';
    eventId: string;
    simulatedEmailId: string;
    categories: readonly ContentCategoryDto[];
    expectedClassification: EmailClassificationDto;
  };

// Real-email tracking is owned by #555; it has no Campaign item occurrence.
export type RealEmailLinkClickEvidence = EvidenceBase & {
  source: 'REAL_EMAIL_LINK_CLICK';
  eventId: string;
  phishingSimulationId: string;
  messageId: string;
  campaignId: string;
  campaignAssignmentId: string;
  categories: readonly ContentCategoryDto[];
  expectedClassification: EmailClassificationDto;
};

export type AdaptiveEvidenceFact =
  | QuizCategoryEvidence
  | ClassificationEvidence
  | SimulatedInboxLinkClickEvidence
  | RealEmailLinkClickEvidence;

/** Backend-only Revision 1 fixture until #557 owns the shared result contract. */
export type AdaptiveCategoryState = {
  category: ContentCategoryDto;
  evidenceStatus: 'SUFFICIENT' | 'INSUFFICIENT';
  evidenceCount: number;
  recommendedDifficulty: DifficultyLevelDto;
  resolutionBasis: 'EVIDENCE' | 'FALLBACK';
  calculatedAt: string;
};

export function evidenceOccurrenceKey(fact: AdaptiveEvidenceFact): string {
  switch (fact.source) {
    case 'QUIZ_CATEGORY':
      return JSON.stringify([
        fact.source,
        fact.campaignAssignmentId,
        fact.campaignItemId,
        fact.attemptId,
        fact.quizResultId,
      ]);
    case 'CLASSIFICATION':
      return JSON.stringify([
        fact.source,
        fact.campaignAssignmentId,
        fact.campaignItemId,
        fact.simulatedEmailId,
        fact.responseId,
      ]);
    case 'SIMULATED_INBOX_LINK_CLICK':
      return JSON.stringify([
        fact.source,
        fact.campaignAssignmentId,
        fact.campaignItemId,
        fact.simulatedEmailId,
        fact.eventId,
      ]);
    case 'REAL_EMAIL_LINK_CLICK':
      return JSON.stringify([fact.source, fact.phishingSimulationId, fact.messageId, fact.eventId]);
  }
}
