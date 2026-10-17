import type { CampaignCatalogueItemDto } from '@insightful-phish/shared';
import type { CampaignManagementClient } from './campaignManagementClient';
import type { CampaignManagementContext } from './campaignManagement.types';

export type CampaignSelectionCatalogueState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; items: readonly CampaignCatalogueItemDto[] };

export async function loadCampaignSelectionCatalogue(
  client: Pick<CampaignManagementClient, 'getCampaignCatalogue'>,
  context: CampaignManagementContext,
): Promise<CampaignCatalogueItemDto[]> {
  const items = new Map<string, CampaignCatalogueItemDto>();
  for (let page = 1; ; page++) {
    const response = await client.getCampaignCatalogue(context, { page, limit: 100 });
    for (const item of response.items) {
      items.set(`${item.type}:${item.id}`, item);
    }
    if (page >= response.pagination.totalPages) {
      return [...items.values()];
    }
  }
}
