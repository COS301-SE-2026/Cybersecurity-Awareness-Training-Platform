import type { z } from 'zod';
import type { SuccessResponseDto } from './common.js';
import type {
  getTrainingDocumentRequestParamsSchema,
  recordTrainingInteractionRequestParamsSchema,
  recordTrainingInteractionRequestSchema,
} from './validation/training.schemas.js';

export type DifficultyLevelDto = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ADAPTIVE';

export type TrainingContentTypeDto = 'PDF' | 'MARKDOWN' | 'HTML' | 'URL' | 'INTERACTIVE';

export type TrainingDocumentStatusDto = 'DRAFT' | 'AVAILABLE' | 'UNAVAILABLE' | 'ARCHIVED';

export type TrainingInteractionEventTypeDto = 'TRAINING_VIEWED' | 'TRAINING_COMPLETED';

export interface GetAssignedTrainingRequestParamsDto {}

export interface TrainingDocumentSummaryDto {
  id: string;
  campaignItemId: string;
  campaignAssignmentId?: string | null;
  title: string;
  description?: string | null;
  contentSummary?: string | null;
  estimatedReadTimeMinutes?: number | null;
  difficultyLevel: DifficultyLevelDto;
  status: TrainingDocumentStatusDto;
  availabilityStatus: 'AVAILABLE' | 'LOCKED' | 'UNAVAILABLE' | 'ARCHIVED';
}

export interface GetAssignedTrainingResponseDto {
  trainingDocuments: TrainingDocumentSummaryDto[];
}

export type GetTrainingDocumentRequestParamsDto = z.infer<
  typeof getTrainingDocumentRequestParamsSchema
>;

export interface TrainingDocumentDetailDto {
  id: string;
  campaignItemId?: string | null;
  campaignAssignmentId?: string | null;
  title: string;
  contentType: TrainingContentTypeDto;
  contentRef: string;
  contentSummary?: string | null;
  estimatedReadTimeMinutes?: number | null;
  difficultyLevel: DifficultyLevelDto;
  status: TrainingDocumentStatusDto;
}

export interface GetTrainingDocumentResponseDto extends TrainingDocumentDetailDto {}

export type RecordTrainingInteractionRequestParamsDto = z.infer<
  typeof recordTrainingInteractionRequestParamsSchema
>;

export type RecordTrainingInteractionRequestDto = z.infer<
  typeof recordTrainingInteractionRequestSchema
>;

export interface RecordTrainingInteractionResponseDto extends SuccessResponseDto {
  eventType: TrainingInteractionEventTypeDto;
}
