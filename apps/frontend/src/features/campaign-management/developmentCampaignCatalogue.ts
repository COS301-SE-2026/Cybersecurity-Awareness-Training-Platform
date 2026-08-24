import type { CampaignCatalogueItemDto } from '@insightful-phish/shared';

export const DEVELOPMENT_CAMPAIGN_CATALOGUE: readonly CampaignCatalogueItemDto[] = [
  {
    id: '50000000-0000-4000-8000-000000000001',
    type: 'TRAINING_DOCUMENT',
    title: 'Password security essentials',
    description: 'Practical guidance for creating and protecting strong passwords.',
    contentType: 'AWARENESS_BRIEF',
    estimatedReadTimeMinutes: 8,
    difficultyLevel: 'BEGINNER',
    status: 'AVAILABLE',
  },
  {
    id: '50000000-0000-4000-8000-000000000002',
    type: 'QUIZ',
    title: 'Password safety quiz',
    description: 'Check understanding of password security practices.',
    passThresholdPercentage: 80,
    questionCount: 5,
    difficultyLevel: 'INTERMEDIATE',
    status: 'PUBLISHED',
  },
  {
    id: '50000000-0000-4000-8000-000000000003',
    type: 'SIMULATED_INBOX',
    title: 'Invoice phishing simulation',
    description: 'Identify suspicious messages in a simulated inbox.',
    emailCount: 4,
    difficultyLevel: 'ADVANCED',
    status: 'ACTIVE',
  },
  {
    id: '50000000-0000-4000-8000-000000000004',
    type: 'TRAINING_DOCUMENT',
    title: 'Remote work security',
    description: 'Safe handling of company information outside the office.',
    contentType: 'BEST_PRACTICE_GUIDE',
    estimatedReadTimeMinutes: 10,
    difficultyLevel: 'INTERMEDIATE',
    status: 'AVAILABLE',
  },
];
