import type { AdminQuizResponseDto, QuizDraftInput } from '@insightful-phish/shared';
import * as ContentLifecycleRepository from '../repositories/content-lifecycle.repository.js';
import type {
  UpdateSimulationDraftInput,
  UpdateTrainingDocumentDraftInput,
} from '../repositories/content-lifecycle.repository.js';
import * as OrganisationScopeRepository from '../repositories/organisation-scope.repository.js';

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
    activate: (id: string, organisationId: string | null) => Promise<TResult | null>;
  },
): Promise<TResult> {
  const content = await getContentForMutation(actor, id, organisationId, access, 'EDIT');

  if (!access.isDraft(content)) {
    throw createInvalidStatusTransitionError();
  }

  const activated = await access.activate(id, organisationId);
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

export function editTrainingDocumentDraft(
  actor: UserActorContext,
  id: string,
  organisationId: string | null,
  input: UpdateTrainingDocumentDraftInput,
) {
  return editDraft(actor, id, organisationId, input, {
    ...trainingDocumentAccess,
    update: ContentLifecycleRepository.updateTrainingDocumentDraft,
  });
}

export function activateTrainingDocument(
  actor: UserActorContext,
  id: string,
  organisationId: string | null,
) {
  return activateDraft(actor, id, organisationId, {
    ...trainingDocumentAccess,
    activate: ContentLifecycleRepository.activateTrainingDocument,
  });
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

export function activateQuiz(actor: UserActorContext, id: string, organisationId: string | null) {
  return activateDraft(actor, id, organisationId, {
    ...quizAccess,
    activate: ContentLifecycleRepository.activateQuiz,
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
    activate: ContentLifecycleRepository.activateSimulation,
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
