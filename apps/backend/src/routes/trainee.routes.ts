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
/**
 * @openapi
 * /trainee/campaign-items/{campaignItemId}/simulated-inbox:
 *   get:
 *     tags: [Trainee Simulation]
 *     summary: Get a simulated inbox for a campaign item
 *     description: Resolves a trainee-accessible simulated inbox through campaign item access.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CampaignItemIdPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/SimulatedInboxOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/SimulationNotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/campaign-items/:campaignItemId/simulated-inbox',
  requireAuth,
  validateParams(getSimulatedInboxRequestParamsSchema),
  simulationController.getSimulatedInbox,
);

// Simulated Email Details
/**
 * @openapi
 * /trainee/campaign-items/{campaignItemId}/simulated-emails/{emailId}:
 *   get:
 *     tags: [Trainee Simulation]
 *     summary: Get simulated email details
 *     description: Returns pre-classification email details without expectedClassification or redFlags.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CampaignItemIdPathParam'
 *       - $ref: '#/components/parameters/EmailIdPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/SimulatedEmailDetailOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/SimulationNotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/campaign-items/:campaignItemId/simulated-emails/:emailId',
  requireAuth,
  validateParams(getSimulatedEmailRequestParamsSchema),
  simulationController.getSimulatedEmail,
);

// Simulated Email Interactions
/**
 * @openapi
 * /trainee/campaign-items/{campaignItemId}/simulated-emails/{emailId}/interactions:
 *   post:
 *     tags: [Trainee Simulation]
 *     summary: Record a simulated email interaction
 *     description: Records an allowed interaction event without accepting sensitive metadata.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CampaignItemIdPathParam'
 *       - $ref: '#/components/parameters/EmailIdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/RecordSimulatedEmailInteraction'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/SimulatedEmailInteractionOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/SimulationNotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/campaign-items/:campaignItemId/simulated-emails/:emailId/interactions',
  requireAuth,
  validateParams(recordSimulatedEmailInteractionRequestParamsSchema),
  validateBody(recordSimulatedEmailInteractionRequestSchema),
  simulationController.recordInteraction,
);

// Simulated Email Classification
/**
 * @openapi
 * /trainee/campaign-items/{campaignItemId}/simulated-emails/{emailId}/classification:
 *   post:
 *     tags: [Trainee Simulation]
 *     summary: Classify a simulated email
 *     description: Records classification and returns feedback plus red flags only after submission.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CampaignItemIdPathParam'
 *       - $ref: '#/components/parameters/EmailIdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/ClassifySimulatedEmail'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/SimulatedEmailClassificationOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/SimulationNotFound'
 *       409:
 *         $ref: '#/components/responses/SimulatedEmailAlreadyClassified'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/campaign-items/:campaignItemId/simulated-emails/:emailId/classification',
  requireAuth,
  validateParams(classifySimulatedEmailRequestParamsSchema),
  validateBody(classifySimulatedEmailRequestSchema),
  simulationController.classifyEmail,
);

export { router as traineeRouter };
