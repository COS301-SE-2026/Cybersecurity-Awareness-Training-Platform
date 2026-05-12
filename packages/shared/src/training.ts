import type { z } from 'zod';
import type { SuccessResponseDto } from './common.js';
import type {
  getTrainingDocumentRequestParamsSchema,
  recordTrainingProgressRequestParamsSchema,
  recordTrainingProgressRequestSchema,
} from './validation/training.schemas.js';

export type TrainingContentTypeDto = 'MARKDOWN' | 'HTML' | 'URL';
export type TrainingDocumentStatusDto = 'AVAILABLE' | 'UNAVAILABLE' | 'ARCHIVED';
export type TrainingProgressStatusDto = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface GetAssignedTrainingRequestParamsDto {}

export interface TrainingDocumentSummaryDto {
  id: string;
  title: string;
  description: string;
  status: TrainingProgressStatusDto;
}

export interface GetAssignedTrainingResponseDto {
  trainingDocuments: TrainingDocumentSummaryDto[];
}

export type GetTrainingDocumentRequestParamsDto = z.infer<
  typeof getTrainingDocumentRequestParamsSchema
>;

export interface TrainingDocumentDetailDto {
  id: string;
  title: string;
  contentType: TrainingContentTypeDto;
  contentRef: string;
  linkedQuizIds?: string[];
}

export interface GetTrainingDocumentResponseDto extends TrainingDocumentDetailDto {}

export type RecordTrainingProgressRequestParamsDto = z.infer<
  typeof recordTrainingProgressRequestParamsSchema
>;

export type RecordTrainingProgressRequestDto = z.infer<typeof recordTrainingProgressRequestSchema>;

export interface RecordTrainingProgressResponseDto extends SuccessResponseDto {}
