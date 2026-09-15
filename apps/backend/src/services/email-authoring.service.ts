import { createHash } from 'node:crypto';
import {
  EMAIL_PERSONALISATION_MARKERS,
  SYSTEM_LINK_MARKER,
  organisationEmailDraftInputSchema,
  type ActivationValidationIssue,
  type OrganisationEmailDraftInput,
} from '@insightful-phish/shared';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';

const allowedEmailTags = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'br',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
]);

const supportedMarkers = new Set<string>([
  EMAIL_PERSONALISATION_MARKERS.FIRST_NAME,
  EMAIL_PERSONALISATION_MARKERS.SURNAME,
  EMAIL_PERSONALISATION_MARKERS.EMAIL_ADDRESS,
  SYSTEM_LINK_MARKER,
]);

export class EmailAuthoringValidationError extends Error {
  constructor(public readonly issues: ActivationValidationIssue[]) {
    super('Email authoring input is invalid');
    this.name = 'EmailAuthoringValidationError';
  }
}

export type CanonicalOrganisationEmail = {
  draft: OrganisationEmailDraftInput;
  contentHash: string;
  canonicalJson: string;
};

function issue(field: string, code: string, message: string): ActivationValidationIssue {
  return {
    emailId: null,
    position: null,
    field,
    code,
    message,
  };
}

function normaliseString(value: string): string {
  return value.trim().normalize('NFC');
}

function canonicaliseHtml(bodyHtml: string): string {
  const violations: ActivationValidationIssue[] = [];
  const canonicalHtml = sanitizeHtml(normaliseString(bodyHtml), {
    allowedTags: [...allowedEmailTags],
    allowedAttributes: {},
    allowedSchemes: [],
    allowProtocolRelative: false,
    parseStyleAttributes: false,
    onOpenTag(tagName, attributes) {
      if (!allowedEmailTags.has(tagName)) {
        violations.push(
          issue('bodyHtml', 'UNSAFE_HTML_TAG', `HTML tag <${tagName}> is not allowed.`),
        );
      }
      for (const attributeName of Object.keys(attributes)) {
        violations.push(
          issue(
            'bodyHtml',
            'UNSAFE_HTML_ATTRIBUTE',
            `HTML attribute ${attributeName} is not allowed.`,
          ),
        );
      }
    },
  });

  if (violations.length > 0) {
    throw new EmailAuthoringValidationError(violations);
  }

  return canonicalHtml;
}

function validateMarkers(bodyHtml: string, link: OrganisationEmailDraftInput['link']): void {
  const markers = bodyHtml.match(/{{[^{}]+}}/g) ?? [];
  const unknownMarkers = [...new Set(markers.filter((marker) => !supportedMarkers.has(marker)))];
  const malformedMarkerSyntax = bodyHtml.replace(/{{[^{}]+}}/g, '').match(/{{|}}/);
  const issues: ActivationValidationIssue[] = unknownMarkers.map((marker) =>
    issue('bodyHtml', 'UNKNOWN_TEMPLATE_VARIABLE', `Template variable ${marker} is not supported.`),
  );

  if (malformedMarkerSyntax) {
    issues.push(
      issue('bodyHtml', 'UNKNOWN_TEMPLATE_VARIABLE', 'Template variable syntax is not supported.'),
    );
  }

  const systemLinkCount = markers.filter((marker) => marker === SYSTEM_LINK_MARKER).length;
  if (systemLinkCount > 1) {
    issues.push(
      issue(
        'bodyHtml',
        'MULTIPLE_SYSTEM_LINK_MARKERS',
        'At most one system-link marker is allowed.',
      ),
    );
  }
  if (systemLinkCount === 0 && link !== null) {
    issues.push(
      issue(
        'link',
        'LINK_WITHOUT_SYSTEM_MARKER',
        'Link must be null when the system-link marker is absent.',
      ),
    );
  }
  if (systemLinkCount === 1 && link === null) {
    issues.push(
      issue(
        'link',
        'SYSTEM_MARKER_WITHOUT_LINK',
        'Link details are required when the system-link marker is present.',
      ),
    );
  }

  if (issues.length > 0) {
    throw new EmailAuthoringValidationError(issues);
  }
}

function normaliseDraft(input: OrganisationEmailDraftInput): OrganisationEmailDraftInput {
  const bodyHtml = canonicaliseHtml(input.bodyHtml);
  const link = input.link === null ? null : { anchorText: normaliseString(input.link.anchorText) };
  validateMarkers(bodyHtml, link);

  const categories = [...new Set(input.categories)].sort();
  const redFlags = input.redFlags
    .map((redFlag) => ({
      redFlagType: redFlag.redFlagType,
      label: normaliseString(redFlag.label),
      description: redFlag.description ? normaliseString(redFlag.description) || null : null,
      severity: redFlag.severity,
    }))
    .sort((left, right) => {
      const leftKey = [left.redFlagType, left.label, left.description ?? '', left.severity].join(
        '\u0000',
      );
      const rightKey = [
        right.redFlagType,
        right.label,
        right.description ?? '',
        right.severity,
      ].join('\u0000');
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    });

  return {
    senderLabel: normaliseString(input.senderLabel),
    senderAddress: normaliseString(input.senderAddress).toLowerCase(),
    subject: normaliseString(input.subject),
    preview: normaliseString(input.preview),
    bodyHtml,
    link,
    expectedClassification: input.expectedClassification,
    redFlags,
    categories,
    difficultyLevel: input.difficultyLevel,
  };
}

export function canonicaliseOrganisationEmailDraft(input: unknown): CanonicalOrganisationEmail {
  const parsed = organisationEmailDraftInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new EmailAuthoringValidationError(
      parsed.error.issues.map((validationIssue) =>
        issue(validationIssue.path.join('.'), 'INVALID_STRUCTURE', validationIssue.message),
      ),
    );
  }

  const draft = normaliseDraft(parsed.data);
  const canonicalJson = JSON.stringify(draft);
  return {
    draft,
    canonicalJson,
    contentHash: createHash('sha256').update(canonicalJson).digest('hex'),
  };
}

export function validateOrganisationEmailActivation(
  draft: OrganisationEmailDraftInput,
  emailId: string,
): ActivationValidationIssue[] {
  const activationIssues: ActivationValidationIssue[] = [];
  const addIssue = (field: string, code: string, message: string) => {
    activationIssues.push({ emailId, position: null, field, code, message });
  };

  if (!draft.senderLabel) addIssue('senderLabel', 'REQUIRED', 'Sender label is required.');
  if (!z.string().email().safeParse(draft.senderAddress).success) {
    addIssue('senderAddress', 'INVALID_EMAIL_ADDRESS', 'Sender address must be a valid email.');
  }
  if (!draft.subject) addIssue('subject', 'REQUIRED', 'Subject is required.');
  const bodyText = sanitizeHtml(draft.bodyHtml, { allowedTags: [], allowedAttributes: {} }).trim();
  if (!bodyText) addIssue('bodyHtml', 'REQUIRED', 'Email body is required.');
  if (draft.categories.length === 0) {
    addIssue('categories', 'REQUIRED', 'At least one category is required.');
  }
  if (draft.link !== null && !draft.link.anchorText) {
    addIssue('link.anchorText', 'REQUIRED', 'Link anchor text is required.');
  }

  draft.redFlags.forEach((redFlag, index) => {
    if (!redFlag.label) {
      addIssue(`redFlags.${index}.label`, 'REQUIRED', 'Red-flag label is required.');
    }
    if (!redFlag.description) {
      addIssue(`redFlags.${index}.description`, 'REQUIRED', 'Red-flag description is required.');
    }
  });

  if (
    (draft.expectedClassification === 'SUSPICIOUS' ||
      draft.expectedClassification === 'PHISHING') &&
    draft.redFlags.length === 0
  ) {
    addIssue(
      'redFlags',
      'REQUIRED_FOR_CLASSIFICATION',
      'Suspicious and phishing emails require at least one red flag.',
    );
  }

  return activationIssues;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderOrganisationEmailBody(
  draft: OrganisationEmailDraftInput,
  replacements: {
    firstName: string;
    surname: string;
    emailAddress: string;
    systemLinkUrl?: string;
  },
): string {
  const canonicalDraft = canonicaliseOrganisationEmailDraft(draft).draft;
  let rendered = canonicalDraft.bodyHtml
    .replaceAll(EMAIL_PERSONALISATION_MARKERS.FIRST_NAME, escapeHtml(replacements.firstName))
    .replaceAll(EMAIL_PERSONALISATION_MARKERS.SURNAME, escapeHtml(replacements.surname))
    .replaceAll(EMAIL_PERSONALISATION_MARKERS.EMAIL_ADDRESS, escapeHtml(replacements.emailAddress));

  if (canonicalDraft.link !== null) {
    if (!replacements.systemLinkUrl) {
      throw new EmailAuthoringValidationError([
        issue('systemLinkUrl', 'REQUIRED', 'A generated system-link URL is required.'),
      ]);
    }
    rendered = rendered.replace(
      SYSTEM_LINK_MARKER,
      `<a href="${escapeHtml(replacements.systemLinkUrl)}">${escapeHtml(canonicalDraft.link.anchorText)}</a>`,
    );
  }

  return rendered;
}
