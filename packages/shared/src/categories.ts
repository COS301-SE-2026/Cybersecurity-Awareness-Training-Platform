import { z } from 'zod';

export const contentCategories = [
  'PHISHING',
  'PASSWORD_SECURITY',
  'DATA_PROTECTION',
  'DEVICE_SECURITY',
  'INCIDENT_REPORTING',
] as const;

export type ContentCategoryDto = (typeof contentCategories)[number];

export const contentCategorySchema = z.enum(contentCategories);

export const difficultyLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ADAPTIVE'] as const;

export type DifficultyLevelDto = (typeof difficultyLevels)[number];

export const difficultyLevelSchema = z.enum(difficultyLevels);
