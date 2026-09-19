export const PORTAL_TEMPLATE_IDS = [
  'GENERIC_ACCOUNT_LOGIN_V1',
  'GENERIC_DOCUMENT_ACCESS_V1',
  'GENERIC_BANKING_LOGIN_V1',
] as const;

export type PortalTemplateId = (typeof PORTAL_TEMPLATE_IDS)[number];

export type PortalCapableEmailFields = {
  portalTemplateId: PortalTemplateId | null;
};

export const PORTAL_DELIVERY_CHANNELS = ['SIMULATED_INBOX', 'REAL_EMAIL'] as const;

export type PortalDeliveryChannel = (typeof PORTAL_DELIVERY_CHANNELS)[number];

export type ManagedPortalLinkContext =
  | {
      channel: 'SIMULATED_INBOX';
      campaignAssignmentId: string;
      campaignItemId: string;
      simulatedEmailId: string;
      phishingSimulationMessageId?: never;
    }
  | {
      channel: 'REAL_EMAIL';
      phishingSimulationMessageId: string;
      campaignAssignmentId?: string | null;
      campaignItemId?: never;
      simulatedEmailId?: never;
    };

export const BROWSER_PORTAL_INTERACTION_EVENT_TYPES = [
  'PORTAL_VISITED',
  'PORTAL_IDENTIFIER_FIELD_INTERACTED',
  'PORTAL_CREDENTIAL_FIELD_INTERACTED',
  'CREDENTIAL_SUBMISSION_ATTEMPTED',
  'PORTAL_EDUCATIONAL_REVEAL_VIEWED',
] as const;

export type BrowserPortalInteractionEventType =
  (typeof BROWSER_PORTAL_INTERACTION_EVENT_TYPES)[number];

export type PortalInteractionEventType =
  | 'MANAGED_LINK_REQUESTED'
  | BrowserPortalInteractionEventType;

export const PORTAL_INTERACTION_EVENT_TYPES = [
  'MANAGED_LINK_REQUESTED',
  ...BROWSER_PORTAL_INTERACTION_EVENT_TYPES,
] as const satisfies readonly PortalInteractionEventType[];

export type RecordPortalInteractionRequest = {
  eventType: BrowserPortalInteractionEventType;
  clientEventId: string;
};

export type PortalWarningSign = {
  label: string;
  description: string;
};

export type PortalTemplatePresentation = {
  templateId: PortalTemplateId;
  heading: string;
  identifierLabel: string;
  credentialLabel: string;
  submitLabel: string;
};

export type PortalTemplateDefinition = PortalTemplatePresentation & {
  warningSigns: PortalWarningSign[];
};

export type PortalEmailRedFlag = {
  label: string;
  description: string | null;
};

export type PortalEducationalReveal = {
  emailRedFlags: PortalEmailRedFlag[];
  portalWarningSigns: PortalWarningSign[];
  trainingPath: string | null;
};

export type ResolvePhishingPortalResponse =
  | {
      state: 'ACTIVE';
      portal: PortalTemplatePresentation;
    }
  | {
      state: 'INACTIVE' | 'UNAVAILABLE';
    };

export type RecordPortalInteractionResponse = {
  accepted: true;
  reveal: PortalEducationalReveal | null;
};

export type PortalInsightSummary = {
  managedLinkRequestCount: number;
  distinctTraineeLinkRequestCount: number;
  portalVisitCount: number;
  distinctPortalVisitorCount: number;
  identifierFieldInteractionCount: number;
  credentialFieldInteractionCount: number;
  credentialSubmissionAttemptCount: number;
  distinctCredentialAttemptTraineeCount: number;
  repeatCredentialAttemptCount: number;
  educationalRevealViewCount: number;
  distinctRevealTraineeCount: number;
};

export type TraineePortalInsight = {
  managedLinkRequested: boolean;
  portalVisited: boolean;
  identifierFieldInteracted: boolean;
  credentialFieldInteracted: boolean;
  credentialSubmissionAttemptCount: number;
  repeatCredentialAttemptCount: number;
  educationalRevealViewed: boolean;
};
