import type {
  CampaignDetailAdaptiveItemDto,
  CampaignDetailComponentItemDto,
  CampaignDetailConsumableItemDto,
  CampaignDetailItemDto,
} from '@insightful-phish/shared';

import type {
  CampaignDraftAdaptiveItemState,
  CampaignDraftComponentItemState,
  CampaignDraftConsumableItemState,
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
    ...(item.componentType === 'QUIZ'
      ? { maxAttempts: item.maxAttempts, scorePolicy: item.scorePolicy }
      : {}),
  };
}

function toCampaignDraftAdaptiveItem(
  item: CampaignDetailAdaptiveItemDto,
): CampaignDraftAdaptiveItemState {
  return {
    itemType: 'ADAPTIVE',
    campaignItemId: item.campaignItemId,
    componentType: item.componentType,
    alternatives: {
      EASY: { ...item.alternatives.EASY },
      MEDIUM: { ...item.alternatives.MEDIUM },
      HARD: { ...item.alternatives.HARD },
    },
    persistedAlternativeContentIds: {
      EASY: item.alternatives.EASY.contentId,
      MEDIUM: item.alternatives.MEDIUM.contentId,
      HARD: item.alternatives.HARD.contentId,
    },
    title: item.title,
    description: item.description ?? null,
    isRequired: item.isRequired,
    sourceAvailable: item.sourceAvailable,
    ...(item.componentType === 'QUIZ'
      ? { maxAttempts: item.maxAttempts, scorePolicy: item.scorePolicy }
      : {}),
  };
}

function toCampaignDraftConsumableItem(
  item: CampaignDetailConsumableItemDto,
): CampaignDraftConsumableItemState {
  return item.itemType === 'ADAPTIVE'
    ? toCampaignDraftAdaptiveItem(item)
    : toCampaignDraftComponentItem(item);
}

export function campaignDraftConsumableKey(item: CampaignDraftConsumableItemState): string {
  if (item.campaignItemId) return item.campaignItemId;
  if (item.itemType === 'COMPONENT') return `${item.componentType}:${item.contentId}`;
  if (item.clientId) return item.clientId;
  return [
    'ADAPTIVE',
    item.componentType,
    item.alternatives.EASY.contentId,
    item.alternatives.MEDIUM.contentId,
    item.alternatives.HARD.contentId,
  ].join(':');
}

export function toCampaignDraftItems(
  items: readonly CampaignDetailItemDto[],
): readonly CampaignDraftItemState[] {
  return [...items]
    .sort((left, right) => left.position - right.position)
    .map((item) => {
      if (item.itemType !== 'GROUP') {
        return toCampaignDraftConsumableItem(item);
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
          .map(toCampaignDraftConsumableItem),
      };
    });
}
