import type { OrganisationEmailDraftInput } from '@insightful-phish/shared';
import { describe, expect, it } from 'vitest';
import {
  EmailAuthoringValidationError,
  canonicaliseOrganisationEmailDraft,
  renderOrganisationEmailBody,
  validateOrganisationEmailActivation,
} from '../../../src/services/email-authoring.service.js';

function draft(overrides: Partial<OrganisationEmailDraftInput> = {}): OrganisationEmailDraftInput {
  return {
    senderLabel: 'IT Support',
    senderAddress: 'support@example.test',
    subject: 'Review your account',
    preview: 'A security review is waiting',
    bodyHtml: '<p>Hello {{FIRST_NAME}}, review {{SYSTEM_LINK}}</p>',
    link: { anchorText: 'your account' },
    expectedClassification: 'PHISHING',
    redFlags: [
      {
        redFlagType: 'LINK',
        label: 'Suspicious link',
        description: 'The link destination is hidden.',
        severity: 'HIGH',
      },
    ],
    categories: ['LINKS_DOMAINS_AND_SENDER_VERIFICATION'],
    difficultyLevel: 'MEDIUM',
    portalTemplateId: null,
    ...overrides,
  };
}

describe('email authoring safety and canonicalisation', () => {
  it('accepts only the basic email formatting allowlist', () => {
    const result = canonicaliseOrganisationEmailDraft(
      draft({
        bodyHtml:
          '<h1>Notice</h1><p>Hello<br><strong>Important</strong> <em>now</em></p><ul><li>One</li></ul><ol><li>Two</li></ol>',
        link: null,
      }),
    );

    expect(result.draft.bodyHtml).toBe(
      '<h1>Notice</h1><p>Hello<br /><strong>Important</strong> <em>now</em></p><ul><li>One</li></ul><ol><li>Two</li></ol>',
    );
  });

  it.each([
    'script',
    'form',
    'input',
    'button',
    'frame',
    'iframe',
    'embed',
    'object',
    'a',
    'img',
    'link',
  ])('rejects the <%s> element instead of sanitising it silently', (tag) => {
    const html = ['input', 'embed', 'img'].includes(tag)
      ? `<p>Safe</p><${tag} src="https://remote.example/image.png">`
      : `<${tag}>unsafe</${tag}>`;

    expect(() => canonicaliseOrganisationEmailDraft(draft({ bodyHtml: html, link: null }))).toThrow(
      EmailAuthoringValidationError,
    );
  });

  it.each(['</script>', '<script', '</iframe>'])(
    'rejects malformed or orphaned unsafe markup: %s',
    (bodyHtml) => {
      expect(() =>
        canonicaliseOrganisationEmailDraft(
          draft({ bodyHtml: `<p>Safe</p>${bodyHtml}`, link: null }),
        ),
      ).toThrow(EmailAuthoringValidationError);
    },
  );

  it.each(['onclick', 'style', 'class', 'id', 'src'])('rejects the %s attribute', (attribute) => {
    expect(() =>
      canonicaliseOrganisationEmailDraft(
        draft({ bodyHtml: `<p ${attribute}="unsafe">Text</p>`, link: null }),
      ),
    ).toThrow(EmailAuthoringValidationError);
  });

  it('rejects unknown and malformed template variables', () => {
    for (const bodyHtml of [
      '<p>{{DISPLAY_NAME}}</p>',
      '<p>{{ FIRST_NAME }}</p>',
      '<p>{{FIRST_NAME}</p>',
      '<p>FIRST_NAME}}</p>',
    ]) {
      expect(() => canonicaliseOrganisationEmailDraft(draft({ bodyHtml, link: null }))).toThrow(
        EmailAuthoringValidationError,
      );
    }
  });

  it('accepts only the supported personalisation markers', () => {
    const result = canonicaliseOrganisationEmailDraft(
      draft({
        bodyHtml: '<p>{{FIRST_NAME}} {{SURNAME}} {{EMAIL_ADDRESS}}</p>',
        link: null,
      }),
    );

    expect(result.draft.bodyHtml).toContain('{{FIRST_NAME}} {{SURNAME}} {{EMAIL_ADDRESS}}');
  });

  it('enforces the system-link marker relationship and cardinality', () => {
    expect(() => canonicaliseOrganisationEmailDraft(draft({ bodyHtml: '<p>No link</p>' }))).toThrow(
      EmailAuthoringValidationError,
    );
    expect(() =>
      canonicaliseOrganisationEmailDraft(draft({ bodyHtml: '<p>{{SYSTEM_LINK}}</p>', link: null })),
    ).toThrow(EmailAuthoringValidationError);
    expect(() =>
      canonicaliseOrganisationEmailDraft(
        draft({ bodyHtml: '<p>{{SYSTEM_LINK}} {{SYSTEM_LINK}}</p>' }),
      ),
    ).toThrow(EmailAuthoringValidationError);
    expect(
      canonicaliseOrganisationEmailDraft(draft({ bodyHtml: '<p>No link</p>', link: null })).draft
        .link,
    ).toBeNull();
  });

  it('rejects a caller-controlled destination URL', () => {
    expect(() =>
      canonicaliseOrganisationEmailDraft({
        ...draft(),
        link: { anchorText: 'Review', href: 'https://attacker.example' },
      }),
    ).toThrow(EmailAuthoringValidationError);
  });

  it('normalises equivalent content to the same SHA-256 hash', () => {
    const first = canonicaliseOrganisationEmailDraft(
      draft({
        senderLabel: '  IT Support ',
        senderAddress: ' SUPPORT@EXAMPLE.TEST ',
        subject: ' Review your account ',
        preview: ' A security review is waiting ',
        link: { anchorText: ' your account ' },
        categories: [
          'PASSWORDS_AND_AUTHENTICATION',
          'LINKS_DOMAINS_AND_SENDER_VERIFICATION',
          'PASSWORDS_AND_AUTHENTICATION',
        ],
        redFlags: [
          {
            redFlagType: 'SENDER',
            label: ' Sender ',
            description: ' Mismatch ',
            severity: 'MEDIUM',
          },
          {
            redFlagType: 'LINK',
            label: ' Suspicious link ',
            description: ' The link destination is hidden. ',
            severity: 'HIGH',
          },
        ],
      }),
    );
    const second = canonicaliseOrganisationEmailDraft(
      draft({
        categories: ['LINKS_DOMAINS_AND_SENDER_VERIFICATION', 'PASSWORDS_AND_AUTHENTICATION'],
        redFlags: [
          {
            redFlagType: 'LINK',
            label: 'Suspicious link',
            description: 'The link destination is hidden.',
            severity: 'HIGH',
          },
          {
            redFlagType: 'SENDER',
            label: 'Sender',
            description: 'Mismatch',
            severity: 'MEDIUM',
          },
        ],
      }),
    );

    expect(first.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.contentHash).toBe(second.contentHash);
    expect(first.canonicalJson).toContain('{{SYSTEM_LINK}}');
  });

  it('normalises null and blank preview values to the same nullable canonical value', () => {
    const nullPreview = canonicaliseOrganisationEmailDraft(draft({ preview: null }));
    const blankPreview = canonicaliseOrganisationEmailDraft(draft({ preview: '   ' }));

    expect(nullPreview.draft.preview).toBeNull();
    expect(blankPreview.draft.preview).toBeNull();
    expect(blankPreview.contentHash).toBe(nullPreview.contentHash);
  });

  it('includes all authored semantic fields in the hash', () => {
    const original = canonicaliseOrganisationEmailDraft(draft()).contentHash;
    const variants = [
      draft({ expectedClassification: 'SUSPICIOUS' }),
      draft({ difficultyLevel: 'HARD' }),
      draft({ categories: ['PASSWORDS_AND_AUTHENTICATION'] }),
      draft({ link: { anchorText: 'another label' } }),
      draft({ redFlags: [{ ...draft().redFlags[0], severity: 'LOW' }] }),
    ];

    for (const variant of variants) {
      expect(canonicaliseOrganisationEmailDraft(variant).contentHash).not.toBe(original);
    }
  });

  it('HTML-escapes trainee values and generated link data when rendering', () => {
    const rendered = renderOrganisationEmailBody(draft(), {
      firstName: '<Admin>',
      surname: "O'Neil & Sons",
      emailAddress: '"onload@example.test',
      systemLinkUrl: 'https://platform.test/click?a=1&b="2"',
    });

    expect(rendered).toContain('&lt;Admin&gt;');
    expect(rendered).toContain('href="https://platform.test/click?a=1&amp;b=&quot;2&quot;"');
    expect(rendered).not.toContain('<Admin>');
  });

  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', '/relative'])(
    'rejects an unsafe generated system-link URL: %s',
    (systemLinkUrl) => {
      expect(() =>
        renderOrganisationEmailBody(draft(), {
          firstName: 'Alex',
          surname: 'Smith',
          emailAddress: 'alex.smith@example.test',
          systemLinkUrl,
        }),
      ).toThrow(EmailAuthoringValidationError);
    },
  );
});

describe('organisation email activation validation', () => {
  it('accepts complete SAFE drafts without red flags', () => {
    expect(
      validateOrganisationEmailActivation(
        canonicaliseOrganisationEmailDraft(
          draft({
            expectedClassification: 'SAFE',
            redFlags: [],
            bodyHtml: '<p>Newsletter</p>',
            link: null,
          }),
        ).draft,
        '11111111-1111-4111-8111-111111111111',
      ),
    ).toEqual([]);
  });

  it('returns structured issues for incomplete suspicious and phishing drafts', () => {
    for (const classification of ['SUSPICIOUS', 'PHISHING'] as const) {
      const canonical = canonicaliseOrganisationEmailDraft(
        draft({
          senderLabel: ' ',
          senderAddress: 'invalid',
          subject: ' ',
          bodyHtml: ' ',
          link: null,
          categories: [],
          expectedClassification: classification,
          redFlags: [],
        }),
      );
      const issues = validateOrganisationEmailActivation(
        canonical.draft,
        '11111111-1111-4111-8111-111111111111',
      );

      expect(issues.map((entry) => entry.field)).toEqual(
        expect.arrayContaining([
          'senderLabel',
          'senderAddress',
          'subject',
          'bodyHtml',
          'categories',
          'redFlags',
        ]),
      );
      expect(issues.every((entry) => entry.emailId !== null && entry.position === null)).toBe(true);
    }
  });

  it('requires complete red-flag labels and descriptions while allowing ATTACHMENT', () => {
    const canonical = canonicaliseOrganisationEmailDraft(
      draft({
        redFlags: [
          {
            redFlagType: 'ATTACHMENT',
            label: '',
            description: null,
            severity: 'HIGH',
          },
        ],
      }),
    );

    expect(validateOrganisationEmailActivation(canonical.draft, 'email-id')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'redFlags.0.label', code: 'REQUIRED' }),
        expect.objectContaining({ field: 'redFlags.0.description', code: 'REQUIRED' }),
      ]),
    );
  });
});
