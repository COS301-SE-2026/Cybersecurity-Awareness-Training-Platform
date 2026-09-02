import * as campaignsApi from '../../lib/campaignsApi';
import { ApiError } from '../../lib/apiClient';
import {
  CampaignManagementClientError,
  type CampaignManagementClient,
} from './campaignManagementClient';

type CampaignApiErrorBody = Readonly<{
  error: string;
  message: string | undefined;
  details: unknown;
}>;

function getCampaignApiErrorBody(body: unknown): CampaignApiErrorBody | null {
  if (
    !body ||
    typeof body !== 'object' ||
    !('error' in body) ||
    typeof body.error !== 'string' ||
    !body.error.trim()
  ) {
    return null;
  }

  return {
    error: body.error,
    message:
      'message' in body && typeof body.message === 'string' && body.message.trim()
        ? body.message
        : undefined,
    details: 'details' in body ? body.details : undefined,
  };
}

function convertCampaignApiError(error: unknown): unknown {
  if (!(error instanceof ApiError)) {
    return error;
  }

  const body = getCampaignApiErrorBody(error.body);

  if (!body) {
    return error;
  }

  return new CampaignManagementClientError(body.error, {
    message: body.message ?? error.message,
    status: error.status,
    details: body.details,
  });
}

async function withCampaignApiError<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw convertCampaignApiError(error);
  }
}

export const apiCampaignManagementClient: CampaignManagementClient = {
  listCampaigns(context, query) {
    return withCampaignApiError(() => {
      if (context.kind === 'organisation') {
        return campaignsApi.getOrganisationCampaigns(context.organisationId, query);
      }

      return campaignsApi.getPlatformCampaigns(query);
    });
  },

  getCampaignCatalogue(context, query) {
    return withCampaignApiError(() => {
      if (context.kind === 'organisation') {
        return campaignsApi.getOrganisationCampaignCatalogue(context.organisationId, query);
      }

      return campaignsApi.getPlatformCampaignCatalogue(query);
    });
  },

  getCampaignDetail(context, campaignId) {
    return withCampaignApiError(() => {
      if (context.kind === 'organisation') {
        return campaignsApi.getOrganisationCampaignDetail(context.organisationId, campaignId);
      }

      return campaignsApi.getPlatformCampaignDetail(campaignId);
    });
  },

  createCampaignDraft(context, request) {
    return withCampaignApiError(() => {
      if (context.kind === 'organisation') {
        return campaignsApi.createOrganisationCampaignDraft(context.organisationId, request);
      }

      return campaignsApi.createPlatformCampaignDraft(request);
    });
  },

  updateCampaignDraft(context, campaignId, request) {
    return withCampaignApiError(() => {
      if (context.kind === 'organisation') {
        return campaignsApi.updateOrganisationCampaignDraft(
          context.organisationId,
          campaignId,
          request,
        );
      }

      return campaignsApi.updatePlatformCampaignDraft(campaignId, request);
    });
  },

  activateCampaign(context, campaignId, request) {
    return withCampaignApiError(() => {
      if (context.kind === 'organisation') {
        return campaignsApi.activateOrganisationCampaign(
          context.organisationId,
          campaignId,
          request,
        );
      }

      return campaignsApi.activatePlatformCampaign(campaignId, request);
    });
  },

  archiveCampaign(context, campaignId, request) {
    return withCampaignApiError(() => {
      if (context.kind === 'organisation') {
        return campaignsApi.archiveOrganisationCampaign(
          context.organisationId,
          campaignId,
          request,
        );
      }

      return campaignsApi.archivePlatformCampaign(campaignId, request);
    });
  },

  reactivateCampaign(context, campaignId, request) {
    return withCampaignApiError(() => {
      if (context.kind === 'organisation') {
        return campaignsApi.reactivateOrganisationCampaign(
          context.organisationId,
          campaignId,
          request,
        );
      }

      return campaignsApi.reactivatePlatformCampaign(campaignId, request);
    });
  },
};
