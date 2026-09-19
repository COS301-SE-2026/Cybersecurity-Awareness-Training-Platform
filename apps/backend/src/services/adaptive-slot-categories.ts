import { contentCategories, type ContentCategoryDto } from '@insightful-phish/shared';

function canonicalCategorySet(categories: readonly ContentCategoryDto[]): ContentCategoryDto[] {
  const values = new Set(categories);
  return contentCategories.filter((category) => values.has(category));
}

export function sharedAdaptiveSlotCategories(
  categorySets: readonly (readonly ContentCategoryDto[])[],
): ContentCategoryDto[] | null {
  if (categorySets.length !== 3) return null;

  const normalized = categorySets.map(canonicalCategorySet);
  const expected = normalized[0];
  if (
    expected.length === 0 ||
    normalized.some(
      (categories) =>
        categories.length !== expected.length ||
        categories.some((category, index) => category !== expected[index]),
    )
  ) {
    return null;
  }

  return expected;
}
