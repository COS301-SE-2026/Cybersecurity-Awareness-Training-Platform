import { recordPortalInteractionRequestSchema } from '@insightful-phish/shared';
import { Router } from 'express';
import {
  getPublicPhishingPortal,
  recordPublicPhishingPortalInteraction,
} from '../controllers/phishing-portal.controller.js';
import { apiRateLimit } from '../middleware/apiRateLimit.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validateBody } from '../middleware/validateRequest.js';

export const phishingPortalRouter = Router();

/**
 * @openapi
 * /api/public/phishing-portals/{token}:
 *   get:
 *     tags: [Public Phishing Portal]
 *     summary: Resolve a managed phishing portal
 *     description: Public token operation. Returns INACTIVE or UNAVAILABLE as a 200 state without revealing why the link is unusable. Active access records a managed link request.
 *     security: []
 *     parameters:
 *       - name: token
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Portal resolution state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PublicPortalResolution'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
phishingPortalRouter.get(
  '/api/public/phishing-portals/:token',
  apiRateLimit,
  asyncHandler(getPublicPhishingPortal),
);

/**
 * @openapi
 * /api/public/phishing-portals/{token}/interactions:
 *   post:
 *     tags: [Public Phishing Portal]
 *     summary: Record a managed phishing portal interaction
 *     description: Public token operation. Credential values are never accepted. An unavailable or revoked link returns 404. Repeated client event identifiers are idempotent for the same event type.
 *     security: []
 *     parameters:
 *       - name: token
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RecordPortalInteractionRequest'
 *     responses:
 *       200:
 *         description: Interaction accepted, with an educational reveal for credential submission attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RecordPortalInteractionResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
phishingPortalRouter.post(
  '/api/public/phishing-portals/:token/interactions',
  apiRateLimit,
  validateBody(recordPortalInteractionRequestSchema, { includeIssueDetails: false }),
  asyncHandler(recordPublicPhishingPortalInteraction),
);
