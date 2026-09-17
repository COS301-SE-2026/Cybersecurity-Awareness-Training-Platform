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

const SERVER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

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
