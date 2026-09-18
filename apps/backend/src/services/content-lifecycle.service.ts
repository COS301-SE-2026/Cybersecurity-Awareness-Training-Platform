import {
  quizDraftInputSchema,
  type AdminQuizResponseDto,
  type QuizDraftInput,
  type ListTrainingDocumentsResponseDto,
  type TrainingDocumentAuthoringResponseDto,
  type TrainingDocuemtnDraftInputDto,
} from '@insightful-phish/shared';
import { resolveContent } from './content-resolver.service.js';
import * as ContentLifecycleRepository from '../repositories/content-lifecycle.repository.js';
import type {
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

async function validateActorAccess(
  actor: UserActorContext,
  organisationId: string | null,
  requiredPermission: 'VIEW_CAMPAIGNS' | 'MANAGE_CAMPAIGNS' = 'MANAGE_CAMPAIGNS',
) {
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

  const hasRequiredPermission = adminScope.permissionGrants.some((grant) => {
    const permission = grant.organisationPermission.key;
    if (requiredPermission === 'VIEW_CAMPAIGNS') {
      return permission === 'VIEW_CAMPAIGNS' || permission === 'MANAGE_CAMPAIGNS';
    }
    return permission === 'MANAGE_CAMPAIGNS';
  });
  if (hasRequiredPermission !== true) {
    throw new ContentLifecycleServiceError(
      403,
      'FORBIDDEN',
      `Missing required permission: ${requiredPermission}`,
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

function createContentChangedError() {
  return new ContentLifecycleServiceError(
    409,
    'CONTENT_CHANGED',
    'The content was changed by another administrator. Reload before retrying.',
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
  isActive: (content: TrainingDocumentContent) =>
    content.status === 'AVAILABLE' || content.status === 'ARCHIVED',
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

function toAdminQuizResponse(
  quiz: NonNullable<Awaited<ReturnType<typeof ContentLifecycleRepository.findQuizByIdInScope>>>,
): AdminQuizResponseDto {
  return {
    id: quiz.id,
    organisationId: quiz.organisationId,
    createdByUserId: quiz.createdByUserId,
    title: quiz.title,
    description: quiz.description,
    passThresholdPercentage: quiz.passThresholdPercentage,
    difficultyLevel: quiz.difficultyLevel,
    status: quiz.status,
    createdAt: quiz.createdAt.toISOString(),
    updatedAt: quiz.updatedAt.toISOString(),
    questions: quiz.questions.map((question) => {
      const common = {
        id: question.id,
        prompt: question.prompt,
        position: question.position,
        points: question.points,
        shuffleOptions: question.shuffleOptions,
        categories: question.categories,
        answerOptions: question.answerOptions.map((option) => ({
          id: option.id,
          label: option.label,
          text: option.text,
          position: option.position,
          isCorrect: option.isCorrect,
          feedbackText: option.feedbackText,
        })),
      };

      return question.questionType === 'MULTIPLE_CHOICE'
        ? {
            ...common,
            questionType: 'MULTIPLE_CHOICE' as const,
            minSelections: question.minSelections!,
            maxSelections: question.maxSelections!,
          }
        : {
            ...common,
            questionType: 'SINGLE_CHOICE' as const,
          };
    }),
  };
}

function validatedQuizForActivation(quiz: QuizContent): void {
  const adminQuiz = toAdminQuizResponse(quiz);
  const validation = quizDraftInputSchema.safeParse({
    title: adminQuiz.title,
    description: adminQuiz.description,
    passThresholdPercentage: adminQuiz.passThresholdPercentage,
    difficultyLevel: adminQuiz.difficultyLevel,
    questions: adminQuiz.questions,
  });

  if (!validation.success) {
    throw new ContentLifecycleServiceError(
      422,
      'QUIZ_ACTIVATION_INVALID',
      'The persisted Quiz is not structurally valid for activation.',
    );
  }

  if (validation.data.questions.length === 0) {
    throw new ContentLifecycleServiceError(
      422,
      'QUIZ_ACTIVATION_INVALID',
      'A Quiz must contain at least one question before activation.',
    );
  }
}

function assertCreateInputHasNoPersistedIds(input: QuizDraftInput): void {
  const constainsPersistedId = input.questions.some(
    (question) =>
      question.id !== undefined || question.answerOptions.some((option) => option.id !== undefined),
  );

  if (constainsPersistedId) {
    throw new ContentLifecycleServiceError(
      422,
      'PERSISTED_IDS_NOT_ALLOWED',
      'Question and answer-option IDs must be omitted when creating a Quiz.',
    );
  }
}

export async function createQuizDraft(
  actor: UserActorContext,
  organisationId: string | null,
  input: QuizDraftInput,
): Promise<AdminQuizResponseDto> {
  await validateActorAccess(actor, organisationId);
  assertCreateInputHasNoPersistedIds(input);

  const quiz = await ContentLifecycleRepository.createQuizDraft(
    organisationId,
    actor.userId,
    input,
  );
  return toAdminQuizResponse(quiz);
}

export async function getQuizForAuthoring(
  actor: UserActorContext,
  id: string,
  organisationId: string | null,
): Promise<AdminQuizResponseDto> {
  await validateActorAccess(actor, organisationId);
  const quiz = await ContentLifecycleRepository.findQuizByIdInScope(id, organisationId);

  if (!quiz) {
    throw new ContentLifecycleServiceError(404, 'CONTENT_NOT_FOUND', 'Quiz not found');
  }

  return toAdminQuizResponse(quiz);
}

export async function editQuizDraft(
  actor: UserActorContext,
  id: string,
  organisationId: string | null,
  input: QuizDraftInput,
): Promise<AdminQuizResponseDto> {
  await validateActorAccess(actor, organisationId);
  const quiz = await ContentLifecycleRepository.findQuizByIdInScope(id, organisationId);

  if (!quiz) {
    throw new ContentLifecycleServiceError(404, 'CONTENT_NOT_FOUND', 'Quiz not found');
  }

  if (quiz.status !== 'DRAFT') {
    throw createContentReadOnlyError();
  }

  try {
    const updated = await ContentLifecycleRepository.updateQuizDraft(id, organisationId, input);
    if (!updated) {
      throw createContentReadOnlyError();
    }
    return toAdminQuizResponse(updated);
  } catch (error) {
    if (error instanceof ContentLifecycleRepository.QuizDraftPersistenceError) {
      if (error.code === 'QUIZ_HAS_ATTEMPTS') {
        throw new ContentLifecycleServiceError(
          409,
          'QUIZ_HAS_ATTEMPTS',
          'A Quiz with attempt history cannot be structurally edited.',
        );
      }

      throw new ContentLifecycleServiceError(
        422,
        error.code,
        'One or more persisted question or answer-option IDs are invalid.',
      );
    }
    throw error;
  }
}

export async function activateQuiz(
  actor: UserActorContext,
  id: string,
  organisationId: string | null,
): Promise<AdminQuizResponseDto> {
  await validateActorAccess(actor, organisationId);

  const activated = await ContentLifecycleRepository.activateQuiz(
    id,
    organisationId,
    validatedQuizForActivation,
  );

  if (!activated) {
    const existing = await ContentLifecycleRepository.findQuizByIdInScope(id, organisationId);
    if (!existing) {
      throw new ContentLifecycleServiceError(404, 'CONTENT_NOT_FOUND', 'Quiz not found');
    }

    if (existing.status !== 'DRAFT') {
      throw createInvalidStatusTransitionError();
    }

    throw createContentChangedError();
  }

  return toAdminQuizResponse(activated);
}

export async function copyQuiz(
  actor: UserActorContext,
  id: string,
  targetOrganisationId: string | null,
): Promise<AdminQuizResponseDto> {
  await validateActorAccess(actor, targetOrganisationId);

  const source = await ContentLifecycleRepository.findQuizCopySourceById(id, targetOrganisationId);
  if (!source) {
    throw new ContentLifecycleServiceError(404, 'CONTENT_NOT_FOUND', 'Quiz not found');
  }

  if (source.status !== 'PUBLISHED') {
    throw createContentNotActiveError();
  }

  const copy = await ContentLifecycleRepository.copyQuiz(id, targetOrganisationId, actor.userId);
  if (!copy) {
    throw createContentNotActiveError();
  }

  return toAdminQuizResponse(copy);
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
  await validateActorAccess(actor, organisationId, 'VIEW_CAMPAIGNS');
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

export async function listTrainingDocumentsForAuthoring(
  actor: UserActorContext,
  organisationId: string | null,
): Promise<ListTrainingDocumentsResponseDto> {
  await validateActorAccess(actor, organisationId, 'VIEW_CAMPAIGNS');
  const documents = await ContentLifecycleRepository.findTrainingDocuments(organisationId);

  return {
    items: documents.map((document) => ({
      ...document,
      updatedAt: document.updatedAt.toISOString(),
    })),
    totalItems: documents.length,
  };
}

export async function activateTrainingDocumentForAuthoring(
  actor: UserActorContext,
  id: string,
  organisationId: string | null,
): Promise<TrainingDocumentAuthoringResponseDto> {
  const document = await activateTrainingDocument(actor, id, organisationId);
  return toTrainingDocumentAuthoringResponse(document);
}

export async function archiveTrainingDocumentForAuthoring(
  actor: UserActorContext,
  id: string,
  organisationId: string | null,
): Promise<TrainingDocumentAuthoringResponseDto> {
  const document = await getContentForMutation(
    actor,
    id,
    organisationId,
    trainingDocumentAccess,
    'EDIT',
  );
  if (document.status === 'ARCHIVED') {
    throw new ContentLifecycleServiceError(
      409,
      'INVALID_STATUS_TRANSITION',
      'The Training Document is already archived',
    );
  }

  const archived = await ContentLifecycleRepository.archiveTrainingDocument(id, organisationId);
  if (archived === null) {
    throw new ContentLifecycleServiceError(
      409,
      'INVALID_STATUS_TRANSITION',
      'The Training Document could not be archived',
    );
  }
  return toTrainingDocumentAuthoringResponse(archived);
}

export async function unarchiveTrainingDocumentForAuthoring(
  actor: UserActorContext,
  id: string,
  organisationId: string | null,
): Promise<TrainingDocumentAuthoringResponseDto> {
  const document = await getContentForMutation(
    actor,
    id,
    organisationId,
    trainingDocumentAccess,
    'EDIT',
  );
  if (document.status !== 'ARCHIVED') {
    throw new ContentLifecycleServiceError(
      409,
      'INVALID_STATUS_TRANSITION',
      'Only archived Training Documents can be restored',
    );
  }

  const restored = await ContentLifecycleRepository.unarchiveTrainingDocument(id, organisationId);
  if (restored === null) {
    throw new ContentLifecycleServiceError(
      409,
      'INVALID_STATUS_TRANSITION',
      'The Training Document could not be restored',
    );
  }
  return toTrainingDocumentAuthoringResponse(restored);
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
  await validateActorAccess(actor, organisationId, 'VIEW_CAMPAIGNS');
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
