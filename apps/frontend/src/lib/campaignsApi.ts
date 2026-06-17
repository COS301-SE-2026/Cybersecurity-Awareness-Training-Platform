import type {
  GetTraineeCampaignDetailResponseDto,
  GetTraineeCampaignsResponseDto,
} from '@insightful-phish/shared';
import { apiClient } from './apiClient';

export async function getTraineeCampaigns(): Promise<GetTraineeCampaignsResponseDto> {
  return apiClient.get<GetTraineeCampaignsResponseDto>('/trainee/campaigns');
}

export async function getTraineeCampaignDetail(
  campaignId: string,
): Promise<GetTraineeCampaignDetailResponseDto> {
  return apiClient.get<GetTraineeCampaignDetailResponseDto>(`/trainee/campaigns/${campaignId}`);
}
