import {
  recordPortalInteractionRequestSchema,
  recordPortalInteractionResponseSchema,
  resolvePhishingPortalResponseSchema,
  type RecordPortalInteractionRequest,
  type RecordPortalInteractionResponse,
  type ResolvePhishingPortalResponse,
} from '@insightful-phish/shared';
import { apiClient } from '../../lib/apiClient';

function portalPath(token: string): string {
  return `/api/public/phishing-portals/${encodeURIComponent(token)}`;
}

export async function resolvePhishingPortal(token: string): Promise<ResolvePhishingPortalResponse> {
  const response = await apiClient.get<unknown>(portalPath(token), { authToken: null });
  return resolvePhishingPortalResponseSchema.parse(response);
}

export async function recordPhishingPortalInteraction(
  token: string,
  request: RecordPortalInteractionRequest,
): Promise<RecordPortalInteractionResponse> {
  const body = recordPortalInteractionRequestSchema.parse(request);
  const response = await apiClient.post<unknown, RecordPortalInteractionRequest>(
    `${portalPath(token)}/interactions`,
    body,
    { authToken: null },
  );

  return recordPortalInteractionResponseSchema.parse(response);
}
