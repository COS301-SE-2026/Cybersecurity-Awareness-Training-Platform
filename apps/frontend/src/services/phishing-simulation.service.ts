import type {
  CreatePhishingSimulationDraftRequestDto,
  PhishingSimulationDetailResponseDto,
  PhishingSimulationListResponseDto,
  PhishingSimulationResponseDto,
  RealEmailFeedbackDto,
  UpdatePhishingSimulationDraftRequestDto,
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

export function launchPhishingSimulation(
  organisationId: string,
  campaignId: string,
  simulationId: string,
): Promise<PhishingSimulationResponseDto> {
  return apiClient.post<PhishingSimulationResponseDto>(
    `${simulationDetailPath(organisationId, campaignId, simulationId)}/launch`,
  );
}

export function getPhishingSimulationFeedback(token: string): Promise<RealEmailFeedbackDto> {
  return apiClient.get<RealEmailFeedbackDto>(
    `/phishing-simulations/feedback/${encodeURIComponent(token)}`,
    { authToken: null, cache: 'no-store' },
  );
}
