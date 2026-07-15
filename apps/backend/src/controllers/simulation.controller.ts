import type { Request, Response } from 'express';
import { simulationService } from '../services/simulation.service.js';

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
      const msg = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
      const status =
        msg === 'NOT_FOUND'
          ? 404
          : msg === 'FORBIDDEN'
            ? 403
            : msg === 'ALREADY_CLASSIFIED'
              ? 409
              : msg === 'VALIDATION_ERROR'
                ? 400
                : 500;
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
