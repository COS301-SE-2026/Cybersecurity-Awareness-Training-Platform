import type { Request, Response } from 'express';
import {
  listOrganisationRequests as listRequestsService,
  getOrganisationRequest as getRequestService,
  markRequestContacted as contactedRequestService,
  approveOrganisationRequest as approveRequestService,
  rejectOrganisationRequest as rejectRequestService,
  deleteOrganisationRequest as deleteRequestService,
  getPlatformOrganisationDetail as getOrganisationDetailService,
  getOrganisationRequestDetails as getRequestDetailsService,
  resendInitialAdminSetup as resendSetupService,
  OrganisationRegistrationRequestError,
} from '../services/organisation-registration-request.service.js';

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

function handleControllerError(error: unknown, res: Response) {
  if (error instanceof OrganisationRegistrationRequestError) {
    return res.status(error.statusCode).json({
      error: error.error,
      message: error.message,
    });
  }
  throw error;
}

function requiredParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string') {
    throw new OrganisationRegistrationRequestError(
      404,
      'ROUTE_PARAM_MISSING',
      'Route parameter is missing',
    );
  }
  return value;
}

export async function listOrganisationRequests(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  try {
    const result = await listRequestsService(
      actorUserId,
      req.query as unknown as {
        page: number;
        limit: number;
        sort?: string;
        status?: 'CANCELLED' | 'APPROVED' | 'PENDING_REVIEW' | 'CONTACTED' | 'REJECTED';
        search?: string;
      },
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
}

export async function getOrganisationRequest(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  try {
    const result = await getRequestService(actorUserId, requiredParam(req, 'requestId'));
    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
}

export async function markRequestContacted(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  try {
    const result = await contactedRequestService(actorUserId, requiredParam(req, 'requestId'));
    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
}

export async function approveOrganisationRequest(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  try {
    const result = await approveRequestService(
      actorUserId,
      requiredParam(req, 'requestId'),
      req.body,
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
}

export async function rejectOrganisationRequest(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  try {
    const result = await rejectRequestService(
      actorUserId,
      requiredParam(req, 'requestId'),
      req.body,
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
}

export async function deleteOrganisationRequest(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  try {
    const result = await deleteRequestService(actorUserId, requiredParam(req, 'requestId'));
    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
}

export async function getPlatformOrganisationDetail(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  try {
    const result = await getOrganisationDetailService(
      actorUserId,
      requiredParam(req, 'organisationId'),
    );
    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
}

export async function getOrganisationRequestDetails(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  try {
    const result = await getRequestDetailsService(actorUserId, requiredParam(req, 'requestId'));
    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
}

export async function resendInitialAdminSetup(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  try {
    const result = await resendSetupService(actorUserId, requiredParam(req, 'organisationId'));
    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(error, res);
  }
}
