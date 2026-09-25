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

phishingPortalRouter.get(
  '/api/public/phishing-portals/:token',
  apiRateLimit,
  asyncHandler(getPublicPhishingPortal),
);

phishingPortalRouter.post(
  '/api/public/phishing-portals/:token/interactions',
  apiRateLimit,
  validateBody(recordPortalInteractionRequestSchema, { includeIssueDetails: false }),
  asyncHandler(recordPublicPhishingPortalInteraction),
);
