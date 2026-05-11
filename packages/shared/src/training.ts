import type { Id, SuccessResponseDto } from './common.js';

export type TrainingContentTypeDto = 'MARKDOWN' | 'HTML' | 'URL';
export type TrainingDocumentStatusDto = 'AVAILABLE' | 'UNAVAILABLE' | 'ARCHIVED';
export type TrainingProgressStatusDto = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface GetAssignedTrainingRequestParamsDto {}

export interface TrainingDocumentSummaryDto {
  id: Id;
  title: string;
  description: string;
  status: TrainingProgressStatusDto;
}

export interface GetAssignedTrainingResponseDto {
  trainingDocuments: TrainingDocumentSummaryDto[];
}

export interface GetTrainingDocumentRequestParamsDto {
  trainingId: Id;
}

export interface TrainingDocumentDetailDto {
  id: Id;
  title: string;
  contentType: TrainingContentTypeDto;
  contentRef: string;
  linkedQuizIds?: Id[];
}

export interface GetTrainingDocumentResponseDto extends TrainingDocumentDetailDto {}

export interface RecordTrainingProgressRequestParamsDto {
  trainingId: Id;
}

export interface RecordTrainingProgressRequestDto {
  status: Extract<TrainingProgressStatusDto, 'IN_PROGRESS' | 'COMPLETED'>;
}

export interface RecordTrainingProgressResponseDto extends SuccessResponseDto {}
