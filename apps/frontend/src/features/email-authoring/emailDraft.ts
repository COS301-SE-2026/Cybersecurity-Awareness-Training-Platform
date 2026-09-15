import type { OrganisationEmailDraftInput } from '@insightful-phish/shared';

export function createEmptyOrganisationEmailDraft(): OrganisationEmailDraftInput {
  return {
    senderLabel: '',
    senderAddress: '',
    subject: '',
    preview: '',
    bodyHtml: '',
    link: null,
    expectedClassification: 'SAFE',
    redFlags: [],
    categories: [],
    difficultyLevel: 'EASY',
  };
}
