import type { Request, Response } from 'express';

function notImplemented(res: Response) {
  return res.status(501).json({
    error: 'NOT_IMPLEMENTED',
    message: 'Organisation admin management endpoint is not implemented yet',
  });
}

export function listOrganisationAdmins(_req: Request, res: Response) {
  return notImplemented(res);
}

export function promoteOrganisationAdmin(_req: Request, res: Response) {
  return notImplemented(res);
}

export function updateOrganisationAdminPermissions(_req: Request, res: Response) {
  return notImplemented(res);
}

export function removeOrganisationAdmin(_req: Request, res: Response) {
  return notImplemented(res);
}
