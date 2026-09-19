import type {
  PortalTemplateDefinition,
  PortalTemplateId,
  PortalTemplatePresentation,
} from './phishing-portals.js';

type DeepReadonly<Value> = Value extends readonly (infer Item)[]
  ? readonly DeepReadonly<Item>[]
  : Value extends object
    ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
    : Value;

type PortalTemplateRegistry = {
  readonly [TemplateId in PortalTemplateId]: DeepReadonly<
    PortalTemplateDefinition & { templateId: TemplateId }
  >;
};

function immutablePortalTemplateDefinition<TemplateId extends PortalTemplateId>(
  definition: PortalTemplateDefinition & { templateId: TemplateId },
): DeepReadonly<PortalTemplateDefinition & { templateId: TemplateId }> {
  const warningSigns = Object.freeze(
    definition.warningSigns.map((warningSign) => Object.freeze({ ...warningSign })),
  );

  return Object.freeze({
    ...definition,
    warningSigns,
  }) as DeepReadonly<PortalTemplateDefinition & { templateId: TemplateId }>;
}

export const PORTAL_TEMPLATE_REGISTRY = Object.freeze({
  GENERIC_ACCOUNT_LOGIN_V1: immutablePortalTemplateDefinition({
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
  }),
  GENERIC_DOCUMENT_ACCESS_V1: immutablePortalTemplateDefinition({
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
  }),
  GENERIC_BANKING_LOGIN_V1: immutablePortalTemplateDefinition({
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
  }),
} satisfies PortalTemplateRegistry);

export function findPortalTemplateDefinition(
  templateId: unknown,
): DeepReadonly<PortalTemplateDefinition> | null {
  if (typeof templateId !== 'string' || !Object.hasOwn(PORTAL_TEMPLATE_REGISTRY, templateId)) {
    return null;
  }

  return PORTAL_TEMPLATE_REGISTRY[templateId as PortalTemplateId];
}

export function getPortalTemplateDefinition(
  templateId: PortalTemplateId,
): DeepReadonly<PortalTemplateDefinition> {
  const definition = findPortalTemplateDefinition(templateId);

  if (!definition) {
    throw new RangeError('Unknown portal template identifier.');
  }

  return definition;
}

export function getPortalTemplatePresentation(
  templateId: PortalTemplateId,
): Readonly<PortalTemplatePresentation> {
  const definition = getPortalTemplateDefinition(templateId);

  return Object.freeze({
    templateId: definition.templateId,
    heading: definition.heading,
    identifierLabel: definition.identifierLabel,
    credentialLabel: definition.credentialLabel,
    submitLabel: definition.submitLabel,
  } satisfies PortalTemplatePresentation);
}
