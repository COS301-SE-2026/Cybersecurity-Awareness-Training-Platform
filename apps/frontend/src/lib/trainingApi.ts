import type {
  GetTrainingDocumentResponseDto,
  PreviewTrainingDocumentRequestDto,
  PreviewTrainingDocumentResponseDto,
  TrainingDocuemtnDraftInputDto,
  TrainingDocumentAuthoringResponseDto,
} from '@insightful-phish/shared';
import { apiClient } from './apiClient';

export type TrainingDocumentStatus = 'NOT_STARTED' | 'STARTED' | 'VIEWED' | 'COMPLETED';

export type TrainingDocumentAuthoringContext =
  | { kind: 'platform' }
  | { kind: 'organisation'; organisationId: string };

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

function getTrainingDocumentAuthoringBasePath(context: TrainingDocumentAuthoringContext): string {
  if (context.kind === 'organisation') {
    return `/organisations/${encodeURIComponent(context.organisationId)}/training-documents`;
  }

  return '/platform/training-documents';
}

function getTrainingDocumentAuthoringPath(
  context: TrainingDocumentAuthoringContext,
  trainingDocumentId: string,
): string {
  return `${getTrainingDocumentAuthoringBasePath(context)}/${encodeURIComponent(trainingDocumentId)}`;
}

export async function createTrainingDocumentDraft(
  context: TrainingDocumentAuthoringContext,
  input: TrainingDocuemtnDraftInputDto,
): Promise<TrainingDocumentAuthoringResponseDto> {
  return apiClient.post<TrainingDocumentAuthoringResponseDto, TrainingDocuemtnDraftInputDto>(
    getTrainingDocumentAuthoringBasePath(context),
    input,
  );
}

export async function getTrainingDocumentForAuthoring(
  context: TrainingDocumentAuthoringContext,
  trainingDocumentId: string,
): Promise<TrainingDocumentAuthoringResponseDto> {
  return apiClient.get<TrainingDocumentAuthoringResponseDto>(
    getTrainingDocumentAuthoringPath(context, trainingDocumentId),
  );
}

export async function updateTrainingDocumentDraft(
  context: TrainingDocumentAuthoringContext,
  trainingDocumentId: string,
  input: TrainingDocuemtnDraftInputDto,
): Promise<TrainingDocumentAuthoringResponseDto> {
  return apiClient.put<TrainingDocumentAuthoringResponseDto, TrainingDocuemtnDraftInputDto>(
    getTrainingDocumentAuthoringPath(context, trainingDocumentId),
    input,
  );
}

export async function previewTrainingDocumentMarkdown(
  context: TrainingDocumentAuthoringContext,
  input: PreviewTrainingDocumentRequestDto,
): Promise<PreviewTrainingDocumentResponseDto> {
  return apiClient.post<PreviewTrainingDocumentResponseDto, PreviewTrainingDocumentRequestDto>(
    `${getTrainingDocumentAuthoringBasePath(context)}/preview`,
    input,
  );
}

export async function activateTrainingDocumentDraft(
  context: TrainingDocumentAuthoringContext,
  trainingDocumentId: string,
): Promise<TrainingDocumentAuthoringResponseDto> {
  return apiClient.post<TrainingDocumentAuthoringResponseDto, Record<string, never>>(
    `${getTrainingDocumentAuthoringPath(context, trainingDocumentId)}/activate`,
    {},
  );
}

export async function copyTrainingDocument(
  context: TrainingDocumentAuthoringContext,
  trainingDocumentId: string,
): Promise<TrainingDocumentAuthoringResponseDto> {
  return apiClient.post<TrainingDocumentAuthoringResponseDto, Record<string, never>>(
    `${getTrainingDocumentAuthoringPath(context, trainingDocumentId)}/copy`,
    {},
  );
}

export async function getCampaignItemTrainingDocument(
  campaignItemId: string,
): Promise<GetTrainingDocumentResponseDto> {
  return apiClient.get<GetTrainingDocumentResponseDto>(
    `/trainee/campaign-items/${campaignItemId}/training-document`,
  );
}

export async function recordTrainingDocumentViewed(campaignItemId: string): Promise<void> {
  await apiClient.post<void, Record<string, never>>(
    `/trainee/campaign-items/${campaignItemId}/training-document/viewed`,
    {},
  );
}

export async function recordTrainingDocumentCompleted(campaignItemId: string): Promise<void> {
  await apiClient.post<void, Record<string, never>>(
    `/trainee/campaign-items/${campaignItemId}/training-document/completed`,
    {},
  );
}
