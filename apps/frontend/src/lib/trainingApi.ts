import type { GetTrainingDocumentResponseDto } from '@insightful-phish/shared';
import { authenticatedFetch } from './authenticatedFetch';

export type TrainingDocumentStatus = 'NOT_STARTED' | 'STARTED' | 'VIEWED' | 'COMPLETED';

export interface TrainingDocumentSummary {
  id: string;
  title: string;
  description: string;
  status: TrainingDocumentStatus;
}

export const trainingRoutes = {
  modules: '/campaigns',
  document: (campaignItemId: string) => `/training/${campaignItemId}`,
  quiz: (campaignItemId: string) => `/quizzes/${campaignItemId}`,
};

export async function getCampaignItemTrainingDocument(
  campaignItemId: string,
): Promise<GetTrainingDocumentResponseDto> {
  return authenticatedFetch<GetTrainingDocumentResponseDto>(
    `/trainee/campaign-items/${campaignItemId}/training-document`,
  );
}

export async function recordTrainingDocumentViewed(campaignItemId: string): Promise<void> {
  await authenticatedFetch<void>(
    `/trainee/campaign-items/${campaignItemId}/training-document/viewed`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
}

export async function recordTrainingDocumentCompleted(campaignItemId: string): Promise<void> {
  await authenticatedFetch<void>(
    `/trainee/campaign-items/${campaignItemId}/training-document/completed`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
}
