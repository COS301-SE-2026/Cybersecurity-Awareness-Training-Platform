import type { AuthStatusDto, UserTypeDto } from './auth.js';
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

export interface OrganisationDto {
  id: string;
  name: string;
  contextStatus: ContextStatusDto;
  createdAt: string;
  updatedAt: string;
}

export interface OrganisationMembershipDto {
  id: string;
  userId: string;
  organisationId: string;
  role: OrganisationRoleDto;
  status: MembershipStatusDto;
  departmentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeneralLearningAccessDto {
  id: string;
  userId: string;
  assignedAt: string;
  source: GeneralLearningAccessSourceDto;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentDto {
  id: string;
  organisationId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyContextDto {
  id: string;
  organisationId: string;
  industry?: string | null;
  terminology?: Record<string, unknown> | null;
  safetyNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDto {
  id: string;
  organisationId?: string | null;
  name: string;
  description?: string | null;
  campaignType: CampaignTypeDto;
  status: CampaignStatusDto;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignAssignmentDto {
  id: string;
  campaignId: string;
  userId: string;
  membershipId: string;
  assignedAt: string;
  assignmentStatus: AssignmentStatusDto;
  createdAt: string;
  updatedAt: string;
}

export interface LearningPathDto {
  id: string;
  campaignId: string;
  title: string;
  status: LearningPathStatusDto;
  createdAt: string;
  updatedAt: string;
}

export interface SimulationDto {
  id: string;
  campaignId: string;
  simulationType: SimulationTypeDto;
  objective?: string | null;
  safetyStatus: SafetyStatusDto;
  createdAt: string;
  updatedAt: string;
}

export interface SimulatedInboxDto {
  id: string;
  ownerUserId: string;
  status: InboxStatusDto;
  createdAt: string;
  updatedAt: string;
}

export interface SimulatedEmailDto {
  id: string;
  inboxId: string;
  simulationId: string;
  recommendedTrainingDocumentId?: string | null;
  senderLabel: string;
  senderAddress: string;
  subject: string;
  preview?: string | null;
  bodyHtml: string;
  receivedAt: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingModuleDto {
  id: string;
  learningPathId?: string | null;
  title: string;
  order: number;
  description?: string | null;
  difficulty: DifficultyLevelDto;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingDocumentDto {
  id: string;
  moduleId: string;
  title: string;
  contentType: TrainingContentTypeDto;
  contentRef: string;
  status: TrainingDocumentStatusDto;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingProgressDto {
  id: string;
  userId: string;
  trainingDocumentId: string;
  campaignAssignmentId?: string | null;
  status: TrainingProgressStatusDto;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuizDto {
  id: string;
  trainingDocumentId?: string | null;
  title: string;
  passThresholdPercentage: number;
  status: QuizStatusDto;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestionDto {
  id: string;
  quizId: string;
  prompt: string;
  questionType: QuestionTypeDto;
  order: number;
  points: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnswerOptionDto {
  id: string;
  questionId: string;
  label: string;
  text: string;
  isCorrect: boolean;
  order: number;
  feedback?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttemptDto {
  id: string;
  userId: string;
  quizId: string;
  campaignAssignmentId?: string | null;
  trainingProgressId?: string | null;
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
  selectedOptionId: string;
  createdAt: string;
  updatedAt: string;
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

export interface FeedbackItemDto {
  id: string;
  quizResultId: string;
  questionId: string;
  attemptAnswerId?: string | null;
  isCorrect: boolean;
  explanation: string;
  feedbackType: FeedbackTypeDto;
  linkedTopic?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InteractionEventDto {
  id: string;
  userId: string;
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
  createdAt: string;
}
