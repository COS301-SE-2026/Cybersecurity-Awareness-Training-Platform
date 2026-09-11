import * as ContentLifecycleRepository from '../repositories/content-lifecycle.repository.js';
import type {
  UpdateQuizDraftInput,
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

export async function editTrainingDocumentDraft(
  actor: UserActorContext,
  id: string,
  actorOrganisationId: string | null,
  input: UpdateTrainingDocumentDraftInput,
) {
  await validateActorAccess(actor, actorOrganisationId);

  const doc = await ContentLifecycleRepository.findTrainingDocumentById(id);
  if (!doc) {
    throw new ContentLifecycleServiceError(404, 'CONTENT_NOT_FOUND', 'Training document not found');
  }

  checkContentEditPermission(actorOrganisationId, doc.organisationId);

  if (doc.status !== 'DRAFT') {
    throw createContentReadOnlyError();
  }

  const updated = await ContentLifecycleRepository.updateTrainingDocumentDraft(
    id,
    actorOrganisationId,
    input,
  );
  if (!updated) {
    throw createContentReadOnlyError();
  }
  return updated;
}

export async function activateTrainingDocument(
  actor: UserActorContext,
  id: string,
  actorOrganisationId: string | null,
) {
  await validateActorAccess(actor, actorOrganisationId);

  const doc = await ContentLifecycleRepository.findTrainingDocumentById(id);
  if (!doc) {
    throw new ContentLifecycleServiceError(404, 'CONTENT_NOT_FOUND', 'Training document not found');
  }

  checkContentEditPermission(actorOrganisationId, doc.organisationId);

  if (doc.status !== 'DRAFT') {
    throw createInvalidStatusTransitionError();
  }

  const activated = await ContentLifecycleRepository.activateTrainingDocument(
    id,
    actorOrganisationId,
  );
  if (!activated) {
    throw createInvalidStatusTransitionError();
  }
  return activated;
}

export async function copyTrainingDocument(
  actor: UserActorContext,
  id: string,
  targetOrganisationId: string | null,
) {
  await validateActorAccess(actor, targetOrganisationId);

  const doc = await ContentLifecycleRepository.findTrainingDocumentById(id);
  if (!doc) {
    throw new ContentLifecycleServiceError(404, 'CONTENT_NOT_FOUND', 'Training document not found');
  }

  checkContentCopyPermission(targetOrganisationId, doc.organisationId);

  if (doc.status !== 'AVAILABLE') {
    throw createContentNotActiveError();
  }

  const copy = await ContentLifecycleRepository.copyTrainingDocument(
    id,
    targetOrganisationId,
    actor.userId,
  );
  if (!copy) {
    throw createContentNotActiveError();
  }
  return copy;
}

export async function editQuizDraft(
  actor: UserActorContext,
  id: string,
  actorOrganisationId: string | null,
  input: UpdateQuizDraftInput,
) {
  await validateActorAccess(actor, actorOrganisationId);

  const quiz = await ContentLifecycleRepository.findQuizById(id);
  if (!quiz) {
    throw new ContentLifecycleServiceError(404, 'CONTENT_NOT_FOUND', 'Quiz not found');
  }

  checkContentEditPermission(actorOrganisationId, quiz.organisationId);

  if (quiz.status !== 'DRAFT') {
    throw createContentReadOnlyError();
  }

  const updated = await ContentLifecycleRepository.updateQuizDraft(id, actorOrganisationId, input);
  if (!updated) {
    throw createContentReadOnlyError();
  }
  return updated;
}

export async function activateQuiz(
  actor: UserActorContext,
  id: string,
  actorOrganisationId: string | null,
) {
  await validateActorAccess(actor, actorOrganisationId);

  const quiz = await ContentLifecycleRepository.findQuizById(id);
  if (!quiz) {
    throw new ContentLifecycleServiceError(404, 'CONTENT_NOT_FOUND', 'Quiz not found');
  }

  checkContentEditPermission(actorOrganisationId, quiz.organisationId);

  if (quiz.status !== 'DRAFT') {
    throw createInvalidStatusTransitionError();
  }

  const activated = await ContentLifecycleRepository.activateQuiz(id, actorOrganisationId);
  if (!activated) {
    throw createInvalidStatusTransitionError();
  }
  return activated;
}

export async function copyQuiz(
  actor: UserActorContext,
  id: string,
  targetOrganisationId: string | null,
) {
  await validateActorAccess(actor, targetOrganisationId);

  const quiz = await ContentLifecycleRepository.findQuizById(id);
  if (!quiz) {
    throw new ContentLifecycleServiceError(404, 'CONTENT_NOT_FOUND', 'Quiz not found');
  }

  checkContentCopyPermission(targetOrganisationId, quiz.organisationId);

  if (quiz.status !== 'PUBLISHED') {
    throw createContentNotActiveError();
  }

  const copy = await ContentLifecycleRepository.copyQuiz(id, targetOrganisationId, actor.userId);
  if (!copy) {
    throw createContentNotActiveError();
  }
  return copy;
}

export async function editSimulationDraft(
  actor: UserActorContext,
  id: string,
  actorOrganisationId: string | null,
  input: UpdateSimulationDraftInput,
) {
  await validateActorAccess(actor, actorOrganisationId);

  const simulation = await ContentLifecycleRepository.findSimulationById(id);
  if (!simulation) {
    throw new ContentLifecycleServiceError(404, 'CONTENT_NOT_FOUND', 'Simulation not found');
  }

  checkContentEditPermission(actorOrganisationId, simulation.organisationId);

  if (simulation.safetyStatus !== 'DRAFT') {
    throw createContentReadOnlyError();
  }

  const updated = await ContentLifecycleRepository.updateSimulationDraft(
    id,
    actorOrganisationId,
    input,
  );
  if (!updated) {
    throw createContentReadOnlyError();
  }
  return updated;
}

export async function activateSimulation(
  actor: UserActorContext,
  id: string,
  actorOrganisationId: string | null,
) {
  await validateActorAccess(actor, actorOrganisationId);

  const simulation = await ContentLifecycleRepository.findSimulationById(id);
  if (!simulation) {
    throw new ContentLifecycleServiceError(404, 'CONTENT_NOT_FOUND', 'Simulation not found');
  }

  checkContentEditPermission(actorOrganisationId, simulation.organisationId);

  if (simulation.safetyStatus !== 'DRAFT') {
    throw createInvalidStatusTransitionError();
  }

  const activated = await ContentLifecycleRepository.activateSimulation(id, actorOrganisationId);
  if (!activated) {
    throw createInvalidStatusTransitionError();
  }
  return activated;
}

export async function copySimulation(
  actor: UserActorContext,
  id: string,
  targetOrganisationId: string | null,
) {
  await validateActorAccess(actor, targetOrganisationId);

  const simulation = await ContentLifecycleRepository.findSimulationById(id);
  if (!simulation) {
    throw new ContentLifecycleServiceError(404, 'CONTENT_NOT_FOUND', 'Simulation not found');
  }

  checkContentCopyPermission(targetOrganisationId, simulation.organisationId);

  if (simulation.safetyStatus !== 'APPROVED' || simulation.simulatedInbox?.status !== 'ACTIVE') {
    throw createContentNotActiveError();
  }

  const copy = await ContentLifecycleRepository.copySimulation(
    id,
    targetOrganisationId,
    actor.userId,
  );
  if (!copy) {
    throw createContentNotActiveError();
  }
  return copy;
}
