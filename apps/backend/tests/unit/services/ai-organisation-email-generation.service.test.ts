import { describe, expect, it, vi } from 'vitest';
import {
  AiOrganisationEmailGenerationService,
  OrganisationEmailGenerationError,
} from '../../../src/services/ai-organisation-email-generation.service.js';

const request = {
  requestedDifficulty: 'MEDIUM',
  requestedCategories: ['PHISHING_AND_SUSPICIOUS_MESSAGES'],
  topic: 'Phishing messages',
  learningObjective: 'Recognise suspicious messages',
};

function generatedDraft(bodyHtml: string) {
  return {
    senderLabel: 'Example Support',
    senderAddress: 'support@example.test',
    subject: 'Account notice',
    preview: null,
    bodyHtml,
    link: null,
    expectedClassification: 'SAFE' as const,
    redFlags: [],
    categories: ['PHISHING_AND_SUSPICIOUS_MESSAGES' as const],
    difficultyLevel: 'MEDIUM' as const,
  };
}

function serviceReturning(bodyHtml: string) {
  return new AiOrganisationEmailGenerationService({
    generateStructured: vi.fn().mockResolvedValue(generatedDraft(bodyHtml)),
  } as never);
}

describe('AI Organisation Email HTML validation', () => {
  it('returns canonical allowed HTML unchanged', async () => {
    const bodyHtml =
      '<p>Hello<br /><strong>Important</strong> <em>notice</em></p><ul><li>Review it</li></ul>';

    await expect(serviceReturning(bodyHtml).generateDraft(request)).resolves.toMatchObject({
      bodyHtml,
      link: null,
    });
  });

  it.each([
    '<p>Safe<script>alert(1)</script></p>',
    '<p>Safe</p><script',
    '<p onclick="alert(1)">Safe</p>',
    '<p>{{SYSTEM_LINK}}</p>',
  ])('rejects unsupported or materially changed HTML: %s', async (bodyHtml) => {
    await expect(serviceReturning(bodyHtml).generateDraft(request)).rejects.toEqual(
      new OrganisationEmailGenerationError('HTML_UNSUPPORTED'),
    );
  });
});
