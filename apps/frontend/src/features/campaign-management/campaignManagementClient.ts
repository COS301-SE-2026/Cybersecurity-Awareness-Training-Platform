import type {
  CampaignDetailResponseDto,
  CampaignListQueryDto,
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
}
