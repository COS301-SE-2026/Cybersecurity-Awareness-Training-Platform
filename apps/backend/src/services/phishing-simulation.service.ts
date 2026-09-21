import type {
  CreatePhishingSimulationDraftRequestDto,
  PhishingSimulationListResponseDto,
  PhishingSimulationResponseDto,
  UpdatePhishingSimulationDraftRequestDto,
  EmbeddedEmailSnapshot,
  PhishingSimulationPoolResponseDto,
  AddLibraryEmailToPhishingSimulationPoolRequestDto,
  PhishingSimulationDetailResponseDto,
  OrganisationEmailDraftInput,
} from '@insightful-phish/shared';
import * as CampaignManagementRepository from '../repositories/campaign-management.repository.js';
import * as PhishingSimulationRepository from '../repositories/phishing-simulation.repository.js';
import { requireOrganisationAdminScope } from './organisation-scope.service.js';
import type {
  PhishingSimulationRecord,
  PhishingSimulationPoolRepositoryState,
  PhishingSimulationDetailRecord,
} from '../repositories/phishing-simulation.repository.js';
import * as OrganisationEmailRepository from '../repositories/organisation-email.repository.js';
import { PLATFORM_EMAIL_PROVIDER_PROFILE_ID } from './email-provider-profile.service.js';
import { randomInt } from 'node:crypto';
import { renderOrganisationEmailBody } from './email-authoring.service.js';
import { queueRenderedEmail } from './email.service.js';
import sanitizeHtml from 'sanitize-html';
import { SYSTEM_LINK_MARKER } from '@insightful-phish/shared';
import { env } from '../config/env.js';
import { generateOpaqueToken, hashOpaqueToken } from './token-hash.service.js';

const SERVER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const WEEKDAYS_BY_INDEX = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;
const PHISHING_SIMULATION_START_POLL_INTERVAL_MS = 1_000;
type SimulationSendInterval = { startAt: Date; endAt: Date };
export type PreparePhishingSimulationMessageAttemptServiceInput = {
  phishingSimulationId: string;
  messageId: string;
  providerProfileId: string;
  deliveryLogId: string;
  jobId: string;
  leaseOwner: string;
  checkedAt: Date;
  actualFromAddress: string;
  actualFromName: string | null;
  actualReplyTo: string | null;
};

export class PhishingSimulationServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly error: string,
    message: string,
  ) {
    super(message);
    this.name = 'PhishingSimulationServiceError';
  }
}

async function requireScopedCampaign(organisationId: string, campaignId: string) {
  const campaign = await CampaignManagementRepository.findCampaignById(campaignId, {
    organisationId,
  });
  if (campaign === null) {
    throw new PhishingSimulationServiceError(404, 'CAMPAIGN_NOT_FOUND', 'Campaign was not found');
  }
  return campaign;
}
async function requireCampaignReadAccess(
  actorUserId: string,
  organisationId: string,
  campaignId: string,
): Promise<void> {
  const actorScope = await requireOrganisationAdminScope({ userId: actorUserId, organisationId });

  if (
    !actorScope.grantedPermissions.has('VIEW_CAMPAIGNS') &&
    !actorScope.grantedPermissions.has('MANAGE_CAMPAIGNS')
  ) {
    throw new PhishingSimulationServiceError(
      403,
      'MISSING_REQUIRED_PERMISSION',
      'Required permissions are missing',
    );
  }
  await requireScopedCampaign(organisationId, campaignId);
}
function toNullableDate(value: string | null | undefined): Date | null {
  if (value === undefined || value === null) {
    return null;
  }
  return new Date(value);
}

function mapPhishingSimulationResponse(
  simulation: PhishingSimulationRecord,
): PhishingSimulationResponseDto {
  return {
    id: simulation.id,
    organisationId: simulation.organisationId,
    campaignId: simulation.campaignId,
    status: simulation.status,
    name: simulation.name,
    emailCount: simulation.emailCount,
    startAt: simulation.startAt?.toISOString() ?? null,
    endAt: simulation.endAt?.toISOString() ?? null,
    sendFrom: simulation.sendFrom,
    sendUntil: simulation.sendUntil,
    weekdays: simulation.weekdays,
    providerProfileIds: simulation.providerProfileIds,
    pool: simulation.pool.map(mapPhishingSimulationEmailResponse),
    timezone: SERVER_TIMEZONE,
    createdAt: simulation.createdAt.toISOString(),
    updatedAt: simulation.updatedAt.toISOString(),
  };
}
export async function createPhishingSimulationDraft(
  actorUserId: string,
  organisationId: string,
  campaignId: string,
  input: CreatePhishingSimulationDraftRequestDto,
): Promise<PhishingSimulationResponseDto> {
  await requireOrganisationAdminScope({
    userId: actorUserId,
    organisationId,
    requiredPermission: 'MANAGE_CAMPAIGNS',
  });

  const campaign = await requireScopedCampaign(organisationId, campaignId);
  if (campaign.status !== 'ACTIVE' && campaign.status !== 'DRAFT') {
    throw new PhishingSimulationServiceError(
      409,
      'CAMPAIGN_NOT_ELIGIBLE',
      'Phishing simulation drafts can only be created for Draft or Active Campaigns',
    );
  }

  const simulation = await PhishingSimulationRepository.createPhishingSimulationDraft({
    organisationId,
    campaignId,
    status: 'DRAFT',
    name: input.name ?? null,
    emailCount: input.emailCount ?? null,
    startAt: toNullableDate(input.startAt),
    endAt: toNullableDate(input.endAt),
    sendFrom: input.sendFrom ?? null,
    sendUntil: input.sendUntil ?? null,
    weekdays: input.weekdays ?? [],
    providerProfileIds: input.providerProfileIds ?? [],
  });
  return mapPhishingSimulationResponse(simulation);
}
export async function listPhishingSimulationDrafts(
  actorUserId: string,
  organisationId: string,
  campaignId: string,
): Promise<PhishingSimulationListResponseDto> {
  await requireCampaignReadAccess(actorUserId, organisationId, campaignId);
  const simulations = await PhishingSimulationRepository.findPhishingSimulationDrafts({
    organisationId,
    campaignId,
  });
  return { items: simulations.map(mapPhishingSimulationResponse) };
}
export async function getPhishingSimulationDraft(
  actorUserId: string,
  organisationId: string,
  campaignId: string,
  simulationId: string,
): Promise<PhishingSimulationDetailResponseDto> {
  await requireCampaignReadAccess(actorUserId, organisationId, campaignId);
  const simulation = await PhishingSimulationRepository.findPhishingSimulationDraftById({
    organisationId,
    campaignId,
    simulationId,
  });
  if (simulation === null) {
    throw new PhishingSimulationServiceError(
      404,
      'PHISHING_SIMULATION_NOT_FOUND',
      'Phishing simulation was not found',
    );
  }
  return mapPhishingSimulationDetailResponse(simulation);
}

export async function updatePhishingSimulationDraft(
  actorUserId: string,
  organisationId: string,
  campaignId: string,
  simulationId: string,
  input: UpdatePhishingSimulationDraftRequestDto,
): Promise<PhishingSimulationResponseDto> {
  await requireOrganisationAdminScope({
    userId: actorUserId,
    organisationId,
    requiredPermission: 'MANAGE_CAMPAIGNS',
  });
  const campaign = await requireScopedCampaign(organisationId, campaignId);
  if (campaign.status !== 'DRAFT' && campaign.status !== 'ACTIVE') {
    throw new PhishingSimulationServiceError(
      409,
      'CAMPAIGN_NOT_ELIGIBLE',
      'Phishing simulations can only be updated for Draft or Active Campaigns',
    );
  }
  const updatedSimulation = await PhishingSimulationRepository.updatePhishingSimulationDraft({
    organisationId,
    campaignId,
    simulationId,
    name: input.name,
    emailCount: input.emailCount,
    startAt: input.startAt === undefined ? undefined : toNullableDate(input.startAt),
    endAt: input.endAt === undefined ? undefined : toNullableDate(input.endAt),
    sendFrom: input.sendFrom,
    sendUntil: input.sendUntil,
    weekdays: input.weekdays,
    providerProfileIds: input.providerProfileIds,
  });

  if (updatedSimulation === null) {
    const simulation = await PhishingSimulationRepository.findPhishingSimulationDraftById({
      organisationId,
      campaignId,
      simulationId,
    });
    if (simulation === null) {
      throw new PhishingSimulationServiceError(
        404,
        'PHISHING_SIMULATION_NOT_FOUND',
        'Phishing simulation was not found',
      );
    }
    throw new PhishingSimulationServiceError(
      409,
      'LIFECYCLE_CONFLICT',
      'Only Draft phishing simulations can be updated',
    );
  }
  return mapPhishingSimulationResponse(updatedSimulation);
}

function mapPhishingSimulationEmailResponse(
  record: PhishingSimulationRecord['pool'][number],
): EmbeddedEmailSnapshot {
  return {
    id: record.id,
    sourceOrganisationEmailId: record.sourceOrganisationEmailId,
    senderLabel: record.senderLabel,
    senderAddress: record.senderAddress,
    subject: record.subject,
    preview: record.preview,
    bodyHtml: record.bodyHtml,
    link: record.linkAnchorText === null ? null : { anchorText: record.linkAnchorText },
    expectedClassification: record.expectedClassification,
    redFlags: record.redFlags.map((redFlag) => ({
      redFlagType: redFlag.redFlagType,
      label: redFlag.label,
      description: redFlag.description,
      severity: redFlag.severity,
    })),
    categories: record.categories,
    difficultyLevel: record.difficultyLevel,
    portalTemplateId: record.portalTemplateId,
  };
}
export async function getPhishingSimulationPool(
  actorUserId: string,
  organisationId: string,
  campaignId: string,
  simulationId: string,
): Promise<PhishingSimulationPoolResponseDto> {
  const simulation = await getPhishingSimulationDraft(
    actorUserId,
    organisationId,
    campaignId,
    simulationId,
  );

  return { items: simulation.pool };
}

async function requirePoolMutationAccess(
  actorUserId: string,
  organisationId: string,
  campaignId: string,
): Promise<void> {
  await requireOrganisationAdminScope({
    userId: actorUserId,
    organisationId,
    requiredPermission: 'MANAGE_CAMPAIGNS',
  });

  const campaign = await requireScopedCampaign(organisationId, campaignId);
  if (campaign.status !== 'DRAFT' && campaign.status !== 'ACTIVE') {
    throw new PhishingSimulationServiceError(
      409,
      'CAMPAIGN_NOT_ELIGIBLE',
      'Phishing simulation pools can only be modified for Draft or Active Campaigns',
    );
  }
}
function mapPhishingSimulationPoolRepositoryState(
  state: PhishingSimulationPoolRepositoryState,
): never {
  if (state === 'NOT_FOUND') {
    throw new PhishingSimulationServiceError(
      404,
      'PHISHING_SIMULATION_NOT_FOUND',
      'Phishing simulation was not found',
    );
  }

  if (state === 'POOL_EMAIL_NOT_FOUND') {
    throw new PhishingSimulationServiceError(
      404,
      'PHISHING_SIMULATION_POOL_EMAIL_NOT_FOUND',
      'Phishing simulation pool email was not found',
    );
  }

  throw new PhishingSimulationServiceError(
    409,
    'LIFECYCLE_CONFLICT',
    'Only Draft phishing simulations can be modified',
  );
}
export async function addLibraryEmailToPhishingSimulationPool(
  actorUserId: string,
  organisationId: string,
  campaignId: string,
  simulationId: string,
  input: AddLibraryEmailToPhishingSimulationPoolRequestDto,
): Promise<EmbeddedEmailSnapshot> {
  await requirePoolMutationAccess(actorUserId, organisationId, campaignId);

  const source = await OrganisationEmailRepository.findOrganisationEmail(
    organisationId,
    input.organisationEmailId,
  );

  if (source?.status !== 'ACTIVE') {
    throw new PhishingSimulationServiceError(
      404,
      'ACTIVE_ORGANISATION_EMAIL_NOT_FOUND',
      'Active organisation email not found',
    );
  }

  const result = await PhishingSimulationRepository.addPhishingSimulationEmailSnapshot({
    organisationId,
    campaignId,
    simulationId,
    source,
  });

  if (result.state !== 'CREATED') {
    mapPhishingSimulationPoolRepositoryState(result.state);
  }

  return mapPhishingSimulationEmailResponse(result.email);
}
export async function removePhishingSimulationPoolEmail(
  actorUserId: string,
  organisationId: string,
  campaignId: string,
  simulationId: string,
  poolEmailId: string,
): Promise<void> {
  await requirePoolMutationAccess(actorUserId, organisationId, campaignId);

  const result = await PhishingSimulationRepository.removePhishingSimulationEmailSnapshot({
    organisationId,
    campaignId,
    simulationId,
    poolEmailId,
  });

  if (result.state !== 'REMOVED') {
    mapPhishingSimulationPoolRepositoryState(result.state);
  }
}

function getValidSimulationSendIntervals(
  startAt: Date,
  endAt: Date,
  sendFrom: string,
  sendUntil: string,
  weekdays: PhishingSimulationRecord['weekdays'],
): SimulationSendInterval[] {
  const [sendFromHour, sendFromMinute] = sendFrom.split(':').map(Number);
  const [sendUntilHour, sendUntilMinute] = sendUntil.split(':').map(Number);
  const day = new Date(startAt);
  day.setHours(0, 0, 0, 0);
  const finalDay = new Date(endAt);
  finalDay.setHours(0, 0, 0, 0);
  const intervals: SimulationSendInterval[] = [];

  while (day.getTime() <= finalDay.getTime()) {
    const weekday = WEEKDAYS_BY_INDEX[day.getDay()];

    if (weekdays.includes(weekday)) {
      const windowStart = new Date(day);
      windowStart.setHours(sendFromHour, sendFromMinute, 0, 0);
      const windowEnd = new Date(day);
      windowEnd.setHours(sendUntilHour, sendUntilMinute, 0, 0);
      const validStartTime = Math.max(startAt.getTime(), windowStart.getTime());
      const validEndTime = Math.min(endAt.getTime(), windowEnd.getTime());
      if (validStartTime <= validEndTime)
        intervals.push({ startAt: new Date(validStartTime), endAt: new Date(validEndTime) });
    }

    day.setDate(day.getDate() + 1);
  }

  return intervals;
}
export async function launchPhishingSimulation(
  actorUserId: string,
  organisationId: string,
  campaignId: string,
  simulationId: string,
): Promise<PhishingSimulationResponseDto> {
  await requireOrganisationAdminScope({
    userId: actorUserId,
    organisationId,
    requiredPermission: 'MANAGE_CAMPAIGNS',
  });
  const validate = (state: PhishingSimulationRepository.PhishingSimulationLaunchState): void => {
    if (state.campaign.status !== 'ACTIVE')
      throw new PhishingSimulationServiceError(
        409,
        'CAMPAIGN_NOT_ELIGIBLE',
        'Only Active Campaigns can launch phishing simulations',
      );
    if (state.hasEligibleRecipient === false)
      throw new PhishingSimulationServiceError(
        422,
        'NO_ELIGIBLE_RECIPIENTS',
        'The Campaign does not have an eligible verified recipient',
      );

    const name = state.simulation.name;
    const emailCount = state.simulation.emailCount;
    const startAt = state.simulation.startAt;
    const endAt = state.simulation.endAt;
    const sendFrom = state.simulation.sendFrom;
    const sendUntil = state.simulation.sendUntil;
    const weekdays = state.simulation.weekdays;
    const providerProfileIds = state.simulation.providerProfileIds;

    if (
      name === null ||
      name.trim().length === 0 ||
      emailCount === null ||
      emailCount < 1 ||
      startAt === null ||
      endAt === null ||
      sendFrom === null ||
      sendUntil === null ||
      weekdays.length === 0 ||
      providerProfileIds.length === 0
    )
      throw new PhishingSimulationServiceError(
        422,
        'PHISHING_SIMULATION_INCOMPLETE',
        'Complete the simulation configuration before Launch',
      );
    if (state.simulation.pool.length < emailCount)
      throw new PhishingSimulationServiceError(
        422,
        'PHISHING_SIMULATION_POOL_TOO_SMALL',
        'The email pool must contain at least the configured number of emails per recipient',
      );

    const activeOrganisationProviderProfileIds = new Set<string>();
    for (const profile of state.organisationProviderProfiles) {
      if (profile.status === 'ACTIVE') activeOrganisationProviderProfileIds.add(profile.id);
    }
    for (const providerProfileId of providerProfileIds) {
      if (
        providerProfileId !== PLATFORM_EMAIL_PROVIDER_PROFILE_ID &&
        activeOrganisationProviderProfileIds.has(providerProfileId) === false
      )
        throw new PhishingSimulationServiceError(
          422,
          'EMAIL_PROVIDER_PROFILE_NOT_PERMITTED',
          'Every selected email provider profile must be active and belong to the organisation',
        );
    }

    const sendingTimePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    const now = new Date();
    if (
      sendingTimePattern.test(sendFrom) === false ||
      sendingTimePattern.test(sendUntil) === false ||
      startAt.getTime() <= now.getTime() ||
      endAt.getTime() <= startAt.getTime() ||
      sendFrom >= sendUntil ||
      (state.campaign.startDate !== null &&
        startAt.getTime() < state.campaign.startDate.getTime()) ||
      (state.campaign.endDate !== null && endAt.getTime() > state.campaign.endDate.getTime()) ||
      getValidSimulationSendIntervals(startAt, endAt, sendFrom, sendUntil, weekdays).length === 0
    )
      throw new PhishingSimulationServiceError(
        422,
        'PHISHING_SIMULATION_SCHEDULE_INVALID',
        'The simulation schedule must contain a valid future sending window within the Campaign dates',
      );
  };

  const result = await PhishingSimulationRepository.launchPhishingSimulation({
    organisationId,
    campaignId,
    simulationId,
    platformProviderProfileId: PLATFORM_EMAIL_PROVIDER_PROFILE_ID,
    validate,
  });
  if (result.state === 'NOT_FOUND')
    throw new PhishingSimulationServiceError(
      404,
      'PHISHING_SIMULATION_NOT_FOUND',
      'Phishing simulation was not found',
    );
  if (result.state === 'CAMPAIGN_NOT_FOUND')
    throw new PhishingSimulationServiceError(404, 'CAMPAIGN_NOT_FOUND', 'Campaign was not found');
  if (result.state === 'LIFECYCLE_CONFLICT')
    throw new PhishingSimulationServiceError(
      409,
      'LIFECYCLE_CONFLICT',
      'Only Draft phishing simulations can be launched',
    );
  return mapPhishingSimulationResponse(result.simulation);
}

function selectDistinctPoolEmails(
  pool: PhishingSimulationRecord['pool'],
  emailCount: number,
): PhishingSimulationRecord['pool'] {
  const shuffledPool = [...pool];
  for (let poolIndex = shuffledPool.length - 1; poolIndex > 0; poolIndex -= 1) {
    const randomIndex = randomInt(poolIndex + 1);
    [shuffledPool[poolIndex], shuffledPool[randomIndex]] = [
      shuffledPool[randomIndex],
      shuffledPool[poolIndex],
    ];
  }
  return shuffledPool.slice(0, emailCount);
}
function randomScheduledFor(intervals: SimulationSendInterval[]): Date {
  const interval = intervals[randomInt(intervals.length)];
  const startTime = interval.startAt.getTime();
  const duration = interval.endAt.getTime() - startTime;
  return new Date(startTime + randomInt(duration + 1));
}
function planPhishingSimulationStart(
  state: PhishingSimulationRepository.PhishingSimulationStartState,
): PhishingSimulationRepository.PhishingSimulationStartPlan {
  if (
    state.campaign.status !== 'ACTIVE' ||
    (state.campaign.startDate !== null &&
      state.startedAt.getTime() < state.campaign.startDate.getTime()) ||
    (state.campaign.endDate !== null &&
      state.startedAt.getTime() >= state.campaign.endDate.getTime())
  ) {
    return { state: 'STOPPED', stopReason: 'CAMPAIGN_INACTIVE' };
  }
  if (state.eligibleRecipients.length === 0)
    return { state: 'STOPPED', stopReason: 'NO_ELIGIBLE_RECIPIENTS' };
  const emailCount = state.simulation.emailCount;
  const startAt = state.simulation.startAt;
  const endAt = state.simulation.endAt;
  const sendFrom = state.simulation.sendFrom;
  const sendUntil = state.simulation.sendUntil;
  const weekdays = state.simulation.weekdays;
  const providerProfileIds = state.simulation.providerProfileIds;
  if (
    emailCount === null ||
    emailCount < 1 ||
    startAt === null ||
    endAt === null ||
    sendFrom === null ||
    sendUntil === null ||
    weekdays.length === 0 ||
    providerProfileIds.length === 0 ||
    state.simulation.pool.length < emailCount
  ) {
    throw new PhishingSimulationServiceError(
      500,
      'PHISHING_SIMULATION_START_INVARIANT_VIOLATION',
      'Scheduled phishing simulation configuration is invalid',
    );
  }

  let effectiveStartTime = Math.max(state.startedAt.getTime(), startAt.getTime());
  if (state.campaign.startDate !== null)
    effectiveStartTime = Math.max(effectiveStartTime, state.campaign.startDate.getTime());
  let effectiveEndTime = endAt.getTime();
  if (state.campaign.endDate !== null)
    effectiveEndTime = Math.min(effectiveEndTime, state.campaign.endDate.getTime());
  const validIntervals =
    effectiveStartTime > effectiveEndTime
      ? []
      : getValidSimulationSendIntervals(
          new Date(effectiveStartTime),
          new Date(effectiveEndTime),
          sendFrom,
          sendUntil,
          weekdays,
        );
  if (validIntervals.length === 0) return { state: 'STOPPED', stopReason: 'NO_VALID_SEND_WINDOW' };

  const recipients: PhishingSimulationRepository.PhishingSimulationPlannedRecipientInput[] = [];
  for (const eligibleRecipient of state.eligibleRecipients) {
    const selectedPoolEmails = selectDistinctPoolEmails(state.simulation.pool, emailCount);
    const messages: PhishingSimulationRepository.PhishingSimulationPlannedMessageInput[] = [];
    for (const poolEmail of selectedPoolEmails) {
      const providerProfileId = providerProfileIds[randomInt(providerProfileIds.length)];
      messages.push({
        poolEmailId: poolEmail.id,
        providerProfileId,
        scheduledFor: randomScheduledFor(validIntervals),
        portalTemplateId: poolEmail.portalTemplateId,
      });
    }
    recipients.push({
      campaignAssignmentId: eligibleRecipient.id,
      traineeProfileId: eligibleRecipient.traineeProfileId,
      recipientEmail: eligibleRecipient.traineeProfile.user.email,
      recipientFirstName: eligibleRecipient.traineeProfile.user.firstName,
      recipientLastName: eligibleRecipient.traineeProfile.user.lastName,
      messages,
    });
  }

  return { state: 'RUNNING', recipients };
}
export function startPhishingSimulation(simulationId: string, startedAt: Date = new Date()) {
  return PhishingSimulationRepository.startPhishingSimulation({
    simulationId,
    startedAt,
    plan: planPhishingSimulationStart,
  });
}
export async function startDuePhishingSimulations(): Promise<void> {
  const dueAt = new Date();
  const dueSimulations = await PhishingSimulationRepository.findDuePhishingSimulationIds(dueAt);
  for (const simulation of dueSimulations) {
    await startPhishingSimulation(simulation.id, new Date());
  }
}

export function startPhishingSimulationWorker() {
  let stopped = false;
  let running = false;
  let timer: NodeJS.Timeout | undefined;

  const scheduleNextRun = () => {
    if (stopped) {
      return;
    }

    timer = setTimeout(() => {
      void runOnce();
    }, PHISHING_SIMULATION_START_POLL_INTERVAL_MS);
    timer.unref();
  };

  const runOnce = async () => {
    if (running || stopped) {
      scheduleNextRun();
      return;
    }

    running = true;

    try {
      await startDuePhishingSimulations();
    } catch {
      console.error('[PhishingSimulationWorker] Start cycle failed', {
        reasonCode: 'PHISHING_SIMULATION_START_CYCLE_FAILED',
      });
    } finally {
      running = false;
      scheduleNextRun();
    }
  };

  console.info('[PhishingSimulationWorker] Worker started', {
    pollIntervalMs: PHISHING_SIMULATION_START_POLL_INTERVAL_MS,
  });
  void runOnce();

  return {
    stop: () => {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
      }
      console.info('[PhishingSimulationWorker] Worker stopped');
    },
  };
}

function mapPhishingSimulationDetailResponse(
  simulation: PhishingSimulationDetailRecord,
): PhishingSimulationDetailResponseDto {
  return {
    ...mapPhishingSimulationResponse(simulation),
    stopReason: simulation.stopReason,
    recipients: simulation.recipients.map((recipient) => ({
      id: recipient.id,
      phishingSimulationId: recipient.phishingSimulationId,
      campaignAssignmentId: recipient.campaignAssignmentId,
      traineeProfileId: recipient.traineeProfileId,
      recipientEmail: recipient.recipientEmail,
      recipientFirstName: recipient.recipientFirstName,
      recipientLastName: recipient.recipientLastName,
      snapshottedAt: recipient.snapshottedAt.toISOString(),
    })),
    messages: simulation.messages.map((message) => ({
      id: message.id,
      phishingSimulationId: message.phishingSimulationId,
      recipientId: message.recipientId,
      poolEmailId: message.poolEmailId,
      providerProfileId: message.providerProfileId,
      scheduledFor: message.scheduledFor.toISOString(),
      portalTemplateId: message.portalTemplateId,
      dispatchStatus: message.dispatchStatus,
      emailDeliveryLogId: message.emailDeliveryLogId,
      actualFromAddress: message.actualFromAddress,
      actualFromName: message.actualFromName,
      actualReplyTo: message.actualReplyTo,
    })),
  };
}

function mapPhishingSimulationEmailDraft(
  record: PhishingSimulationRecord['pool'][number],
): OrganisationEmailDraftInput {
  return {
    senderLabel: record.senderLabel,
    senderAddress: record.senderAddress,
    subject: record.subject,
    preview: record.preview,
    bodyHtml: record.bodyHtml,
    link: record.linkAnchorText === null ? null : { anchorText: record.linkAnchorText },
    expectedClassification: record.expectedClassification,
    redFlags: record.redFlags.map((redFlag) => ({
      redFlagType: redFlag.redFlagType,
      label: redFlag.label,
      description: redFlag.description,
      severity: redFlag.severity,
    })),
    categories: record.categories,
    difficultyLevel: record.difficultyLevel,
    portalTemplateId: record.portalTemplateId,
  };
}
export function queuePhishingSimulationMessage(
  phishingSimulationId: string,
  messageId: string,
  queuedAt: Date = new Date(),
) {
  const enqueue: PhishingSimulationRepository.QueuePhishingSimulationMessageInput['enqueue'] =
    async (state, client) => {
      const endAt = state.message.phishingSimulation.endAt;
      if (endAt === null) {
        throw new PhishingSimulationServiceError(
          500,
          'PHISHING_SIMULATION_QUEUE_INVARIANT_VIOLATION',
          'Running phishing simulation is missing its end time',
        );
      }

      const draft = mapPhishingSimulationEmailDraft(state.poolEmail);
      let trackingTokenHash: string | null = null;
      let trackingTokenExpiresAt: Date | null = null;
      let systemLinkUrl: string | undefined;
      if (draft.bodyHtml.includes(SYSTEM_LINK_MARKER) === true) {
        const rawTrackingToken = generateOpaqueToken();
        trackingTokenHash = hashOpaqueToken(rawTrackingToken);
        trackingTokenExpiresAt = endAt;
        systemLinkUrl = new URL(
          `/phishing-simulations/links/${encodeURIComponent(rawTrackingToken)}`,
          env.PUBLIC_API_ORIGIN,
        ).toString();
      }

      const renderedHtml = renderOrganisationEmailBody(draft, {
        firstName: state.message.recipient.recipientFirstName,
        surname: state.message.recipient.recipientLastName,
        emailAddress: state.message.recipient.recipientEmail,
        systemLinkUrl,
      });
      const bodyText = sanitizeHtml(renderedHtml, {
        allowedTags: [],
        allowedAttributes: {},
      }).trim();
      const renderedText =
        systemLinkUrl === undefined ? bodyText : `${bodyText}\n\n${systemLinkUrl}`;
      const delivery = await queueRenderedEmail(
        {
          emailType: 'PHISHING_SIMULATION_MESSAGE',
          recipientEmail: state.message.recipient.recipientEmail,
          relatedEntity: {
            organisationId: state.message.phishingSimulation.organisationId,
            campaignAssignmentId: state.message.recipient.campaignAssignmentId,
          },
          subject: draft.subject,
          text: renderedText,
          html: renderedHtml,
          idempotencyKey: `phishing-simulation-message:${state.message.id}`,
          nextAttemptAt: state.message.scheduledFor,
          retryDeadlineAt: endAt,
        },
        client,
      );
      return { deliveryLogId: delivery.deliveryLogId, trackingTokenHash, trackingTokenExpiresAt };
    };

  return PhishingSimulationRepository.queuePhishingSimulationMessage({
    phishingSimulationId,
    messageId,
    queuedAt,
    enqueue,
  });
}

export async function resolvePhishingSimulationTrackingLink(
  rawTrackingToken: string,
  resolvedAt: Date = new Date(),
): Promise<string> {
  const message =
    await PhishingSimulationRepository.findPhishingSimulationMessageByTrackingTokenHash(
      hashOpaqueToken(rawTrackingToken),
    );
  if (
    message === null ||
    message.trackingTokenExpiresAt === null ||
    message.trackingTokenExpiresAt.getTime() <= resolvedAt.getTime()
  ) {
    throw new PhishingSimulationServiceError(
      404,
      'PHISHING_SIMULATION_LINK_UNAVAILABLE',
      'Phishing simulation link is unavailable',
    );
  }

  return new URL('/', env.FRONTEND_ORIGIN).toString();
}

export function getPhishingSimulationMessageAttemptDecision(
  state: PhishingSimulationRepository.PhishingSimulationMessageAttemptState,
): PhishingSimulationRepository.PhishingSimulationMessageAttemptDecision {
  if (state.simulation.status !== 'RUNNING') {
    return { state: 'CANCELLED', reasonCode: 'PHISHING_SIMULATION_NOT_RUNNING' };
  }
  if (
    state.campaign === null ||
    state.campaign.status !== 'ACTIVE' ||
    (state.campaign.startDate !== null &&
      state.checkedAt.getTime() < state.campaign.startDate.getTime()) ||
    (state.campaign.endDate !== null &&
      state.checkedAt.getTime() >= state.campaign.endDate.getTime())
  ) {
    return { state: 'CANCELLED', reasonCode: 'CAMPAIGN_INACTIVE' };
  }

  const endAt = state.simulation.endAt;
  const sendFrom = state.simulation.sendFrom;
  const sendUntil = state.simulation.sendUntil;
  const weekdays = state.simulation.weekdays;
  const sendingTimePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (
    endAt === null ||
    sendFrom === null ||
    sendUntil === null ||
    weekdays.length === 0 ||
    sendingTimePattern.test(sendFrom) === false ||
    sendingTimePattern.test(sendUntil) === false ||
    sendFrom >= sendUntil
  ) {
    return { state: 'FAILED', reasonCode: 'PHISHING_SIMULATION_SCHEDULE_INVALID' };
  }
  if (state.checkedAt.getTime() >= endAt.getTime()) {
    return { state: 'FAILED', reasonCode: 'PHISHING_SIMULATION_END_REACHED' };
  }

  const effectiveEndAt =
    state.campaign.endDate === null || endAt.getTime() <= state.campaign.endDate.getTime()
      ? endAt
      : state.campaign.endDate;
  const validIntervals = getValidSimulationSendIntervals(
    state.checkedAt,
    effectiveEndAt,
    sendFrom,
    sendUntil,
    weekdays,
  );
  const nextInterval = validIntervals[0];
  if (nextInterval === undefined) {
    return { state: 'FAILED', reasonCode: 'PHISHING_SIMULATION_NO_VALID_SEND_WINDOW' };
  }
  if (nextInterval.startAt.getTime() > state.checkedAt.getTime()) {
    return {
      state: 'RETRY_SCHEDULED',
      nextAttemptAt: nextInterval.startAt,
      reasonCode: 'PHISHING_SIMULATION_OUTSIDE_SEND_WINDOW',
    };
  }
  return { state: 'READY' };
}

export function preparePhishingSimulationMessageAttempt(
  input: PreparePhishingSimulationMessageAttemptServiceInput,
) {
  return PhishingSimulationRepository.preparePhishingSimulationMessageAttempt({
    phishingSimulationId: input.phishingSimulationId,
    messageId: input.messageId,
    providerProfileId: input.providerProfileId,
    deliveryLogId: input.deliveryLogId,
    jobId: input.jobId,
    leaseOwner: input.leaseOwner,
    checkedAt: input.checkedAt,
    actualFromAddress: input.actualFromAddress,
    actualFromName: input.actualFromName,
    actualReplyTo: input.actualReplyTo,
    validate: getPhishingSimulationMessageAttemptDecision,
  });
}

export async function stopPhishingSimulation(
  actorUserId: string,
  organisationId: string,
  campaignId: string,
  simulationId: string,
  stoppedAt: Date = new Date(),
): Promise<PhishingSimulationResponseDto> {
  await requireOrganisationAdminScope({
    userId: actorUserId,
    organisationId,
    requiredPermission: 'MANAGE_CAMPAIGNS',
  });
  const validate: PhishingSimulationRepository.StopPhishingSimulationInput['validate'] = (
    status,
  ) => {
    if (status !== 'SCHEDULED' && status !== 'RUNNING' && status !== 'STOPPED') {
      throw new PhishingSimulationServiceError(
        409,
        'LIFECYCLE_CONFLICT',
        'Draft and Completed phishing simulations cannot be stopped',
      );
    }
  };

  const result = await PhishingSimulationRepository.stopPhishingSimulation({
    organisationId,
    campaignId,
    simulationId,
    stoppedAt,
    stopReason: 'ADMIN_STOPPED',
    deliveryReasonCode: 'PHISHING_SIMULATION_ADMIN_STOPPED',
    validate,
  });
  if (result.state === 'NOT_FOUND') {
    throw new PhishingSimulationServiceError(
      404,
      'PHISHING_SIMULATION_NOT_FOUND',
      'Phishing simulation was not found',
    );
  }
  return mapPhishingSimulationResponse(result.simulation);
}
