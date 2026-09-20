import {
  createTrainingDocumentDraftRequestSchema,
  organisationEmailDraftInputSchema,
  quizDraftInputSchema,
  type OrganisationEmailDraftInput,
  type QuizDraftInput,
  type ReusableContentGenerationRequestDto,
  type TrainingDocuemtnDraftInputDto,
} from '@insightful-phish/shared';
import { AiProviderConfigurationError } from '../config/ai-provider.js';
import { findActiveIpAdminScope } from '../repositories/organisation-scope.repository.js';
import { AiGenerationProviderError } from './ai-generation-provider.js';
import { AiStructuredOutputValidationError } from './ai-generation.service.js';
import {
  createAiOrganisationEmailGenerationService,
  OrganisationEmailGenerationError,
} from './ai-organisation-email-generation.service.js';
import { getApprovedOrganisationContextForAi } from './ai-organisation-context.service.js';
import {
  createAiQuizGenerationService,
  type GeneratedQuizDraft,
  QuizGenerationError,
} from './ai-quiz-generation.service.js';
import {
  createAiTrainingDocumentGenerationService,
  TrainingDocumentGenerationError,
} from './ai-training-document-generation.service.js';

export class AiBuilderGenerationError extends Error {
  constructor(
    readonly statusCode: 401 | 403 | 429 | 502 | 503 | 504,
    readonly error: string,
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'AiBuilderGenerationError';
  }
}

async function requirePlatformAuthoringAccess(userId: string): Promise<void> {
  if (!(await findActiveIpAdminScope(userId))) {
    throw new AiBuilderGenerationError(
      403,
      'FORBIDDEN',
      'Platform administrator access is required',
      false,
    );
  }
}

async function promptContext(userId: string, organisationId: string | null) {
  if (organisationId === null) {
    await requirePlatformAuthoringAccess(userId);
    return undefined;
  }
  return {
    organisationContext: await getApprovedOrganisationContextForAi({
      actorUserId: userId,
      organisationId,
    }),
  };
}

function toQuizDraft(generated: GeneratedQuizDraft): QuizDraftInput {
  return quizDraftInputSchema.parse({
    ...generated,
    questions: generated.questions.map((question, questionIndex) => {
      const common = {
        prompt: question.prompt,
        questionType: question.questionType,
        position: questionIndex,
        points: question.points,
        shuffleOptions: question.shuffleOptions,
        categories: question.categories,
        answerOptions: question.answerOptions.map((option, optionIndex) => ({
          label: option.label,
          text: option.text,
          position: optionIndex,
          isCorrect: option.isCorrect,
          feedbackText: option.feedbackText,
        })),
      };
      return question.questionType === 'SINGLE_CHOICE'
        ? common
        : {
            ...common,
            minSelections: question.minSelections,
            maxSelections: question.maxSelections,
          };
    }),
  });
}

export function translateAiBuilderGenerationError(error: unknown): never {
  if (error instanceof AiBuilderGenerationError) throw error;
  if (error instanceof AiProviderConfigurationError) {
    throw new AiBuilderGenerationError(
      503,
      'AI_GENERATION_UNAVAILABLE',
      'AI generation is temporarily unavailable',
      true,
    );
  }
  if (error instanceof AiGenerationProviderError) {
    const statusCode =
      error.failureKind === 'TIMEOUT'
        ? 504
        : error.failureKind === 'RATE_LIMITED'
          ? 429
          : error.failureKind === 'PROVIDER_UNAVAILABLE'
            ? 503
            : 502;
    throw new AiBuilderGenerationError(
      statusCode,
      `AI_GENERATION_${error.failureKind}`,
      'AI generation could not be completed',
      error.retryable,
    );
  }
  if (
    error instanceof AiStructuredOutputValidationError ||
    error instanceof TrainingDocumentGenerationError ||
    error instanceof QuizGenerationError ||
    error instanceof OrganisationEmailGenerationError
  ) {
    throw new AiBuilderGenerationError(
      502,
      'AI_GENERATION_INVALID_RESPONSE',
      'AI generation returned an invalid Draft',
      true,
    );
  }
  throw error;
}

export async function generateTrainingDocumentDraft(input: {
  userId: string;
  organisationId: string | null;
  request: ReusableContentGenerationRequestDto;
}): Promise<TrainingDocuemtnDraftInputDto> {
  try {
    const context = await promptContext(input.userId, input.organisationId);
    const draft = await createAiTrainingDocumentGenerationService().generateDraft(
      input.request,
      context,
    );
    return createTrainingDocumentDraftRequestSchema.parse(draft);
  } catch (error) {
    return translateAiBuilderGenerationError(error);
  }
}

export async function generateQuizDraft(input: {
  userId: string;
  organisationId: string | null;
  request: ReusableContentGenerationRequestDto;
}): Promise<QuizDraftInput> {
  try {
    const context = await promptContext(input.userId, input.organisationId);
    const draft = await createAiQuizGenerationService().generateDraft(input.request, context);
    return toQuizDraft(draft);
  } catch (error) {
    return translateAiBuilderGenerationError(error);
  }
}

export async function generateOrganisationEmailDraft(input: {
  userId: string;
  organisationId: string;
  request: ReusableContentGenerationRequestDto;
}): Promise<OrganisationEmailDraftInput> {
  try {
    const context = await promptContext(input.userId, input.organisationId);
    const draft = await createAiOrganisationEmailGenerationService().generateDraft(
      input.request,
      context,
    );
    return organisationEmailDraftInputSchema.parse(draft);
  } catch (error) {
    return translateAiBuilderGenerationError(error);
  }
}
