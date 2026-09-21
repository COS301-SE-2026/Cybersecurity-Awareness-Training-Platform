import {
  campaignPortalReportingFactSchema,
  findPortalTemplateDefinition,
  getPortalTemplateDefinition,
  getPortalTemplatePresentation,
  type BrowserPortalInteractionEventType,
  type CampaignPortalReportingFact,
  type PortalTemplateId,
  type RecordPortalInteractionRequest,
  type RecordPortalInteractionResponse,
  type ResolvePhishingPortalResponse,
  type SimulatedInboxPortalContext,
} from '@insightful-phish/shared';
import {
  ManagedPortalLinkIdConflictError,
  ManagedPortalLinkOccurrenceConflictError,
  ManagedPortalLinkTokenHashConflictError,
  createFirstPortalInteractionEvent,
  createManagedPortalLink,
  createPortalInteractionEvent,
  findOrganisationCampaignForPortalReporting,
  findManagedPortalLinkByOccurrence,
  findManagedPortalLinkResolutionByTokenHash,
  readCampaignPortalReportingFacts,
  type ManagedPortalLinkOccurrenceRecord,
  type ManagedPortalLinkResolutionFacts,
} from '../repositories/portal-persistence.repository.js';
import { env } from '../config/env.js';
import {
  deriveManagedPortalToken,
  generateOpaqueToken,
  hashOpaqueToken,
  opaqueTokenMatches,
} from './token-hash.service.js';
import { defaultCampaignEligibilityService } from './campaign-eligibility.service.js';
import { requireOrganisationAdminScope } from './organisation-scope.service.js';

const PORTAL_TOKEN_BYTES = 32;
const PORTAL_TOKEN_LENGTH = 43;
const TOKEN_CREATION_ATTEMPTS = 3;
const PUBLIC_PORTAL_PATH_PREFIX = '/api/public/phishing-portals/';
const ACCESSIBLE_ASSIGNMENT_STATUSES = new Set([
  'AVAILABLE',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
]);
const FIRST_OCCURRENCE_BROWSER_EVENTS = new Set<BrowserPortalInteractionEventType>([
  'PORTAL_VISITED',
  'PORTAL_IDENTIFIER_FIELD_INTERACTED',
  'PORTAL_CREDENTIAL_FIELD_INTERACTED',
  'PORTAL_EDUCATIONAL_REVEAL_VIEWED',
]);

export type CreateApprovedManagedPortalLinkInput = {
  portalTemplateId: PortalTemplateId;
  traineeProfileId: string;
  organisationId: string | null;
  context: SimulatedInboxPortalContext;
  expiresAt: Date;
};

export type CreateApprovedManagedPortalLinkResult = {
  token: string;
  managedPortalLinkId: string;
  expiresAt: string;
};

export type ManagedPortalOccurrenceResult =
  | { state: 'ACTIVE'; managedPortalUrl: string }
  | { state: 'INACTIVE' };

export type CampaignPortalReportingActor = {
  userId: string;
  userType: string;
};

type UnavailableReason =
  | 'MALFORMED_TOKEN'
  | 'UNKNOWN_TOKEN'
  | 'WRONG_PURPOSE'
  | 'UNKNOWN_TEMPLATE'
  | 'UNSUPPORTED_SOURCE'
  | 'SOURCE_MISSING'
  | 'SOURCE_INCONSISTENT'
  | 'TRAINEE_CONTEXT_INCONSISTENT'
  | 'TENANT_INCONSISTENT';

type InactiveReason = 'SOURCE_INACTIVE' | 'EXPIRED' | 'REVOKED';

export type ManagedPortalTokenResolution =
  | {
      state: 'ACTIVE';
      managedPortalLinkId: string;
      portalTemplateId: PortalTemplateId;
      simulatedEmailId: string;
      emailRedFlags: Array<{
        label: string;
        description: string | null;
      }>;
    }
  | { state: 'INACTIVE'; reason: InactiveReason }
  | { state: 'UNAVAILABLE'; reason: UnavailableReason };

export class PhishingPortalServiceError extends Error {
  constructor(
    public readonly code:
      | 'INVALID_EXPIRY'
      | 'TOKEN_COLLISION_RETRY_EXHAUSTED'
      | 'OCCURRENCE_CONTEXT_CONFLICT'
      | 'TOKEN_RECOVERY_FAILED',
  ) {
    super(
      code === 'INVALID_EXPIRY'
        ? 'Managed portal link expiry must be a finite future date.'
        : 'A managed portal link could not be obtained.',
    );
    this.name = 'PhishingPortalServiceError';
  }
}

export class CampaignPortalReportingServiceError extends Error {
  readonly statusCode = 404;
  readonly error = 'CAMPAIGN_NOT_FOUND';

  constructor() {
    super('Campaign not found.');
    this.name = 'CampaignPortalReportingServiceError';
  }
}

function assertValidExpiry(expiresAt: Date, now: Date): void {
  if (
    !(expiresAt instanceof Date) ||
    !Number.isFinite(expiresAt.getTime()) ||
    expiresAt.getTime() <= now.getTime()
  ) {
    throw new PhishingPortalServiceError('INVALID_EXPIRY');
  }
}

function buildManagedPortalUrl(token: string): string {
  return new URL(
    `${PUBLIC_PORTAL_PATH_PREFIX}${encodeURIComponent(token)}`,
    env.PUBLIC_API_ORIGIN,
  ).toString();
}

function occurrenceRecordMatchesInput(
  record: ManagedPortalLinkOccurrenceRecord,
  input: CreateApprovedManagedPortalLinkInput,
): boolean {
  return (
    record.purpose === 'PHISHING_PORTAL' &&
    record.portalTemplateId === input.portalTemplateId &&
    record.traineeProfileId === input.traineeProfileId &&
    record.organisationId === input.organisationId &&
    record.context.channel === 'SIMULATED_INBOX' &&
    record.context.campaignAssignmentId === input.context.campaignAssignmentId &&
    record.context.campaignItemId === input.context.campaignItemId &&
    record.context.simulatedEmailId === input.context.simulatedEmailId
  );
}

function restoreManagedPortalOccurrence(
  record: ManagedPortalLinkOccurrenceRecord,
  input: CreateApprovedManagedPortalLinkInput,
  now: Date,
): ManagedPortalOccurrenceResult {
  if (!occurrenceRecordMatchesInput(record, input)) {
    throw new PhishingPortalServiceError('OCCURRENCE_CONTEXT_CONFLICT');
  }
  if (record.revokedAt !== null || record.expiresAt.getTime() <= now.getTime()) {
    return { state: 'INACTIVE' };
  }

  const token = deriveManagedPortalToken(record.id);
  if (!isValidPresentedToken(token) || !opaqueTokenMatches(token, record.tokenHash)) {
    throw new PhishingPortalServiceError('TOKEN_RECOVERY_FAILED');
  }
  return { state: 'ACTIVE', managedPortalUrl: buildManagedPortalUrl(token) };
}

export class PhishingPortalInteractionUnavailableError extends Error {
  readonly statusCode = 404;
  readonly error = 'PHISHING_PORTAL_UNAVAILABLE';

  constructor() {
    super('The phishing portal interaction is unavailable.');
    this.name = 'PhishingPortalInteractionUnavailableError';
  }
}

function isValidPresentedToken(token: unknown): token is string {
  if (
    typeof token !== 'string' ||
    token.length !== PORTAL_TOKEN_LENGTH ||
    !/^[A-Za-z0-9_-]+$/.test(token)
  ) {
    return false;
  }

  const decoded = Buffer.from(token, 'base64url');
  return decoded.length === PORTAL_TOKEN_BYTES && decoded.toString('base64url') === token;
}

function sourceRecordsExist(facts: ManagedPortalLinkResolutionFacts): boolean {
  return (
    facts.traineeProfile !== null &&
    facts.campaignAssignment !== null &&
    facts.campaignItem !== null &&
    facts.simulatedEmail !== null
  );
}

function sourceRelationshipsAreConsistent(facts: ManagedPortalLinkResolutionFacts): boolean {
  const assignment = facts.campaignAssignment;
  const item = facts.campaignItem;
  const email = facts.simulatedEmail;
  if (!assignment || !item || !email) return false;

  return (
    assignment.id === facts.context.campaignAssignmentId &&
    item.id === facts.context.campaignItemId &&
    email.id === facts.context.simulatedEmailId &&
    assignment.campaignId === assignment.campaign.id &&
    item.campaignId === assignment.campaignId &&
    item.itemType === 'COMPONENT' &&
    item.componentType === 'SIMULATED_INBOX' &&
    item.simulationId !== null &&
    item.simulationId === email.inbox.simulationId &&
    email.inbox.id === email.inboxId &&
    email.inbox.simulation.id === email.inbox.simulationId &&
    email.inbox.simulation.simulationType === 'SIMULATED_INBOX' &&
    email.portalTemplateId === facts.portalTemplateId
  );
}

function traineeContextIsConsistent(facts: ManagedPortalLinkResolutionFacts): boolean {
  return (
    facts.traineeProfile?.id === facts.traineeProfileId &&
    facts.campaignAssignment?.traineeProfileId === facts.traineeProfileId
  );
}

function tenantContextIsConsistent(facts: ManagedPortalLinkResolutionFacts): boolean {
  const assignment = facts.campaignAssignment;
  const simulation = facts.simulatedEmail?.inbox.simulation;
  if (!assignment || !simulation) return false;
  const campaign = assignment.campaign;

  if (
    campaign.organisationId !== facts.organisationId ||
    (simulation.organisationId !== null && simulation.organisationId !== facts.organisationId)
  ) {
    return false;
  }

  if (facts.organisationId === null) {
    return (
      facts.organisation === null &&
      campaign.campaignType === 'PREMADE_GENERAL' &&
      assignment.accessType === 'SELF_SELECTED' &&
      facts.traineeProfile?.hasGeneralProfile === true
    );
  }

  return (
    facts.organisation?.id === facts.organisationId &&
    campaign.campaignType === 'ORGANISATION_CUSTOM' &&
    assignment.accessType === 'ASSIGNED' &&
    facts.traineeProfile?.organisationMembership?.organisationId === facts.organisationId
  );
}

function sourceLifecycleIsActive(facts: ManagedPortalLinkResolutionFacts, now: Date): boolean {
  const trainee = facts.traineeProfile;
  const assignment = facts.campaignAssignment;
  const item = facts.campaignItem;
  const email = facts.simulatedEmail;
  if (!trainee || !assignment || !item || !email) return false;

  if (
    trainee.traineeStatus !== 'ACTIVE' ||
    trainee.userAuthStatus !== 'ACTIVE' ||
    !ACCESSIBLE_ASSIGNMENT_STATUSES.has(assignment.assignmentStatus) ||
    item.availabilityStatus !== 'AVAILABLE' ||
    email.inbox.simulation.safetyStatus !== 'APPROVED' ||
    email.inbox.status !== 'ACTIVE'
  ) {
    return false;
  }

  if (
    facts.organisationId !== null &&
    (facts.organisation?.status !== 'ACTIVE' ||
      trainee.organisationMembership?.membershipStatus !== 'ACTIVE')
  ) {
    return false;
  }

  const campaignEligibility = defaultCampaignEligibilityService.evaluateCampaignEligibility(
    {
      status: assignment.campaign.status,
      campaignType: assignment.campaign.campaignType,
      startDate: assignment.campaign.startDate,
      endDate: assignment.campaign.endDate,
    },
    now,
  );
  return defaultCampaignEligibilityService.evaluateItemEligibility(
    campaignEligibility,
    'SIMULATED_INBOX',
  ).canProgress;
}

export async function getCampaignPortalReportingFacts(
  actor: CampaignPortalReportingActor,
  organisationId: string,
  campaignId: string,
): Promise<CampaignPortalReportingFact[]> {
  await requireOrganisationAdminScope({
    userId: actor.userId,
    organisationId,
    requiredAnyPermission: ['VIEW_CAMPAIGNS', 'MANAGE_CAMPAIGNS'],
  });

  const campaign = await findOrganisationCampaignForPortalReporting({
    organisationId,
    campaignId,
  });
  if (!campaign) throw new CampaignPortalReportingServiceError();

  const facts = await readCampaignPortalReportingFacts({ organisationId, campaignId });
  return campaignPortalReportingFactSchema.array().parse(facts);
}

export async function createApprovedManagedPortalLink(
  input: CreateApprovedManagedPortalLinkInput,
  now = new Date(),
): Promise<CreateApprovedManagedPortalLinkResult> {
  assertValidExpiry(input.expiresAt, now);

  for (let attempt = 0; attempt < TOKEN_CREATION_ATTEMPTS; attempt += 1) {
    const managedPortalLinkId = generateOpaqueToken(PORTAL_TOKEN_BYTES);
    const token = deriveManagedPortalToken(managedPortalLinkId);
    const tokenHash = hashOpaqueToken(token);
    try {
      const link = await createManagedPortalLink({
        id: managedPortalLinkId,
        tokenHash,
        portalTemplateId: input.portalTemplateId,
        traineeProfileId: input.traineeProfileId,
        organisationId: input.organisationId,
        context: input.context,
        expiresAt: input.expiresAt,
      });
      return {
        token,
        managedPortalLinkId: link.id,
        expiresAt: link.expiresAt,
      };
    } catch (error) {
      if (
        !(error instanceof ManagedPortalLinkIdConflictError) &&
        !(error instanceof ManagedPortalLinkTokenHashConflictError)
      ) {
        throw error;
      }
    }
  }

  throw new PhishingPortalServiceError('TOKEN_COLLISION_RETRY_EXHAUSTED');
}

export async function getOrCreateManagedPortalForOccurrence(
  input: CreateApprovedManagedPortalLinkInput,
  now = new Date(),
): Promise<ManagedPortalOccurrenceResult> {
  assertValidExpiry(input.expiresAt, now);

  const existing = await findManagedPortalLinkByOccurrence(input.context);
  if (existing) return restoreManagedPortalOccurrence(existing, input, now);

  try {
    const created = await createApprovedManagedPortalLink(input, now);
    return { state: 'ACTIVE', managedPortalUrl: buildManagedPortalUrl(created.token) };
  } catch (error) {
    if (!(error instanceof ManagedPortalLinkOccurrenceConflictError)) throw error;
    const concurrent = await findManagedPortalLinkByOccurrence(input.context);
    if (!concurrent) throw error;
    return restoreManagedPortalOccurrence(concurrent, input, now);
  }
}

export async function resolveManagedPortalToken(
  presentedToken: unknown,
  now = new Date(),
): Promise<ManagedPortalTokenResolution> {
  if (!isValidPresentedToken(presentedToken)) {
    return { state: 'UNAVAILABLE', reason: 'MALFORMED_TOKEN' };
  }

  const tokenHash = hashOpaqueToken(presentedToken);
  const facts = await findManagedPortalLinkResolutionByTokenHash(tokenHash);
  if (!facts) return { state: 'UNAVAILABLE', reason: 'UNKNOWN_TOKEN' };
  if (facts.purpose !== 'PHISHING_PORTAL') {
    return { state: 'UNAVAILABLE', reason: 'WRONG_PURPOSE' };
  }

  const template = findPortalTemplateDefinition(facts.portalTemplateId);
  if (!template) return { state: 'UNAVAILABLE', reason: 'UNKNOWN_TEMPLATE' };
  if (facts.context.channel !== 'SIMULATED_INBOX') {
    return { state: 'UNAVAILABLE', reason: 'UNSUPPORTED_SOURCE' };
  }
  if (!sourceRecordsExist(facts)) {
    return { state: 'UNAVAILABLE', reason: 'SOURCE_MISSING' };
  }
  if (!sourceRelationshipsAreConsistent(facts)) {
    return { state: 'UNAVAILABLE', reason: 'SOURCE_INCONSISTENT' };
  }
  if (!traineeContextIsConsistent(facts)) {
    return { state: 'UNAVAILABLE', reason: 'TRAINEE_CONTEXT_INCONSISTENT' };
  }
  if (!tenantContextIsConsistent(facts)) {
    return { state: 'UNAVAILABLE', reason: 'TENANT_INCONSISTENT' };
  }
  if (!sourceLifecycleIsActive(facts, now)) {
    return { state: 'INACTIVE', reason: 'SOURCE_INACTIVE' };
  }
  if (!Number.isFinite(facts.expiresAt.getTime()) || facts.expiresAt.getTime() <= now.getTime()) {
    return { state: 'INACTIVE', reason: 'EXPIRED' };
  }
  if (facts.revokedAt !== null) {
    return { state: 'INACTIVE', reason: 'REVOKED' };
  }

  return {
    state: 'ACTIVE',
    managedPortalLinkId: facts.id,
    portalTemplateId: template.templateId,
    simulatedEmailId: facts.simulatedEmail?.id ?? facts.context.simulatedEmailId,
    emailRedFlags: facts.simulatedEmail?.redFlags ?? [],
  };
}

export async function resolvePhishingPortal(
  presentedToken: unknown,
  now = new Date(),
): Promise<ResolvePhishingPortalResponse> {
  const resolution = await resolveManagedPortalToken(presentedToken, now);
  if (resolution.state !== 'ACTIVE') return { state: resolution.state };

  await createPortalInteractionEvent({
    managedPortalLinkId: resolution.managedPortalLinkId,
    eventType: 'MANAGED_LINK_REQUESTED',
    clientEventId: null,
    occurredAt: now,
  });

  return {
    state: 'ACTIVE',
    portal: getPortalTemplatePresentation(resolution.portalTemplateId),
  };
}

export async function recordPhishingPortalInteraction(
  presentedToken: unknown,
  request: RecordPortalInteractionRequest,
  now = new Date(),
): Promise<RecordPortalInteractionResponse> {
  const resolution = await resolveManagedPortalToken(presentedToken, now);
  if (resolution.state !== 'ACTIVE') {
    throw new PhishingPortalInteractionUnavailableError();
  }

  if (request.eventType === 'CREDENTIAL_SUBMISSION_ATTEMPTED') {
    await createPortalInteractionEvent({
      managedPortalLinkId: resolution.managedPortalLinkId,
      eventType: request.eventType,
      clientEventId: request.clientEventId,
      occurredAt: now,
    });

    const definition = getPortalTemplateDefinition(resolution.portalTemplateId);
    return {
      accepted: true,
      reveal: {
        emailRedFlags: resolution.emailRedFlags.map((redFlag) => ({
          label: redFlag.label,
          description: redFlag.description,
        })),
        portalWarningSigns: definition.warningSigns.map((warningSign) => ({
          label: warningSign.label,
          description: warningSign.description,
        })),
        trainingPath: null,
      },
    };
  }

  if (!FIRST_OCCURRENCE_BROWSER_EVENTS.has(request.eventType)) {
    throw new PhishingPortalInteractionUnavailableError();
  }

  await createFirstPortalInteractionEvent({
    managedPortalLinkId: resolution.managedPortalLinkId,
    eventType: request.eventType,
    clientEventId: request.clientEventId,
    occurredAt: now,
  });

  return { accepted: true, reveal: null };
}
