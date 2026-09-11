import { z } from 'zod';

export const contentCategories = [
  'PHISHING_AND_SUSPICIOUS_MESSAGES',
  'LINKS_DOMAINS_AND_SENDER_VERIFICATION',
  'PASSWORDS_AND_AUTHENTICATION',
  'SOCIAL_ENGINEERING_AND_INFORMATION_DISCLOSURE',
  'DATA_DEVICE_AND_ACCOUNT_SAFETY',
] as const;

export type ContentCategoryDto = (typeof contentCategories)[number];

export const contentCategorySchema = z.enum(contentCategories);

export const difficultyLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ADAPTIVE'] as const;

export type DifficultyLevelDto = (typeof difficultyLevels)[number];

export const difficultyLevelSchema = z.enum(difficultyLevels);
