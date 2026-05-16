import type { z } from 'zod';
import type { SuccessResponseDto } from './common.js';
import type {
  CampaignAccessTypeDto,
  CampaignAssignmentDto,
  CampaignDto,
  CampaignItemDto,
} from './entities.js';
import type { QuizStatusDto } from './quizzes.js';
import type { DifficultyLevelDto, TrainingDocumentStatusDto } from './training.js';
import type {
  getTraineeCampaignRequestParamsSchema,
  traineeCampaignItemRequestParamsSchema,
} from './validation/campaigns.schemas.js';

export type GetTraineeCampaignRequestParamsDto = z.infer<
  typeof getTraineeCampaignRequestParamsSchema
>;

export type TraineeCampaignItemRequestParamsDto = z.infer<
  typeof traineeCampaignItemRequestParamsSchema
>;

export interface CampaignTrainingDocumentSummaryDto {
  id: string;
  title: string;
  contentSummary?: string | null;
  estimatedReadTimeMinutes?: number | null;
  difficultyLevel: DifficultyLevelDto;
  status: TrainingDocumentStatusDto;
}

export interface CampaignQuizSummaryDto {
  id: string;
  title: string;
  description?: string | null;
  passThresholdPercentage: number;
  difficultyLevel: DifficultyLevelDto;
  status: QuizStatusDto;
  questionCount?: number;
}

export interface CampaignSimulationSummaryDto {
  id: string;
  title: string;
  description?: string | null;
  difficultyLevel: DifficultyLevelDto;
}

export interface TraineeCampaignItemDto extends CampaignItemDto {
  trainingDocument?: CampaignTrainingDocumentSummaryDto | null;
  quiz?: CampaignQuizSummaryDto | null;
  simulation?: CampaignSimulationSummaryDto | null;
  children?: TraineeCampaignItemDto[];
}

export interface TraineeCampaignSummaryDto extends CampaignDto {
  assignment?: CampaignAssignmentDto | null;
  accessType?: CampaignAccessTypeDto | null;
}

export interface GetTraineeCampaignsResponseDto {
  campaigns: TraineeCampaignSummaryDto[];
}

export interface GetTraineeCampaignResponseDto extends TraineeCampaignSummaryDto {
  items: TraineeCampaignItemDto[];
}

export interface TraineeCampaignActionResponseDto extends SuccessResponseDto {
  campaignId?: string;
  campaignItemId?: string;
}
