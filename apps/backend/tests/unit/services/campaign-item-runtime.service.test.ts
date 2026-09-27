import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as RuntimeRepository from '../../../src/repositories/campaign-item-runtime.repository.js';
import * as ResolutionRepository from '../../../src/repositories/adaptive-campaign-resolution.repository.js';
import { resolveAdaptiveSlot } from '../../../src/services/adaptive-slot-resolution.service.js';
import {
  resolveCampaignItemRuntime,
  resolvePersistedCampaignItemRuntime,
} from '../../../src/services/campaign-item-runtime.service.js';

vi.mock('../../../src/repositories/campaign-item-runtime.repository.js', () => ({
  findCampaignItemRuntimeContext: vi.fn(),
}));
vi.mock('../../../src/repositories/adaptive-campaign-resolution.repository.js', () => ({
  findAdaptiveResolutionForTrainee: vi.fn(),
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

  it('reads an existing adaptive resolution without recalculating it', async () => {
    vi.mocked(RuntimeRepository.findCampaignItemRuntimeContext).mockResolvedValue({
      id: 'item-1',
      campaignId: 'campaign-1',
      itemType: 'ADAPTIVE',
      componentType: 'SIMULATED_INBOX',
      trainingDocumentId: null,
      quizId: null,
      simulationId: null,
      campaign: { assignments: [{ id: 'assignment-1' }] },
    } as never);
    vi.mocked(ResolutionRepository.findAdaptiveResolutionForTrainee).mockResolvedValue({
      campaignId: 'campaign-1',
      selectedContentId: 'simulation-hard',
    } as never);

    await expect(
      resolvePersistedCampaignItemRuntime('item-1', 'trainee-1', 'assignment-1'),
    ).resolves.toMatchObject({
      campaignAssignmentId: 'assignment-1',
      campaignItemId: 'item-1',
      componentType: 'SIMULATED_INBOX',
      contentId: 'simulation-hard',
      itemType: 'ADAPTIVE',
    });
    expect(RuntimeRepository.findCampaignItemRuntimeContext).toHaveBeenCalledWith(
      'item-1',
      'trainee-1',
      'assignment-1',
    );
    expect(resolveAdaptiveSlot).not.toHaveBeenCalled();
  });

  it('does not initialize a missing persisted adaptive resolution', async () => {
    vi.mocked(RuntimeRepository.findCampaignItemRuntimeContext).mockResolvedValue({
      id: 'item-1',
      campaignId: 'campaign-1',
      itemType: 'ADAPTIVE',
      componentType: 'SIMULATED_INBOX',
      trainingDocumentId: null,
      quizId: null,
      simulationId: null,
      campaign: { assignments: [{ id: 'assignment-1' }] },
    } as never);
    vi.mocked(ResolutionRepository.findAdaptiveResolutionForTrainee).mockResolvedValue(null);

    await expect(
      resolvePersistedCampaignItemRuntime('item-1', 'trainee-1', 'assignment-1'),
    ).resolves.toBeNull();
    expect(resolveAdaptiveSlot).not.toHaveBeenCalled();
  });
});
