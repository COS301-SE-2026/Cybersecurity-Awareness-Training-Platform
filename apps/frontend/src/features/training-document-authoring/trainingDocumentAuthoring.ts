import {
  contentCategories,
  difficultyLevels,
  type ContentCategoryDto,
  type DifficultyLevelDto,
  type TrainingDocuemtnDraftInputDto,
  type TrainingDocumentAuthoringResponseDto,
} from '@insightful-phish/shared';

export const TRAINING_DOCUMENT_TITLE_MAX_LENGTH = 200;
export const TRAINING_DOCUMENT_SUMMARY_MAX_LENGTH = 2_000;
export const TRAINING_DOCUMENT_MARKDOWN_MAX_LENGTH = 50_000;

export const trainingDocumentCategoryLabels: Record<ContentCategoryDto, string> = {
  PHISHING_AND_SUSPICIOUS_MESSAGES: 'Phishing and suspicious messages',
  LINKS_DOMAINS_AND_SENDER_VERIFICATION: 'Links, domains and sender verification',
  PASSWORDS_AND_AUTHENTICATION: 'Passwords and authentication',
  SOCIAL_ENGINEERING_AND_INFORMATION_DISCLOSURE: 'Social engineering and information disclosure',
  DATA_DEVICE_AND_ACCOUNT_SAFETY: 'Data, device and account safety',
};

export const trainingDocumentDifficultyLabels: Record<DifficultyLevelDto, string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};

export const trainingDocumentCategoryOptions = contentCategories.map((value) => ({
  value,
  label: trainingDocumentCategoryLabels[value],
}));

export const trainingDocumentDifficultyOptions = difficultyLevels.map((value) => ({
  value,
  label: trainingDocumentDifficultyLabels[value],
}));

export type TrainingDocumentDraftField =
  | 'title'
  | 'contentSummary'
  | 'rawMarkdown'
  | 'estimatedReadTimeMinutes'
  | 'categories'
  | 'difficultyLevel';

export type TrainingDocumentDraftErrors = Partial<Record<TrainingDocumentDraftField, string>>;

export function createEmptyTrainingDocumentDraft(): TrainingDocuemtnDraftInputDto {
  return {
    title: '',
    contentSummary: null,
    rawMarkdown: '',
    estimatedReadTimeMinutes: null,
    categories: [],
    difficultyLevel: 'EASY',
  };
}

export function toTrainingDocumentDraft(
  document: TrainingDocumentAuthoringResponseDto,
): TrainingDocuemtnDraftInputDto {
  return {
    title: document.title,
    contentSummary: document.contentSummary,
    rawMarkdown: document.rawMarkdown,
    estimatedReadTimeMinutes: document.estimatedReadTimeMinutes,
    categories: [...document.categories],
    difficultyLevel: document.difficultyLevel,
  };
}

export function toTrainingDocumentRequest(
  draft: TrainingDocuemtnDraftInputDto,
): TrainingDocuemtnDraftInputDto {
  return {
    ...draft,
    title: draft.title.trim(),
    contentSummary:
      draft.contentSummary !== null && draft.contentSummary.trim().length > 0
        ? draft.contentSummary.trim()
        : null,
    categories: [...draft.categories],
  };
}

export function areTrainingDocumentDraftsEqual(
  left: TrainingDocuemtnDraftInputDto,
  right: TrainingDocuemtnDraftInputDto,
): boolean {
  return (
    left.title === right.title &&
    left.contentSummary === right.contentSummary &&
    left.rawMarkdown === right.rawMarkdown &&
    left.estimatedReadTimeMinutes === right.estimatedReadTimeMinutes &&
    left.difficultyLevel === right.difficultyLevel &&
    left.categories.length === right.categories.length &&
    left.categories.every((category, index) => category === right.categories[index])
  );
}

export function validateTrainingDocumentDraft(
  draft: TrainingDocuemtnDraftInputDto,
  requireActivationFields = false,
): TrainingDocumentDraftErrors {
  const errors: TrainingDocumentDraftErrors = {};
  const titleLength = draft.title.trim().length;

  if (titleLength === 0) {
    errors.title = 'Enter a title.';
  } else if (titleLength > TRAINING_DOCUMENT_TITLE_MAX_LENGTH) {
    errors.title = `Use ${TRAINING_DOCUMENT_TITLE_MAX_LENGTH} characters or fewer.`;
  }

  if (
    draft.contentSummary !== null &&
    draft.contentSummary.trim().length > TRAINING_DOCUMENT_SUMMARY_MAX_LENGTH
  ) {
    errors.contentSummary = `Use ${TRAINING_DOCUMENT_SUMMARY_MAX_LENGTH} characters or fewer.`;
  }

  if (draft.rawMarkdown.length > TRAINING_DOCUMENT_MARKDOWN_MAX_LENGTH) {
    errors.rawMarkdown = `Use ${TRAINING_DOCUMENT_MARKDOWN_MAX_LENGTH} characters or fewer.`;
  } else if (requireActivationFields === true && draft.rawMarkdown.trim().length === 0) {
    errors.rawMarkdown = 'Enter Markdown content before activating.';
  }

  if (
    draft.estimatedReadTimeMinutes !== null &&
    (Number.isInteger(draft.estimatedReadTimeMinutes) === false ||
      draft.estimatedReadTimeMinutes <= 0)
  ) {
    errors.estimatedReadTimeMinutes = 'Enter a positive whole number.';
  }

  if (requireActivationFields === true && draft.categories.length === 0) {
    errors.categories = 'Select at least one category before activating.';
  }

  return errors;
}

export function hasTrainingDocumentDraftErrors(errors: TrainingDocumentDraftErrors): boolean {
  return Object.keys(errors).length > 0;
}
