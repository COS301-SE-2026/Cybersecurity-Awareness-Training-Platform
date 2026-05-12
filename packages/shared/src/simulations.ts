import type { z } from 'zod';
import type { Id, IsoDateTimeString, SuccessResponseDto } from './common.js';
import type {
  getSimulatedEmailRequestParamsSchema,
  recordSimulatedEmailInteractionRequestParamsSchema,
  recordSimulatedEmailInteractionRequestSchema,
} from './validation/simulations.schemas.js';

export type InboxStatusDto = 'ACTIVE' | 'ARCHIVED';

export type InteractionEventTypeDto =
  | 'EMAIL_OPENED'
  | 'EMAIL_LINK_CLICKED'
  | 'CREDENTIAL_SUBMISSION_ATTEMPTED'
  | 'TRAINING_VIEWED'
  | 'TRAINING_COMPLETED'
  | 'QUIZ_STARTED'
  | 'QUIZ_ANSWER_SUBMITTED'
  | 'QUIZ_COMPLETED';

export type SimulatedEmailInteractionEventTypeDto = 'EMAIL_OPENED' | 'EMAIL_LINK_CLICKED';

export interface GetSimulatedInboxRequestParamsDto {}

export interface SimulatedEmailSummaryDto {
  id: Id;
  senderLabel: string;
  subject: string;
  receivedDate: IsoDateTimeString;
  isRead: boolean;
}

export interface GetSimulatedInboxResponseDto {
  emails: SimulatedEmailSummaryDto[];
}

export type GetSimulatedEmailRequestParamsDto = z.infer<
  typeof getSimulatedEmailRequestParamsSchema
>;

export interface SimulationContextDto {
  isPhishing: boolean;
  warningMessage?: string;
}

export interface SimulatedEmailDetailDto {
  id: Id;
  senderLabel: string;
  senderAddress: string;
  subject: string;
  bodyHtml: string;
  recommendedTrainingDocumentId?: Id | null;
  simulationContext: SimulationContextDto;
}

export interface GetSimulatedEmailResponseDto extends SimulatedEmailDetailDto {}

export type RecordSimulatedEmailInteractionRequestParamsDto = z.infer<
  typeof recordSimulatedEmailInteractionRequestParamsSchema
>;

export type RecordSimulatedEmailInteractionRequestDto = z.infer<
  typeof recordSimulatedEmailInteractionRequestSchema
>;

export interface RecordSimulatedEmailInteractionResponseDto extends SuccessResponseDto {}
