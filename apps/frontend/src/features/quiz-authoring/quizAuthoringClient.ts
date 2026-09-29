import type {
  AdminQuizResponseDto,
  ListQuizzesResponseDto,
  QuizDraftInput,
} from '@insightful-phish/shared';

import { apiClient } from '../../lib/apiClient';

export type QuizAuthoringScope =
  | {
      kind: 'organisation';
      organisationId: string;
    }
  | {
      kind: 'platform';
    };

function getQuizCollectionPath(scope: QuizAuthoringScope): string {
  if (scope.kind === 'organisation') {
    return `/organisations/${encodeURIComponent(scope.organisationId)}/quizzes`;
  }

  return '/platform/quizzes';
}

function getQuizPath(scope: QuizAuthoringScope, quizId: string): string {
  return `${getQuizCollectionPath(scope)}/${encodeURIComponent(quizId)}`;
}

export function listQuizzes(scope: QuizAuthoringScope): Promise<ListQuizzesResponseDto> {
  return apiClient.get<ListQuizzesResponseDto>(getQuizCollectionPath(scope));
}

export function createQuizDraft(
  scope: QuizAuthoringScope,
  input: QuizDraftInput,
): Promise<AdminQuizResponseDto> {
  return apiClient.post<AdminQuizResponseDto, QuizDraftInput>(getQuizCollectionPath(scope), input);
}

export function getQuizForAuthoring(
  scope: QuizAuthoringScope,
  quizId: string,
): Promise<AdminQuizResponseDto> {
  return apiClient.get<AdminQuizResponseDto>(getQuizPath(scope, quizId));
}

export function updateQuizDraft(
  scope: QuizAuthoringScope,
  quizId: string,
  input: QuizDraftInput,
): Promise<AdminQuizResponseDto> {
  return apiClient.put<AdminQuizResponseDto, QuizDraftInput>(getQuizPath(scope, quizId), input);
}

export function activateQuiz(
  scope: QuizAuthoringScope,
  quizId: string,
): Promise<AdminQuizResponseDto> {
  return apiClient.post<AdminQuizResponseDto>(`${getQuizPath(scope, quizId)}/activate`);
}

export function copyQuiz(scope: QuizAuthoringScope, quizId: string): Promise<AdminQuizResponseDto> {
  return apiClient.post<AdminQuizResponseDto>(`${getQuizPath(scope, quizId)}/copy`);
}
