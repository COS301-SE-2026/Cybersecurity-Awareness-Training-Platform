import type {
  TrainingDocumentAuthoringResponseDto,
  TrainingDocuemtnDraftInputDto,
} from '@insightful-phish/shared';
import { resolveContent } from './content-resolver.service.js';
import * as ContentLifecycleRepository from '../repositories/content-lifecycle.repository.js';
import type {
  UpdateQuizDraftInput,
  UpdateSimulationDraftInput,
  UpdateTrainingDocumentDraftInput,
} from '../repositories/content-lifecycle.repository.js';
import * as OrganisationScopeRepository from '../repositories/organisation-scope.repository.js';
import { renderTrainingDocumentMarkdown } from './training-document-renderer.service.js';

export type UserActorContext = {
  userId: string;
  userType: string;
};

export class ContentLifecycleServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly error: string,
    message: string,
  ) {
    super(message);
    this.name = 'ContentLifecycleServiceError';
  }
}

async function validateActorAccess(actor: UserActorContext, organisationId: string | null) {
  if (!organisationId) {
    const ipAdmin = await OrganisationScopeRepository.findActiveIpAdminScope(actor.userId);
    if (!ipAdmin) {
      throw new ContentLifecycleServiceError(
        403,
        'FORBIDDEN',
        'Platform administrator access is required',
      );
    }
    return;
  }

  const adminScope = await OrganisationScopeRepository.findOrganisationAdminActorScope({
    userId: actor.userId,
    organisationId,
  });

  if (!adminScope) {
    throw new ContentLifecycleServiceError(
      404,
      'ORGANISATION_NOT_FOUND',
      'Organisation context not found or user is not an active admin',
    );
  }

  if (adminScope.organisation.status !== 'ACTIVE') {
    throw new ContentLifecycleServiceError(
      403,
      'ORGANISATION_NOT_ACTIVE',
      'Organisation is not active',
    );
  }

  const canManageCampaigns = adminScope.permissionGrants.some(
    (grant) => grant.organisationPermission.key === 'MANAGE_CAMPAIGNS',
  );
  if (!canManageCampaigns) {
    throw new ContentLifecycleServiceError(
      403,
      'FORBIDDEN',
      'Missing required permission: MANAGE_CAMPAIGNS',
    );
  }
}

function checkContentEditPermission(
  actorOrganisationId: string | null,
  contentOrganisationId: string | null,
) {
  if (actorOrganisationId !== contentOrganisationId) {
    throw new ContentLifecycleServiceError(
      403,
      'FORBIDDEN',
      'Cannot modify content belonging to another organisation or platform scope',
    );
  }
}

function checkContentCopyPermission(
  actorOrganisationId: string | null,
  sourceOrganisationId: string | null,
) {
  if (sourceOrganisationId === null) {
    return;
  }
  if (sourceOrganisationId !== actorOrganisationId) {
    throw new ContentLifecycleServiceError(
      403,
      'FORBIDDEN',
      'Cannot copy private content belonging to another organisation',
    );
  }
}

function createContentReadOnlyError() {
  return new ContentLifecycleServiceError(
    409,
    'CONTENT_READ_ONLY',
    'Active content cannot be modified directly. Create a copy to edit.',
  );
}

function createInvalidStatusTransitionError() {
  return new ContentLifecycleServiceError(
    409,
    'INVALID_STATUS_TRANSITION',
    'Only draft content can be activated',
  );
}

function createContentNotActiveError() {
  return new ContentLifecycleServiceError(
    409,
    'CONTENT_NOT_ACTIVE',
    'Only active content can be copied',
  );
}

type OwnedContent = {
  organisationId: string | null;
};

type ContentAccess<TContent extends OwnedContent> = {
  contentName: string;
  findById: (id: string) => Promise<TContent | null>;
};

type FoundContent<TFinder extends (...args: never[]) => Promise<unknown>> = NonNullable<
  Awaited<ReturnType<TFinder>>
>;

type TrainingDocumentContent = FoundContent<
  typeof ContentLifecycleRepository.findTrainingDocumentById
>;
type QuizContent = FoundContent<typeof ContentLifecycleRepository.findQuizById>;
type SimulationContent = FoundContent<typeof ContentLifecycleRepository.findSimulationById>;

async function getContentForMutation<TContent extends OwnedContent>(
  actor: UserActorContext,
  id: string,
  organisationId: string | null,
  access: ContentAccess<TContent>,
  operation: 'EDIT' | 'COPY',
): Promise<TContent> {
  await validateActorAccess(actor, organisationId);

  const content = await access.findById(id);
  if (!content) {
    throw new ContentLifecycleServiceError(
      404,
      'CONTENT_NOT_FOUND',
      `${access.contentName} not found`,
    );
  }

  if (operation === 'COPY') {
    checkContentCopyPermission(organisationId, content.organisationId);
  } else {
    checkContentEditPermission(organisationId, content.organisationId);
  }

  return content;
}

async function editDraft<TContent extends OwnedContent, TInput, TResult>(
  actor: UserActorContext,
  id: string,
  organisationId: string | null,
  input: TInput,
  access: ContentAccess<TContent> & {
    isDraft: (content: TContent) => boolean;
    update: (id: string, organisationId: string | null, input: TInput) => Promise<TResult | null>;
  },
): Promise<TResult> {
  const content = await getContentForMutation(actor, id, organisationId, access, 'EDIT');

  if (!access.isDraft(content)) {
    throw createContentReadOnlyError();
  }

  const updated = await access.update(id, organisationId, input);
  if (!updated) {
    throw createContentReadOnlyError();
  }

  return updated;
}

async function activateDraft<TContent extends OwnedContent, TResult>(
  actor: UserActorContext,
  id: string,
  organisationId: string | null,
  access: ContentAccess<TContent> & {
    isDraft: (content: TContent) => boolean;
    validate?: (content: TContent) => void;
    activate: (
      id: string,
      organisationId: string | null,
      content: TContent,
    ) => Promise<TResult | null>;
  },
): Promise<TResult> {
  const content = await getContentForMutation(actor, id, organisationId, access, 'EDIT');

  if (!access.isDraft(content)) {
    throw createInvalidStatusTransitionError();
  }
  if (access.validate !== undefined) {
    access.validate(content);
  }

  const activated = await access.activate(id, organisationId, content);
  if (!activated) {
    throw createInvalidStatusTransitionError();
  }

  return activated;
}

async function copyActive<TContent extends OwnedContent, TResult>(
  actor: UserActorContext,
  id: string,
  targetOrganisationId: string | null,
  access: ContentAccess<TContent> & {
    isActive: (content: TContent) => boolean;
    copy: (
      id: string,
      organisationId: string | null,
      createdByUserId: string,
    ) => Promise<TResult | null>;
  },
): Promise<TResult> {
  const content = await getContentForMutation(actor, id, targetOrganisationId, access, 'COPY');

  if (!access.isActive(content)) {
    throw createContentNotActiveError();
  }

  const copy = await access.copy(id, targetOrganisationId, actor.userId);
  if (!copy) {
    throw createContentNotActiveError();
  }

  return copy;
}

const trainingDocumentAccess = {
  contentName: 'Training document',
  findById: ContentLifecycleRepository.findTrainingDocumentById,
  isDraft: (content: TrainingDocumentContent) => content.status === 'DRAFT',
  isActive: (content: TrainingDocumentContent) => content.status === 'AVAILABLE',
};

const quizAccess = {
  contentName: 'Quiz',
  findById: ContentLifecycleRepository.findQuizById,
  isDraft: (content: QuizContent) => content.status === 'DRAFT',
  isActive: (content: QuizContent) => content.status === 'PUBLISHED',
};

const simulationAccess = {
  contentName: 'Simulation',
  findById: ContentLifecycleRepository.findSimulationById,
  isDraft: (content: SimulationContent) => content.safetyStatus === 'DRAFT',
  isActive: (content: SimulationContent) =>
    content.safetyStatus === 'APPROVED' && content.simulatedInbox?.status === 'ACTIVE',
};

export async function editTrainingDocumentDraft(
  actor: UserActorContext,
  id: string,
  organisationId: string | null,
  input: UpdateTrainingDocumentDraftInput,
): Promise<TrainingDocumentAuthoringResponseDto> {
  const document = await editDraft(actor, id, organisationId, input, {
    ...trainingDocumentAccess,
    update: ContentLifecycleRepository.updateTrainingDocumentDraft,
  });
  return toTrainingDocumentAuthoringResponse(document);
}

export function activateTrainingDocument(
  actor: UserActorContext,
  id: string,
  organisationId: string | null,
) {
  return activateDraft(actor, id, organisationId, {
    ...trainingDocumentAccess,
    validate: validateTrainingDocumentDraft,
    activate: (documentId, ownerOrganisationId, document: TrainingDocumentContent) =>
      ContentLifecycleRepository.activateTrainingDocument(
        documentId,
        ownerOrganisationId,
        document.updatedAt,
      ),
  });
}

function validateTrainingDocumentDraft(document: TrainingDocumentContent) {
  const content = document.rawMarkdown?.trim() ?? document.contentRef?.trim();
  if (
    document.title.trim().length === 0 ||
    document.categories.length === 0 ||
    document.contentType !== 'MARKDOWN' ||
    content === undefined ||
    content.length === 0
  ) {
    throw new ContentLifecycleServiceError(
      422,
      'INVALID_TRAINING_DOCUMENT',
      'A title, category and Markdown content are required before the Training Document can be activated.',
    );
  }
}

export function copyTrainingDocument(
  actor: UserActorContext,
  id: string,
  targetOrganisationId: string | null,
) {
  return copyActive(actor, id, targetOrganisationId, {
    ...trainingDocumentAccess,
    copy: ContentLifecycleRepository.copyTrainingDocument,
  });
}

export function editQuizDraft(
  actor: UserActorContext,
  id: string,
  organisationId: string | null,
  input: UpdateQuizDraftInput,
) {
  return editDraft(actor, id, organisationId, input, {
    ...quizAccess,
    update: ContentLifecycleRepository.updateQuizDraft,
  });
}

export function activateQuiz(actor: UserActorContext, id: string, organisationId: string | null) {
  return activateDraft(actor, id, organisationId, {
    ...quizAccess,
    activate: (quizId, ownerOrganisationid) =>
      ContentLifecycleRepository.activateQuiz(quizId, ownerOrganisationid),
  });
}

export function copyQuiz(actor: UserActorContext, id: string, targetOrganisationId: string | null) {
  return copyActive(actor, id, targetOrganisationId, {
    ...quizAccess,
    copy: ContentLifecycleRepository.copyQuiz,
  });
}

export function editSimulationDraft(
  actor: UserActorContext,
  id: string,
  organisationId: string | null,
  input: UpdateSimulationDraftInput,
) {
  return editDraft(actor, id, organisationId, input, {
    ...simulationAccess,
    update: ContentLifecycleRepository.updateSimulationDraft,
  });
}

export function activateSimulation(
  actor: UserActorContext,
  id: string,
  organisationId: string | null,
) {
  return activateDraft(actor, id, organisationId, {
    ...simulationAccess,
    activate: (sumulationId, ownerOrganisationId) =>
      ContentLifecycleRepository.activateSimulation(sumulationId, ownerOrganisationId),
  });
}

export function copySimulation(
  actor: UserActorContext,
  id: string,
  targetOrganisationId: string | null,
) {
  return copyActive(actor, id, targetOrganisationId, {
    ...simulationAccess,
    copy: ContentLifecycleRepository.copySimulation,
  });
}

async function toTrainingDocumentAuthoringResponse(
  document: TrainingDocumentContent,
): Promise<TrainingDocumentAuthoringResponseDto> {
  const rawMarkdown =
    document.rawMarkdown ?? (await resolveContent(document.contentType, document.contentRef)) ?? '';
  return {
    id: document.id,
    title: document.title,
    contentSummary: document.contentSummary,
    rawMarkdown,
    estimatedReadTimeMinutes: document.estimatedReadTimeMinutes,
    categories: document.categories,
    difficultyLevel: document.difficultyLevel,
    status: document.status,
    contentRef: document.contentRef,
  };
}

export async function createTrainingDocumentDraft(
  actor: UserActorContext,
  organisationId: string | null,
  input: TrainingDocuemtnDraftInputDto,
): Promise<TrainingDocumentAuthoringResponseDto> {
  await validateActorAccess(actor, organisationId);
  const document = await ContentLifecycleRepository.createTrainingDocumentDraft(
    organisationId,
    actor.userId,
    input,
  );
  return toTrainingDocumentAuthoringResponse(document);
}

export async function getTrainingDocumentAuthoring(
  actor: UserActorContext,
  id: string,
  organisationId: string | null,
): Promise<TrainingDocumentAuthoringResponseDto> {
  await validateActorAccess(actor, organisationId);
  const document = await ContentLifecycleRepository.findTrainingDocumentById(id);
  if (
    document === null ||
    (document.organisationId !== organisationId &&
      !(
        organisationId !== null &&
        document.organisationId === null &&
        document.status === 'AVAILABLE'
      ))
  ) {
    throw new ContentLifecycleServiceError(404, 'CONTENT_NOT_FOUND', 'Training document not found');
  }
  return toTrainingDocumentAuthoringResponse(document);
}
export async function activateTrainingDocumentForAuthoring(
  actor: UserActorContext,
  id: string,
  organisationId: string | null,
): Promise<TrainingDocumentAuthoringResponseDto> {
  const document = await activateTrainingDocument(actor, id, organisationId);
  return toTrainingDocumentAuthoringResponse(document);
}
export async function copyTrainingDocumentForAuthoring(
  actor: UserActorContext,
  id: string,
  organisationId: string | null,
): Promise<TrainingDocumentAuthoringResponseDto> {
  const document = await copyTrainingDocument(actor, id, organisationId);
  return toTrainingDocumentAuthoringResponse(document);
}

export async function previewTrainingDocumentMarkdown(
  actor: UserActorContext,
  organisationId: string | null,
  rawMarkdown: string,
) {
  await validateActorAccess(actor, organisationId);
  try {
    return await renderTrainingDocumentMarkdown(rawMarkdown);
  } catch {
    throw new ContentLifecycleServiceError(
      502,
      'MARKDOWN_PREVIEW_UNAVAILABLE',
      'Markdown preview is not available.',
    );
  }
}
