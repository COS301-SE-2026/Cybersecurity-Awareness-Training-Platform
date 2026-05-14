import type { AuthStatusDto, UserTypeDto } from './auth.js';
import type { QuestionTypeDto, QuizAttemptStatusDto, QuizStatusDto } from './quizzes.js';
import type {
  EmailClassificationDto,
  EmailRedFlagTypeDto,
  InboxStatusDto,
  InteractionEventTypeDto,
  InteractionTargetTypeDto,
  RedFlagSeverityDto,
} from './simulations.js';
import type {
  DifficultyLevelDto,
  TrainingContentTypeDto,
  TrainingDocumentStatusDto,
} from './training.js';

export type LearnerStatusDto = 'ACTIVE' | 'INACTIVE';

export type OrganisationUserStatusDto = 'ACTIVE' | 'INACTIVE';

export type AdminStatusDto = 'ACTIVE' | 'INACTIVE';

export type GeneralLearnerAccessSourceDto = 'SELF_SIGNUP' | 'INVITE' | 'SEED' | 'ADMIN_CREATED';

export type OrganisationStatusDto = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type OrganisationContextTypeDto =
  | 'LOGO'
  | 'BRAND_GUIDELINES'
  | 'SECURITY_POLICY'
  | 'STAFF_STRUCTURE'
  | 'INTERNAL_TERMINOLOGY'
  | 'APPROVED_DOMAINS'
  | 'EMAIL_SIGNATURE_FORMAT'
  | 'OTHER';

export type OrganisationContextProcessingStatusDto =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'READY'
  | 'NEEDS_REVIEW'
  | 'ARCHIVED';

export type CampaignTypeDto = 'PREMADE_GENERAL' | 'ORGANISATION_CUSTOM';

export type CampaignStatusDto = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

export type CampaignItemTypeDto = 'COMPONENT' | 'GROUP';

export type CampaignComponentTypeDto = 'TRAINING_DOCUMENT' | 'QUIZ' | 'SIMULATED_INBOX';

export type CampaignGroupTypeDto =
  | 'SECTION'
  | 'MODULE'
  | 'REVISION_SET'
  | 'ASSESSMENT_SET'
  | 'SIMULATION_SET';

export type CompletionRuleDto = 'COMPLETE_ALL' | 'COMPLETE_ANY' | 'COMPLETE_REQUIRED_ONLY';

export type CampaignItemAvailabilityStatusDto = 'AVAILABLE' | 'LOCKED' | 'UNAVAILABLE' | 'ARCHIVED';

export type AssignmentStatusDto =
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type CampaignAccessTypeDto = 'ASSIGNED' | 'SELF_SELECTED';

export type CampaignPrerequisiteRequirementTypeDto = 'COMPLETION_REQUIRED';

export type SimulationTypeDto = 'SIMULATED_INBOX';

export type SafetyStatusDto = 'DRAFT' | 'APPROVED' | 'BLOCKED';

export interface HealthCheckDto {
  id: string;
  message: string;
  createdAt: string;
}

export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: UserTypeDto;
  authStatus: AuthStatusDto;
  createdAt: string;
  updatedAt: string;
}

export interface LearnerProfileDto {
  id: string;
  userId: string;
  learnerStatus: LearnerStatusDto;
  createdAt: string;
  updatedAt: string;
}

export interface GeneralLearnerProfileDto {
  id: string;
  learnerProfileId: string;
  accessSource: GeneralLearnerAccessSourceDto;
  createdAt: string;
  updatedAt: string;
}

export interface OrganisationLearnerProfileDto {
  id: string;
  learnerProfileId: string;
  organisationId: string;
  employeeLabel?: string | null;
  joinedAt: string;
  organisationUserStatus: OrganisationUserStatusDto;
  createdAt: string;
  updatedAt: string;
}

export interface OrganisationAdminProfileDto {
  id: string;
  userId: string;
  organisationId: string;
  adminStatus: AdminStatusDto;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface IpAdminProfileDto {
  id: string;
  userId: string;
  adminStatus: AdminStatusDto;
  createdAt: string;
  updatedAt: string;
}

export interface OrganisationDto {
  id: string;
  name: string;
  status: OrganisationStatusDto;
  createdAt: string;
  updatedAt: string;
}

export interface OrganisationContextDto {
  id: string;
  organisationId: string;
  uploadedByUserId?: string | null;
  contextType: OrganisationContextTypeDto;
  name: string;
  description?: string | null;
  contentSummary?: string | null;
  contentRef?: string | null;
  metadata?: Record<string, unknown> | null;
  processingStatus: OrganisationContextProcessingStatusDto;
  aiUsable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDto {
  id: string;
  organisationId?: string | null;
  createdByUserId?: string | null;
  name: string;
  description?: string | null;
  campaignType: CampaignTypeDto;
  difficultyLevel: DifficultyLevelDto;
  status: CampaignStatusDto;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignPrerequisiteDto {
  id: string;
  campaignId: string;
  prerequisiteCampaignId: string;
  requirementType: CampaignPrerequisiteRequirementTypeDto;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignItemDto {
  id: string;
  campaignId: string;
  parentGroupId?: string | null;
  itemType: CampaignItemTypeDto;
  componentType?: CampaignComponentTypeDto | null;
  groupType?: CampaignGroupTypeDto | null;
  completionRule?: CompletionRuleDto | null;
  title: string;
  description?: string | null;
  position: number;
  difficultyLevel?: DifficultyLevelDto | null;
  isRequired: boolean;
  availabilityStatus: CampaignItemAvailabilityStatusDto;
  trainingDocumentId?: string | null;
  quizId?: string | null;
  simulationId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignAssignmentDto {
  id: string;
  campaignId: string;
  learnerProfileId: string;
  assignedByUserId?: string | null;
  currentCampaignItemId?: string | null;
  assignedAt: string;
  dueDate?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  assignmentStatus: AssignmentStatusDto;
  accessType: CampaignAccessTypeDto;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingDocumentDto {
  id: string;
  createdByUserId?: string | null;
  title: string;
  contentType: TrainingContentTypeDto;
  contentRef: string;
  contentSummary?: string | null;
  estimatedReadTimeMinutes?: number | null;
  difficultyLevel: DifficultyLevelDto;
  status: TrainingDocumentStatusDto;
  createdAt: string;
  updatedAt: string;
}

export interface QuizDto {
  id: string;
  createdByUserId?: string | null;
  title: string;
  description?: string | null;
  passThresholdPercentage: number;
  difficultyLevel: DifficultyLevelDto;
  status: QuizStatusDto;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestionDto {
  id: string;
  quizId: string;
  prompt: string;
  questionType: QuestionTypeDto;
  position: number;
  points: number;
  shuffleOptions: boolean;
  minSelections?: number | null;
  maxSelections?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnswerOptionDto {
  id: string;
  questionId: string;
  label: string;
  text: string;
  isCorrect: boolean;
  position: number;
  feedbackText?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttemptDto {
  id: string;
  learnerProfileId: string;
  quizId: string;
  campaignAssignmentId?: string | null;
  campaignItemId?: string | null;
  status: QuizAttemptStatusDto;
  startedAt: string;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttemptAnswerDto {
  id: string;
  attemptId: string;
  questionId: string;
  responseSummary?: string | null;
  typedResponse?: string | null;
  isCorrect?: boolean | null;
  awardedPoints?: number | null;
  feedbackShown?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttemptAnswerOptionDto {
  id: string;
  attemptAnswerId: string;
  answerOptionId: string;
  createdAt: string;
}

export interface QuizResultDto {
  id: string;
  attemptId: string;
  scorePercentage: number;
  passed: boolean;
  summary?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SimulationDto {
  id: string;
  createdByUserId?: string | null;
  simulationType: SimulationTypeDto;
  title: string;
  description?: string | null;
  objective?: string | null;
  safetyStatus: SafetyStatusDto;
  difficultyLevel: DifficultyLevelDto;
  createdAt: string;
  updatedAt: string;
}

export interface SimulatedInboxDto {
  id: string;
  simulationId: string;
  title: string;
  description?: string | null;
  status: InboxStatusDto;
  createdAt: string;
  updatedAt: string;
}

export interface SimulatedEmailDto {
  id: string;
  inboxId: string;
  senderLabel: string;
  senderAddress: string;
  subject: string;
  preview?: string | null;
  bodyHtml: string;
  simulatedLinkTarget?: string | null;
  hasAttachment: boolean;
  receivedAt: string;
  expectedClassification: EmailClassificationDto;
  difficultyLevel: DifficultyLevelDto;
  createdAt: string;
  updatedAt: string;
}

export interface EmailRedFlagEntityDto {
  id: string;
  simulatedEmailId: string;
  redFlagType: EmailRedFlagTypeDto;
  label: string;
  description?: string | null;
  severity: RedFlagSeverityDto;
  createdAt: string;
  updatedAt: string;
}

export interface EmailClassificationResponseDto {
  id: string;
  learnerProfileId: string;
  simulatedEmailId: string;
  campaignAssignmentId?: string | null;
  campaignItemId?: string | null;
  selectedClassification: EmailClassificationDto;
  reasonSummary?: string | null;
  freeTextReason?: string | null;
  isCorrect: boolean;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailClassificationSelectedRedFlagDto {
  id: string;
  emailClassificationResponseId: string;
  emailRedFlagId: string;
  createdAt: string;
}

export interface InteractionEventDto {
  id: string;
  learnerProfileId: string;
  campaignAssignmentId?: string | null;
  campaignItemId?: string | null;
  eventType: InteractionEventTypeDto;
  targetType: InteractionTargetTypeDto;
  targetId: string;
  occurredAt: string;
  metadata?: Record<string, unknown> | null;
  simulatedEmailId?: string | null;
  trainingDocumentId?: string | null;
  quizAttemptId?: string | null;
  quizId?: string | null;
  quizQuestionId?: string | null;
  emailClassificationResponseId?: string | null;
  createdAt: string;
}
