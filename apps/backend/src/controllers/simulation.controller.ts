import type { Request, Response } from 'express';
import { simulationService } from '../services/simulation.service.js';
import { CampaignEligibilityDenialError } from '../services/campaign-eligibility.service.js';

function getSimulationErrorStatus(msg: string): number {
  switch (msg) {
    case 'NOT_FOUND':
      return 404;
    case 'FORBIDDEN':
      return 403;
    case 'ALREADY_CLASSIFIED':
    case 'CAMPAIGN_NOT_STARTED':
    case 'CAMPAIGN_EXPIRED':
    case 'CAMPAIGN_ARCHIVED':
      return 409;
    case 'VALIDATION_ERROR':
      return 400;
    default:
      return 500;
  }
}

export class SimulationController {
  private handleTraineeRequest = async (
    req: Request,
    res: Response,
    handler: (traineeProfileId: string) => Promise<unknown>,
  ) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });

    try {
      const traineeProfile = await simulationService.getTraineeProfile(userId);
      if (!traineeProfile) return res.status(403).json({ error: 'FORBIDDEN' });

      const response = await handler(traineeProfile.id);
      return res.json(response);
    } catch (error: unknown) {
      if (error instanceof CampaignEligibilityDenialError) {
        return res.status(409).json({
          error: error.errorCode,
          message: error.message,
        });
      }

      const msg = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
      const status = getSimulationErrorStatus(msg);
      return res.status(status).json({ error: msg });
    }
  };

  getSimulatedInbox = async (req: Request, res: Response) => {
    return this.handleTraineeRequest(req, res, (id) =>
      simulationService.getSimulatedInbox(req.params.campaignItemId as string, id),
    );
  };

  getSimulatedEmail = async (req: Request, res: Response) => {
    return this.handleTraineeRequest(req, res, (id) =>
      simulationService.getSimulatedEmail(
        req.params.emailId as string,
        req.params.campaignItemId as string,
        id,
      ),
    );
  };

  recordInteraction = async (req: Request, res: Response) => {
    return this.handleTraineeRequest(req, res, (id) =>
      simulationService.recordInteraction(
        req.params.emailId as string,
        req.params.campaignItemId as string,
        id,
        req.body,
      ),
    );
  };

  classifyEmail = async (req: Request, res: Response) => {
    return this.handleTraineeRequest(req, res, (id) =>
      simulationService.classifyEmail(
        req.params.emailId as string,
        req.params.campaignItemId as string,
        id,
        req.body,
      ),
    );
  };
}
