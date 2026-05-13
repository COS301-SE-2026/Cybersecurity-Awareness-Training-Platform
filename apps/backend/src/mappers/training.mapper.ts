import type {
  GetTrainingDocumentResponseDto,
  TrainingDocumentSummaryDto,
  TrainingProgressStatusDto,
} from '@insightful-phish/shared';

interface TrainingProgressSummaryRecord {
  status: TrainingProgressStatusDto;
}

interface TrainingDocumentSummaryRecord {
  id: string;
  title: string;
  trainingProgress: TrainingProgressSummaryRecord[];
  module: {
    description: string | null;
  };
}

interface TrainingDocumentDetailRecord {
  id: string;
  title: string;
  contentType: GetTrainingDocumentResponseDto['contentType'];
  contentRef: string;
  quizzes: Array<{
    id: string;
  }>;
}

export function toTrainingDocumentSummaryDto(
  document: TrainingDocumentSummaryRecord,
): TrainingDocumentSummaryDto {
  return {
    id: document.id,
    title: document.title,
    description: document.module.description ?? '',
    status: document.trainingProgress[0]?.status ?? 'NOT_STARTED',
  };
}

export function toGetTrainingDocumentResponseDto(
  document: TrainingDocumentDetailRecord,
): GetTrainingDocumentResponseDto {
  const linkedQuizIds = document.quizzes.map((quiz) => quiz.id);

  return {
    id: document.id,
    title: document.title,
    contentType: document.contentType,
    contentRef: document.contentRef,
    ...(linkedQuizIds.length > 0 ? { linkedQuizIds } : {}),
  };
}
