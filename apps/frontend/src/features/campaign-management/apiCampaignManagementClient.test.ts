import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as campaignsApi from '../../lib/campaignsApi';
import { ApiError } from '../../lib/apiClient';
import { apiCampaignManagementClient } from './apiCampaignManagementClient';
import {
  CampaignManagementClientError,
  type CampaignManagementClient,
} from './campaignManagementClient';

vi.mock('../../lib/campaignsApi', () => ({
  getOrganisationCampaignCatalogue: vi.fn(),
  getPlatformCampaignCatalogue: vi.fn(),
  getOrganisationCampaigns: vi.fn(),
  getPlatformCampaigns: vi.fn(),
  getOrganisationCampaignDetail: vi.fn(),
  getPlatformCampaignDetail: vi.fn(),
  createOrganisationCampaignDraft: vi.fn(),
  createPlatformCampaignDraft: vi.fn(),
  updateOrganisationCampaignDraft: vi.fn(),
  updatePlatformCampaignDraft: vi.fn(),
  activateOrganisationCampaign: vi.fn(),
  activatePlatformCampaign: vi.fn(),
  archiveOrganisationCampaign: vi.fn(),
  archivePlatformCampaign: vi.fn(),
  reactivateOrganisationCampaign: vi.fn(),
  reactivatePlatformCampaign: vi.fn(),
}));

const ORGANISATION_CONTEXT = {
  kind: 'organisation' as const,
  organisationId: '11111111-1111-4111-8111-111111111111',
};

const PLATFORM_CONTEXT = {
  kind: 'platform' as const,
};

const CAMPAIGN_ID = '10000000-0000-4000-8000-000000000001';
const EXPECTED_UPDATED_AT = '2026-08-24T10:00:00.000Z';

const LIST_QUERY: Parameters<CampaignManagementClient['listCampaigns']>[1] = {
  page: 1,
  limit: 10,
  search: 'awareness',
};

const CATALOGUE_QUERY: Parameters<CampaignManagementClient['getCampaignCatalogue']>[1] = {
  page: 1,
  limit: 20,
  type: 'QUIZ',
};

const CREATE_REQUEST: Parameters<CampaignManagementClient['createCampaignDraft']>[1] = {
  name: 'Security awareness',
  description: 'Authoritative Campaign Draft',
  accentColor: '#8400FF',
  startDate: '2026-09-01T08:00:00.000Z',
  endDate: '2026-10-01T17:00:00.000Z',
  items: [],
};

const UPDATE_REQUEST: Parameters<CampaignManagementClient['updateCampaignDraft']>[2] = {
  ...CREATE_REQUEST,
  name: 'Updated security awareness',
  expectedUpdatedAt: EXPECTED_UPDATED_AT,
};

const PRECONDITION: Parameters<CampaignManagementClient['activateCampaign']>[2] = {
  expectedUpdatedAt: EXPECTED_UPDATED_AT,
};

const LIST_RESPONSE: Awaited<ReturnType<CampaignManagementClient['listCampaigns']>> = {
  items: [],
  pagination: {
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

function createApiError(body: unknown): ApiError {
  return new ApiError('Transport fallback message', {
    status: 409,
    statusText: 'Conflict',
    method: 'PUT',
    url: `/organisations/${ORGANISATION_CONTEXT.organisationId}/campaigns/${CAMPAIGN_ID}`,
    body,
  });
}

describe('apiCampaignManagementClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatches organisation operations and forwards their arguments unchanged', async () => {
    vi.mocked(campaignsApi.getOrganisationCampaigns).mockResolvedValueOnce(LIST_RESPONSE);

    await expect(
      apiCampaignManagementClient.listCampaigns(ORGANISATION_CONTEXT, LIST_QUERY),
    ).resolves.toBe(LIST_RESPONSE);
    await apiCampaignManagementClient.getCampaignCatalogue(ORGANISATION_CONTEXT, CATALOGUE_QUERY);
    await apiCampaignManagementClient.getCampaignDetail(ORGANISATION_CONTEXT, CAMPAIGN_ID);
    await apiCampaignManagementClient.createCampaignDraft(ORGANISATION_CONTEXT, CREATE_REQUEST);
    await apiCampaignManagementClient.updateCampaignDraft(
      ORGANISATION_CONTEXT,
      CAMPAIGN_ID,
      UPDATE_REQUEST,
    );
    await apiCampaignManagementClient.activateCampaign(
      ORGANISATION_CONTEXT,
      CAMPAIGN_ID,
      PRECONDITION,
    );
    await apiCampaignManagementClient.archiveCampaign(
      ORGANISATION_CONTEXT,
      CAMPAIGN_ID,
      PRECONDITION,
    );
    await apiCampaignManagementClient.reactivateCampaign(
      ORGANISATION_CONTEXT,
      CAMPAIGN_ID,
      PRECONDITION,
    );

    expect(campaignsApi.getOrganisationCampaigns).toHaveBeenCalledWith(
      ORGANISATION_CONTEXT.organisationId,
      LIST_QUERY,
    );
    expect(campaignsApi.getOrganisationCampaignCatalogue).toHaveBeenCalledWith(
      ORGANISATION_CONTEXT.organisationId,
      CATALOGUE_QUERY,
    );
    expect(campaignsApi.getOrganisationCampaignDetail).toHaveBeenCalledWith(
      ORGANISATION_CONTEXT.organisationId,
      CAMPAIGN_ID,
    );
    expect(campaignsApi.createOrganisationCampaignDraft).toHaveBeenCalledWith(
      ORGANISATION_CONTEXT.organisationId,
      CREATE_REQUEST,
    );
    expect(campaignsApi.updateOrganisationCampaignDraft).toHaveBeenCalledWith(
      ORGANISATION_CONTEXT.organisationId,
      CAMPAIGN_ID,
      UPDATE_REQUEST,
    );
    expect(campaignsApi.activateOrganisationCampaign).toHaveBeenCalledWith(
      ORGANISATION_CONTEXT.organisationId,
      CAMPAIGN_ID,
      PRECONDITION,
    );
    expect(campaignsApi.archiveOrganisationCampaign).toHaveBeenCalledWith(
      ORGANISATION_CONTEXT.organisationId,
      CAMPAIGN_ID,
      PRECONDITION,
    );
    expect(campaignsApi.reactivateOrganisationCampaign).toHaveBeenCalledWith(
      ORGANISATION_CONTEXT.organisationId,
      CAMPAIGN_ID,
      PRECONDITION,
    );

    expect(campaignsApi.getPlatformCampaigns).not.toHaveBeenCalled();
    expect(campaignsApi.getPlatformCampaignCatalogue).not.toHaveBeenCalled();
    expect(campaignsApi.getPlatformCampaignDetail).not.toHaveBeenCalled();
    expect(campaignsApi.createPlatformCampaignDraft).not.toHaveBeenCalled();
    expect(campaignsApi.updatePlatformCampaignDraft).not.toHaveBeenCalled();
    expect(campaignsApi.activatePlatformCampaign).not.toHaveBeenCalled();
    expect(campaignsApi.archivePlatformCampaign).not.toHaveBeenCalled();
    expect(campaignsApi.reactivatePlatformCampaign).not.toHaveBeenCalled();
  });

  it('dispatches platform operations and forwards their arguments unchanged', async () => {
    await apiCampaignManagementClient.listCampaigns(PLATFORM_CONTEXT, LIST_QUERY);
    await apiCampaignManagementClient.getCampaignCatalogue(PLATFORM_CONTEXT, CATALOGUE_QUERY);
    await apiCampaignManagementClient.getCampaignDetail(PLATFORM_CONTEXT, CAMPAIGN_ID);
    await apiCampaignManagementClient.createCampaignDraft(PLATFORM_CONTEXT, CREATE_REQUEST);
    await apiCampaignManagementClient.updateCampaignDraft(
      PLATFORM_CONTEXT,
      CAMPAIGN_ID,
      UPDATE_REQUEST,
    );
    await apiCampaignManagementClient.activateCampaign(PLATFORM_CONTEXT, CAMPAIGN_ID, PRECONDITION);
    await apiCampaignManagementClient.archiveCampaign(PLATFORM_CONTEXT, CAMPAIGN_ID, PRECONDITION);
    await apiCampaignManagementClient.reactivateCampaign(
      PLATFORM_CONTEXT,
      CAMPAIGN_ID,
      PRECONDITION,
    );

    expect(campaignsApi.getPlatformCampaigns).toHaveBeenCalledWith(LIST_QUERY);
    expect(campaignsApi.getPlatformCampaignCatalogue).toHaveBeenCalledWith(CATALOGUE_QUERY);
    expect(campaignsApi.getPlatformCampaignDetail).toHaveBeenCalledWith(CAMPAIGN_ID);
    expect(campaignsApi.createPlatformCampaignDraft).toHaveBeenCalledWith(CREATE_REQUEST);
    expect(campaignsApi.updatePlatformCampaignDraft).toHaveBeenCalledWith(
      CAMPAIGN_ID,
      UPDATE_REQUEST,
    );
    expect(campaignsApi.activatePlatformCampaign).toHaveBeenCalledWith(CAMPAIGN_ID, PRECONDITION);
    expect(campaignsApi.archivePlatformCampaign).toHaveBeenCalledWith(CAMPAIGN_ID, PRECONDITION);
    expect(campaignsApi.reactivatePlatformCampaign).toHaveBeenCalledWith(CAMPAIGN_ID, PRECONDITION);

    expect(campaignsApi.getOrganisationCampaigns).not.toHaveBeenCalled();
    expect(campaignsApi.getOrganisationCampaignCatalogue).not.toHaveBeenCalled();
    expect(campaignsApi.getOrganisationCampaignDetail).not.toHaveBeenCalled();
    expect(campaignsApi.createOrganisationCampaignDraft).not.toHaveBeenCalled();
    expect(campaignsApi.updateOrganisationCampaignDraft).not.toHaveBeenCalled();
    expect(campaignsApi.activateOrganisationCampaign).not.toHaveBeenCalled();
    expect(campaignsApi.archiveOrganisationCampaign).not.toHaveBeenCalled();
    expect(campaignsApi.reactivateOrganisationCampaign).not.toHaveBeenCalled();
  });

  it('converts a structured ApiError and preserves all Campaign metadata', async () => {
    const details = { componentType: 'QUIZ' };
    vi.mocked(campaignsApi.updateOrganisationCampaignDraft).mockRejectedValueOnce(
      createApiError({
        success: false,
        error: 'CAMPAIGN_CHANGED',
        message: 'The campaign has changed.',
        details,
      }),
    );

    const error = await apiCampaignManagementClient
      .updateCampaignDraft(ORGANISATION_CONTEXT, CAMPAIGN_ID, UPDATE_REQUEST)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CampaignManagementClientError);
    expect(error).toMatchObject({
      code: 'CAMPAIGN_CHANGED',
      message: 'The campaign has changed.',
      status: 409,
      details,
    });
  });

  it('preserves backend codes outside the UI-handled set', async () => {
    vi.mocked(campaignsApi.createOrganisationCampaignDraft).mockRejectedValueOnce(
      createApiError({
        success: false,
        error: 'DUPLICATE_CAMPAIGN_CONTENT',
        message: 'The same reusable content cannot appear more than once.',
      }),
    );

    await expect(
      apiCampaignManagementClient.createCampaignDraft(ORGANISATION_CONTEXT, CREATE_REQUEST),
    ).rejects.toMatchObject({
      code: 'DUPLICATE_CAMPAIGN_CONTENT',
      message: 'The same reusable content cannot appear more than once.',
      status: 409,
    });
  });

  it('rethrows an ApiError with an unstructured body unchanged', async () => {
    const apiError = createApiError({
      message: 'A response code was not supplied.',
    });
    vi.mocked(campaignsApi.getOrganisationCampaigns).mockRejectedValueOnce(apiError);

    await expect(
      apiCampaignManagementClient.listCampaigns(ORGANISATION_CONTEXT, LIST_QUERY),
    ).rejects.toBe(apiError);
  });

  it('rethrows a non-ApiError unchanged', async () => {
    const unexpectedError = new Error('Response schema parsing failed');
    vi.mocked(campaignsApi.getPlatformCampaigns).mockRejectedValueOnce(unexpectedError);

    await expect(
      apiCampaignManagementClient.listCampaigns(PLATFORM_CONTEXT, LIST_QUERY),
    ).rejects.toBe(unexpectedError);
  });
});
