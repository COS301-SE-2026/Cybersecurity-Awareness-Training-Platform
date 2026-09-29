import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findSubmittedQuizEvidence } from '../../../src/repositories/adaptive-quiz-evidence.repository.js';
import { collectQuizCategoryEvidence } from '../../../src/services/adaptive-quiz-evidence.service.js';

vi.mock('../../../src/repositories/adaptive-quiz-evidence.repository.js', () => ({
  findSubmittedQuizEvidence: vi.fn(),
}));

function quizResult(input: { directQuizId: string | null; selectedContentId?: string }) {
  return {
    id: 'result-1',
    scorePercentage: 80,
    attempt: {
      id: 'attempt-1',
      quizId: 'quiz-selected',
      submittedAt: new Date('2026-09-20T12:00:00.000Z'),
      campaignAssignmentId: 'assignment-1',
      campaignItemId: 'item-1',
      campaignAssignment: {
        campaignId: 'campaign-1',
        traineeProfileId: 'trainee-1',
        adaptiveResolutions: input.selectedContentId
          ? [{ campaignItemId: 'item-1', selectedContentId: input.selectedContentId }]
          : [],
      },
      campaignItem: { campaignId: 'campaign-1', quizId: input.directQuizId },
      quiz: { difficultyLevel: 'MEDIUM' as const },
      answers: [
        {
          awardedPoints: 1,
          question: {
            points: 1,
            categories: ['PHISHING_AND_SUSPICIOUS_MESSAGES' as const],
          },
        },
      ],
    },
  };
}

describe('adaptive Quiz evidence collection', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['direct component', quizResult({ directQuizId: 'quiz-selected' })],
    [
      'persisted adaptive selection',
      quizResult({ directQuizId: null, selectedContentId: 'quiz-selected' }),
    ],
  ])('collects evidence for %s content', async (_label, result) => {
    vi.mocked(findSubmittedQuizEvidence).mockResolvedValue([result]);

    await expect(collectQuizCategoryEvidence('trainee-1')).resolves.toHaveLength(1);
  });

  it('rejects evidence for content not selected by the adaptive occurrence', async () => {
    vi.mocked(findSubmittedQuizEvidence).mockResolvedValue([
      quizResult({ directQuizId: null, selectedContentId: 'quiz-other' }),
    ]);

    await expect(collectQuizCategoryEvidence('trainee-1')).resolves.toEqual([]);
  });
});
