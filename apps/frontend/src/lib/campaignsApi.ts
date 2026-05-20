import type {
  GetTraineeCampaignDetailResponseDto,
  GetTraineeCampaignsResponseDto,
} from '@insightful-phish/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

function getAuthToken(): string | null {
  return (
    localStorage.getItem('authToken') ??
    localStorage.getItem('accessToken') ??
    localStorage.getItem('token')
  );
}

async function authenticatedFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

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
