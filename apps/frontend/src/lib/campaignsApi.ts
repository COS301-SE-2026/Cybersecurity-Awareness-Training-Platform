import type {
  GetTraineeCampaignDetailResponseDto,
  GetTraineeCampaignsResponseDto,
} from '@insightful-phish/shared';
import { authenticatedFetch } from './authenticatedFetch';

export async function getTraineeCampaigns(): Promise<GetTraineeCampaignsResponseDto> {
  return authenticatedFetch<GetTraineeCampaignsResponseDto>('/trainee/campaigns');
}

export async function getTraineeCampaignDetail(
  campaignId: string,
): Promise<GetTraineeCampaignDetailResponseDto> {
  return authenticatedFetch<GetTraineeCampaignDetailResponseDto>(
    `/trainee/campaigns/${campaignId}`,
  );
}
