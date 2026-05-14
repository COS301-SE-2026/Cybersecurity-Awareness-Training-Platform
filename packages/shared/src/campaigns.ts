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
  getLearnerCampaignRequestParamsSchema,
  learnerCampaignItemRequestParamsSchema,
} from './validation/campaigns.schemas.js';

export type GetLearnerCampaignRequestParamsDto = z.infer<
  typeof getLearnerCampaignRequestParamsSchema
>;

export type LearnerCampaignItemRequestParamsDto = z.infer<
  typeof learnerCampaignItemRequestParamsSchema
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

export interface LearnerCampaignItemDto extends CampaignItemDto {
  trainingDocument?: CampaignTrainingDocumentSummaryDto | null;
  quiz?: CampaignQuizSummaryDto | null;
  simulation?: CampaignSimulationSummaryDto | null;
  children?: LearnerCampaignItemDto[];
}

export interface LearnerCampaignSummaryDto extends CampaignDto {
  assignment?: CampaignAssignmentDto | null;
  accessType?: CampaignAccessTypeDto | null;
}

export interface GetLearnerCampaignsResponseDto {
  campaigns: LearnerCampaignSummaryDto[];
}

export interface GetLearnerCampaignResponseDto extends LearnerCampaignSummaryDto {
  items: LearnerCampaignItemDto[];
}

export interface LearnerCampaignActionResponseDto extends SuccessResponseDto {
  campaignId?: string;
  campaignItemId?: string;
}
