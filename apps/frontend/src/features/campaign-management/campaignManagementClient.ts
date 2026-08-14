import type { CampaignListQueryDto, GetCampaignResponseDto } from './campaignManagement.contract';
import type { CampaignManagementContext } from './campaignManagement.types';

export interface CampaignManagementClient {
  listCampaigns(
    context: CampaignManagementContext,
    query: CampaignListQueryDto,
  ): Promise<GetCampaignResponseDto>;
}
