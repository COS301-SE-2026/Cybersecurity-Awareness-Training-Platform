import type { z } from 'zod';
import type { SuccessResponseDto } from './common.js';
import type { ContentCategoryDto, DifficultyLevelDto } from './categories.js';
import type {
  getQuizRequestParamsSchema,
  getQuizResultRequestParamsSchema,
  quizAnswerInputSchema,
  quizAnswerOptionDraftInputSchema,
  quizDraftInputSchema,
  quizQuestionDraftInputSchema,
  startQuizAttemptRequestParamsSchema,
  submitQuizAttemptRequestParamsSchema,
  submitQuizAttemptRequestSchema,
} from './validation/quizzes.schemas.js';

export type QuestionTypeDto = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
export type QuizAttemptStatusDto = 'IN_PROGRESS' | 'SUBMITTED';
export type QuizStatusDto = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type QuizScorePolicyDto = 'BEST' | 'LATEST' | 'AVERAGE';

export type QuizAnswerOptionDraftInput = z.infer<typeof quizAnswerOptionDraftInputSchema>;
export type QuizQuestionDraftInput = z.infer<typeof quizQuestionDraftInputSchema>;
export type QuizDraftInput = z.infer<typeof quizDraftInputSchema>;

type DistributiveOmit<T, Tkey extends PropertyKey> = T extends unknown
  ? Omit<T, Extract<keyof T, Tkey>>
  : never;

export type AdminQuizAnswerOptionDto = QuizAnswerOptionDraftInput & {
  id: string;
};

export type AdminQuizQuestionDto = DistributiveOmit<
  QuizQuestionDraftInput,
  'id' | 'answerOptions'
> & {
  id: string;
  answerOptions: AdminQuizAnswerOptionDto[];
};

export type QuizManagementListItemDto = Pick<
  AdminQuizResponseDto,
  'id' | 'title' | 'status' | 'difficultyLevel'
>;

export type ListQuizzesResponseDto = {
  items: QuizManagementListItemDto[];
};

export type AdminQuizResponseDto = Omit<QuizDraftInput, 'questions'> & {
  id: string;
  organisationId: string | null;
  createdByUserId: string | null;
  status: QuizStatusDto;
  createdAt: string;
  updatedAt: string;
  questions: AdminQuizQuestionDto[];
};

export type GetQuizRequestParamsDto = z.infer<typeof getQuizRequestParamsSchema>;

export interface SafeQuizAnswerOptionDto {
  id: string;
  label: string;
  text: string;
  position: number;
}

export type SafeQuizQuestionDto = {
  id: string;
  prompt: string;
  questionType: QuestionTypeDto;
  position: number;
  points: number;
  categories?: ContentCategoryDto[];
  options: SafeQuizAnswerOptionDto[];
} & (
  | {
      questionType: 'SINGLE_CHOICE';
      minSelections?: never;
      maxSelections?: never;
    }
  | {
      questionType: 'MULTIPLE_CHOICE';
      minSelections: number;
      maxSelections: number;
    }
);

export interface CurrentQuizAttemptSummaryDto {
  attemptId: string;
  status: QuizAttemptStatusDto;
  hasResult: boolean;
}

export interface GetQuizResponseDto {
  id: string;
  organisationId?: string | null;
  campaignItemId?: string | null;
  campaignAssignmentId?: string | null;
  title: string;
  description?: string | null;
  passThresholdPercentage: number;
  difficultyLevel: DifficultyLevelDto;
  status: QuizStatusDto;
  questions: SafeQuizQuestionDto[];
  maxAttempts: number;
  attemptsRemaining: number;
  scorePolicy: QuizScorePolicyDto;
  effectiveScorePercentage: number | null;
  currentAttempt?: CurrentQuizAttemptSummaryDto | null;
}

export type StartQuizAttemptRequestParamsDto = z.infer<typeof startQuizAttemptRequestParamsSchema>;

export interface StartQuizAttemptResponseDto {
  attemptId: string;
  traineeProfileId: string;
  quizId: string;
  campaignAssignmentId?: string | null;
  campaignItemId?: string | null;
  status: Extract<QuizAttemptStatusDto, 'IN_PROGRESS'>;
  startedAt: string;
}

export type SubmitQuizAttemptRequestParamsDto = z.infer<
  typeof submitQuizAttemptRequestParamsSchema
>;

export type QuizAnswerInputDto = z.infer<typeof quizAnswerInputSchema>;

export type SubmitQuizAttemptRequestDto = z.infer<typeof submitQuizAttemptRequestSchema>;

export interface SubmitQuizAttemptResponseDto extends SuccessResponseDto {
  attemptId: string;
  status: Extract<QuizAttemptStatusDto, 'SUBMITTED'>;
}

export type GetQuizResultRequestParamsDto = z.infer<typeof getQuizResultRequestParamsSchema>;

export interface QuizResultOptionFeedbackDto {
  optionId: string;
  label: string;
  text: string;
  isCorrect: boolean;
  feedbackText?: string | null;
  selected: boolean;
}

export interface QuizAttemptAnswerResultDto {
  questionId: string;
  isCorrect?: boolean | null;
  awardedPoints?: number | null;
  feedbackShown?: string | null;
  options: QuizResultOptionFeedbackDto[];
  questionPrompt: string;
}

export interface QuizAttemptResultSummaryDto {
  attemptId: string;
  attemptNumber: number;
  submittedAt: string | null;
  scorePercentage: number;
  passed: boolean;
}

export interface GetQuizResultResponseDto {
  attemptId: string;
  quizId: string;
  campaignAssignmentId?: string | null;
  campaignItemId?: string | null;
  scorePercentage: number;
  passed: boolean;
  summary?: string | null;
  answers: QuizAttemptAnswerResultDto[];
  quizTitle: string;
  attemptHistory: QuizAttemptResultSummaryDto[];
  pointsEarned: number;
  pointsAvailable: number;
  feedbackAvailable: boolean;
}
