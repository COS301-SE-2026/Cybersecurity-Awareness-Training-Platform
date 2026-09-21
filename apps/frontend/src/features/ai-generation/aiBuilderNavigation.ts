import type { ContentCategoryDto, DifficultyLevelDto } from '@insightful-phish/shared';

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
    navigationState.aiGenerationIntent?.returnTo ?? navigationState.aiGenerationReturnTo;
  return typeof returnTo === 'string' && returnTo.startsWith('/') ? returnTo : null;
}
