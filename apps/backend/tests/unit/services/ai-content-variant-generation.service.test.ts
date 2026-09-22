import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getApprovedOrganisationContextForAi } from '../../../src/services/ai-organisation-context.service.js';
import { AiContentVariantGenerationService } from '../../../src/services/ai-content-variant-generation.service.js';

vi.mock('../../../src/services/ai-organisation-context.service.js', () => ({
  getApprovedOrganisationContextForAi: vi.fn(),
}));

describe('AI content variant generation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('generates and reviews a Quiz variant using bounded source context', async () => {
    const quizGenerator = { generateDraft: vi.fn() };
    const qualityService = { reviewDrafts: vi.fn() };
    const draft = {
      title: 'Hard phishing quiz',
      description: null,
      passThresholdPercentage: 80,
      difficultyLevel: 'HARD' as const,
      questions: [],
    };
    vi.mocked(getApprovedOrganisationContextForAi).mockResolvedValue([]);
    quizGenerator.generateDraft.mockResolvedValue(draft);
    qualityService.reviewDrafts.mockResolvedValue({
      findings: [],
      semanticReviewStatus: 'COMPLETE',
    });
    const service = new AiContentVariantGenerationService(
      { generateDraft: vi.fn() } as never,
      quizGenerator as never,
      { generateDraft: vi.fn() } as never,
      qualityService as never,
    );
    const sourceConcept = {
      title: 'Medium phishing quiz',
      summary: 'Recognising suspicious links',
    };

    await expect(
      service.generateMissingVariant({
        actorUserId: '11111111-1111-4111-8111-111111111111',
        organisationId: '22222222-2222-4222-8222-222222222222',
        contentType: 'QUIZ',
        targetDifficulty: 'HARD',
        requestedCategories: ['PHISHING_AND_SUSPICIOUS_MESSAGES'],
        topic: 'Phishing',
        learningObjective: 'Recognise advanced phishing attempts',
        sourceConcept,
      }),
    ).resolves.toMatchObject({ contentType: 'QUIZ', draft, semanticReviewStatus: 'COMPLETE' });
    expect(quizGenerator.generateDraft).toHaveBeenCalledWith(
      expect.objectContaining({ requestedDifficulty: 'HARD' }),
      { organisationContext: [], sourceConcept },
    );
    expect(qualityService.reviewDrafts).toHaveBeenCalledOnce();
  });
});
