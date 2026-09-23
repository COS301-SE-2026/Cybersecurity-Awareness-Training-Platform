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
    percentage: number;
    wholeQuizScorePercentage: number;
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
    normalizedValue: number;
  };

export type SimulatedInboxLinkClickEvidence = EvidenceBase &
  CampaignOccurrence & {
    source: 'SIMULATED_INBOX_LINK_CLICK';
    eventId: string;
    simulatedEmailId: string;
    categories: readonly ContentCategoryDto[];
    expectedClassification: EmailClassificationDto;
    normalizedValue: number;
  };

export type EligiblePortalAdaptiveStage =
  | 'PORTAL_VISITED'
  | 'PORTAL_IDENTIFIER_FIELD_INTERACTED'
  | 'PORTAL_CREDENTIAL_FIELD_INTERACTED'
  | 'CREDENTIAL_SUBMISSION_ATTEMPTED';

// #555 supplies browser-confirmed stages; managed-link requests are not evidence.
export type RealEmailPortalBehaviourEvidence = EvidenceBase & {
  source: 'PHISHING_PORTAL_INTERACTION';
  channel: 'REAL_EMAIL';
  stage: EligiblePortalAdaptiveStage;
  phishingSimulationId: string;
  plannedMessageId: string;
  campaignId: string;
  campaignAssignmentId: string | null;
  categories: readonly ContentCategoryDto[];
  expectedClassification: Extract<EmailClassificationDto, 'SUSPICIOUS' | 'PHISHING'>;
};

export type AdaptiveEvidenceFact =
  | QuizCategoryEvidence
  | ClassificationEvidence
  | SimulatedInboxLinkClickEvidence
  | RealEmailPortalBehaviourEvidence;

export type ScorableAdaptiveEvidenceFact = Exclude<
  AdaptiveEvidenceFact,
  RealEmailPortalBehaviourEvidence
>;

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
      ]);
    case 'PHISHING_PORTAL_INTERACTION':
      return JSON.stringify([fact.source, fact.channel, fact.plannedMessageId]);
  }
}
