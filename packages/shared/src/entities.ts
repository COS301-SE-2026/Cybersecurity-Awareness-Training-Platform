import type { AuthStatusDto, UserTypeDto } from './auth.js';
import type { Id, IsoDateTimeString } from './common.js';
import type { FeedbackTypeDto, QuestionTypeDto, QuizAttemptStatusDto } from './quizzes.js';
import type { InboxStatusDto, InteractionEventTypeDto } from './simulations.js';
import type {
  TrainingContentTypeDto,
  TrainingDocumentStatusDto,
  TrainingProgressStatusDto,
} from './training.js';

export type ContextStatusDto = 'NOT_PROVIDED' | 'PROVIDED' | 'NEEDS_REVIEW';

export type OrganisationRoleDto = 'ADMIN' | 'EMPLOYEE';

export type MembershipStatusDto = 'ACTIVE' | 'INACTIVE';

export type GeneralLearningAccessSourceDto = 'SELF_SIGNUP' | 'INVITE' | 'SEED' | 'ADMIN_CREATED';

export type CampaignTypeDto = 'ORGANISATION_ASSIGNED' | 'PREMADE_GENERAL';

export type CampaignStatusDto = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export type AssignmentStatusDto = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type LearningPathStatusDto = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type SimulationTypeDto = 'PHISHING_EMAIL';

export type SafetyStatusDto = 'DRAFT' | 'APPROVED' | 'BLOCKED';

export type DifficultyLevelDto = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type QuizStatusDto = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type InteractionTargetTypeDto =
  | 'SIMULATED_EMAIL'
  | 'TRAINING_DOCUMENT'
  | 'QUIZ'
  | 'QUIZ_ATTEMPT'
  | 'QUIZ_QUESTION';

export interface HealthCheckDto {
  id: Id;
  message: string;
  createdAt: IsoDateTimeString;
}

export interface UserDto {
  id: Id;
  firstName: string;
  lastName: string;
  email: string;
  userType: UserTypeDto;
  authStatus: AuthStatusDto;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface OrganisationDto {
  id: Id;
  name: string;
  contextStatus: ContextStatusDto;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface OrganisationMembershipDto {
  id: Id;
  userId: Id;
  organisationId: Id;
  role: OrganisationRoleDto;
  status: MembershipStatusDto;
  departmentId?: Id | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface GeneralLearningAccessDto {
  id: Id;
  userId: Id;
  assignedAt: IsoDateTimeString;
  source: GeneralLearningAccessSourceDto;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface DepartmentDto {
  id: Id;
  organisationId: Id;
  name: string;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface CompanyContextDto {
  id: Id;
  organisationId: Id;
  industry?: string | null;
  terminology?: Record<string, unknown> | null;
  safetyNotes?: string | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface CampaignDto {
  id: Id;
  organisationId?: Id | null;
  name: string;
  description?: string | null;
  campaignType: CampaignTypeDto;
  status: CampaignStatusDto;
  startDate?: IsoDateTimeString | null;
  endDate?: IsoDateTimeString | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface CampaignAssignmentDto {
  id: Id;
  campaignId: Id;
  userId: Id;
  membershipId: Id;
  assignedAt: IsoDateTimeString;
  assignmentStatus: AssignmentStatusDto;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface LearningPathDto {
  id: Id;
  campaignId: Id;
  title: string;
  status: LearningPathStatusDto;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface SimulationDto {
  id: Id;
  campaignId: Id;
  simulationType: SimulationTypeDto;
  objective?: string | null;
  safetyStatus: SafetyStatusDto;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface SimulatedInboxDto {
  id: Id;
  ownerUserId: Id;
  status: InboxStatusDto;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface SimulatedEmailDto {
  id: Id;
  inboxId: Id;
  simulationId: Id;
  recommendedTrainingDocumentId?: Id | null;
  senderLabel: string;
  senderAddress: string;
  subject: string;
  preview?: string | null;
  bodyHtml: string;
  receivedAt: IsoDateTimeString;
  isRead: boolean;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface TrainingModuleDto {
  id: Id;
  learningPathId?: Id | null;
  title: string;
  order: number;
  description?: string | null;
  difficulty: DifficultyLevelDto;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface TrainingDocumentDto {
  id: Id;
  moduleId: Id;
  title: string;
  contentType: TrainingContentTypeDto;
  contentRef: string;
  status: TrainingDocumentStatusDto;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface TrainingProgressDto {
  id: Id;
  userId: Id;
  trainingDocumentId: Id;
  campaignAssignmentId?: Id | null;
  status: TrainingProgressStatusDto;
  startedAt?: IsoDateTimeString | null;
  completedAt?: IsoDateTimeString | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface QuizDto {
  id: Id;
  trainingDocumentId?: Id | null;
  title: string;
  passThresholdPercentage: number;
  status: QuizStatusDto;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface QuizQuestionDto {
  id: Id;
  quizId: Id;
  prompt: string;
  questionType: QuestionTypeDto;
  order: number;
  points: number;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface AnswerOptionDto {
  id: Id;
  questionId: Id;
  label: string;
  text: string;
  isCorrect: boolean;
  order: number;
  feedback?: string | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface QuizAttemptDto {
  id: Id;
  userId: Id;
  quizId: Id;
  campaignAssignmentId?: Id | null;
  trainingProgressId?: Id | null;
  status: QuizAttemptStatusDto;
  startedAt: IsoDateTimeString;
  submittedAt?: IsoDateTimeString | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface AttemptAnswerDto {
  id: Id;
  attemptId: Id;
  questionId: Id;
  selectedOptionId: Id;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface QuizResultDto {
  id: Id;
  attemptId: Id;
  scorePercentage: number;
  passed: boolean;
  summary?: string | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface FeedbackItemDto {
  id: Id;
  quizResultId: Id;
  questionId: Id;
  attemptAnswerId?: Id | null;
  isCorrect: boolean;
  explanation: string;
  feedbackType: FeedbackTypeDto;
  linkedTopic?: string | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface InteractionEventDto {
  id: Id;
  userId: Id;
  eventType: InteractionEventTypeDto;
  targetType: InteractionTargetTypeDto;
  targetId: Id;
  occurredAt: IsoDateTimeString;
  metadata?: Record<string, unknown> | null;
  simulatedEmailId?: Id | null;
  trainingDocumentId?: Id | null;
  quizAttemptId?: Id | null;
  quizId?: Id | null;
  quizQuestionId?: Id | null;
  createdAt: IsoDateTimeString;
}
