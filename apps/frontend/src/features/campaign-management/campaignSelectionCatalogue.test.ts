import type { CampaignCatalogueItemDto } from '@insightful-phish/shared';
import { expect, it, vi } from 'vitest';
import { loadCampaignSelectionCatalogue } from './campaignSelectionCatalogue';

it.each([{ kind: 'platform' } as const, { kind: 'organisation', organisationId: 'org' } as const])(
  'collects every eligible catalogue page in the current scope: %s',
  async (context) => {
    const first = Array.from(
      { length: 100 },
      (_, index) => ({ id: `content-${index}`, type: 'QUIZ' }) as CampaignCatalogueItemDto,
    );
    const getCampaignCatalogue = vi
      .fn()
      .mockResolvedValueOnce({ items: first, pagination: { totalPages: 3 } })
      .mockResolvedValueOnce({ items: [first[0]], pagination: { totalPages: 3 } })
      .mockResolvedValueOnce({
        items: [{ id: 'beyond-100', type: 'QUIZ' }],
        pagination: { totalPages: 3 },
      });
    const result = await loadCampaignSelectionCatalogue({ getCampaignCatalogue }, context);
    expect(result).toHaveLength(101);
    expect(result[100].id).toBe('beyond-100');
    expect(getCampaignCatalogue.mock.calls).toEqual(
      [1, 2, 3].map((page) => [context, { page, limit: 100 }]),
    );
  },
);

it('rejects an incomplete selection catalogue when a later page fails', async () => {
  const getCampaignCatalogue = vi
    .fn()
    .mockResolvedValueOnce({
      items: [{ id: 'content', type: 'QUIZ' }],
      pagination: { totalPages: 2 },
    })
    .mockRejectedValueOnce(new Error('Page unavailable'));
  await expect(
    loadCampaignSelectionCatalogue({ getCampaignCatalogue }, { kind: 'platform' }),
  ).rejects.toThrow('Page unavailable');
});
