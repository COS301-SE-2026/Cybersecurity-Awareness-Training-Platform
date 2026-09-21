import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as RuntimeRepository from '../../../src/repositories/campaign-item-runtime.repository.js';
import { resolveAdaptiveSlot } from '../../../src/services/adaptive-slot-resolution.service.js';
import { resolveCampaignItemRuntime } from '../../../src/services/campaign-item-runtime.service.js';

vi.mock('../../../src/repositories/campaign-item-runtime.repository.js', () => ({
  findCampaignItemRuntimeContext: vi.fn(),
}));
vi.mock('../../../src/services/adaptive-slot-resolution.service.js', () => ({
  resolveAdaptiveSlot: vi.fn(),
}));

describe('campaign item runtime resolution', () => {
  beforeEach(() => vi.clearAllMocks());

  it('delegates adaptive selection and preserves the logical Campaign item identity', async () => {
    vi.mocked(RuntimeRepository.findCampaignItemRuntimeContext).mockResolvedValue({
      id: 'item-1',
      campaignId: 'campaign-1',
      itemType: 'ADAPTIVE',
      componentType: 'QUIZ',
      trainingDocumentId: null,
      quizId: null,
      simulationId: null,
      campaign: { assignments: [{ id: 'assignment-1' }] },
    } as never);
    vi.mocked(resolveAdaptiveSlot).mockResolvedValue({
      selectedContentId: 'quiz-hard',
    } as never);

    await expect(resolveCampaignItemRuntime('item-1', 'trainee-1')).resolves.toEqual({
      campaignId: 'campaign-1',
      campaignAssignmentId: 'assignment-1',
      campaignItemId: 'item-1',
      componentType: 'QUIZ',
      contentId: 'quiz-hard',
      itemType: 'ADAPTIVE',
    });
    expect(resolveAdaptiveSlot).toHaveBeenCalledWith({
      campaignAssignmentId: 'assignment-1',
      campaignItemId: 'item-1',
      traineeProfileId: 'trainee-1',
    });
  });

  it('leaves ordinary component execution unchanged', async () => {
    vi.mocked(RuntimeRepository.findCampaignItemRuntimeContext).mockResolvedValue({
      id: 'item-2',
      campaignId: 'campaign-1',
      itemType: 'COMPONENT',
      componentType: 'TRAINING_DOCUMENT',
      trainingDocumentId: 'document-1',
      quizId: null,
      simulationId: null,
      campaign: { assignments: [{ id: 'assignment-1' }] },
    } as never);

    const result = await resolveCampaignItemRuntime('item-2', 'trainee-1');

    expect(result?.contentId).toBe('document-1');
    expect(resolveAdaptiveSlot).not.toHaveBeenCalled();
  });
});
