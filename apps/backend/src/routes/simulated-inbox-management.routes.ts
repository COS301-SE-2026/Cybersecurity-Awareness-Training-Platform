import {
  addLibraryEmailToSimulatedInboxRequestSchema,
  createSimulatedInboxDraftRequestSchema,
  listSimulatedInboxesQuerySchema,
  organisationEmailDraftInputSchema,
  organisationEmailDraftUpdateInputSchema,
  organisationEmailMutationRequestSchema,
  organisationIdParamsSchema,
  reorderSimulatedInboxEmailsRequestSchema,
  simulatedInboxManagementIdParamsSchema,
  simulatedInboxSnapshotIdParamsSchema,
  updateSimulatedInboxDraftRequestSchema,
} from '@insightful-phish/shared';
import { Router } from 'express';
import rateLimit, { MemoryStore } from 'express-rate-limit';
import {
  activateSimulatedInboxController,
  addAuthoredEmailController,
  addLibraryEmailController,
  copySimulatedInboxController,
  createSimulatedInboxController,
  getSimulatedInboxController,
  listSimulatedInboxesController,
  removeSimulatedInboxEmailController,
  reorderSimulatedInboxEmailsController,
  updateSimulatedInboxController,
  updateSimulatedInboxEmailController,
} from '../controllers/simulated-inbox-management.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validateRequest.js';

export const simulatedInboxManagementRouter = Router();

const readStore = new MemoryStore();
const mutationStore = new MemoryStore();
const message = {
  error: 'SIMULATED_INBOX_MANAGEMENT_RATE_LIMITED',
  message: 'Too many simulated inbox management requests. Please try again later.',
};
const readLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  store: readStore,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});
const mutationLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 40,
  store: mutationStore,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});

export async function clearSimulatedInboxManagementRateLimitStores() {
  await readStore.resetAll();
  await mutationStore.resetAll();
}

const collectionPath = '/organisations/:organisationId/simulated-inboxes';
const resourcePath = `${collectionPath}/:simulationId`;

simulatedInboxManagementRouter.get(
  collectionPath,
  readLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema, { statusCode: 422 }),
  validateQuery(listSimulatedInboxesQuerySchema, { statusCode: 422 }),
  asyncHandler(listSimulatedInboxesController),
);

simulatedInboxManagementRouter.post(
  collectionPath,
  mutationLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema, { statusCode: 422 }),
  validateBody(createSimulatedInboxDraftRequestSchema, { statusCode: 422 }),
  asyncHandler(createSimulatedInboxController),
);

simulatedInboxManagementRouter.get(
  resourcePath,
  readLimit,
  requireAuth,
  validateParams(simulatedInboxManagementIdParamsSchema, { statusCode: 422 }),
  asyncHandler(getSimulatedInboxController),
);

simulatedInboxManagementRouter.patch(
  resourcePath,
  mutationLimit,
  requireAuth,
  validateParams(simulatedInboxManagementIdParamsSchema, { statusCode: 422 }),
  validateBody(updateSimulatedInboxDraftRequestSchema, { statusCode: 422 }),
  asyncHandler(updateSimulatedInboxController),
);

simulatedInboxManagementRouter.post(
  `${resourcePath}/emails/authored`,
  mutationLimit,
  requireAuth,
  validateParams(simulatedInboxManagementIdParamsSchema, { statusCode: 422 }),
  validateBody(organisationEmailDraftInputSchema, { statusCode: 422 }),
  asyncHandler(addAuthoredEmailController),
);

simulatedInboxManagementRouter.post(
  `${resourcePath}/emails/from-library`,
  mutationLimit,
  requireAuth,
  validateParams(simulatedInboxManagementIdParamsSchema, { statusCode: 422 }),
  validateBody(addLibraryEmailToSimulatedInboxRequestSchema, { statusCode: 422 }),
  asyncHandler(addLibraryEmailController),
);

simulatedInboxManagementRouter.patch(
  `${resourcePath}/emails/:emailId`,
  mutationLimit,
  requireAuth,
  validateParams(simulatedInboxSnapshotIdParamsSchema, { statusCode: 422 }),
  validateBody(organisationEmailDraftUpdateInputSchema, { statusCode: 422 }),
  asyncHandler(updateSimulatedInboxEmailController),
);

simulatedInboxManagementRouter.delete(
  `${resourcePath}/emails/:emailId`,
  mutationLimit,
  requireAuth,
  validateParams(simulatedInboxSnapshotIdParamsSchema, { statusCode: 422 }),
  asyncHandler(removeSimulatedInboxEmailController),
);

simulatedInboxManagementRouter.put(
  `${resourcePath}/emails/order`,
  mutationLimit,
  requireAuth,
  validateParams(simulatedInboxManagementIdParamsSchema, { statusCode: 422 }),
  validateBody(reorderSimulatedInboxEmailsRequestSchema, { statusCode: 422 }),
  asyncHandler(reorderSimulatedInboxEmailsController),
);

simulatedInboxManagementRouter.post(
  `${resourcePath}/activate`,
  mutationLimit,
  requireAuth,
  validateParams(simulatedInboxManagementIdParamsSchema, { statusCode: 422 }),
  validateBody(organisationEmailMutationRequestSchema, { statusCode: 422 }),
  asyncHandler(activateSimulatedInboxController),
);

simulatedInboxManagementRouter.post(
  `${resourcePath}/copy`,
  mutationLimit,
  requireAuth,
  validateParams(simulatedInboxManagementIdParamsSchema, { statusCode: 422 }),
  validateBody(organisationEmailMutationRequestSchema, { statusCode: 422 }),
  asyncHandler(copySimulatedInboxController),
);
