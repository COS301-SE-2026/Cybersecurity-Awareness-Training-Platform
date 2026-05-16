import { Router } from 'express';
import { SimulationController } from '../controllers/simulation.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody, validateParams } from '../middleware/validateRequest.js';
import {
  classifySimulatedEmailRequestSchema,
  recordSimulatedEmailInteractionRequestSchema,
  getSimulatedInboxRequestParamsSchema,
  getSimulatedEmailRequestParamsSchema,
  recordSimulatedEmailInteractionRequestParamsSchema,
  classifySimulatedEmailRequestParamsSchema,
} from '@insightful-phish/shared';

import { apiRateLimit } from '../middleware/apiRateLimit.js';

const router = Router();
const simulationController = new SimulationController();

// Apply rate limiting to all trainee routes
router.use(apiRateLimit);

// Simulated Inbox
router.get(
  '/campaign-items/:campaignItemId/simulated-inbox',
  requireAuth,
  validateParams(getSimulatedInboxRequestParamsSchema),
  simulationController.getSimulatedInbox,
);

// Simulated Email Details
router.get(
  '/simulated-emails/:emailId',
  requireAuth,
  validateParams(getSimulatedEmailRequestParamsSchema),
  simulationController.getSimulatedEmail,
);

// Simulated Email Interactions
router.post(
  '/simulated-emails/:emailId/interactions',
  requireAuth,
  validateParams(recordSimulatedEmailInteractionRequestParamsSchema),
  validateBody(recordSimulatedEmailInteractionRequestSchema),
  simulationController.recordInteraction,
);

// Simulated Email Classification
router.post(
  '/simulated-emails/:emailId/classification',
  requireAuth,
  validateParams(classifySimulatedEmailRequestParamsSchema),
  validateBody(classifySimulatedEmailRequestSchema),
  simulationController.classifyEmail,
);

export { router as traineeRouter };
