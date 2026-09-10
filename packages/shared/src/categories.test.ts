import { describe, expect, it } from 'vitest';
import {
  contentCategories,
  contentCategorySchema,
  difficultyLevels,
  difficultyLevelSchema,
} from './categories.js';

describe('categories and difficulty definitions', () => {
  it('contains all required content categories', () => {
    expect(contentCategories).toEqual([
      'PHISHING',
      'PASSWORD_SECURITY',
      'SOCIAL_ENGINEERING',
      'MALWARE',
      'DATA_PROTECTION',
      'DEVICE_SECURITY',
      'INCIDENT_REPORTING',
    ]);
  });

  it('validates content categories correctly', () => {
    for (const category of contentCategories) {
      expect(contentCategorySchema.safeParse(category).success).toBe(true);
    }
    expect(contentCategorySchema.safeParse('UNKNOWN_CATEGORY').success).toBe(false);
  });

  it('contains extended difficulty levels', () => {
    expect(difficultyLevels).toEqual([
      'BEGINNER',
      'INTERMEDIATE',
      'ADVANCED',
      'ADAPTIVE',
      'EASY',
      'MEDIUM',
      'HARD',
    ]);
  });

  it('validates difficulty levels correctly', () => {
    for (const difficulty of difficultyLevels) {
      expect(difficultyLevelSchema.safeParse(difficulty).success).toBe(true);
    }
    expect(difficultyLevelSchema.safeParse('SUPER_HARD').success).toBe(false);
  });
});
