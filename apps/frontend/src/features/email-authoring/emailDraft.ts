import type { OrganisationEmailDraftInput } from '@insightful-phish/shared';

export function createEmptyOrganisationEmailDraft(): OrganisationEmailDraftInput {
  return {
    senderLabel: '',
    senderAddress: '',
    subject: '',
    preview: null,
    bodyHtml: '',
    link: null,
    expectedClassification: 'SAFE',
    redFlags: [],
    categories: [],
    difficultyLevel: 'EASY',
    portalTemplateId: null,
  };
}
