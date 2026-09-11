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
      'PHISHING_AND_SUSPICIOUS_MESSAGES',
      'LINKS_DOMAINS_AND_SENDER_VERIFICATION',
      'PASSWORDS_AND_AUTHENTICATION',
      'SOCIAL_ENGINEERING_AND_INFORMATION_DISCLOSURE',
      'DATA_DEVICE_AND_ACCOUNT_SAFETY',
    ]);
  });

  it('validates content categories correctly', () => {
    for (const category of contentCategories) {
      expect(contentCategorySchema.safeParse(category).success).toBe(true);
    }
    expect(contentCategorySchema.safeParse('UNKNOWN_CATEGORY').success).toBe(false);
  });

  it('retains the persisted difficulty levels', () => {
    expect(difficultyLevels).toEqual(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ADAPTIVE']);
  });

  it('validates difficulty levels correctly', () => {
    for (const difficulty of difficultyLevels) {
      expect(difficultyLevelSchema.safeParse(difficulty).success).toBe(true);
    }
    expect(difficultyLevelSchema.safeParse('SUPER_HARD').success).toBe(false);
  });
});
