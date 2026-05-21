import type {
  GetSimulatedEmailResponseDto,
  GetSimulatedInboxResponseDto,
  GetTraineeCampaignDetailResponseDto,
  GetTraineeCampaignsResponseDto,
  RecordSimulatedEmailInteractionResponseDto,
  SimulatedEmailInteractionEventTypeDto,
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

export async function getSimulatedInbox(
  campaignItemId: string,
  token: string,
): Promise<GetSimulatedInboxResponseDto> {
  const response = await fetch(
    `${API_BASE_URL}/trainee/campaign-items/${campaignItemId}/simulated-inbox`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = (await response.json()) as GetSimulatedInboxResponseDto;

  if (!response.ok) {
    throw new Error('FAILED TO FETCH SIMULATED INBOX');
  }

  return data;
}

export async function getSimulatedEmail(
  campaignItemId: string,
  emailId: string,
  token: string,
): Promise<GetSimulatedEmailResponseDto> {
  const response = await fetch(
    `${API_BASE_URL}/trainee/campaign-items/${campaignItemId}/simulated-emails/${emailId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = (await response.json()) as GetSimulatedEmailResponseDto;

  if (!response.ok) {
    throw new Error('FAILED TO FETCH SIMULATED EMAIL');
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

export async function recordSimulatedEmailInteraction(
  campaignItemId: string,
  emailId: string,
  eventType: SimulatedEmailInteractionEventTypeDto,
  token: string,
): Promise<RecordSimulatedEmailInteractionResponseDto> {
  const response = await fetch(
    `${API_BASE_URL}/trainee/campaign-items/${campaignItemId}/simulated-emails/${emailId}/interactions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        eventType,
      }),
    },
  );

  const data = (await response.json()) as RecordSimulatedEmailInteractionResponseDto;

  if (!response.ok) {
    throw new Error('FAILED TO RECORD SIMULATED EMAIL INTERACTION');
  }

  return data;
}
