import {
  recordPortalInteractionResponseSchema,
  resolvePhishingPortalResponseSchema,
  type RecordPortalInteractionRequest,
  type RecordPortalInteractionResponse,
  type ResolvePhishingPortalResponse,
} from '@insightful-phish/shared';
import type { Request, Response } from 'express';
import {
  PhishingPortalInteractionUnavailableError,
  recordPhishingPortalInteraction,
  resolvePhishingPortal,
} from '../services/phishing-portal.service.js';

const MAX_PRESENTED_TOKEN_LENGTH = 128;

class PublicPhishingPortalResolutionError extends Error {
  constructor() {
    super('Public phishing portal resolution failed.');
    this.name = 'PublicPhishingPortalResolutionError';
  }
}

function mapPublicResponse(response: ResolvePhishingPortalResponse): ResolvePhishingPortalResponse {
  if (response.state !== 'ACTIVE') {
    return resolvePhishingPortalResponseSchema.parse({ state: response.state });
  }

  return resolvePhishingPortalResponseSchema.parse({
    state: 'ACTIVE',
    portal: {
      templateId: response.portal.templateId,
      heading: response.portal.heading,
      identifierLabel: response.portal.identifierLabel,
      credentialLabel: response.portal.credentialLabel,
      submitLabel: response.portal.submitLabel,
    },
  });
}

function mapInteractionResponse(
  response: RecordPortalInteractionResponse,
): RecordPortalInteractionResponse {
  if (response.reveal === null) {
    return recordPortalInteractionResponseSchema.parse({ accepted: true, reveal: null });
  }

  return recordPortalInteractionResponseSchema.parse({
    accepted: true,
    reveal: {
      emailRedFlags: response.reveal.emailRedFlags.map((redFlag) => ({
        label: redFlag.label,
        description: redFlag.description,
      })),
      portalWarningSigns: response.reveal.portalWarningSigns.map((warningSign) => ({
        label: warningSign.label,
        description: warningSign.description,
      })),
      trainingPath: response.reveal.trainingPath,
    },
  });
}

function extractSafeToken(req: Request): string | null {
  const token = req.params.token;
  return typeof token === 'string' && token.length > 0 && token.length <= MAX_PRESENTED_TOKEN_LENGTH
    ? token
    : null;
}

function unavailableInteractionResponse(res: Response) {
  return res.status(404).json({
    error: 'PHISHING_PORTAL_UNAVAILABLE',
    message: 'The phishing portal interaction is unavailable.',
  });
}

export async function getPublicPhishingPortal(req: Request, res: Response) {
  const token = extractSafeToken(req);
  if (token === null) {
    return res.status(200).json(mapPublicResponse({ state: 'UNAVAILABLE' }));
  }

  try {
    const response = await resolvePhishingPortal(token);
    return res.status(200).json(mapPublicResponse(response));
  } catch {
    throw new PublicPhishingPortalResolutionError();
  }
}

export async function recordPublicPhishingPortalInteraction(req: Request, res: Response) {
  const token = extractSafeToken(req);
  if (token === null) {
    return unavailableInteractionResponse(res);
  }

  const validatedBody = req.body as RecordPortalInteractionRequest;
  const request: RecordPortalInteractionRequest = {
    eventType: validatedBody.eventType,
    clientEventId: validatedBody.clientEventId,
  };

  try {
    const response = await recordPhishingPortalInteraction(token, request);
    return res.status(200).json(mapInteractionResponse(response));
  } catch (error) {
    if (error instanceof PhishingPortalInteractionUnavailableError) {
      return unavailableInteractionResponse(res);
    }
    throw new PublicPhishingPortalResolutionError();
  }
}
