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
import {
  listPlatformAdmins as listAdminsService,
  invitePlatformAdmin as inviteAdminService,
  resendPlatformAdminInvite as resendInviteService,
  transferSuperAdmin as transferSuperAdminService,
  demotePlatformAdmin as demoteAdminService,
  PlatformAdminServiceError,
} from '../services/platform-admin.service.js';

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

// List platform admins with row action eligibilty
export async function listPlatformAdmins(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  try {
    const result = await listAdminsService(actorUserId);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof PlatformAdminServiceError) {
      return res.status(error.statusCode).json({ error: error.error, message: error.message });
    }
    return handleControllerError(error, res);
  }
}

// Invite new platform admin or triger trainee role upgrade
export async function invitePlatformAdmin(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  try {
    const result = await inviteAdminService(actorUserId, req.body);
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof PlatformAdminServiceError) {
      return res.status(error.statusCode).json({ error: error.error, message: error.message });
    }
    return handleControllerError(error, res);
  }
}

// Resend platform admin invite token
export async function resendPlatformAdminInvite(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  try {
    const result = await resendInviteService(actorUserId, requiredParam(req, 'id'));
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof PlatformAdminServiceError) {
      return res.status(error.statusCode).json({ error: error.error, message: error.message });
    }
    return handleControllerError(error, res);
  }
}

// Transfer super admin role transactionaly
export async function transferSuperAdmin(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  try {
    const result = await transferSuperAdminService(actorUserId, req.body);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof PlatformAdminServiceError) {
      return res.status(error.statusCode).json({ error: error.error, message: error.message });
    }
    return handleControllerError(error, res);
  }
}

// Demote normal platform admin and revoke user sesions
export async function demotePlatformAdmin(req: Request, res: Response) {
  const actorUserId = requireActorUserId(req, res);
  if (!actorUserId) return;

  try {
    const result = await demoteAdminService(actorUserId, requiredParam(req, 'userId'), req.body);
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof PlatformAdminServiceError) {
      return res.status(error.statusCode).json({ error: error.error, message: error.message });
    }
    return handleControllerError(error, res);
  }
}
