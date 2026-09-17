import type {
  AddLibraryEmailToSimulatedInboxRequest,
  CreateSimulatedInboxDraftRequest,
  ListSimulatedInboxesQuery,
  OrganisationEmailDraftInput,
  ReorderSimulatedInboxEmailsRequest,
  UpdateSimulatedInboxDraftRequest,
} from '@insightful-phish/shared';
import type { Request, Response } from 'express';
import {
  OrganisationScopeServiceError,
  SimulatedInboxManagementServiceError,
  activateSimulatedInbox,
  addAuthoredEmailToSimulatedInbox,
  addLibraryEmailToSimulatedInbox,
  copySimulatedInbox,
  createSimulatedInboxDraft,
  getSimulatedInbox,
  listSimulatedInboxes,
  removeSimulatedInboxEmail,
  reorderSimulatedInboxEmails,
  updateSimulatedInboxDraft,
  updateSimulatedInboxEmail,
} from '../services/simulated-inbox-management.service.js';

function requireActorUserId(req: Request, res: Response): string | null {
  if (!req.auth?.userId) {
    res.status(401).json({
      error: 'AUTH_REQUIRED',
      message: 'Authentication credentials are required',
    });
    return null;
  }
  return req.auth.userId;
}

function requiredParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string') {
    throw new SimulatedInboxManagementServiceError(
      404,
      'ROUTE_PARAM_MISSING',
      'Route parameter is missing',
    );
  }
  return value;
}

function handleError(error: unknown, res: Response) {
  if (error instanceof SimulatedInboxManagementServiceError) {
    return res.status(error.statusCode).json({
      error: error.error,
      message: error.message,
      ...(error.issues.length > 0 ? { details: error.issues } : {}),
    });
  }
  if (error instanceof OrganisationScopeServiceError) {
    return res.status(error.statusCode).json({ error: error.error, message: error.message });
  }
  throw error;
}

export async function listSimulatedInboxesController(req: Request, res: Response) {
  const userId = requireActorUserId(req, res);
  if (!userId) return;
  try {
    return res
      .status(200)
      .json(
        await listSimulatedInboxes(
          userId,
          requiredParam(req, 'organisationId'),
          req.query as unknown as ListSimulatedInboxesQuery,
        ),
      );
  } catch (error) {
    return handleError(error, res);
  }
}

export async function createSimulatedInboxController(req: Request, res: Response) {
  const userId = requireActorUserId(req, res);
  if (!userId) return;
  try {
    return res
      .status(201)
      .json(
        await createSimulatedInboxDraft(
          userId,
          requiredParam(req, 'organisationId'),
          req.body as CreateSimulatedInboxDraftRequest,
        ),
      );
  } catch (error) {
    return handleError(error, res);
  }
}

export async function getSimulatedInboxController(req: Request, res: Response) {
  const userId = requireActorUserId(req, res);
  if (!userId) return;
  try {
    return res
      .status(200)
      .json(
        await getSimulatedInbox(
          userId,
          requiredParam(req, 'organisationId'),
          requiredParam(req, 'simulationId'),
        ),
      );
  } catch (error) {
    return handleError(error, res);
  }
}

export async function updateSimulatedInboxController(req: Request, res: Response) {
  const userId = requireActorUserId(req, res);
  if (!userId) return;
  try {
    return res
      .status(200)
      .json(
        await updateSimulatedInboxDraft(
          userId,
          requiredParam(req, 'organisationId'),
          requiredParam(req, 'simulationId'),
          req.body as UpdateSimulatedInboxDraftRequest,
        ),
      );
  } catch (error) {
    return handleError(error, res);
  }
}

export async function addAuthoredEmailController(req: Request, res: Response) {
  const userId = requireActorUserId(req, res);
  if (!userId) return;
  try {
    return res
      .status(201)
      .json(
        await addAuthoredEmailToSimulatedInbox(
          userId,
          requiredParam(req, 'organisationId'),
          requiredParam(req, 'simulationId'),
          req.body as OrganisationEmailDraftInput,
        ),
      );
  } catch (error) {
    return handleError(error, res);
  }
}

export async function addLibraryEmailController(req: Request, res: Response) {
  const userId = requireActorUserId(req, res);
  if (!userId) return;
  try {
    return res
      .status(201)
      .json(
        await addLibraryEmailToSimulatedInbox(
          userId,
          requiredParam(req, 'organisationId'),
          requiredParam(req, 'simulationId'),
          req.body as AddLibraryEmailToSimulatedInboxRequest,
        ),
      );
  } catch (error) {
    return handleError(error, res);
  }
}

export async function updateSimulatedInboxEmailController(req: Request, res: Response) {
  const userId = requireActorUserId(req, res);
  if (!userId) return;
  try {
    return res
      .status(200)
      .json(
        await updateSimulatedInboxEmail(
          userId,
          requiredParam(req, 'organisationId'),
          requiredParam(req, 'simulationId'),
          requiredParam(req, 'emailId'),
          req.body as OrganisationEmailDraftInput,
        ),
      );
  } catch (error) {
    return handleError(error, res);
  }
}

export async function removeSimulatedInboxEmailController(req: Request, res: Response) {
  const userId = requireActorUserId(req, res);
  if (!userId) return;
  try {
    await removeSimulatedInboxEmail(
      userId,
      requiredParam(req, 'organisationId'),
      requiredParam(req, 'simulationId'),
      requiredParam(req, 'emailId'),
    );
    return res.status(204).send();
  } catch (error) {
    return handleError(error, res);
  }
}

export async function reorderSimulatedInboxEmailsController(req: Request, res: Response) {
  const userId = requireActorUserId(req, res);
  if (!userId) return;
  try {
    return res
      .status(200)
      .json(
        await reorderSimulatedInboxEmails(
          userId,
          requiredParam(req, 'organisationId'),
          requiredParam(req, 'simulationId'),
          req.body as ReorderSimulatedInboxEmailsRequest,
        ),
      );
  } catch (error) {
    return handleError(error, res);
  }
}

export async function activateSimulatedInboxController(req: Request, res: Response) {
  const userId = requireActorUserId(req, res);
  if (!userId) return;
  try {
    return res
      .status(200)
      .json(
        await activateSimulatedInbox(
          userId,
          requiredParam(req, 'organisationId'),
          requiredParam(req, 'simulationId'),
        ),
      );
  } catch (error) {
    return handleError(error, res);
  }
}

export async function copySimulatedInboxController(req: Request, res: Response) {
  const userId = requireActorUserId(req, res);
  if (!userId) return;
  try {
    return res
      .status(201)
      .json(
        await copySimulatedInbox(
          userId,
          requiredParam(req, 'organisationId'),
          requiredParam(req, 'simulationId'),
        ),
      );
  } catch (error) {
    return handleError(error, res);
  }
}
