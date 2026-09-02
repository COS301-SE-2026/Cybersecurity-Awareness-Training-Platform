import { describe, expect, it } from 'vitest';

import { CampaignManagementClientError } from './campaignManagementClient';

describe('CampaignManagementClientError', () => {
  it('supports backwards-compatible code-only construction', () => {
    const error = new CampaignManagementClientError('CAMPAIGN_CHANGED');

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: 'CampaignManagementClientError',
      code: 'CAMPAIGN_CHANGED',
      message: 'CAMPAIGN_CHANGED',
      status: undefined,
      details: undefined,
    });
  });

  it('preserves supplied API error metadata', () => {
    const details = { componentType: 'QUIZ' };
    const error = new CampaignManagementClientError('CAMPAIGN_CHANGED', {
      message: 'The Campaign was changed by another administrator.',
      status: 409,
      details,
    });

    expect(error).toMatchObject({
      code: 'CAMPAIGN_CHANGED',
      message: 'The Campaign was changed by another administrator.',
      status: 409,
      details,
    });
  });

  it('retains backend error codes outside the UI-handled set', () => {
    const error = new CampaignManagementClientError('DUPLICATE_CAMPAIGN_CONTENT');

    expect(error.code).toBe('DUPLICATE_CAMPAIGN_CONTENT');
  });
});
