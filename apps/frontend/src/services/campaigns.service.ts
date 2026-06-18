import {
  type GetSimulatedEmailResponseDto,
  type GetSimulatedInboxResponseDto,
  type GetTraineeCampaignDetailResponseDto,
  type GetTraineeCampaignsResponseDto,
  type RecordSimulatedEmailInteractionResponseDto,
  type SimulatedEmailInteractionEventTypeDto,
} from '@insightful-phish/shared';
import { apiClient } from '../lib/apiClient';

export async function getTraineeCampaigns(token: string): Promise<GetTraineeCampaignsResponseDto> {
  return apiClient.get<GetTraineeCampaignsResponseDto>('/trainee/campaigns', {
    authToken: token,
  });
}

export async function getSimulatedInbox(
  campaignItemId: string,
  token: string,
): Promise<GetSimulatedInboxResponseDto> {
  return apiClient.get<GetSimulatedInboxResponseDto>(
    `/trainee/campaign-items/${campaignItemId}/simulated-inbox`,
    {
      authToken: token,
    },
  );
}

export async function getSimulatedEmail(
  campaignItemId: string,
  emailId: string,
  token: string,
): Promise<GetSimulatedEmailResponseDto> {
  return apiClient.get<GetSimulatedEmailResponseDto>(
    `/trainee/campaign-items/${campaignItemId}/simulated-emails/${emailId}`,
    {
      authToken: token,
    },
  );
}

export async function getTraineeCampaign(
  campaignId: string,
  token: string,
): Promise<GetTraineeCampaignDetailResponseDto> {
  return apiClient.get<GetTraineeCampaignDetailResponseDto>(`/trainee/campaigns/${campaignId}`, {
    authToken: token,
  });
}

export async function recordSimulatedEmailInteraction(
  campaignItemId: string,
  emailId: string,
  eventType: SimulatedEmailInteractionEventTypeDto,
  token: string,
): Promise<RecordSimulatedEmailInteractionResponseDto> {
  return apiClient.post<
    RecordSimulatedEmailInteractionResponseDto,
    { eventType: SimulatedEmailInteractionEventTypeDto }
  >(
    `/trainee/campaign-items/${campaignItemId}/simulated-emails/${emailId}/interactions`,
    {
      eventType,
    },
    {
      authToken: token,
    },
  );
}
