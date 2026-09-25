import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as AiQuizGenerationModule from '../../../src/services/ai-quiz-generation.service.js';
import { getApprovedOrganisationContextForAi } from '../../../src/services/ai-organisation-context.service.js';
import { generateQuizDraft } from '../../../src/services/ai-builder-generation.service.js';
import { createAiQuizGenerationService } from '../../../src/services/ai-quiz-generation.service.js';

vi.mock('../../../src/services/ai-organisation-context.service.js', () => ({
  getApprovedOrganisationContextForAi: vi.fn(),
}));

vi.mock('../../../src/services/ai-quiz-generation.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof AiQuizGenerationModule>();
  return { ...actual, createAiQuizGenerationService: vi.fn() };
});

describe('AI builder Quiz generation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('replaces provider labels with positional labels without changing answer content', async () => {
    const generateDraft = vi.fn().mockResolvedValue({
      title: 'Phishing Quiz',
      description: null,
      passThresholdPercentage: 80,
      difficultyLevel: 'EASY',
      questions: [
        {
          prompt: 'Why do phishing messages create urgency?',
          questionType: 'SINGLE_CHOICE',
          position: 1,
          points: 1,
          shuffleOptions: false,
          minSelections: null,
          maxSelections: null,
          categories: ['PHISHING_AND_SUSPICIOUS_MESSAGES'],
          answerOptions: [
            {
              label: 'To create a sense of',
              text: 'To create a sense of urgency',
              position: 1,
              isCorrect: true,
              feedbackText: 'Urgency pressures people to skip normal checks.',
            },
            {
              label: 'An arbitrary provider label',
              text: 'To make the message easier to archive',
              position: 2,
              isCorrect: false,
              feedbackText: 'Archiving is unrelated to the pressure tactic.',
            },
          ],
        },
      ],
    });
    vi.mocked(getApprovedOrganisationContextForAi).mockResolvedValue([]);
    vi.mocked(createAiQuizGenerationService).mockReturnValue({ generateDraft } as never);

    const result = await generateQuizDraft({
      userId: '11111111-1111-4111-8111-111111111111',
      organisationId: '22222222-2222-4222-8222-222222222222',
      request: {
        requestedDifficulty: 'EASY',
        requestedCategories: ['PHISHING_AND_SUSPICIOUS_MESSAGES'],
        topic: 'Phishing urgency',
        learningObjective: 'Recognise urgency as a phishing tactic.',
      },
    });

    expect(result.questions[0]?.answerOptions).toEqual([
      {
        label: 'A',
        text: 'To create a sense of urgency',
        position: 0,
        isCorrect: true,
        feedbackText: 'Urgency pressures people to skip normal checks.',
      },
      {
        label: 'B',
        text: 'To make the message easier to archive',
        position: 1,
        isCorrect: false,
        feedbackText: 'Archiving is unrelated to the pressure tactic.',
      },
    ]);
  });
});
