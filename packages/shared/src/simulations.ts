import type { z } from 'zod';
import type { SuccessResponseDto } from './common.js';
import type { DifficultyLevelDto } from './training.js';
import type {
  classifySimulatedEmailRequestParamsSchema,
  classifySimulatedEmailRequestSchema,
  getSimulatedEmailRequestParamsSchema,
  getSimulatedInboxRequestParamsSchema,
  recordSimulatedEmailInteractionRequestParamsSchema,
  recordSimulatedEmailInteractionRequestSchema,
} from './validation/simulations.schemas.js';

export type InboxStatusDto = 'ACTIVE' | 'ARCHIVED';

export type EmailClassificationDto = 'SAFE' | 'SUSPICIOUS' | 'PHISHING';

export type EmailRedFlagTypeDto =
  | 'SENDER'
  | 'LINK'
  | 'LANGUAGE'
  | 'ATTACHMENT'
  | 'REQUEST'
  | 'DOMAIN'
  | 'OTHER';

export type RedFlagSeverityDto = 'LOW' | 'MEDIUM' | 'HIGH';

export type InteractionEventTypeDto =
  | 'CAMPAIGN_STARTED'
  | 'CAMPAIGN_ITEM_STARTED'
  | 'CAMPAIGN_ITEM_COMPLETED'
  | 'TRAINING_VIEWED'
  | 'TRAINING_COMPLETED'
  | 'QUIZ_STARTED'
  | 'QUIZ_ANSWER_SUBMITTED'
  | 'QUIZ_COMPLETED'
  | 'SIMULATED_EMAIL_OPENED'
  | 'SIMULATED_EMAIL_LINK_CLICKED'
  | 'SIMULATED_EMAIL_CLASSIFIED'
  | 'CREDENTIAL_SUBMISSION_ATTEMPTED';

export type InteractionTargetTypeDto =
  | 'CAMPAIGN'
  | 'CAMPAIGN_ITEM'
  | 'CAMPAIGN_COMPONENT'
  | 'TRAINING_DOCUMENT'
  | 'QUIZ'
  | 'QUIZ_ATTEMPT'
  | 'QUIZ_QUESTION'
  | 'SIMULATED_EMAIL'
  | 'EMAIL_CLASSIFICATION_RESPONSE';

export type SimulatedEmailInteractionEventTypeDto =
  | 'SIMULATED_EMAIL_OPENED'
  | 'SIMULATED_EMAIL_LINK_CLICKED'
  | 'CREDENTIAL_SUBMISSION_ATTEMPTED';

export type GetSimulatedInboxRequestParamsDto = z.infer<
  typeof getSimulatedInboxRequestParamsSchema
>;

export interface SimulatedEmailSummaryDto {
  id: string;
  campaignAssignmentId?: string | null;
  campaignItemId?: string | null;
  inboxId: string;
  senderLabel: string;
  senderAddress: string;
  subject: string;
  preview?: string | null;
  receivedAt: string;
  difficultyLevel: DifficultyLevelDto;
  isOpened: boolean;
}

export interface GetSimulatedInboxResponseDto {
  emails: SimulatedEmailSummaryDto[];
}

export type GetSimulatedEmailRequestParamsDto = z.infer<
  typeof getSimulatedEmailRequestParamsSchema
>;

export interface EmailRedFlagDto {
  id: string;
  redFlagType: EmailRedFlagTypeDto;
  label: string;
  description?: string | null;
  severity: RedFlagSeverityDto;
}

export interface SimulatedEmailDetailDto {
  id: string;
  campaignAssignmentId?: string | null;
  campaignItemId?: string | null;
  inboxId: string;
  senderLabel: string;
  senderAddress: string;
  subject: string;
  preview?: string | null;
  bodyHtml: string;
  simulatedLinkTarget?: string | null;
  hasAttachment: boolean;
  receivedAt: string;
  difficultyLevel: DifficultyLevelDto;
}

export interface GetSimulatedEmailResponseDto extends SimulatedEmailDetailDto {}

export type RecordSimulatedEmailInteractionRequestParamsDto = z.infer<
  typeof recordSimulatedEmailInteractionRequestParamsSchema
>;

export type RecordSimulatedEmailInteractionRequestDto = z.infer<
  typeof recordSimulatedEmailInteractionRequestSchema
>;

export interface RecordSimulatedEmailInteractionResponseDto extends SuccessResponseDto {
  eventType: SimulatedEmailInteractionEventTypeDto;
}

export type ClassifySimulatedEmailRequestParamsDto = z.infer<
  typeof classifySimulatedEmailRequestParamsSchema
>;

export type ClassifySimulatedEmailRequestDto = z.infer<typeof classifySimulatedEmailRequestSchema>;

export interface ClassifySimulatedEmailResponseDto extends SuccessResponseDto {
  responseId: string;
  selectedClassification: EmailClassificationDto;
  isCorrect: boolean;
  feedback?: string | null;
  redFlags?: EmailRedFlagDto[];
}
