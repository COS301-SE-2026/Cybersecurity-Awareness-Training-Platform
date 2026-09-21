import {
  createTrainingDocumentDraftRequestSchema,
  type ContentCategoryDto,
  type DifficultyLevelDto,
  organisationEmailDraftInputSchema,
  type OrganisationEmailDraftInput,
  type QuizDraftInput,
  type TrainingDocuemtnDraftInputDto,
} from '@insightful-phish/shared';
import { adaptGeneratedQuizDraft } from './aiBuilderGenerationClient';

export type AiBuilderNavigationIntent = Readonly<{
  autoOpenGenerateWithAi: true;
  requestedDifficulty: DifficultyLevelDto;
  requestedCategories?: readonly ContentCategoryDto[];
  administratorGuidance?: string;
  returnTo?: string;
}>;

export type AiBuilderNavigationState = Readonly<{
  aiGenerationIntent?: AiBuilderNavigationIntent;
  aiGenerationReturnTo?: string;
  aiBuilderPrefill?:
    | Readonly<{ contentType: 'TRAINING_DOCUMENT'; draft: unknown; returnTo?: string }>
    | Readonly<{ contentType: 'QUIZ'; draft: unknown; returnTo?: string }>
    | Readonly<{ contentType: 'ORGANISATION_EMAIL'; draft: unknown; returnTo?: string }>;
}>;

export function readAiBuilderNavigationIntent(state: unknown): AiBuilderNavigationIntent | null {
  if (!state || typeof state !== 'object' || !('aiGenerationIntent' in state)) return null;

  const intent = (state as AiBuilderNavigationState).aiGenerationIntent;
  if (
    !intent ||
    intent.autoOpenGenerateWithAi !== true ||
    !['EASY', 'MEDIUM', 'HARD'].includes(intent.requestedDifficulty)
  ) {
    return null;
  }

  return intent;
}

export function readAiBuilderReturnTo(state: unknown): string | null {
  if (!state || typeof state !== 'object') return null;
  const navigationState = state as AiBuilderNavigationState;
  const returnTo =
    navigationState.aiGenerationIntent?.returnTo ??
    navigationState.aiBuilderPrefill?.returnTo ??
    navigationState.aiGenerationReturnTo;
  return typeof returnTo === 'string' && returnTo.startsWith('/') ? returnTo : null;
}

export function readTrainingDocumentPrefill(state: unknown): TrainingDocuemtnDraftInputDto | null {
  if (!state || typeof state !== 'object') return null;
  const prefill = (state as AiBuilderNavigationState).aiBuilderPrefill;
  if (prefill?.contentType !== 'TRAINING_DOCUMENT') return null;
  const result = createTrainingDocumentDraftRequestSchema.safeParse(prefill.draft);
  return result.success ? result.data : null;
}

export function readQuizPrefill(state: unknown): QuizDraftInput | null {
  if (!state || typeof state !== 'object') return null;
  const prefill = (state as AiBuilderNavigationState).aiBuilderPrefill;
  if (prefill?.contentType !== 'QUIZ') return null;
  try {
    return adaptGeneratedQuizDraft(prefill.draft);
  } catch {
    return null;
  }
}

export function readOrganisationEmailPrefill(state: unknown): OrganisationEmailDraftInput | null {
  if (!state || typeof state !== 'object') return null;
  const prefill = (state as AiBuilderNavigationState).aiBuilderPrefill;
  if (prefill?.contentType !== 'ORGANISATION_EMAIL') return null;
  const result = organisationEmailDraftInputSchema.safeParse(prefill.draft);
  return result.success ? { ...result.data, link: null } : null;
}
