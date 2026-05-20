import type {
  GetTraineeCampaignDetailResponseDto,
  GetTraineeCampaignsResponseDto,
} from '@insightful-phish/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getTraineeCampaigns(token: string): Promise<GetTraineeCampaignsResponseDto> {
  const response = await fetch(`${API_BASE_URL}/trainee/campaigns`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as GetTraineeCampaignsResponseDto;

  if (!response.ok) {
    throw new Error('FAILED TO FETCH CAMPAIGNS');
  }

  return data;
}

export async function getTraineeCampaign(
  campaignId: string,
  token: string,
): Promise<GetTraineeCampaignDetailResponseDto> {
  const response = await fetch(`${API_BASE_URL}/trainee/campaigns/${campaignId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as GetTraineeCampaignDetailResponseDto;

  if (!response.ok) {
    throw new Error('FAILED TO FETCH CAMPAIGN');
  }

  return data;
}
