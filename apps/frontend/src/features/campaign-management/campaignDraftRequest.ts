import type {
  CreateCampaignDraftRequestDto,
  UpdateCampaignDraftRequestDto,
} from '@insightful-phish/shared';

import { fromDateTimeLocal } from './campaignDraftDate';
import type { CampaignDraftFormState, CampaignManagementContext } from './campaignManagement.types';

export function toCreateCampaignDraftRequest(
  context: CampaignManagementContext,
  draft: CampaignDraftFormState,
): CreateCampaignDraftRequestDto {
  const description = draft.description.trim();
  const request = {
    name: draft.name.trim(),
    description: description || null,
    accentColor: draft.accentColor,
    items: [],
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
