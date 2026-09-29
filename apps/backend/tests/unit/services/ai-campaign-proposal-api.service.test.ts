import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findActiveOrganisationTraineesForCampaignProposal,
  findEligibleOrganisationTraineeForCampaignProposal,
} from '../../../src/repositories/organisation-trainee.repository.js';
import {
  AiCampaignProposalApiError,
  generateOrganisationFollowUpCampaignProposal,
  listOrganisationCampaignProposalTrainees,
} from '../../../src/services/ai-campaign-proposal-api.service.js';
import { getAdaptiveCategoryStates } from '../../../src/services/adaptive-category-state.service.js';
import { requireOrganisationCampaignManagementAccess } from '../../../src/services/campaign-management.service.js';

vi.mock('../../../src/repositories/organisation-trainee.repository.js', () => ({
  findActiveOrganisationTraineesForCampaignProposal: vi.fn(),
  findEligibleOrganisationTraineeForCampaignProposal: vi.fn(),
}));
vi.mock('../../../src/services/adaptive-category-state.service.js', () => ({
  getAdaptiveCategoryStates: vi.fn(),
}));
vi.mock('../../../src/services/campaign-management.service.js', () => ({
  requireOrganisationCampaignManagementAccess: vi.fn(),
}));

const actor = {
  userId: 'admin-1',
  userType: 'ORGANISATION_ADMIN' as const,
  authStatus: 'ACTIVE' as const,
};

describe('AI Campaign proposal trainee eligibility', () => {
  const traineeProfileId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => vi.clearAllMocks());

  it('lists the minimal selector data after Campaign-management access succeeds', async () => {
    vi.mocked(findActiveOrganisationTraineesForCampaignProposal).mockResolvedValue([
      {
        traineeProfileId,
        traineeProfile: {
          user: { firstName: 'Taylor', lastName: 'Ng', email: 'taylor@example.com' },
        },
      },
    ]);

    await expect(
      listOrganisationCampaignProposalTrainees({ actor, organisationId: 'org-1' }),
    ).resolves.toEqual({
      trainees: [{ traineeProfileId, displayName: 'Taylor Ng' }],
    });
    expect(requireOrganisationCampaignManagementAccess).toHaveBeenCalledWith(actor, 'org-1');
  });

  it('rejects a stale ineligible selection before loading evidence or invoking AI', async () => {
    vi.mocked(findEligibleOrganisationTraineeForCampaignProposal).mockResolvedValue(null);

    await expect(
      generateOrganisationFollowUpCampaignProposal({
        actor,
        organisationId: 'org-1',
        request: { traineeProfileId: 'trainee-1', objective: 'Reinforce phishing awareness' },
      }),
    ).rejects.toEqual(
      new AiCampaignProposalApiError(
        404,
        'TRAINEE_NOT_FOUND',
        'Active organisation trainee not found',
        false,
      ),
    );
    expect(getAdaptiveCategoryStates).not.toHaveBeenCalled();
  });
});
