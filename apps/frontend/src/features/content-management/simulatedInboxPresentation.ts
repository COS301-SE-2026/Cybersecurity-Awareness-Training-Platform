import { ApiError } from '../../lib/apiClient';
import type { ActivationValidationIssue } from '@insightful-phish/shared';

export function formatContentUpdatedAt(value: string) {
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getSimulatedInboxError(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) {
    return { message: fallback, issues: [] as ActivationValidationIssue[], unauthorized: false };
  }

  const body = error.body && typeof error.body === 'object' ? error.body : null;
  const message =
    body && 'message' in body && typeof body.message === 'string' && body.message.trim()
      ? body.message
      : error.message || fallback;
  const rawDetails = body && 'details' in body && Array.isArray(body.details) ? body.details : [];
  const issues = rawDetails.flatMap((detail): ActivationValidationIssue[] => {
    if (!detail || typeof detail !== 'object') return [];
    const issueMessage =
      'message' in detail && typeof detail.message === 'string' ? detail.message : null;
    const field =
      'field' in detail && typeof detail.field === 'string'
        ? detail.field
        : 'path' in detail && Array.isArray(detail.path)
          ? detail.path.join('.')
          : null;
    if (!field || !issueMessage) return [];
    const code =
      'code' in detail && typeof detail.code === 'string' ? detail.code : 'INVALID_INPUT';
    const emailId =
      'emailId' in detail && typeof detail.emailId === 'string' ? detail.emailId : null;
    const position =
      'position' in detail && typeof detail.position === 'number' ? detail.position : null;
    return [{ field, message: issueMessage, code, emailId, position }];
  });

  return { message, issues, unauthorized: error.status === 401 };
}
