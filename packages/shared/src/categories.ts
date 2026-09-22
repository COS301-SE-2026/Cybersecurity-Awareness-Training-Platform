import { z } from 'zod';

export const contentCategories = [
  'PHISHING_AND_SUSPICIOUS_MESSAGES',
  'LINKS_DOMAINS_AND_SENDER_VERIFICATION',
  'PASSWORDS_AND_AUTHENTICATION',
  'SOCIAL_ENGINEERING_AND_INFORMATION_DISCLOSURE',
  'DATA_DEVICE_AND_ACCOUNT_SAFETY',
] as const;

export type ContentCategoryDto = (typeof contentCategories)[number];

export function canonicalContentCategorySet(
  categories: readonly ContentCategoryDto[],
): ContentCategoryDto[] {
  const values = new Set(categories);
  return contentCategories.filter((category) => values.has(category));
}

export function contentCategorySetsEqual(
  left: readonly ContentCategoryDto[],
  right: readonly ContentCategoryDto[],
): boolean {
  const normalizedLeft = canonicalContentCategorySet(left);
  const normalizedRight = canonicalContentCategorySet(right);
  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((category, index) => category === normalizedRight[index])
  );
}

export function sharedAdaptiveSlotCategories(
  categorySets: readonly (readonly ContentCategoryDto[])[],
): ContentCategoryDto[] | null {
  if (categorySets.length !== 3) return null;

  const normalized = categorySets.map(canonicalContentCategorySet);
  const expected = normalized[0];
  if (
    expected.length === 0 ||
    normalized.some((categories) => !contentCategorySetsEqual(categories, expected))
  ) {
    return null;
  }

  return expected;
}

export const contentCategorySchema = z.enum(contentCategories);

export const difficultyLevels = ['EASY', 'MEDIUM', 'HARD'] as const;

export type DifficultyLevelDto = (typeof difficultyLevels)[number];

export const difficultyLevelSchema = z.enum(difficultyLevels);
