import type {
  CreatePhishingSimulationDraftRequestDto,
  PhishingSimulationListResponseDto,
  PhishingSimulationResponseDto,
  UpdatePhishingSimulationDraftRequestDto,
  EmbeddedEmailSnapshot,
  PhishingSimulationPoolResponseDto,
  AddLibraryEmailToPhishingSimulationPoolRequestDto,
} from '@insightful-phish/shared';
import * as CampaignManagementRepository from '../repositories/campaign-management.repository.js';
import * as PhishingSimulationRepository from '../repositories/phishing-simulation.repository.js';
import { requireOrganisationAdminScope } from './organisation-scope.service.js';
import type {
  PhishingSimulationRecord,
  PhishingSimulationPoolRepositoryState,
} from '../repositories/phishing-simulation.repository.js';
import * as OrganisationEmailRepository from '../repositories/organisation-email.repository.js';
import { PLATFORM_EMAIL_PROVIDER_PROFILE_ID } from './email-provider-profile.service.js';

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
type SimulationSendInterval = { startAt: Date; endAt: Date };

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
): Promise<PhishingSimulationResponseDto> {
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
  return mapPhishingSimulationResponse(simulation);
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
    const randomIndex = Math.floor(Math.random() * (poolIndex + 1));
    [shuffledPool[poolIndex], shuffledPool[randomIndex]] = [
      shuffledPool[randomIndex],
      shuffledPool[poolIndex],
    ];
  }
  return shuffledPool.slice(0, emailCount);
}
function randomScheduledFor(intervals: SimulationSendInterval[]): Date {
  const interval = intervals[Math.floor(Math.random() * intervals.length)];
  const startTime = interval.startAt.getTime();
  const duration = interval.endAt.getTime() - startTime;
  return new Date(startTime + Math.floor(Math.random() * (duration + 1)));
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
      const providerProfileId =
        providerProfileIds[Math.floor(Math.random() * providerProfileIds.length)];
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
