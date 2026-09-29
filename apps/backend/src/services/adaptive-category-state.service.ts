import type {
  AdaptiveCategoryState,
  ScorableAdaptiveEvidenceFact,
} from './adaptive-evidence.types.js';
import { calculateAdaptiveCategoryStates } from './adaptive-category-state-calculator.js';
import { collectQuizCategoryEvidence } from './adaptive-quiz-evidence.service.js';
import { collectSimulatedInboxEvidence } from './adaptive-simulated-inbox-evidence.service.js';

export async function getAdaptiveCategoryStates(
  traineeProfileId: string,
): Promise<AdaptiveCategoryState[]> {
  const [quiz, simulatedInbox] = await Promise.all([
    collectQuizCategoryEvidence(traineeProfileId),
    collectSimulatedInboxEvidence(traineeProfileId),
  ]);
  const facts: ScorableAdaptiveEvidenceFact[] = [
    ...quiz,
    ...simulatedInbox.classifications,
    ...simulatedInbox.linkClicks,
  ];
  return calculateAdaptiveCategoryStates(facts, new Date());
}
