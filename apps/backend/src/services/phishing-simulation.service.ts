import type {
  CreatePhishingSimulationDraftRequestDto,
  PhishingSimulationListResponseDto,
  PhishingSimulationResponseDto,
} from '@insightful-phish/shared';
import type { PhishingSimulation } from '../generated/prisma/client.js';
import * as CampaignManagementRepository from '../repositories/campaign-management.repository.js';
import * as PhishingSimulationRepository from '../repositories/phishing-simulation.repository.js';
import { requireOrganisationAdminScope } from './organisation-scope.service.js';

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
  simulation: PhishingSimulation,
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
    pool: [],
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
