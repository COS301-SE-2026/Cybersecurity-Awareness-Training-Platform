import type { Request, Response } from 'express';
import { simulationService } from '../services/simulation.service.js';

export class SimulationController {
  async getSimulatedInbox(req: Request, res: Response) {
    const { campaignItemId } = req.params;
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    try {
      const traineeProfile = await simulationService.getTraineeProfile(userId);
      if (!traineeProfile) {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Trainee profile not found' });
      }

      const response = await simulationService.getSimulatedInbox(campaignItemId, traineeProfile.id);
      return res.json(response);
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Simulated inbox not found' });
      }
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'You are not assigned to this campaign' });
      }
      return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
  }

  async getSimulatedEmail(req: Request, res: Response) {
    const { emailId } = req.params;
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    try {
      const traineeProfile = await simulationService.getTraineeProfile(userId);
      if (!traineeProfile) {
        return res.status(403).json({ error: 'FORBIDDEN' });
      }

      const response = await simulationService.getSimulatedEmail(emailId, traineeProfile.id);
      return res.json(response);
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return res.status(404).json({ error: 'NOT_FOUND', message: 'Email not found' });
      }
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied' });
      }
      return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
  }

  async recordInteraction(req: Request, res: Response) {
    const { emailId } = req.params;
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    try {
      const traineeProfile = await simulationService.getTraineeProfile(userId);
      if (!traineeProfile) {
        return res.status(403).json({ error: 'FORBIDDEN' });
      }

      const response = await simulationService.recordInteraction(emailId, traineeProfile.id, req.body);
      return res.json(response);
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return res.status(404).json({ error: 'NOT_FOUND' });
      }
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'FORBIDDEN' });
      }
      return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
  }

  async classifyEmail(req: Request, res: Response) {
    const { emailId } = req.params;
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    try {
      const traineeProfile = await simulationService.getTraineeProfile(userId);
      if (!traineeProfile) {
        return res.status(403).json({ error: 'FORBIDDEN' });
      }

      const response = await simulationService.classifyEmail(emailId, traineeProfile.id, req.body);
      return res.json(response);
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        return res.status(404).json({ error: 'NOT_FOUND' });
      }
      if (error.message === 'FORBIDDEN') {
        return res.status(403).json({ error: 'FORBIDDEN' });
      }
      return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
  }
}
