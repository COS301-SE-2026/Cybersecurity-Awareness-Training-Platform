import { mockAssignedTrainingResponse, mockTrainingDocumentDetails } from './trainingMocks';

export type TrainingDocumentStatus = 'NOT_STARTED' | 'STARTED' | 'VIEWED' | 'COMPLETED';

export type TrainingProgressStatus = 'STARTED' | 'VIEWED' | 'COMPLETED';

export interface TrainingDocumentSummary {
  id: string;
  title: string;
  description: string;
  status: TrainingDocumentStatus;
}

export interface GetAssignedTrainingResponse {
  trainingDocuments: TrainingDocumentSummary[];
}

export interface TrainingDocumentDetail {
  id: string;
  title: string;
  contentMarkdown: string;
  linkedQuizId?: string;
}

export interface RecordTrainingProgressRequest {
  status: TrainingProgressStatus;
}

export interface RecordTrainingProgressResponse {
  trainingId: string;
  status: TrainingProgressStatus;
  updatedAt: string;
}

export const trainingRoutes = {
  modules: '/training/modules',
  document: (trainingId: string) => `/training/modules/${trainingId}`,
  quiz: (quizId: string) => `/quiz/${quizId}`,
};

function delay(ms = 150) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function getAssignedTraining(): Promise<GetAssignedTrainingResponse> {
  await delay();

  return mockAssignedTrainingResponse;
}

export async function getTrainingById(trainingId: string): Promise<TrainingDocumentDetail> {
  await delay();

  const trainingDocument = mockTrainingDocumentDetails[trainingId];

  if (!trainingDocument) {
    throw new Error('Training document not found.');
  }

  return trainingDocument;
}

export async function postTrainingProgress(
  trainingId: string,
  payload: RecordTrainingProgressRequest,
): Promise<RecordTrainingProgressResponse> {
  await delay(100);

  return {
    trainingId,
    status: payload.status,
    updatedAt: new Date().toISOString(),
  };
}
