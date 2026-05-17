import type { Request, Response } from 'express';
import { simulationService } from '../services/simulation.service.js';

export class SimulationController {
  private handleTraineeRequest = async (
    req: Request,
    res: Response,
    handler: (traineeProfileId: string) => Promise<any>,
  ) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ error: 'UNAUTHORIZED' });

    try {
      const traineeProfile = await simulationService.getTraineeProfile(userId);
      if (!traineeProfile) return res.status(403).json({ error: 'FORBIDDEN' });

      const response = await handler(traineeProfile.id);
      return res.json(response);
    } catch (error: any) {
      const status =
        error.message === 'NOT_FOUND'
          ? 404
          : error.message === 'FORBIDDEN'
            ? 403
            : error.message === 'ALREADY_CLASSIFIED'
              ? 409
              : error.message === 'VALIDATION_ERROR'
                ? 400
                : 500;
      return res.status(status).json({ error: error.message });
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
