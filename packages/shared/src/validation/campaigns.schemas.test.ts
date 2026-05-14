import { describe, expect, it } from 'vitest';
import { learnerCampaignItemRequestParamsSchema } from './campaigns.schemas.js';

describe('campaign validation schemas', () => {
  it('accepts learner campaign item route params', () => {
    const result = learnerCampaignItemRequestParamsSchema.safeParse({
      campaignItemId: 'item-1',
    });

    expect(result.success).toBe(true);
  });

  it('rejects missing learner campaign item route params', () => {
    const result = learnerCampaignItemRequestParamsSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
