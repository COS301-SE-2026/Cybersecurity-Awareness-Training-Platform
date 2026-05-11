import type { Id, SuccessResponseDto } from './common.js';

export type QuestionTypeDto = 'SINGLE_CHOICE';
export type QuizAttemptStatusDto = 'IN_PROGRESS' | 'SUBMITTED';
export type FeedbackTypeDto = 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';

export interface GetQuizRequestParamsDto {
  quizId: Id;
}

export interface SafeQuizAnswerOptionDto {
  id: Id;
  label: string;
  text: string;
  order: number;
}

export interface SafeQuizQuestionDto {
  id: Id;
  text: string;
  type: QuestionTypeDto;
  order: number;
  points: number;
  options: SafeQuizAnswerOptionDto[];
}

export interface GetQuizResponseDto {
  id: Id;
  title: string;
  passThresholdPercentage: number;
  questions: SafeQuizQuestionDto[];
}

export interface StartQuizAttemptRequestParamsDto {
  quizId: Id;
}

export interface StartQuizAttemptResponseDto {
  attemptId: Id;
  status: Extract<QuizAttemptStatusDto, 'IN_PROGRESS'>;
}

export interface SubmitQuizAttemptRequestParamsDto {
  attemptId: Id;
}

export interface QuizAnswerInputDto {
  questionId: Id;
  answerValue: Id;
}

export interface SubmitQuizAttemptRequestDto {
  answers: QuizAnswerInputDto[];
}

export interface SubmitQuizAttemptResponseDto extends SuccessResponseDto {
  attemptId: Id;
  status: Extract<QuizAttemptStatusDto, 'SUBMITTED'>;
}

export interface GetQuizResultRequestParamsDto {
  attemptId: Id;
}

export interface QuizResultFeedbackItemDto {
  questionId: Id;
  isCorrect: boolean;
  explanation: string;
  feedbackType?: FeedbackTypeDto;
  linkedTopic?: string | null;
}

export interface GetQuizResultResponseDto {
  attemptId: Id;
  scorePercentage: number;
  passed: boolean;
  summary?: string | null;
  feedback: QuizResultFeedbackItemDto[];
}
