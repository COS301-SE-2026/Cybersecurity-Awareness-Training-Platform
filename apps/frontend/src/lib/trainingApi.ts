import type { GetTrainingDocumentResponseDto } from '@insightful-phish/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

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

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

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
