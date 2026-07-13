import type { Request, Response } from 'express';
import {
  getPlatformOrganisationDetail as getOrganisationDetailService,
  getOrganisationRequestDetails as getRequestDetailsService,
  resendInitialAdminSetup as resendSetupService,
} from '../services/platformOrganisation.service.js';
import { requireActorUserId, handleControllerError, requiredParam } from './controller.helpers.js';

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
