import {
  createTrainingDocumentDraftRequestSchema,
  contentVariantGenerationResponseSchema,
  organisationEmailDraftInputSchema,
  quizDraftInputSchema,
  type OrganisationEmailDraftInput,
  type ContentVariantGenerationRequestDto,
  type ContentVariantGenerationResponseDto,
  type QuizDraftInput,
  type ReusableContentGenerationRequestDto,
  type TrainingDocuemtnDraftInputDto,
} from '@insightful-phish/shared';
import { apiClient } from '../../lib/apiClient';

export type AiBuilderGenerationScope =
  | { kind: 'platform' }
  | { kind: 'organisation'; organisationId: string };

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function generationBasePath(scope: AiBuilderGenerationScope): string {
  if (scope.kind === 'organisation') {
    return `/organisations/${encodeURIComponent(scope.organisationId)}`;
  }

  return '/platform';
}

function publicRequest(
  request: ReusableContentGenerationRequestDto,
): ReusableContentGenerationRequestDto {
  return {
    requestedDifficulty: request.requestedDifficulty,
    requestedCategories: request.requestedCategories,
    topic: request.topic,
    learningObjective: request.learningObjective,
    ...(request.administratorGuidance === undefined
      ? {}
      : { administratorGuidance: request.administratorGuidance }),
  };
}

function orderedByPosition(values: unknown[]): unknown[] {
  return [...values].sort((left, right) => {
    const leftPosition = isJsonObject(left) ? left.position : undefined;
    const rightPosition = isJsonObject(right) ? right.position : undefined;

    return typeof leftPosition === 'number' && typeof rightPosition === 'number'
      ? leftPosition - rightPosition
      : 0;
  });
}

function withoutGeneratedOptionIdentity(value: unknown, position: number): unknown {
  if (!isJsonObject(value)) {
    return value;
  }

  const option = { ...value };
  delete option.id;
  delete option.answerOptionId;
  option.position = position;
  return option;
}

function withoutGeneratedQuestionIdentity(value: unknown, position: number): unknown {
  if (!isJsonObject(value)) {
    return value;
  }

  const question = { ...value };
  const { minSelections, maxSelections, answerOptions } = question;
  const normalizedOptions = Array.isArray(answerOptions)
    ? orderedByPosition(answerOptions).map(withoutGeneratedOptionIdentity)
    : answerOptions;
  delete question.id;
  delete question.questionId;
  delete question.position;
  delete question.minSelections;
  delete question.maxSelections;
  delete question.answerOptions;

  if (question.questionType === 'SINGLE_CHOICE') {
    return { ...question, position, answerOptions: normalizedOptions };
  }

  return {
    ...question,
    position,
    minSelections,
    maxSelections,
    answerOptions: normalizedOptions,
  };
}

export function adaptGeneratedQuizDraft(value: unknown): QuizDraftInput {
  if (!isJsonObject(value)) {
    return quizDraftInputSchema.parse(value);
  }

  const quiz = { ...value };
  const { questions } = quiz;
  const normalizedQuestions = Array.isArray(questions)
    ? orderedByPosition(questions).map(withoutGeneratedQuestionIdentity)
    : questions;
  delete quiz.id;
  delete quiz.quizId;
  delete quiz.questions;

  return quizDraftInputSchema.parse({ ...quiz, questions: normalizedQuestions });
}

export async function generateTrainingDocumentDraft(
  scope: AiBuilderGenerationScope,
  request: ReusableContentGenerationRequestDto,
): Promise<TrainingDocuemtnDraftInputDto> {
  const response = await apiClient.post<unknown, ReusableContentGenerationRequestDto>(
    `${generationBasePath(scope)}/training-documents/generate`,
    publicRequest(request),
  );

  return createTrainingDocumentDraftRequestSchema.parse(response);
}

export async function generateQuizDraft(
  scope: AiBuilderGenerationScope,
  request: ReusableContentGenerationRequestDto,
): Promise<QuizDraftInput> {
  const response = await apiClient.post<unknown, ReusableContentGenerationRequestDto>(
    `${generationBasePath(scope)}/quizzes/generate`,
    publicRequest(request),
  );

  return adaptGeneratedQuizDraft(response);
}

export async function generateOrganisationEmailDraft(
  organisationId: string,
  request: ReusableContentGenerationRequestDto,
): Promise<OrganisationEmailDraftInput> {
  const response = await apiClient.post<unknown, ReusableContentGenerationRequestDto>(
    `/organisations/${encodeURIComponent(organisationId)}/email-library/generate`,
    publicRequest(request),
  );

  return organisationEmailDraftInputSchema.parse(response);
}

export type BuilderContentVariantResult =
  | (Omit<
      Extract<ContentVariantGenerationResponseDto, { contentType: 'TRAINING_DOCUMENT' }>,
      'draft'
    > & {
      draft: TrainingDocuemtnDraftInputDto;
    })
  | (Omit<Extract<ContentVariantGenerationResponseDto, { contentType: 'QUIZ' }>, 'draft'> & {
      draft: QuizDraftInput;
    })
  | Extract<ContentVariantGenerationResponseDto, { contentType: 'ORGANISATION_EMAIL' }>;

export async function generateOrganisationContentVariant(
  organisationId: string,
  request: ContentVariantGenerationRequestDto,
): Promise<BuilderContentVariantResult> {
  const response = await apiClient.post<unknown, ContentVariantGenerationRequestDto>(
    `/organisations/${encodeURIComponent(organisationId)}/content-variants/generate`,
    request,
  );
  const parsed = contentVariantGenerationResponseSchema.parse(response);
  if (parsed.contentType === 'TRAINING_DOCUMENT') {
    return { ...parsed, draft: createTrainingDocumentDraftRequestSchema.parse(parsed.draft) };
  }
  if (parsed.contentType === 'QUIZ') {
    return { ...parsed, draft: adaptGeneratedQuizDraft(parsed.draft) };
  }
  return parsed;
}
