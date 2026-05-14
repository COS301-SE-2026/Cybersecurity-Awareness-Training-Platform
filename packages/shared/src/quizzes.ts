import type { z } from 'zod';
import type { SuccessResponseDto } from './common.js';
import type { DifficultyLevelDto } from './training.js';
import type {
  getQuizRequestParamsSchema,
  getQuizResultRequestParamsSchema,
  quizAnswerInputSchema,
  startQuizAttemptRequestParamsSchema,
  submitQuizAttemptRequestParamsSchema,
  submitQuizAttemptRequestSchema,
} from './validation/quizzes.schemas.js';

export type QuestionTypeDto = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
export type QuizAttemptStatusDto = 'IN_PROGRESS' | 'SUBMITTED';
export type QuizStatusDto = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type GetQuizRequestParamsDto = z.infer<typeof getQuizRequestParamsSchema>;

export interface SafeQuizAnswerOptionDto {
  id: string;
  label: string;
  text: string;
  position: number;
}

export interface SafeQuizQuestionDto {
  id: string;
  prompt: string;
  questionType: QuestionTypeDto;
  position: number;
  points: number;
  options: SafeQuizAnswerOptionDto[];
}

export interface GetQuizResponseDto {
  id: string;
  campaignItemId?: string | null;
  campaignAssignmentId?: string | null;
  title: string;
  description?: string | null;
  passThresholdPercentage: number;
  difficultyLevel: DifficultyLevelDto;
  status: QuizStatusDto;
  questions: SafeQuizQuestionDto[];
}

export type StartQuizAttemptRequestParamsDto = z.infer<typeof startQuizAttemptRequestParamsSchema>;

export interface StartQuizAttemptResponseDto {
  attemptId: string;
  learnerProfileId: string;
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

export interface QuizSelectedOptionFeedbackDto {
  optionId: string;
  label: string;
  text: string;
  isCorrect: boolean;
  feedbackText?: string | null;
}

export interface QuizAttemptAnswerResultDto {
  questionId: string;
  isCorrect?: boolean | null;
  awardedPoints?: number | null;
  feedbackShown?: string | null;
  selectedOptions: QuizSelectedOptionFeedbackDto[];
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
}
