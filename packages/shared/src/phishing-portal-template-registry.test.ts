import { describe, expect, it } from 'vitest';
import * as sharedApi from './index.js';
import {
  PORTAL_TEMPLATE_IDS,
  PORTAL_TEMPLATE_REGISTRY,
  findPortalTemplateDefinition,
  getPortalTemplateDefinition,
  getPortalTemplatePresentation,
  managedPortalLinkContextSchema,
  portalInsightSummarySchema,
  portalTemplateDefinitionSchema,
  recordPortalInteractionRequestSchema,
  recordPortalInteractionResponseSchema,
  resolvePhishingPortalResponseSchema,
  traineePortalInsightSchema,
  type PortalTemplateId,
} from './index.js';
import {
  ACTIVE_PORTAL_RESOLVE_RESPONSE_FIXTURE,
  INACTIVE_PORTAL_RESOLVE_RESPONSE_FIXTURE,
  PORTAL_INSIGHT_SUMMARY_FIXTURE,
  PORTAL_INTERACTION_REQUEST_FIXTURE,
  PORTAL_INTERACTION_WITHOUT_REVEAL_RESPONSE_FIXTURE,
  PORTAL_INTERACTION_WITH_REVEAL_RESPONSE_FIXTURE,
  REAL_EMAIL_MANAGED_PORTAL_LINK_CONTEXT_FIXTURE,
  SIMULATED_INBOX_MANAGED_PORTAL_LINK_CONTEXT_FIXTURE,
  TRAINEE_PORTAL_INSIGHT_FIXTURE,
  UNAVAILABLE_PORTAL_RESOLVE_RESPONSE_FIXTURE,
} from './testing/index.js';

function collectStringValues(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectStringValues);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap(collectStringValues);
  }

  return [];
}

function collectPropertyNames(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectPropertyNames);
  }

  if (typeof value !== 'object' || value === null) {
    return [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => [
    key,
    ...collectPropertyNames(nestedValue),
  ]);
}

describe('phishing portal template registry', () => {
  it('contains exactly one matching definition for every canonical template identifier', () => {
    expect(Object.keys(PORTAL_TEMPLATE_REGISTRY)).toEqual(PORTAL_TEMPLATE_IDS);

    for (const templateId of PORTAL_TEMPLATE_IDS) {
      const definition = PORTAL_TEMPLATE_REGISTRY[templateId];

      expect(definition.templateId).toBe(templateId);
      expect(portalTemplateDefinitionSchema.safeParse(definition).success).toBe(true);
      expect(getPortalTemplateDefinition(templateId)).toBe(definition);
      expect(findPortalTemplateDefinition(templateId)).toBe(definition);
    }
  });

  it('does not resolve unknown untyped input or fall back to another template', () => {
    for (const value of [
      'GENERIC_ACCOUNT_LOGIN_V2',
      'UNKNOWN_TEMPLATE',
      '__proto__',
      '',
      null,
      undefined,
      1,
      {},
    ]) {
      expect(findPortalTemplateDefinition(value)).toBeNull();
    }

    expect(() => getPortalTemplateDefinition('UNKNOWN_TEMPLATE' as PortalTemplateId)).toThrowError(
      'Unknown portal template identifier.',
    );
  });

  it('keeps the registry, definitions, warning arrays, and warning objects immutable', () => {
    expect(Object.isFrozen(PORTAL_TEMPLATE_REGISTRY)).toBe(true);

    for (const templateId of PORTAL_TEMPLATE_IDS) {
      const definition = getPortalTemplateDefinition(templateId);
      const originalHeading = definition.heading;
      const originalWarningLabel = definition.warningSigns[0]?.label;

      expect(Object.isFrozen(definition)).toBe(true);
      expect(Object.isFrozen(definition.warningSigns)).toBe(true);
      expect(definition.warningSigns.every(Object.isFrozen)).toBe(true);
      expect(Reflect.set(definition, 'heading', 'Changed heading')).toBe(false);
      expect(
        Reflect.set(definition.warningSigns, 0, { label: 'Changed', description: 'Changed' }),
      ).toBe(false);

      const firstWarningSign = definition.warningSigns[0];
      expect(firstWarningSign).toBeDefined();
      if (firstWarningSign) {
        expect(Reflect.set(firstWarningSign, 'label', 'Changed label')).toBe(false);
      }

      expect(definition.heading).toBe(originalHeading);
      expect(definition.warningSigns[0]?.label).toBe(originalWarningLabel);
    }
  });

  it('defines the neutral generic account login template', () => {
    expect(getPortalTemplateDefinition('GENERIC_ACCOUNT_LOGIN_V1')).toEqual({
      templateId: 'GENERIC_ACCOUNT_LOGIN_V1',
      heading: 'Sign in to your account',
      identifierLabel: 'Email address or username',
      credentialLabel: 'Password',
      submitLabel: 'Sign in',
      warningSigns: [
        {
          label: 'Unexpected sign-in request',
          description: 'Pause when a message asks you to sign in unexpectedly.',
        },
        {
          label: 'Pressure to act quickly',
          description: 'Urgent language can rush you into entering credentials.',
        },
        {
          label: 'Unverified destination',
          description: 'Confirm the destination and request context before signing in.',
        },
      ],
    });
  });

  it('defines the neutral generic document access template', () => {
    expect(getPortalTemplateDefinition('GENERIC_DOCUMENT_ACCESS_V1')).toEqual({
      templateId: 'GENERIC_DOCUMENT_ACCESS_V1',
      heading: 'Access shared document',
      identifierLabel: 'Email address or username',
      credentialLabel: 'Access code or password',
      submitLabel: 'Access document',
      warningSigns: [
        {
          label: 'Unexpected document share',
          description: 'Treat an unanticipated document invitation with caution.',
        },
        {
          label: 'Vague sharing context',
          description: 'Check that the sender and document purpose are clear and expected.',
        },
        {
          label: 'Authentication before verification',
          description: 'Verify the source before entering account information.',
        },
      ],
    });
  });

  it('defines the neutral generic banking login template', () => {
    expect(getPortalTemplateDefinition('GENERIC_BANKING_LOGIN_V1')).toEqual({
      templateId: 'GENERIC_BANKING_LOGIN_V1',
      heading: 'Sign in to your financial account',
      identifierLabel: 'Customer or account identifier',
      credentialLabel: 'Password',
      submitLabel: 'Continue',
      warningSigns: [
        {
          label: 'Financial urgency',
          description: 'Claims of immediate account risk or financial loss can create pressure.',
        },
        {
          label: 'Unsolicited login request',
          description: 'Be cautious when an unexpected message asks you to sign in.',
        },
        {
          label: 'Untrusted access route',
          description:
            'Contact the institution through a trusted route instead of the supplied link.',
        },
      ],
    });
  });

  it('creates an exact public presentation without warning signs', () => {
    for (const templateId of PORTAL_TEMPLATE_IDS) {
      const definition = getPortalTemplateDefinition(templateId);
      const presentation = getPortalTemplatePresentation(templateId);

      expect(presentation).not.toBe(definition);
      expect(Object.keys(presentation)).toEqual([
        'templateId',
        'heading',
        'identifierLabel',
        'credentialLabel',
        'submitLabel',
      ]);
      expect(presentation).toEqual({
        templateId: definition.templateId,
        heading: definition.heading,
        identifierLabel: definition.identifierLabel,
        credentialLabel: definition.credentialLabel,
        submitLabel: definition.submitLabel,
      });
      expect('warningSigns' in presentation).toBe(false);
      expect(Object.isFrozen(presentation)).toBe(true);
    }
  });

  it('contains non-empty generic presentation labels and meaningful warning signs', () => {
    for (const templateId of PORTAL_TEMPLATE_IDS) {
      const definition = getPortalTemplateDefinition(templateId);

      for (const label of [
        definition.heading,
        definition.identifierLabel,
        definition.credentialLabel,
        definition.submitLabel,
      ]) {
        expect(label.trim().length).toBeGreaterThan(0);
      }

      expect(definition.warningSigns.length).toBeGreaterThan(0);
      for (const warningSign of definition.warningSigns) {
        expect(warningSign.label.trim().length).toBeGreaterThan(0);
        expect(warningSign.description.trim().length).toBeGreaterThan(10);
      }
    }
  });

  it('keeps registry content generic and free of markup, scripts, URLs, and real branding', () => {
    const content = collectStringValues(PORTAL_TEMPLATE_REGISTRY).join('\n');

    expect(content).not.toMatch(/https?:\/\/|www\.|javascript:/i);
    expect(content).not.toMatch(/<\/?(?:html|style|script|form|input|button)\b/i);
    expect(content).not.toMatch(/\b(?:function\s*\(|document\.|window\.|eval\s*\(|alert\s*\()/i);
    expect(content).not.toMatch(/(?:^|[\s;])(?:body|html|form|input|button|[.#][\w-]+)\s*\{/im);
    expect(content).not.toMatch(
      /\b(?:google|microsoft|apple|amazon|dropbox|paypal|chase|barclays|hsbc|visa|mastercard)\b/i,
    );
    expect(content).not.toMatch(/\b(?:otp|pin)\b/i);
  });
});

describe('phishing portal representative fixtures', () => {
  const fixtures = [
    ACTIVE_PORTAL_RESOLVE_RESPONSE_FIXTURE,
    INACTIVE_PORTAL_RESOLVE_RESPONSE_FIXTURE,
    UNAVAILABLE_PORTAL_RESOLVE_RESPONSE_FIXTURE,
    PORTAL_INTERACTION_REQUEST_FIXTURE,
    PORTAL_INTERACTION_WITHOUT_REVEAL_RESPONSE_FIXTURE,
    PORTAL_INTERACTION_WITH_REVEAL_RESPONSE_FIXTURE,
    SIMULATED_INBOX_MANAGED_PORTAL_LINK_CONTEXT_FIXTURE,
    REAL_EMAIL_MANAGED_PORTAL_LINK_CONTEXT_FIXTURE,
    PORTAL_INSIGHT_SUMMARY_FIXTURE,
    TRAINEE_PORTAL_INSIGHT_FIXTURE,
  ];

  it('validates every fixture against its canonical schema', () => {
    expect(
      resolvePhishingPortalResponseSchema.safeParse(ACTIVE_PORTAL_RESOLVE_RESPONSE_FIXTURE).success,
    ).toBe(true);
    expect(
      resolvePhishingPortalResponseSchema.safeParse(INACTIVE_PORTAL_RESOLVE_RESPONSE_FIXTURE)
        .success,
    ).toBe(true);
    expect(
      resolvePhishingPortalResponseSchema.safeParse(UNAVAILABLE_PORTAL_RESOLVE_RESPONSE_FIXTURE)
        .success,
    ).toBe(true);
    expect(
      recordPortalInteractionRequestSchema.safeParse(PORTAL_INTERACTION_REQUEST_FIXTURE).success,
    ).toBe(true);
    expect(
      recordPortalInteractionResponseSchema.safeParse(
        PORTAL_INTERACTION_WITHOUT_REVEAL_RESPONSE_FIXTURE,
      ).success,
    ).toBe(true);
    expect(
      recordPortalInteractionResponseSchema.safeParse(
        PORTAL_INTERACTION_WITH_REVEAL_RESPONSE_FIXTURE,
      ).success,
    ).toBe(true);
    expect(
      managedPortalLinkContextSchema.safeParse(SIMULATED_INBOX_MANAGED_PORTAL_LINK_CONTEXT_FIXTURE)
        .success,
    ).toBe(true);
    expect(
      managedPortalLinkContextSchema.safeParse(REAL_EMAIL_MANAGED_PORTAL_LINK_CONTEXT_FIXTURE)
        .success,
    ).toBe(true);
    expect(portalInsightSummarySchema.safeParse(PORTAL_INSIGHT_SUMMARY_FIXTURE).success).toBe(true);
    expect(traineePortalInsightSchema.safeParse(TRAINEE_PORTAL_INSIGHT_FIXTURE).success).toBe(true);
  });

  it('keeps the active fixture presentation free of warning signs', () => {
    expect(Object.keys(ACTIVE_PORTAL_RESOLVE_RESPONSE_FIXTURE.portal)).toEqual([
      'templateId',
      'heading',
      'identifierLabel',
      'credentialLabel',
      'submitLabel',
    ]);
    expect('warningSigns' in ACTIVE_PORTAL_RESOLVE_RESPONSE_FIXTURE.portal).toBe(false);
  });

  it('contains no captured-input, token, arbitrary metadata, or tenant identity fields', () => {
    const propertyNames = fixtures.flatMap(collectPropertyNames);

    for (const forbiddenProperty of [
      'username',
      'email',
      'password',
      'credential',
      'credentials',
      'otp',
      'oneTimePin',
      'pin',
      'value',
      'identifier',
      'personalFieldValue',
      'rawToken',
      'token',
      'metadata',
      'formData',
      'fieldValues',
      'portalTemplateId',
      'organisationId',
      'tenantId',
    ]) {
      expect(propertyNames).not.toContain(forbiddenProperty);
    }
  });

  it('contains no markup, scripts, external URLs, or real branding', () => {
    const content = fixtures.flatMap(collectStringValues).join('\n');

    expect(content).not.toMatch(/https?:\/\/|www\.|javascript:/i);
    expect(content).not.toMatch(/<\/?(?:html|style|script|form|input|button)\b/i);
    expect(content).not.toMatch(/\b(?:function\s*\(|document\.|window\.|eval\s*\(|alert\s*\()/i);
    expect(content).not.toMatch(/(?:^|[\s;])(?:body|html|form|input|button|[.#][\w-]+)\s*\{/im);
    expect(content).not.toMatch(
      /\b(?:google|microsoft|apple|amazon|dropbox|paypal|chase|barclays|hsbc|visa|mastercard)\b/i,
    );
  });

  it('does not expose testing fixtures from the production package entry point', () => {
    expect('ACTIVE_PORTAL_RESOLVE_RESPONSE_FIXTURE' in sharedApi).toBe(false);
    expect('PORTAL_INTERACTION_REQUEST_FIXTURE' in sharedApi).toBe(false);
  });
});
