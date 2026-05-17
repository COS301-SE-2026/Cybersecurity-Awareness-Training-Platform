import { describe, expect, it } from 'vitest';
import { traineeCampaignItemRequestParamsSchema } from './campaigns.schemas.js';

describe('campaign validation schemas', () => {
  it('accepts trainee campaign item route params', () => {
    const result = traineeCampaignItemRequestParamsSchema.safeParse({
      campaignItemId: '11111111-1111-1111-1111-111111111111',
    });

    expect(result.success).toBe(true);
  });

  it('rejects missing trainee campaign item route params', () => {
    const result = traineeCampaignItemRequestParamsSchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
