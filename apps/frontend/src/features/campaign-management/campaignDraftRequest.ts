import type {
  CampaignDraftComponentItemInputDto,
  CampaignDraftItemInputDto,
  CreateCampaignDraftRequestDto,
  UpdateCampaignDraftRequestDto,
} from '@insightful-phish/shared';

import { fromDateTimeLocal } from './campaignDraftDate';
import type {
  CampaignDraftComponentItemState,
  CampaignDraftFormState,
  CampaignDraftItemState,
  CampaignManagementContext,
} from './campaignManagement.types';

function toCampaignDraftComponentItemRequest(
  item: CampaignDraftComponentItemState,
  position: number,
): CampaignDraftComponentItemInputDto {
  return {
    itemType: 'COMPONENT',
    campaignItemId: item.campaignItemId,
    componentType: item.componentType,
    contentId: item.contentId,
    title: item.title,
    description: item.description,
    position,
    isRequired: item.isRequired,
  };
}

function toCampaignDraftItemRequest(
  item: CampaignDraftItemState,
  position: number,
): CampaignDraftItemInputDto {
  if (item.itemType === 'COMPONENT') {
    return toCampaignDraftComponentItemRequest(item, position);
  }

  return {
    itemType: 'GROUP',
    campaignItemId: item.campaignItemId,
    title: item.title,
    description: item.description,
    groupType: item.groupType,
    completionRule: item.completionRule,
    position,
    isRequired: item.isRequired,
    children: item.children.map(toCampaignDraftComponentItemRequest),
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
    items: draft.items.map(toCampaignDraftItemRequest),
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
