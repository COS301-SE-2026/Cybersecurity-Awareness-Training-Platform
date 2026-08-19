import type {
  CampaignDetailComponentItemDto,
  CampaignDetailItemDto,
} from '@insightful-phish/shared';

import type {
  CampaignDraftComponentItemState,
  CampaignDraftItemState,
} from './campaignManagement.types';

function toCampaignDraftComponentItem(
  item: CampaignDetailComponentItemDto,
): CampaignDraftComponentItemState {
  return {
    itemType: 'COMPONENT',
    campaignItemId: item.campaignItemId,
    componentType: item.componentType,
    contentId: item.contentId,
    title: item.title,
    description: item.description ?? null,
    isRequired: item.isRequired,
    sourceAvailable: item.sourceAvailable,
  };
}

export function toCampaignDraftItems(
  items: readonly CampaignDetailItemDto[],
): readonly CampaignDraftItemState[] {
  return [...items]
    .sort((left, right) => left.position - right.position)
    .map((item) => {
      if (item.itemType === 'COMPONENT') {
        return toCampaignDraftComponentItem(item);
      }

      return {
        itemType: 'GROUP',
        campaignItemId: item.campaignItemId,
        title: item.title,
        description: item.description ?? null,
        groupType: item.groupType,
        completionRule: item.completionRule,
        isRequired: item.isRequired,
        children: [...item.children]
          .sort((left, right) => left.position - right.position)
          .map(toCampaignDraftComponentItem),
      };
    });
}
