import {
  embeddedEmailSnapshotSchema,
  phishingSimulationPoolResponseSchema,
  type AddLibraryEmailToPhishingSimulationPoolRequestDto,
  type CreatePhishingSimulationDraftRequestDto,
  type EmbeddedEmailSnapshot,
  type PhishingSimulationDetailResponseDto,
  type PhishingSimulationListResponseDto,
  type PhishingSimulationPoolResponseDto,
  type PhishingSimulationResponseDto,
  type RealEmailFeedbackDto,
  type UpdatePhishingSimulationDraftRequestDto,
} from '@insightful-phish/shared';

import { apiClient } from '../lib/apiClient';

function simulationCollectionPath(organisationId: string, campaignId: string): string {
  return `/organisations/${encodeURIComponent(
    organisationId,
  )}/campaigns/${encodeURIComponent(campaignId)}/phishing-simulations`;
}

function simulationDetailPath(
  organisationId: string,
  campaignId: string,
  simulationId: string,
): string {
  return `${simulationCollectionPath(
    organisationId,
    campaignId,
  )}/${encodeURIComponent(simulationId)}`;
}

function simulationPoolPath(
  organisationId: string,
  campaignId: string,
  simulationId: string,
): string {
  return `${simulationDetailPath(organisationId, campaignId, simulationId)}/pool`;
}

export function listPhishingSimulations(
  organisationId: string,
  campaignId: string,
): Promise<PhishingSimulationListResponseDto> {
  return apiClient.get<PhishingSimulationListResponseDto>(
    simulationCollectionPath(organisationId, campaignId),
  );
}

export function createPhishingSimulationDraft(
  organisationId: string,
  campaignId: string,
  input: CreatePhishingSimulationDraftRequestDto = {},
): Promise<PhishingSimulationResponseDto> {
  return apiClient.post<PhishingSimulationResponseDto, CreatePhishingSimulationDraftRequestDto>(
    simulationCollectionPath(organisationId, campaignId),
    input,
  );
}

export function getPhishingSimulation(
  organisationId: string,
  campaignId: string,
  simulationId: string,
): Promise<PhishingSimulationDetailResponseDto> {
  return apiClient.get<PhishingSimulationDetailResponseDto>(
    simulationDetailPath(organisationId, campaignId, simulationId),
  );
}

export function updatePhishingSimulationDraft(
  organisationId: string,
  campaignId: string,
  simulationId: string,
  input: UpdatePhishingSimulationDraftRequestDto,
): Promise<PhishingSimulationResponseDto> {
  return apiClient.patch<PhishingSimulationResponseDto, UpdatePhishingSimulationDraftRequestDto>(
    simulationDetailPath(organisationId, campaignId, simulationId),
    input,
  );
}

export async function getPhishingSimulationPool(
  organisationId: string,
  campaignId: string,
  simulationId: string,
): Promise<PhishingSimulationPoolResponseDto> {
  const response = await apiClient.get<unknown>(
    simulationPoolPath(organisationId, campaignId, simulationId),
  );

  return phishingSimulationPoolResponseSchema.parse(response);
}

export async function addPhishingSimulationPoolEmail(
  organisationId: string,
  campaignId: string,
  simulationId: string,
  organisationEmailId: string,
): Promise<EmbeddedEmailSnapshot> {
  const request: AddLibraryEmailToPhishingSimulationPoolRequestDto = {
    organisationEmailId,
  };
  const response = await apiClient.post<unknown, AddLibraryEmailToPhishingSimulationPoolRequestDto>(
    simulationPoolPath(organisationId, campaignId, simulationId),
    request,
  );

  return embeddedEmailSnapshotSchema.parse(response);
}

export function removePhishingSimulationPoolEmail(
  organisationId: string,
  campaignId: string,
  simulationId: string,
  poolEmailId: string,
): Promise<void> {
  return apiClient.delete<void>(
    `${simulationPoolPath(
      organisationId,
      campaignId,
      simulationId,
    )}/${encodeURIComponent(poolEmailId)}`,
  );
}

export function launchPhishingSimulation(
  organisationId: string,
  campaignId: string,
  simulationId: string,
): Promise<PhishingSimulationResponseDto> {
  return apiClient.post<PhishingSimulationResponseDto>(
    `${simulationDetailPath(organisationId, campaignId, simulationId)}/launch`,
  );
}

export function stopPhishingSimulation(
  organisationId: string,
  campaignId: string,
  simulationId: string,
): Promise<PhishingSimulationResponseDto> {
  return apiClient.post<PhishingSimulationResponseDto>(
    `${simulationDetailPath(organisationId, campaignId, simulationId)}/stop`,
  );
}

export function getPhishingSimulationFeedback(token: string): Promise<RealEmailFeedbackDto> {
  return apiClient.get<RealEmailFeedbackDto>(
    `/phishing-simulations/feedback/${encodeURIComponent(token)}`,
    { authToken: null, cache: 'no-store' },
  );
}
