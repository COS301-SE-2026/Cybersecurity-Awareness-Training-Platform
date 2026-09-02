import { CampaignManagementClientError } from './campaignManagementClient';

export type CampaignErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'validation'
  | 'unknown';

export type CampaignErrorPresentation = Readonly<{
  kind: CampaignErrorKind;
  message: string;
}>;

type CampaignErrorPresentationOptions = Readonly<{
  fallback: string;
  forbidden: string;
  notFound?: string;
}>;

function getValidationDetailMessages(details: unknown): string[] {
  if (!Array.isArray(details)) {
    return [];
  }

  return details.flatMap((detail) => {
    if (
      !detail ||
      typeof detail !== 'object' ||
      !('message' in detail) ||
      typeof detail.message !== 'string' ||
      !detail.message.trim()
    ) {
      return [];
    }

    const message = detail.message.trim();
    const field = 'field' in detail && typeof detail.field === 'string' ? detail.field.trim() : '';

    return [field ? `${field}: ${message}` : message];
  });
}

export function getCampaignErrorPresentation(
  error: unknown,
  options: CampaignErrorPresentationOptions,
): CampaignErrorPresentation {
  if (!(error instanceof CampaignManagementClientError)) {
    return {
      kind: 'unknown',
      message: options.fallback,
    };
  }

  if (error.status === 401) {
    return {
      kind: 'unauthorized',
      message: 'Your session is no longer valid. Sign in again.',
    };
  }

  if (error.status === 403) {
    return {
      kind: 'forbidden',
      message: options.forbidden,
    };
  }

  if (error.status === 404) {
    return {
      kind: 'not-found',
      message: options.notFound ?? options.fallback,
    };
  }

  if (error.status === 400 || error.status === 422 || error.code === 'VALIDATION_ERROR') {
    const message = error.message.trim() || options.fallback;
    const validationDetails = getValidationDetailMessages(error.details);

    return {
      kind: 'validation',
      message:
        validationDetails.length > 0 ? `${message}: ${validationDetails.join(' ')}` : message,
    };
  }

  return {
    kind: 'unknown',
    message: options.fallback,
  };
}
