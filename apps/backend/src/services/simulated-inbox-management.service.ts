import type {
  ActivationValidationIssue,
  AddLibraryEmailToSimulatedInboxRequest,
  CreateSimulatedInboxDraftRequest,
  ListSimulatedInboxesQuery,
  OrganisationEmailDraftInput,
  ReorderSimulatedInboxEmailsRequest,
  SimulatedInboxChildEmail,
  SimulatedInboxDetail,
  SimulatedInboxListResponse,
  SimulatedInboxSnapshotCreationResponse,
  UpdateSimulatedInboxDraftRequest,
} from '@insightful-phish/shared';
import * as SimulatedInboxRepository from '../repositories/simulated-inbox-management.repository.js';
import type {
  SimulatedInboxManagementRecord,
  SimulatedInboxSnapshotRecord,
} from '../repositories/simulated-inbox-management.repository.js';
import {
  EmailAuthoringValidationError,
  canonicaliseOrganisationEmailDraft,
  validateOrganisationEmailActivation,
} from './email-authoring.service.js';
import {
  OrganisationEmailServiceError,
  prepareOrganisationEmailRegistration,
} from './organisation-email.service.js';
import { requireOrganisationAdminScope } from './organisation-scope.service.js';
export { OrganisationScopeServiceError } from './organisation-scope.service.js';

export class SimulatedInboxManagementServiceError extends Error {
  constructor(
    public readonly statusCode: 401 | 403 | 404 | 409 | 422,
    public readonly error: string,
    message: string,
    public readonly issues: ActivationValidationIssue[] = [],
  ) {
    super(message);
    this.name = 'SimulatedInboxManagementServiceError';
  }
}

function issue(
  field: string,
  code: string,
  message: string,
  emailId: string | null = null,
  position: number | null = null,
): ActivationValidationIssue {
  return { emailId, position, field, code, message };
}

function normalise(value: string) {
  return value.trim().normalize('NFC');
}

function lifecycleStatus(record: {
  safetyStatus: string;
  simulatedInbox: { status: string } | null;
}): 'DRAFT' | 'ACTIVE' {
  return record.safetyStatus === 'APPROVED' && record.simulatedInbox?.status === 'ACTIVE'
    ? 'ACTIVE'
    : 'DRAFT';
}

function snapshotToDraft(record: SimulatedInboxSnapshotRecord): OrganisationEmailDraftInput {
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
  };
}

function toSnapshot(record: SimulatedInboxSnapshotRecord): SimulatedInboxChildEmail {
  return {
    id: record.id,
    sourceOrganisationEmailId: record.sourceOrganisationEmailId,
    position: record.position,
    ...snapshotToDraft(record),
    portalTemplateId: record.portalTemplateId,
  };
}

function toDetail(record: SimulatedInboxManagementRecord): SimulatedInboxDetail {
  if (!record.simulatedInbox) {
    throw new SimulatedInboxManagementServiceError(
      404,
      'SIMULATED_INBOX_NOT_FOUND',
      'Simulated inbox not found',
    );
  }
  return {
    id: record.id,
    organisationId: record.organisationId,
    createdByUserId: record.createdByUserId,
    title: record.title,
    description: record.description,
    objective: record.objective,
    difficultyLevel: record.difficultyLevel,
    safetyStatus: record.safetyStatus,
    lifecycleStatus: lifecycleStatus(record),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    inboxId: record.simulatedInbox.id,
    inboxStatus: record.simulatedInbox.status,
    emails: record.simulatedInbox.emails.map(toSnapshot),
  };
}

function canonicaliseDraft(input: OrganisationEmailDraftInput) {
  try {
    return canonicaliseOrganisationEmailDraft(input).draft;
  } catch (error) {
    if (error instanceof EmailAuthoringValidationError) {
      throw new SimulatedInboxManagementServiceError(
        422,
        'INVALID_EMAIL_AUTHORING_INPUT',
        error.message,
        error.issues,
      );
    }
    throw error;
  }
}

function mapRepositoryState(state: string): never {
  if (state === 'NOT_FOUND' || state === 'EMAIL_NOT_FOUND') {
    throw new SimulatedInboxManagementServiceError(
      404,
      state === 'EMAIL_NOT_FOUND' ? 'SIMULATED_EMAIL_NOT_FOUND' : 'SIMULATED_INBOX_NOT_FOUND',
      state === 'EMAIL_NOT_FOUND' ? 'Simulated email not found' : 'Simulated inbox not found',
    );
  }
  if (state === 'LIBRARY_EMAIL_NOT_FOUND') {
    throw new SimulatedInboxManagementServiceError(
      404,
      'ACTIVE_ORGANISATION_EMAIL_NOT_FOUND',
      'Active organisation email not found',
    );
  }
  if (state === 'INVALID_ORDER') {
    throw new SimulatedInboxManagementServiceError(
      422,
      'INVALID_EMAIL_ORDER',
      'Email order must contain every snapshot exactly once with contiguous positions',
      [
        issue(
          'emails',
          'INVALID_ORDER',
          'Email order must contain every snapshot exactly once with contiguous positions.',
        ),
      ],
    );
  }
  throw new SimulatedInboxManagementServiceError(
    409,
    'SIMULATED_INBOX_ACTIVE_IMMUTABLE',
    'Active simulated inboxes cannot be modified',
  );
}

async function requireReadAccess(userId: string, organisationId: string) {
  await requireOrganisationAdminScope({
    userId,
    organisationId,
    requiredAnyPermission: ['VIEW_CAMPAIGNS', 'MANAGE_CAMPAIGNS'],
  });
}

async function requireWriteAccess(userId: string, organisationId: string) {
  await requireOrganisationAdminScope({
    userId,
    organisationId,
    requiredPermission: 'MANAGE_CAMPAIGNS',
  });
}

function validateActivation(record: SimulatedInboxManagementRecord): ActivationValidationIssue[] {
  const issues: ActivationValidationIssue[] = [];
  if (!normalise(record.title)) {
    issues.push(issue('title', 'REQUIRED', 'Title is required.'));
  }
  if (!normalise(record.description ?? '')) {
    issues.push(issue('description', 'REQUIRED', 'Description is required.'));
  }
  if (!['EASY', 'MEDIUM', 'HARD'].includes(record.difficultyLevel)) {
    issues.push(
      issue('difficultyLevel', 'INVALID_DIFFICULTY', 'A valid parent difficulty is required.'),
    );
  }
  const emails = record.simulatedInbox?.emails ?? [];
  if (emails.length < 2) {
    issues.push(issue('emails', 'MINIMUM_EMAILS', 'At least two emails are required.'));
  }
  const orderedPositions = emails.map((email) => email.position).sort((a, b) => a - b);
  if (orderedPositions.some((position, index) => position !== index)) {
    issues.push(
      issue('emails', 'NON_CONTIGUOUS_POSITIONS', 'Email positions must be unique and contiguous.'),
    );
  }
  for (const email of emails) {
    try {
      const draft = canonicaliseOrganisationEmailDraft(snapshotToDraft(email)).draft;
      issues.push(
        ...validateOrganisationEmailActivation(draft, email.id).map((emailIssue) => ({
          ...emailIssue,
          position: email.position,
        })),
      );
    } catch (error) {
      if (!(error instanceof EmailAuthoringValidationError)) throw error;
      issues.push(
        ...error.issues.map((emailIssue) => ({
          ...emailIssue,
          emailId: email.id,
          position: email.position,
        })),
      );
    }
  }
  return issues;
}

export async function listSimulatedInboxes(
  userId: string,
  organisationId: string,
  query: ListSimulatedInboxesQuery,
): Promise<SimulatedInboxListResponse> {
  await requireReadAccess(userId, organisationId);
  const result = await SimulatedInboxRepository.listSimulatedInboxes({
    organisationId,
    ...query,
  });
  return {
    items: result.items.map((record) => ({
      id: record.id,
      title: record.title,
      description: record.description,
      objective: record.objective,
      difficultyLevel: record.difficultyLevel,
      safetyStatus: record.safetyStatus,
      lifecycleStatus: lifecycleStatus(record),
      emailCount: record.simulatedInbox?._count.emails ?? 0,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total: result.total,
      totalPages: result.total === 0 ? 0 : Math.ceil(result.total / query.limit),
    },
  };
}

export async function createSimulatedInboxDraft(
  userId: string,
  organisationId: string,
  input: CreateSimulatedInboxDraftRequest,
): Promise<SimulatedInboxDetail> {
  await requireWriteAccess(userId, organisationId);
  return toDetail(
    await SimulatedInboxRepository.createSimulatedInboxDraft({
      organisationId,
      createdByUserId: userId,
      title: normalise(input.title),
      description: normalise(input.description),
      difficultyLevel: input.difficultyLevel,
    }),
  );
}

export async function getSimulatedInbox(
  userId: string,
  organisationId: string,
  simulationId: string,
): Promise<SimulatedInboxDetail> {
  await requireReadAccess(userId, organisationId);
  const record = await SimulatedInboxRepository.findSimulatedInbox(organisationId, simulationId);
  if (!record) mapRepositoryState('NOT_FOUND');
  return toDetail(record);
}

export async function updateSimulatedInboxDraft(
  userId: string,
  organisationId: string,
  simulationId: string,
  input: UpdateSimulatedInboxDraftRequest,
): Promise<SimulatedInboxDetail> {
  await requireWriteAccess(userId, organisationId);
  const result = await SimulatedInboxRepository.updateSimulatedInboxDraftMetadata({
    organisationId,
    simulationId,
    ...(input.title !== undefined ? { title: normalise(input.title) } : {}),
    ...(input.description !== undefined ? { description: normalise(input.description) } : {}),
    ...(input.difficultyLevel !== undefined ? { difficultyLevel: input.difficultyLevel } : {}),
  });
  if (result.state !== 'UPDATED') mapRepositoryState(result.state);
  return toDetail(result.record);
}

export async function addAuthoredEmailToSimulatedInbox(
  userId: string,
  organisationId: string,
  simulationId: string,
  input: OrganisationEmailDraftInput,
): Promise<SimulatedInboxSnapshotCreationResponse> {
  await requireWriteAccess(userId, organisationId);
  let registration;
  try {
    registration = prepareOrganisationEmailRegistration(input);
  } catch (error) {
    if (error instanceof OrganisationEmailServiceError) {
      throw new SimulatedInboxManagementServiceError(
        error.statusCode,
        error.error,
        error.message,
        error.issues,
      );
    }
    throw error;
  }
  const result = await SimulatedInboxRepository.addAuthoredEmailSnapshot({
    organisationId,
    simulationId,
    registration: {
      organisationId,
      createdByUserId: userId,
      draft: registration.draft,
      contentHash: registration.contentHash,
    },
    isEquivalent: registration.isEquivalent,
  });
  if (result.state !== 'CREATED') mapRepositoryState(result.state);
  return {
    email: toSnapshot(result.email),
    sourceOrganisationEmailId: result.sourceOrganisationEmailId,
    libraryEmailReused: result.libraryEmailReused,
  };
}

export async function addLibraryEmailToSimulatedInbox(
  userId: string,
  organisationId: string,
  simulationId: string,
  input: AddLibraryEmailToSimulatedInboxRequest,
): Promise<SimulatedInboxSnapshotCreationResponse> {
  await requireWriteAccess(userId, organisationId);
  const result = await SimulatedInboxRepository.addActiveLibraryEmailSnapshot({
    organisationId,
    simulationId,
    organisationEmailId: input.organisationEmailId,
  });
  if (result.state !== 'CREATED') mapRepositoryState(result.state);
  return {
    email: toSnapshot(result.email),
    sourceOrganisationEmailId: result.sourceOrganisationEmailId,
    libraryEmailReused: result.libraryEmailReused,
  };
}

export async function updateSimulatedInboxEmail(
  userId: string,
  organisationId: string,
  simulationId: string,
  emailId: string,
  input: OrganisationEmailDraftInput,
): Promise<SimulatedInboxChildEmail> {
  await requireWriteAccess(userId, organisationId);
  const draft = canonicaliseDraft(input);
  const result = await SimulatedInboxRepository.updateSimulatedInboxSnapshot({
    organisationId,
    simulationId,
    emailId,
    draft,
  });
  if (result.state !== 'UPDATED') mapRepositoryState(result.state);
  return toSnapshot(result.email);
}

export async function removeSimulatedInboxEmail(
  userId: string,
  organisationId: string,
  simulationId: string,
  emailId: string,
) {
  await requireWriteAccess(userId, organisationId);
  const result = await SimulatedInboxRepository.removeSimulatedInboxSnapshot({
    organisationId,
    simulationId,
    emailId,
  });
  if (result.state !== 'REMOVED') mapRepositoryState(result.state);
}

export async function reorderSimulatedInboxEmails(
  userId: string,
  organisationId: string,
  simulationId: string,
  input: ReorderSimulatedInboxEmailsRequest,
): Promise<SimulatedInboxDetail> {
  await requireWriteAccess(userId, organisationId);
  const result = await SimulatedInboxRepository.reorderSimulatedInboxSnapshots({
    organisationId,
    simulationId,
    order: input.emails,
  });
  if (result.state !== 'REORDERED') mapRepositoryState(result.state);
  return toDetail(result.record);
}

export async function activateSimulatedInbox(
  userId: string,
  organisationId: string,
  simulationId: string,
): Promise<SimulatedInboxDetail> {
  await requireWriteAccess(userId, organisationId);
  const result = await SimulatedInboxRepository.activateSimulatedInbox({
    organisationId,
    simulationId,
    validate: validateActivation,
  });
  if (result.state === 'INVALID') {
    throw new SimulatedInboxManagementServiceError(
      422,
      'SIMULATED_INBOX_ACTIVATION_INVALID',
      'Simulated inbox is incomplete and cannot be activated',
      result.issues,
    );
  }
  if (result.state !== 'ACTIVATED') mapRepositoryState(result.state);
  return toDetail(result.record);
}

export async function copySimulatedInbox(
  userId: string,
  organisationId: string,
  simulationId: string,
): Promise<SimulatedInboxDetail> {
  await requireWriteAccess(userId, organisationId);
  const record = await SimulatedInboxRepository.copyActiveSimulatedInbox({
    organisationId,
    simulationId,
    createdByUserId: userId,
  });
  if (!record) {
    throw new SimulatedInboxManagementServiceError(
      409,
      'SIMULATED_INBOX_NOT_ACTIVE',
      'Only active simulated inboxes can be copied',
    );
  }
  return toDetail(record);
}
