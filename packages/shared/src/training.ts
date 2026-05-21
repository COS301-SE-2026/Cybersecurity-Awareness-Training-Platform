import type { z } from 'zod';
import type { SuccessResponseDto } from './common.js';
import type {
  getTrainingDocumentRequestParamsSchema,
  recordTrainingInteractionRequestParamsSchema,
} from './validation/training.schemas.js';

export type DifficultyLevelDto = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ADAPTIVE';

export type TrainingContentTypeDto = 'PDF' | 'MARKDOWN' | 'HTML' | 'URL' | 'INTERACTIVE';

export type TrainingDocumentStatusDto = 'DRAFT' | 'AVAILABLE' | 'UNAVAILABLE' | 'ARCHIVED';

export type TrainingInteractionEventTypeDto = 'TRAINING_VIEWED' | 'TRAINING_COMPLETED';

type TrainingCampaignItemAvailabilityStatusDto =
  | 'AVAILABLE'
  | 'LOCKED'
  | 'UNAVAILABLE'
  | 'ARCHIVED';

export interface TrainingDocumentContentDto {
  id: string;
  title: string;
  contentType: TrainingContentTypeDto;
  contentRef: string;
  content: string | null;
  contentSummary?: string | null;
  estimatedReadTimeMinutes?: number | null;
  difficultyLevel: DifficultyLevelDto;
  status: TrainingDocumentStatusDto;
}

export interface TrainingCampaignItemContextDto {
  title: string;
  description?: string | null;
  position: number;
  isRequired: boolean;
  availabilityStatus: TrainingCampaignItemAvailabilityStatusDto;
}

export type GetTrainingDocumentRequestParamsDto = z.infer<
  typeof getTrainingDocumentRequestParamsSchema
>;

export interface GetTrainingDocumentResponseDto {
  campaignItemId: string;
  campaignAssignmentId?: string | null;
  trainingDocument: TrainingDocumentContentDto;
  campaignItem: TrainingCampaignItemContextDto;
}

export type RecordTrainingInteractionRequestParamsDto = z.infer<
  typeof recordTrainingInteractionRequestParamsSchema
>;

export interface RecordTrainingInteractionRequestDto {}

export interface RecordTrainingInteractionResponseDto extends SuccessResponseDto {
  campaignItemId: string;
  trainingDocumentId: string;
  event: {
    id: string;
    eventType: TrainingInteractionEventTypeDto;
    occurredAt: string;
  };
}
