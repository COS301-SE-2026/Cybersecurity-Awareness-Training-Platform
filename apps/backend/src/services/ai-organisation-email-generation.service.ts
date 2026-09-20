import { contentCategories, contentCategorySchema } from '@insightful-phish/shared';
import { z } from 'zod';
import {
  generatedContentDifficultySchema,
  parseReusableContentGenerationRequest,
  type ReusableContentGenerationContext,
} from './ai-content-generation-contracts.js';
import {
  buildReusableContentGenerationInstructions,
  type ReusableContentGenerationPromptContext,
} from './ai-content-generation-instructions.js';
import { createAiGenerationService, type AiGenerationService } from './ai-generation.service.js';

const emailClassifications = ['SAFE', 'SUSPICIOUS', 'PHISHING'] as const;
const redFlagTypes = [
  'SENDER',
  'LINK',
  'LANGUAGE',
  'ATTACHMENT',
  'REQUEST',
  'DOMAIN',
  'OTHER',
] as const;
const generatedRedFlagTypes = [
  'SENDER',
  'LANGUAGE',
  'ATTACHMENT',
  'REQUEST',
  'DOMAIN',
  'OTHER',
] as const;
const redFlagSeverities = ['LOW', 'MEDIUM', 'HIGH'] as const;

const safeBodyTag = /^<\/?(?:p|strong|em|ul|ol|li)>$|^<br\s*\/?\s*>$/i;

function isSafeGeneratedEmailHtml(bodyHtml: string): boolean {
  const tags = bodyHtml.match(/<[^>]*>/g) ?? [];
  if (tags.some((tag) => !safeBodyTag.test(tag))) {
    return false;
  }

  return !bodyHtml.replace(/<[^>]*>/g, '').includes('<');
}

const authoredEmailLinkSchema = z
  .object({ anchorText: z.string().trim().min(1).max(200) })
  .strict();

const redFlagSchema = z
  .object({
    redFlagType: z.enum(redFlagTypes),
    label: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(1_000).nullable(),
    severity: z.enum(redFlagSeverities),
  })
  .strict();

/**
 * Temporary backend-only fixture matching Revision 1's OrganisationEmailDraftInput.
 * Replace it with #566's canonical shared authoring schema when that contract lands.
 */
export const generatedOrganisationEmailDraftSchema = z
  .object({
    senderLabel: z.string().trim().min(1).max(200),
    senderAddress: z.string().trim().email().max(254),
    subject: z.string().trim().min(1).max(300),
    preview: z.string().trim().min(1).max(500).nullable(),
    bodyHtml: z
      .string()
      .trim()
      .min(1)
      .max(30_000)
      .refine(isSafeGeneratedEmailHtml, 'Email body contains unsupported HTML'),
    link: authoredEmailLinkSchema.nullable(),
    expectedClassification: z.enum(emailClassifications),
    redFlags: z.array(redFlagSchema).max(20),
    categories: z
      .array(contentCategorySchema)
      .min(1)
      .max(contentCategories.length)
      .refine((categories) => new Set(categories).size === categories.length, {
        message: 'Organisation Email categories must be unique',
      }),
    difficultyLevel: generatedContentDifficultySchema,
  })
  .strict()
  .superRefine((draft, context) => {
    if (draft.expectedClassification === 'SAFE' && draft.redFlags.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['redFlags'],
        message: 'SAFE control emails must not identify red flags',
      });
    }
    if (draft.expectedClassification !== 'SAFE' && draft.redFlags.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['redFlags'],
        message: 'Suspicious and phishing emails require at least one red flag',
      });
    }
    if (draft.link === null && draft.redFlags.some((flag) => flag.redFlagType === 'LINK')) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['redFlags'],
        message: 'A link red flag requires an authored link',
      });
    }
  });

export type GeneratedOrganisationEmailDraft = z.infer<typeof generatedOrganisationEmailDraftSchema>;

export class OrganisationEmailGenerationError extends Error {
  constructor(readonly failure: 'DIFFICULTY_MISMATCH' | 'CATEGORY_MISMATCH' | 'LINK_UNSUPPORTED') {
    super('Generated Organisation Email did not satisfy the requested generation context');
    this.name = 'OrganisationEmailGenerationError';
  }
}

function assertRequestedConstraints(
  draft: GeneratedOrganisationEmailDraft,
  context: ReusableContentGenerationContext,
): void {
  if (draft.difficultyLevel !== context.requestedDifficulty) {
    throw new OrganisationEmailGenerationError('DIFFICULTY_MISMATCH');
  }

  const requested = new Set(context.requestedCategories);
  if (
    draft.categories.length !== requested.size ||
    draft.categories.some((category) => !requested.has(category))
  ) {
    throw new OrganisationEmailGenerationError('CATEGORY_MISMATCH');
  }

  // #566 owns the system-managed marker encoding. Until it lands, emitting no link is the only safe Draft.
  if (draft.link !== null) {
    throw new OrganisationEmailGenerationError('LINK_UNSUPPORTED');
  }
}

const redFlagJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    redFlagType: { type: 'string', enum: generatedRedFlagTypes },
    label: { type: 'string', minLength: 1, maxLength: 200 },
    description: { type: 'string', minLength: 1, maxLength: 1_000 },
    severity: { type: 'string', enum: redFlagSeverities },
  },
  required: ['redFlagType', 'label', 'description', 'severity'],
} as const;

const organisationEmailJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    senderLabel: { type: 'string', minLength: 1, maxLength: 200 },
    senderAddress: { type: 'string', minLength: 3, maxLength: 254 },
    subject: { type: 'string', minLength: 1, maxLength: 300 },
    preview: { type: 'string', minLength: 1, maxLength: 500 },
    bodyHtml: { type: 'string', minLength: 1, maxLength: 30_000 },
    link: { type: 'null' },
    expectedClassification: { type: 'string', enum: emailClassifications },
    redFlags: { type: 'array', maxItems: 20, items: redFlagJsonSchema },
    categories: {
      type: 'array',
      minItems: 1,
      maxItems: contentCategories.length,
      items: { type: 'string', enum: contentCategories },
    },
    difficultyLevel: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD'] },
  },
  required: [
    'senderLabel',
    'senderAddress',
    'subject',
    'preview',
    'bodyHtml',
    'link',
    'expectedClassification',
    'redFlags',
    'categories',
    'difficultyLevel',
  ],
} as const;

export class AiOrganisationEmailGenerationService {
  constructor(private readonly generationService: AiGenerationService) {}

  async generateDraft(
    input: unknown,
    promptContext?: ReusableContentGenerationPromptContext,
  ): Promise<GeneratedOrganisationEmailDraft> {
    const context = parseReusableContentGenerationRequest(input);
    const common = buildReusableContentGenerationInstructions(context, promptContext);
    const draft = await this.generationService.generateStructured(
      {
        systemInstruction: [
          common.systemInstruction,
          'Create one fictional Organisation Email for defensive cybersecurity awareness training.',
          'Use only attribute-free p, strong, em, ul, ol, li, and br elements in bodyHtml.',
          'Do not create forms, inputs, scripts, attachments, credentials requests, URLs, href attributes, or link destinations.',
          'Set link to null because the system-managed authored-link marker is not available to this generator.',
          'Because link is null, never use LINK as a redFlagType.',
          'SAFE control emails are allowed and have no red flags. SUSPICIOUS or PHISHING emails require coherent red flags.',
          'Use exactly the requested categories and difficulty. Do not include provider metadata or lifecycle fields.',
        ].join('\n'),
        userInstruction: [
          common.userInstruction,
          'Return senderLabel, senderAddress, subject, preview, bodyHtml, link, expectedClassification, redFlags, categories, and difficultyLevel only.',
          'Use a fictional sender address in a reserved example domain.',
        ].join('\n'),
        output: {
          name: 'organisation_email_draft',
          description: 'An editable defensive cybersecurity Organisation Email Draft.',
          schema: organisationEmailJsonSchema,
        },
        options: { temperature: 0.3, maxOutputTokens: 1_800 },
      },
      generatedOrganisationEmailDraftSchema,
    );

    assertRequestedConstraints(draft, context);
    return draft;
  }
}

export function createAiOrganisationEmailGenerationService(): AiOrganisationEmailGenerationService {
  return new AiOrganisationEmailGenerationService(createAiGenerationService());
}
