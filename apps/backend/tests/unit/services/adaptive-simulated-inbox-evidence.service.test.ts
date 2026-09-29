import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findClassificationEvidence,
  findSimulatedInboxLinkClickEvidence,
} from '../../../src/repositories/adaptive-simulated-inbox-evidence.repository.js';
import { collectSimulatedInboxEvidence } from '../../../src/services/adaptive-simulated-inbox-evidence.service.js';

vi.mock('../../../src/repositories/adaptive-simulated-inbox-evidence.repository.js', () => ({
  findClassificationEvidence: vi.fn(),
  findSimulatedInboxLinkClickEvidence: vi.fn(),
}));

function occurrence(input: { directSimulationId: string | null; selectedContentId?: string }) {
  return {
    campaignAssignmentId: 'assignment-1',
    campaignItemId: 'item-1',
    campaignAssignment: {
      campaignId: 'campaign-1',
      traineeProfileId: 'trainee-1',
      adaptiveResolutions: input.selectedContentId
        ? [{ campaignItemId: 'item-1', selectedContentId: input.selectedContentId }]
        : [],
    },
    campaignItem: { campaignId: 'campaign-1', simulationId: input.directSimulationId },
    simulatedEmail: {
      id: 'email-1',
      difficultyLevel: 'MEDIUM' as const,
      categories: ['PHISHING_AND_SUSPICIOUS_MESSAGES' as const],
      expectedClassification: 'PHISHING' as const,
      inbox: { simulationId: 'simulation-selected' },
    },
  };
}

function classification(input: { directSimulationId: string | null; selectedContentId?: string }) {
  return {
    id: 'response-1',
    ...occurrence(input),
    selectedClassification: 'PHISHING' as const,
    isCorrect: true,
    submittedAt: new Date('2026-09-20T12:00:00.000Z'),
  };
}

function linkEvent(input: { directSimulationId: string | null; selectedContentId?: string }) {
  return {
    id: 'event-1',
    ...occurrence(input),
    targetId: 'email-1',
    simulatedEmailId: 'email-1',
    occurredAt: new Date('2026-09-20T12:00:00.000Z'),
  };
}

describe('adaptive Simulated Inbox evidence collection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findClassificationEvidence).mockResolvedValue([]);
    vi.mocked(findSimulatedInboxLinkClickEvidence).mockResolvedValue([]);
  });

  it.each([
    ['direct component', { directSimulationId: 'simulation-selected' }],
    [
      'persisted adaptive selection',
      { directSimulationId: null, selectedContentId: 'simulation-selected' },
    ],
  ])('collects classification and link evidence for %s content', async (_label, input) => {
    vi.mocked(findClassificationEvidence).mockResolvedValue([classification(input)]);
    vi.mocked(findSimulatedInboxLinkClickEvidence).mockResolvedValue([linkEvent(input)]);

    await expect(collectSimulatedInboxEvidence('trainee-1')).resolves.toMatchObject({
      classifications: [{ responseId: 'response-1' }],
      linkClicks: [{ eventId: 'event-1' }],
    });
  });

  it('rejects evidence for content not selected by the adaptive occurrence', async () => {
    const input = { directSimulationId: null, selectedContentId: 'simulation-other' };
    vi.mocked(findClassificationEvidence).mockResolvedValue([classification(input)]);
    vi.mocked(findSimulatedInboxLinkClickEvidence).mockResolvedValue([linkEvent(input)]);

    await expect(collectSimulatedInboxEvidence('trainee-1')).resolves.toEqual({
      classifications: [],
      linkClicks: [],
    });
  });
});
