import {
  recordPortalInteractionRequestSchema,
  recordPortalInteractionResponseSchema,
  resolvePhishingPortalResponseSchema,
  type RecordPortalInteractionRequest,
  type RecordPortalInteractionResponse,
  type ResolvePhishingPortalResponse,
} from '@insightful-phish/shared';

export class PublicPortalNetworkError extends Error {
  constructor() {
    super('Public portal request failed.');
  }
}

function portalPath(token: string): string {
  return `/api/public/phishing-portals/${encodeURIComponent(token)}`;
}

async function request(path: string, options: RequestInit): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(path, {
      ...options,
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
    });
  } catch {
    throw new PublicPortalNetworkError();
  }

  if (!response.ok) {
    throw new Error('Public portal request failed.');
  }

  return response.json() as Promise<unknown>;
}

export async function resolvePublicPortal(token: string): Promise<ResolvePhishingPortalResponse> {
  const response = await request(portalPath(token), {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  return resolvePhishingPortalResponseSchema.parse(response);
}

export async function recordPublicPortalInteraction(
  token: string,
  interaction: RecordPortalInteractionRequest,
): Promise<RecordPortalInteractionResponse> {
  const requestBody = recordPortalInteractionRequestSchema.parse({
    eventType: interaction.eventType,
    clientEventId: interaction.clientEventId,
  });
  const response = await request(`${portalPath(token)}/interactions`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  return recordPortalInteractionResponseSchema.parse(response);
}
