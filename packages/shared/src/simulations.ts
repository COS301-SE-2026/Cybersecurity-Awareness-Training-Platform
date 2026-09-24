import type { z } from 'zod';
import type { SuccessResponseDto } from './common.js';
import type { ContentCategoryDto, DifficultyLevelDto } from './categories.js';
import type {
  activationValidationIssueSchema,
  addLibraryEmailToSimulatedInboxRequestSchema,
  authoredEmailLinkSchema,
  authoredEmailRedFlagSchema,
  classifySimulatedEmailRequestParamsSchema,
  classifySimulatedEmailRequestSchema,
  createPhishingSimulationDraftRequestSchema,
  createSimulatedInboxDraftRequestSchema,
  embeddedEmailSnapshotSchema,
  emailPersonalisationFieldSchema,
  getSimulatedEmailRequestParamsSchema,
  getSimulatedInboxRequestParamsSchema,
  listOrganisationEmailsQuerySchema,
  listSimulatedInboxesQuerySchema,
  organisationEmailDraftInputSchema,
  organisationEmailIdParamsSchema,
  organisationEmailListSummarySchema,
  organisationEmailListResponseSchema,
  organisationEmailManagementDetailResponseSchema,
  organisationEmailMutationRequestSchema,
  organisationEmailPickerSummarySchema,
  organisationEmailRegistrationResponseSchema,
  phishingSimulationCollectionRequestParamsSchema,
  phishingSimulationDetailRequestParamsSchema,
  phishingSimulationListResponseSchema,
  phishingSimulationResponseSchema,
  phishingSimulationStatusSchema,
  recordSimulatedEmailInteractionRequestParamsSchema,
  recordSimulatedEmailInteractionRequestSchema,
  simulatedInboxActivationValidationResponseSchema,
  simulatedInboxChildEmailInputSchema,
  simulatedInboxChildEmailSchema,
  simulatedInboxDetailSchema,
  simulatedInboxDraftInputSchema,
  simulatedInboxListSummarySchema,
  simulatedInboxListResponseSchema,
  simulatedInboxManagementIdParamsSchema,
  simulatedInboxSnapshotCreationResponseSchema,
  simulatedInboxSnapshotIdParamsSchema,
  reorderSimulatedInboxEmailsRequestSchema,
  supportedEmailMarkerSchema,
  updatePhishingSimulationDraftRequestSchema,
  updateSimulatedInboxDraftRequestSchema,
  weekdaySchema,
  addLibraryEmailToPhishingSimulationPoolRequestSchema,
  phishingSimulationPoolEntryRequestParamsSchema,
  phishingSimulationPoolRequestParamsSchema,
  phishingSimulationPoolResponseSchema,
  phishingSimulationStopReasonSchema,
  phishingSimulationRecipientSchema,
  plannedMessageSchema,
  phishingSimulationDetailResponseSchema,
  phishingSimulationMessageDispatchStatusSchema,
  realEmailFeedbackSchema,
} from './validation/simulations.schemas.js';

export type WeekdayDto = z.infer<typeof weekdaySchema>;
export type PhishingSimulationStatusDto = z.infer<typeof phishingSimulationStatusSchema>;
export type PhishingSimulationCollectionRequestParamsDto = z.infer<
  typeof phishingSimulationCollectionRequestParamsSchema
>;
export type PhishingSimulationDetailRequestParamsDto = z.infer<
  typeof phishingSimulationDetailRequestParamsSchema
>;
export type CreatePhishingSimulationDraftRequestDto = z.infer<
  typeof createPhishingSimulationDraftRequestSchema
>;
export type UpdatePhishingSimulationDraftRequestDto = z.infer<
  typeof updatePhishingSimulationDraftRequestSchema
>;
export type PhishingSimulationListResponseDto = z.infer<
  typeof phishingSimulationListResponseSchema
>;
export type PhishingSimulationResponseDto = z.infer<typeof phishingSimulationResponseSchema>;

export {
  emailPersonalisationFields as EMAIL_PERSONALISATION_FIELDS,
  emailPersonalisationMarkers as EMAIL_PERSONALISATION_MARKERS,
  supportedEmailMarkers as SUPPORTED_EMAIL_MARKERS,
  systemLinkMarker as SYSTEM_LINK_MARKER,
} from './validation/simulations.schemas.js';

export const EmailPersonalisationField = {
  FIRST_NAME: 'FIRST_NAME',
  SURNAME: 'SURNAME',
  EMAIL_ADDRESS: 'EMAIL_ADDRESS',
} as const;

export type EmailPersonalisationField = z.infer<typeof emailPersonalisationFieldSchema>;

export type SupportedEmailMarker = z.infer<typeof supportedEmailMarkerSchema>;

export type AuthoredEmailLink = z.infer<typeof authoredEmailLinkSchema>;

export type AuthoredEmailRedFlag = z.infer<typeof authoredEmailRedFlagSchema>;

export type OrganisationEmailStatus = 'DRAFT' | 'ACTIVE';

export type OrganisationEmailDraftInput = z.infer<typeof organisationEmailDraftInputSchema>;

export type OrganisationEmailManagementDetailResponse = z.infer<
  typeof organisationEmailManagementDetailResponseSchema
>;

export type OrganisationEmailListSummary = z.infer<typeof organisationEmailListSummarySchema>;

export type OrganisationEmailPickerSummary = z.infer<typeof organisationEmailPickerSummarySchema>;

export type OrganisationEmailIdParams = z.infer<typeof organisationEmailIdParamsSchema>;

export type ListOrganisationEmailsQuery = z.infer<typeof listOrganisationEmailsQuerySchema>;

export type OrganisationEmailMutationRequest = z.infer<
  typeof organisationEmailMutationRequestSchema
>;

export type OrganisationEmailListResponse = z.infer<typeof organisationEmailListResponseSchema>;

export type OrganisationEmailRegistrationResponse = z.infer<
  typeof organisationEmailRegistrationResponseSchema
>;

export type EmbeddedEmailSnapshot = z.infer<typeof embeddedEmailSnapshotSchema>;

export type PhishingSimulationEmailInput = z.infer<typeof organisationEmailDraftInputSchema>;

export type SimulatedInboxChildEmailInput = z.infer<typeof simulatedInboxChildEmailInputSchema>;

export type SimulatedInboxChildEmail = z.infer<typeof simulatedInboxChildEmailSchema>;

export type SimulatedInboxDraftInput = z.infer<typeof simulatedInboxDraftInputSchema>;

export type SimulatedInboxListSummary = z.infer<typeof simulatedInboxListSummarySchema>;

export type SimulatedInboxListResponse = z.infer<typeof simulatedInboxListResponseSchema>;

export type ListSimulatedInboxesQuery = z.infer<typeof listSimulatedInboxesQuerySchema>;

export type CreateSimulatedInboxDraftRequest = z.infer<
  typeof createSimulatedInboxDraftRequestSchema
>;

export type UpdateSimulatedInboxDraftRequest = z.infer<
  typeof updateSimulatedInboxDraftRequestSchema
>;

export type SimulatedInboxManagementIdParams = z.infer<
  typeof simulatedInboxManagementIdParamsSchema
>;

export type SimulatedInboxSnapshotIdParams = z.infer<typeof simulatedInboxSnapshotIdParamsSchema>;

export type AddLibraryEmailToSimulatedInboxRequest = z.infer<
  typeof addLibraryEmailToSimulatedInboxRequestSchema
>;

export type ReorderSimulatedInboxEmailsRequest = z.infer<
  typeof reorderSimulatedInboxEmailsRequestSchema
>;

export type SimulatedInboxSnapshotCreationResponse = z.infer<
  typeof simulatedInboxSnapshotCreationResponseSchema
>;

export type SimulatedInboxDetail = z.infer<typeof simulatedInboxDetailSchema>;

export type ActivationValidationIssue = z.infer<typeof activationValidationIssueSchema>;

export type SimulatedInboxActivationValidationResponse = z.infer<
  typeof simulatedInboxActivationValidationResponseSchema
>;

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
  categories?: ContentCategoryDto[];
  difficultyLevel: DifficultyLevelDto;
  isOpened: boolean;
}

export interface GetSimulatedInboxResponseDto {
  organisationId?: string | null;
  emails: SimulatedEmailSummaryDto[];
  statistics: SimulatedInboxStatisticsDto;
}

export interface SimulatedInboxStatisticsDto {
  totalEmails: number;
  classifiedEmails: number;
  correctlyClassifiedEmails: number;
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
  linkAnchorText?: string | null;
  simulatedLinkTarget?: string | null;
  hasAttachment: boolean;
  receivedAt: string;
  categories?: ContentCategoryDto[];
  difficultyLevel: DifficultyLevelDto;
  classificationResult?: ClassifySimulatedEmailResponseDto | null;
}

export type GetSimulatedEmailResponseDto = SimulatedEmailDetailDto;

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
  expectedClassification?: EmailClassificationDto;
  selectedRedFlagIds?: string[];
  selectedRedFlagTypes: EmailRedFlagTypeDto[];
  isCorrect: boolean;
  feedback?: string | null;
  redFlags?: EmailRedFlagDto[];
}

export type PhishingSimulationPoolRequestParamsDto = z.infer<
  typeof phishingSimulationPoolRequestParamsSchema
>;
export type PhishingSimulationPoolEntryRequestParamsDto = z.infer<
  typeof phishingSimulationPoolEntryRequestParamsSchema
>;
export type AddLibraryEmailToPhishingSimulationPoolRequestDto = z.infer<
  typeof addLibraryEmailToPhishingSimulationPoolRequestSchema
>;
export type PhishingSimulationPoolResponseDto = z.infer<
  typeof phishingSimulationPoolResponseSchema
>;
export type PhishingSimulationStopReasonDto = z.infer<typeof phishingSimulationStopReasonSchema>;
export type PhishingSimulationRecipientDto = z.infer<typeof phishingSimulationRecipientSchema>;
export type PlannedMessageDto = z.infer<typeof plannedMessageSchema>;
export type PhishingSimulationDetailResponseDto = z.infer<
  typeof phishingSimulationDetailResponseSchema
>;
export type PhishingSimulationMessageDispatchStatusDto = z.infer<
  typeof phishingSimulationMessageDispatchStatusSchema
>;
export type RealEmailFeedbackDto = z.infer<typeof realEmailFeedbackSchema>;
