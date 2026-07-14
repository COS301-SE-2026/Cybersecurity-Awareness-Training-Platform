import type { Request, Response } from 'express';
import {
  listOrganisationRequests as listRequestsService,
  getOrganisationRequest as getRequestService,
  markRequestContacted as contactedRequestService,
  approveOrganisationRequest as approveRequestService,
  rejectOrganisationRequest as rejectRequestService,
  deleteOrganisationRequest as deleteRequestService,
} from '../services/organisation-registration-request.service.js';
import { requireActorUserId, handleControllerError, requiredParam } from './controller.helpers.js';

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
