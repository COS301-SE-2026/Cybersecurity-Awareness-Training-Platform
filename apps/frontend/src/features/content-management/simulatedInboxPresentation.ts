import { ApiError } from '../../lib/apiClient';
import type { ActivationValidationIssue } from '@insightful-phish/shared';

function isErrorRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readStringProperty(value: Record<string, unknown>, property: string): string | null {
  const candidate = value[property];
  return typeof candidate === 'string' && candidate.trim() ? candidate : null;
}

function readIssueField(detail: Record<string, unknown>): string | null {
  const field = readStringProperty(detail, 'field');
  if (field) return field;
  if (!Array.isArray(detail.path)) return null;
  return detail.path.join('.');
}

function toActivationIssue(detail: unknown): ActivationValidationIssue[] {
  if (!isErrorRecord(detail)) return [];
  const message = readStringProperty(detail, 'message');
  const field = readIssueField(detail);
  if (!field || !message) return [];

  const code = readStringProperty(detail, 'code') ?? 'INVALID_INPUT';
  const emailId = readStringProperty(detail, 'emailId');
  const position =
    'position' in detail && typeof detail.position === 'number' ? detail.position : null;
  return [{ field, message, code, emailId, position }];
}

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

  const body = isErrorRecord(error.body) ? error.body : null;
  const message = (body && readStringProperty(body, 'message')) || error.message || fallback;
  const rawDetails = Array.isArray(body?.details) ? body.details : [];
  const issues = rawDetails.flatMap(toActivationIssue);

  return { message, issues, unauthorized: error.status === 401 };
}
