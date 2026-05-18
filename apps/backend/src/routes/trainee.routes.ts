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
 *     tags:
 *       - Trainee Simulation
 *     summary: Get a simulated inbox for a campaign item
 *     description: Resolves a trainee-accessible simulated inbox through the authenticated user's campaign assignment and campaign item availability.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CampaignItemIdPathParam'
 *     responses:
 *       200:
 *         description: Simulated inbox email summaries for the campaign item.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SimulatedInbox'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Simulated inbox is missing, unavailable, or not accessible through this campaign item.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
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
 *     tags:
 *       - Trainee Simulation
 *     summary: Get simulated email details
 *     description: Resolves a trainee-accessible simulated email through the authenticated user's campaign assignment and campaign item availability. The response intentionally does not expose expectedClassification or redFlags before classification.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CampaignItemIdPathParam'
 *       - $ref: '#/components/parameters/EmailIdPathParam'
 *     responses:
 *       200:
 *         description: Simulated email details safe for pre-classification display.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SimulatedEmailDetail'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Simulated email is missing or not accessible through this campaign item.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
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
 *     tags:
 *       - Trainee Simulation
 *     summary: Record a simulated email interaction
 *     description: Records an allowed simulated email interaction event after resolving access through the authenticated user's campaign assignment and campaign item availability. No client-supplied context or sensitive metadata is accepted.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CampaignItemIdPathParam'
 *       - $ref: '#/components/parameters/EmailIdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecordSimulatedEmailInteractionRequest'
 *           examples:
 *             linkClicked:
 *               summary: Link clicked interaction
 *               value:
 *                 eventType: SIMULATED_EMAIL_LINK_CLICKED
 *     responses:
 *       200:
 *         description: Simulated email interaction recorded.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecordSimulatedEmailInteractionResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Simulated email is missing or not accessible through this campaign item.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
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
 *     tags:
 *       - Trainee Simulation
 *     summary: Classify a simulated email
 *     description: Records the trainee's selected email classification after resolving access through the authenticated user's campaign assignment and campaign item availability. The expectedClassification and redFlags are not provided before classification; feedback and redFlags are returned after classification.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/CampaignItemIdPathParam'
 *       - $ref: '#/components/parameters/EmailIdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClassifySimulatedEmailRequest'
 *           examples:
 *             phishingClassification:
 *               summary: Classify an email as phishing
 *               value:
 *                 selectedClassification: PHISHING
 *                 selectedRedFlagIds:
 *                   - 33333333-3333-3333-3333-333333333333
 *     responses:
 *       200:
 *         description: Simulated email classification recorded with feedback.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ClassifySimulatedEmailResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         description: Simulated email is missing or not accessible through this campaign item.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       409:
 *         description: The simulated email has already been classified by this trainee.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
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
