import type {
  ActivationValidationIssue,
  ListOrganisationEmailsQuery,
  OrganisationEmailDraftInput,
  OrganisationEmailListResponse,
  OrganisationEmailManagementDetailResponse,
  OrganisationEmailRegistrationResponse,
  PortalTemplateId,
} from '@insightful-phish/shared';
import * as OrganisationEmailRepository from '../repositories/organisation-email.repository.js';
import type { OrganisationEmailRecord } from '../repositories/organisation-email.repository.js';
import {
  EmailAuthoringValidationError,
  canonicaliseOrganisationEmailDraft,
  validateOrganisationEmailActivation,
} from './email-authoring.service.js';
import { requireOrganisationAdminScope } from './organisation-scope.service.js';
export { OrganisationScopeServiceError } from './organisation-scope.service.js';

export class OrganisationEmailServiceError extends Error {
  constructor(
    public readonly statusCode: 401 | 403 | 404 | 409 | 422,
    public readonly error: string,
    message: string,
    public readonly issues: ActivationValidationIssue[] = [],
  ) {
    super(message);
    this.name = 'OrganisationEmailServiceError';
  }
}

function recordToDraft(record: OrganisationEmailRecord): OrganisationEmailDraftInput {
  return {
    senderLabel: record.senderLabel,
    senderAddress: record.senderAddress,
    subject: record.subject,
    preview: record.preview,
    bodyHtml: record.bodyHtml,
    link: record.linkAnchorText === null ? null : { anchorText: record.linkAnchorText },
    expectedClassification: record.expectedClassification,
    redFlags: record.redFlags.map((redFlag) => ({
      redFlagType: redFlag.redFlagType,
      label: redFlag.label,
      description: redFlag.description,
      severity: redFlag.severity,
    })),
    categories: record.categories,
    difficultyLevel: record.difficultyLevel,
    portalTemplateId: record.portalTemplateId,
  };
}

function toDetail(record: OrganisationEmailRecord): OrganisationEmailManagementDetailResponse {
  return {
    id: record.id,
    organisationId: record.organisationId,
    createdByUserId: record.createdByUserId,
    ...recordToDraft(record),
    portalTemplateId: record.portalTemplateId,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toSummary(record: {
  id: string;
  senderLabel: string;
  senderAddress: string;
  subject: string;
  preview: string | null;
  portalTemplateId: PortalTemplateId | null;
  expectedClassification: 'SAFE' | 'SUSPICIOUS' | 'PHISHING';
  categories: OrganisationEmailDraftInput['categories'];
  difficultyLevel: OrganisationEmailDraftInput['difficultyLevel'];
  status: 'DRAFT' | 'ACTIVE';
  updatedAt: Date;
}) {
  return {
    id: record.id,
    senderLabel: record.senderLabel,
    senderAddress: record.senderAddress,
    subject: record.subject,
    preview: record.preview,
    portalTemplateId: record.portalTemplateId,
    expectedClassification: record.expectedClassification,
    categories: record.categories,
    difficultyLevel: record.difficultyLevel,
    status: record.status,
    updatedAt: record.updatedAt.toISOString(),
  };
}

function canonicaliseInput(input: unknown) {
  try {
    return canonicaliseOrganisationEmailDraft(input);
  } catch (error) {
    if (error instanceof EmailAuthoringValidationError) {
      throw new OrganisationEmailServiceError(
        422,
        'INVALID_EMAIL_AUTHORING_INPUT',
        error.message,
        error.issues,
      );
    }
    throw error;
  }
}

function exactMatcher(canonicalJson: string) {
  return (record: OrganisationEmailRecord) => {
    try {
      return (
        canonicaliseOrganisationEmailDraft(recordToDraft(record)).canonicalJson === canonicalJson
      );
    } catch {
      return false;
    }
  };
}

export function prepareOrganisationEmailRegistration(input: OrganisationEmailDraftInput) {
  const canonical = canonicaliseInput(input);
  return {
    ...canonical,
    isEquivalent: exactMatcher(canonical.canonicalJson),
  };
}

async function requireReadAccess(userId: string, organisationId: string) {
  return requireOrganisationAdminScope({
    userId,
    organisationId,
    requiredAnyPermission: ['VIEW_CAMPAIGNS', 'MANAGE_CAMPAIGNS'],
  });
}

async function requireWriteAccess(userId: string, organisationId: string) {
  return requireOrganisationAdminScope({
    userId,
    organisationId,
    requiredPermission: 'MANAGE_CAMPAIGNS',
  });
}

export async function getOrganisationEmails(
  userId: string,
  organisationId: string,
  query: ListOrganisationEmailsQuery,
): Promise<OrganisationEmailListResponse> {
  await requireReadAccess(userId, organisationId);
  const result = await OrganisationEmailRepository.listOrganisationEmails({
    organisationId,
    ...query,
  });
  return {
    items: result.items.map(toSummary),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: result.total === 0 ? 0 : Math.ceil(result.total / query.limit),
    },
  };
}

export async function getOrganisationEmail(
  userId: string,
  organisationId: string,
  emailId: string,
): Promise<OrganisationEmailManagementDetailResponse> {
  await requireReadAccess(userId, organisationId);
  const record = await OrganisationEmailRepository.findOrganisationEmail(organisationId, emailId);
  if (!record) {
    throw new OrganisationEmailServiceError(
      404,
      'ORGANISATION_EMAIL_NOT_FOUND',
      'Organisation email not found',
    );
  }
  return toDetail(record);
}

export async function registerOrganisationEmail(
  userId: string,
  organisationId: string,
  input: OrganisationEmailDraftInput,
): Promise<OrganisationEmailRegistrationResponse> {
  await requireWriteAccess(userId, organisationId);
  const canonical = prepareOrganisationEmailRegistration(input);
  const result = await OrganisationEmailRepository.registerOrganisationEmailDraft(
    {
      organisationId,
      createdByUserId: userId,
      draft: canonical.draft,
      contentHash: canonical.contentHash,
      portalTemplateId: canonical.draft.portalTemplateId,
    },
    canonical.isEquivalent,
  );
  return { email: toDetail(result.record), reused: result.reused };
}

export async function updateOrganisationEmail(
  userId: string,
  organisationId: string,
  emailId: string,
  input: OrganisationEmailDraftInput,
): Promise<OrganisationEmailManagementDetailResponse> {
  await requireWriteAccess(userId, organisationId);
  const canonical = canonicaliseInput(input);
  const result = await OrganisationEmailRepository.updateOrganisationEmailDraft(
    {
      organisationId,
      emailId,
      createdByUserId: userId,
      draft: canonical.draft,
      contentHash: canonical.contentHash,
      portalTemplateId: canonical.draft.portalTemplateId,
    },
    exactMatcher(canonical.canonicalJson),
  );

  if (result.state === 'NOT_FOUND') {
    throw new OrganisationEmailServiceError(
      404,
      'ORGANISATION_EMAIL_NOT_FOUND',
      'Organisation email not found',
    );
  }
  if (result.state === 'ACTIVE') {
    throw new OrganisationEmailServiceError(
      409,
      'ORGANISATION_EMAIL_ACTIVE_IMMUTABLE',
      'Active organisation emails cannot be modified',
    );
  }
  if (result.state === 'CONFLICT') {
    throw new OrganisationEmailServiceError(
      409,
      'ORGANISATION_EMAIL_EQUIVALENT_CONFLICT',
      'An equivalent organisation email already exists',
    );
  }
  return toDetail(result.record);
}

export async function activateOrganisationEmail(
  userId: string,
  organisationId: string,
  emailId: string,
): Promise<OrganisationEmailManagementDetailResponse> {
  await requireWriteAccess(userId, organisationId);
  const record = await OrganisationEmailRepository.findOrganisationEmail(organisationId, emailId);
  if (!record) {
    throw new OrganisationEmailServiceError(
      404,
      'ORGANISATION_EMAIL_NOT_FOUND',
      'Organisation email not found',
    );
  }
  if (record.status !== 'DRAFT') {
    throw new OrganisationEmailServiceError(
      409,
      'ORGANISATION_EMAIL_ACTIVE_IMMUTABLE',
      'Active organisation emails cannot be modified',
    );
  }

  const canonical = canonicaliseInput(recordToDraft(record));
  const issues = validateOrganisationEmailActivation(canonical.draft, emailId);
  if (issues.length > 0) {
    throw new OrganisationEmailServiceError(
      422,
      'ORGANISATION_EMAIL_ACTIVATION_INVALID',
      'Organisation email is incomplete and cannot be activated',
      issues,
    );
  }

  const activated = await OrganisationEmailRepository.activateOrganisationEmailDraft(
    organisationId,
    emailId,
    canonical.contentHash,
  );
  if (!activated) {
    throw new OrganisationEmailServiceError(
      409,
      'ORGANISATION_EMAIL_ACTIVE_IMMUTABLE',
      'Organisation email is no longer an editable draft',
    );
  }
  return toDetail(activated);
}

export async function copyOrganisationEmail(
  userId: string,
  organisationId: string,
  emailId: string,
): Promise<OrganisationEmailManagementDetailResponse> {
  await requireWriteAccess(userId, organisationId);
  const source = await OrganisationEmailRepository.findOrganisationEmail(organisationId, emailId);
  if (!source) {
    throw new OrganisationEmailServiceError(
      404,
      'ORGANISATION_EMAIL_NOT_FOUND',
      'Organisation email not found',
    );
  }
  if (source.status !== 'ACTIVE') {
    throw new OrganisationEmailServiceError(
      409,
      'ORGANISATION_EMAIL_NOT_ACTIVE',
      'Only active organisation emails can be copied',
    );
  }

  const copy = await OrganisationEmailRepository.copyActiveOrganisationEmail({
    organisationId,
    emailId,
    createdByUserId: userId,
  });
  if (!copy) {
    throw new OrganisationEmailServiceError(
      409,
      'ORGANISATION_EMAIL_NOT_ACTIVE',
      'Organisation email is no longer active',
    );
  }
  return toDetail(copy);
}
