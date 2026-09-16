import type { Request, Response } from 'express';
import * as PhishingSimulationService from '../services/phishing-simulation.service.js';

function requireActorUserId(req: Request): string {
  const actorUserId = req.auth?.userId;
  if (actorUserId === undefined) {
    throw new PhishingSimulationService.PhishingSimulationServiceError(
      401,
      'AUTH_REQUIRED',
      'Authentication credentials are required',
    );
  }
  return actorUserId;
}
export async function createPhishingSimulationDraftHandler(req: Request, res: Response) {
  const simulation = await PhishingSimulationService.createPhishingSimulationDraft(
    requireActorUserId(req),
    String(req.params.organisationId),
    String(req.params.campaignId),
    req.body,
  );
  return res.status(201).json(simulation);
}
export async function listPhishingSimulationDraftsHandler(req: Request, res: Response) {
  const simulations = await PhishingSimulationService.listPhishingSimulationDrafts(
    requireActorUserId(req),
    String(req.params.organisationId),
    String(req.params.campaignId),
  );
  return res.status(200).json(simulations);
}
export async function getPhishingSimulationDraftHandler(req: Request, res: Response) {
  const simulation = await PhishingSimulationService.getPhishingSimulationDraft(
    requireActorUserId(req),
    String(req.params.organisationId),
    String(req.params.campaignId),
    String(req.params.simulationId),
  );
  return res.status(200).json(simulation);
}
export async function updatePhishingSimulationDraftHandler(req: Request, res: Response) {
  const simulation = await PhishingSimulationService.updatePhishingSimulationDraft(
    requireActorUserId(req),
    String(req.params.organisationId),
    String(req.params.campaignId),
    String(req.params.simulationId),
    req.body,
  );
  return res.status(200).json(simulation);
}
