import { describe, expect, it } from 'vitest';

import { developmentCampaignManagementClient } from './developmentCampaignManagementClient';

const PRIMARY_ORGANISATION_ID = '11111111-1111-4111-8111-111111111111';
const SECONDARY_ORGANISATION_ID = '22222222-2222-4222-8222-222222222222';
const DRAFT_CAMPAIGN_ID = '10000000-0000-4000-8000-000000000001';
const ACTIVE_CAMPAIGN_ID = '10000000-0000-4000-8000-000000000002';

describe('developmentCampaignManagementClient.getCampaignDetail', () => {
  it('returns valid minimal Draft detail for the matching organisation', async () => {
    const detail = await developmentCampaignManagementClient.getCampaignDetail(
      {
        kind: 'organisation',
        organisationId: PRIMARY_ORGANISATION_ID,
      },
      DRAFT_CAMPAIGN_ID,
    );

    expect(detail).toMatchObject({
      id: DRAFT_CAMPAIGN_ID,
      organisationId: PRIMARY_ORGANISATION_ID,
      name: 'New starter security',
      status: 'DRAFT',
      items: [],
    });
  });

  it('retireves non-Draft Campaign detail', async () => {
    const detail = await developmentCampaignManagementClient.getCampaignDetail(
      {
        kind: 'organisation',
        organisationId: PRIMARY_ORGANISATION_ID,
      },
      ACTIVE_CAMPAIGN_ID,
    );
    expect(detail.status).toBe('ACTIVE');
  });

  it('rejects a Campaign requested through the wrong organisation context', async () => {
    await expect(
      developmentCampaignManagementClient.getCampaignDetail(
        {
          kind: 'organisation',
          organisationId: SECONDARY_ORGANISATION_ID,
        },
        DRAFT_CAMPAIGN_ID,
      ),
    ).rejects.toThrow('Campaign not found.');
  });
});
