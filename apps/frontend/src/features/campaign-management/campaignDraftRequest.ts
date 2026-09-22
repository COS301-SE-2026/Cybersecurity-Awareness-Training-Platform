import type {
  CampaignDraftAdaptiveItemInputDto,
  CampaignDraftComponentItemInputDto,
  CampaignDraftConsumableItemInputDto,
  CampaignDraftItemInputDto,
  CreateCampaignDraftRequestDto,
  UpdateCampaignDraftRequestDto,
} from '@insightful-phish/shared';

import { fromDateTimeLocal } from './campaignDraftDate';
import type {
  CampaignDraftAdaptiveItemState,
  CampaignDraftComponentItemState,
  CampaignDraftConsumableItemState,
  CampaignDraftFormState,
  CampaignDraftItemState,
  CampaignManagementContext,
} from './campaignManagement.types';

function toCampaignDraftComponentItemRequest(
  item: CampaignDraftComponentItemState,
): CampaignDraftComponentItemInputDto {
  return {
    itemType: 'COMPONENT',
    campaignItemId: item.campaignItemId,
    componentType: item.componentType,
    contentId: item.contentId,
    isRequired: item.isRequired,
    ...(item.componentType === 'QUIZ'
      ? {
          maxAttempts: item.maxAttempts ?? 1,
          scorePolicy: item.scorePolicy ?? 'BEST',
        }
      : {}),
  };
}

function toCampaignDraftAdaptiveItemRequest(
  item: CampaignDraftAdaptiveItemState,
): CampaignDraftAdaptiveItemInputDto {
  const preservesOccurrenceIdentity =
    item.persistedAlternativeContentIds !== undefined &&
    (['EASY', 'MEDIUM', 'HARD'] as const).every(
      (difficulty) =>
        item.alternatives[difficulty].contentId ===
        item.persistedAlternativeContentIds?.[difficulty],
    );

  return {
    itemType: 'ADAPTIVE',
    campaignItemId: preservesOccurrenceIdentity ? item.campaignItemId : undefined,
    componentType: item.componentType,
    alternatives: {
      EASY: { contentId: item.alternatives.EASY.contentId },
      MEDIUM: { contentId: item.alternatives.MEDIUM.contentId },
      HARD: { contentId: item.alternatives.HARD.contentId },
    },
    isRequired: item.isRequired,
    ...(item.componentType === 'QUIZ'
      ? {
          maxAttempts: item.maxAttempts ?? 1,
          scorePolicy: item.scorePolicy ?? 'BEST',
        }
      : {}),
  };
}

function toCampaignDraftConsumableItemRequest(
  item: CampaignDraftConsumableItemState,
): CampaignDraftConsumableItemInputDto {
  return item.itemType === 'ADAPTIVE'
    ? toCampaignDraftAdaptiveItemRequest(item)
    : toCampaignDraftComponentItemRequest(item);
}

function toCampaignDraftItemRequest(item: CampaignDraftItemState): CampaignDraftItemInputDto {
  if (item.itemType !== 'GROUP') {
    return toCampaignDraftConsumableItemRequest(item);
  }

  return {
    itemType: 'GROUP',
    campaignItemId: item.campaignItemId,
    title: item.title,
    description: item.description,
    groupType: item.groupType,
    completionRule: item.completionRule,
    isRequired: item.isRequired,
    children: item.children.map(toCampaignDraftConsumableItemRequest),
  };
}

export function toCreateCampaignDraftRequest(
  context: CampaignManagementContext,
  draft: CampaignDraftFormState,
): CreateCampaignDraftRequestDto {
  const description = draft.description.trim();
  const request = {
    name: draft.name.trim(),
    description: description || null,
    accentColor: draft.accentColor,
    items: draft.items.map((item) => toCampaignDraftItemRequest(item)),
  };

  if (context.kind === 'platform') {
    return request;
  }

  return {
    ...request,
    startDate: fromDateTimeLocal(draft.startDate),
    endDate: fromDateTimeLocal(draft.endDate),
  };
}

export function toUpdateCampaignDraftRequest(
  context: CampaignManagementContext,
  draft: CampaignDraftFormState,
  expectedUpdatedAt: string,
): UpdateCampaignDraftRequestDto {
  return {
    ...toCreateCampaignDraftRequest(context, draft),
    expectedUpdatedAt,
  };
}
