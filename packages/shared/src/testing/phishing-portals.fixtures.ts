import {
  getPortalTemplateDefinition,
  getPortalTemplatePresentation,
} from '../phishing-portal-template-registry.js';
import type {
  ManagedPortalLinkContext,
  PortalInsightSummary,
  RecordPortalInteractionRequest,
  RecordPortalInteractionResponse,
  ResolvePhishingPortalResponse,
  TraineePortalInsight,
} from '../phishing-portals.js';

const campaignAssignmentId = '81000000-0000-4000-8000-000000000001';
const campaignItemId = '81000000-0000-4000-8000-000000000002';
const simulatedEmailId = '81000000-0000-4000-8000-000000000003';
const phishingSimulationMessageId = '81000000-0000-4000-8000-000000000004';

export const ACTIVE_PORTAL_RESOLVE_RESPONSE_FIXTURE = {
  state: 'ACTIVE',
  portal: getPortalTemplatePresentation('GENERIC_ACCOUNT_LOGIN_V1'),
} satisfies ResolvePhishingPortalResponse;

export const INACTIVE_PORTAL_RESOLVE_RESPONSE_FIXTURE = {
  state: 'INACTIVE',
} satisfies ResolvePhishingPortalResponse;

export const UNAVAILABLE_PORTAL_RESOLVE_RESPONSE_FIXTURE = {
  state: 'UNAVAILABLE',
} satisfies ResolvePhishingPortalResponse;

export const PORTAL_INTERACTION_REQUEST_FIXTURE = {
  eventType: 'CREDENTIAL_SUBMISSION_ATTEMPTED',
  clientEventId: 'portal-event-fixture-001',
} satisfies RecordPortalInteractionRequest;

export const PORTAL_INTERACTION_WITHOUT_REVEAL_RESPONSE_FIXTURE = {
  accepted: true,
  reveal: null,
} satisfies RecordPortalInteractionResponse;

export const PORTAL_INTERACTION_WITH_REVEAL_RESPONSE_FIXTURE = {
  accepted: true,
  reveal: {
    emailRedFlags: [
      {
        label: 'Unexpected request',
        description: 'The message requested an action that was not anticipated.',
      },
      {
        label: 'Urgent tone',
        description: null,
      },
    ],
    portalWarningSigns: getPortalTemplateDefinition('GENERIC_ACCOUNT_LOGIN_V1').warningSigns.map(
      (warningSign) => ({ ...warningSign }),
    ),
    trainingPath: `/training/${campaignItemId}`,
  },
} satisfies RecordPortalInteractionResponse;

export const SIMULATED_INBOX_MANAGED_PORTAL_LINK_CONTEXT_FIXTURE = {
  channel: 'SIMULATED_INBOX',
  campaignAssignmentId,
  campaignItemId,
  simulatedEmailId,
} satisfies ManagedPortalLinkContext;

export const REAL_EMAIL_MANAGED_PORTAL_LINK_CONTEXT_FIXTURE = {
  channel: 'REAL_EMAIL',
  phishingSimulationMessageId,
  campaignAssignmentId: null,
} satisfies ManagedPortalLinkContext;

export const PORTAL_INSIGHT_SUMMARY_FIXTURE = {
  managedLinkRequestCount: 12,
  distinctTraineeLinkRequestCount: 10,
  portalVisitCount: 9,
  distinctPortalVisitorCount: 8,
  identifierFieldInteractionCount: 7,
  credentialFieldInteractionCount: 6,
  credentialSubmissionAttemptCount: 5,
  distinctCredentialAttemptTraineeCount: 4,
  repeatCredentialAttemptCount: 1,
  educationalRevealViewCount: 5,
  distinctRevealTraineeCount: 4,
} satisfies PortalInsightSummary;

export const TRAINEE_PORTAL_INSIGHT_FIXTURE = {
  managedLinkRequested: true,
  portalVisited: true,
  identifierFieldInteracted: true,
  credentialFieldInteracted: true,
  credentialSubmissionAttemptCount: 2,
  repeatCredentialAttemptCount: 1,
  educationalRevealViewed: true,
} satisfies TraineePortalInsight;
