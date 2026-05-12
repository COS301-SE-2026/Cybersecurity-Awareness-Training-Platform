import type { z } from 'zod';
import type { SuccessResponseDto } from './common.js';
import type {
  getQuizRequestParamsSchema,
  getQuizResultRequestParamsSchema,
  quizAnswerInputSchema,
  startQuizAttemptRequestParamsSchema,
  submitQuizAttemptRequestParamsSchema,
  submitQuizAttemptRequestSchema,
} from './validation/quizzes.schemas.js';

export type QuestionTypeDto = 'SINGLE_CHOICE';
export type QuizAttemptStatusDto = 'IN_PROGRESS' | 'SUBMITTED';
export type FeedbackTypeDto = 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';

export type GetQuizRequestParamsDto = z.infer<typeof getQuizRequestParamsSchema>;

export interface SafeQuizAnswerOptionDto {
  id: string;
  label: string;
  text: string;
  order: number;
}

export interface SafeQuizQuestionDto {
  id: string;
  text: string;
  type: QuestionTypeDto;
  order: number;
  points: number;
  options: SafeQuizAnswerOptionDto[];
}

export interface GetQuizResponseDto {
  id: string;
  title: string;
  passThresholdPercentage: number;
  questions: SafeQuizQuestionDto[];
}

export type StartQuizAttemptRequestParamsDto = z.infer<typeof startQuizAttemptRequestParamsSchema>;

export interface StartQuizAttemptResponseDto {
  attemptId: string;
  status: Extract<QuizAttemptStatusDto, 'IN_PROGRESS'>;
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

export interface QuizResultFeedbackItemDto {
  questionId: string;
  isCorrect: boolean;
  explanation: string;
  feedbackType?: FeedbackTypeDto;
  linkedTopic?: string | null;
}

export interface GetQuizResultResponseDto {
  attemptId: string;
  scorePercentage: number;
  passed: boolean;
  summary?: string | null;
  feedback: QuizResultFeedbackItemDto[];
}
