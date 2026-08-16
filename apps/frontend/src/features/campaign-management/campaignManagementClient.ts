import type {
  CampaignDetailResponseDto,
  CampaignListQueryDto,
  CreateCampaignDraftRequestDto,
  GetCampaignsResponseDto,
} from '@insightful-phish/shared';
import type { CampaignManagementContext } from './campaignManagement.types';

export interface CampaignManagementClient {
  listCampaigns(
    context: CampaignManagementContext,
    query: CampaignListQueryDto,
  ): Promise<GetCampaignsResponseDto>;
  getCampaignDetail(
    context: CampaignManagementContext,
    campaignId: string,
  ): Promise<CampaignDetailResponseDto>;
  createCampaignDraft(
    context: CampaignManagementContext,
    request: CreateCampaignDraftRequestDto,
  ): Promise<CampaignDetailResponseDto>;
}
