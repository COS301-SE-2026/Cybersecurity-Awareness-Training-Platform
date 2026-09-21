import { Router } from 'express';
import rateLimit, { MemoryStore } from 'express-rate-limit';
import {
  campaignCatalogueQuerySchema,
  campaignListQuerySchema,
  campaignMutationPreconditionSchema,
  campaignStatisticsQuerySchema,
  createCampaignDraftRequestSchema,
  updateCampaignDraftRequestSchema,
  idParamSchema,
  organisationIdParamsSchema,
  createPhishingSimulationDraftRequestSchema,
  phishingSimulationCollectionRequestParamsSchema,
  phishingSimulationDetailRequestParamsSchema,
  updatePhishingSimulationDraftRequestSchema,
  phishingSimulationPoolRequestParamsSchema,
  phishingSimulationPoolEntryRequestParamsSchema,
  addLibraryEmailToPhishingSimulationPoolRequestSchema,
} from '@insightful-phish/shared';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validateRequest.js';
import {
  activateOrganisationCampaignHandler,
  activatePlatformCampaignHandler,
  archiveOrganisationCampaignHandler,
  archivePlatformCampaignHandler,
  copyOrganisationCampaignToDraftHandler,
  copyPlatformCampaignToDraftHandler,
  createOrganisationCampaignDraftHandler,
  createPlatformCampaignDraftHandler,
  getOrganisationCampaignCatalogueHandler,
  getOrganisationCampaignDetailHandler,
  getOrganisationCampaignStatisticsHandler,
  getOrganisationCampaignsHandler,
  getPlatformCampaignCatalogueHandler,
  getPlatformCampaignDetailHandler,
  getPlatformCampaignsHandler,
  reactivateOrganisationCampaignHandler,
  reactivatePlatformCampaignHandler,
  updateOrganisationCampaignDraftHandler,
  updatePlatformCampaignDraftHandler,
} from '../controllers/campaign-management.controller.js';
import {
  createPhishingSimulationDraftHandler,
  getPhishingSimulationDraftHandler,
  listPhishingSimulationDraftsHandler,
  updatePhishingSimulationDraftHandler,
  getPhishingSimulationPoolHandler,
  addLibraryEmailToPhishingSimulationPoolHandler,
  removePhishingSimulationPoolEmailHandler,
  launchPhishingSimulationHandler,
} from '../controllers/phishing-simulation.controller.js';
export const campaignManagementRouter = Router();

const campaignManagementRateLimitStore = new MemoryStore();

const campaignManagementRateLimitMessage = {
  error: 'CAMPAIGN_MANAGEMENT_RATE_LIMITED',
  message: 'Too many campaign management requests. Please try again later.',
};

export const campaignManagementRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  store: campaignManagementRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
  message: campaignManagementRateLimitMessage,
});

export async function clearCampaignManagementRateLimitStores(): Promise<void> {
  await campaignManagementRateLimitStore.resetAll();
}

const organisationAndCampaignIdParamsSchema = z
  .object({
    organisationId: idParamSchema,
    campaignId: idParamSchema,
  })
  .strict();

const campaignIdParamSchema = z
  .object({
    campaignId: idParamSchema,
  })
  .strict();

/**
 * @openapi
 * /organisations/{organisationId}/campaign-content/catalog:
 *   get:
 *     tags: [Campaign Management]
 *     summary: Get organisation campaign content catalogue
 *     description: Returns paginated starter training documents, quizzes, and simulations for custom campaign building.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 1-based page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by title or description
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TRAINING_DOCUMENT, QUIZ, SIMULATED_INBOX]
 *         description: Filter content type
 *       - in: query
 *         name: category
 *         schema:
 *           $ref: '#/components/schemas/ContentCategory'
 *         description: Filter by reusable content category
 *     responses:
 *       200:
 *         description: Catalogue items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetCampaignCatalogueResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
campaignManagementRouter.get(
  '/organisations/:organisationId/campaign-content/catalog',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema),
  validateQuery(campaignCatalogueQuerySchema, { statusCode: 422 }),
  asyncHandler(getOrganisationCampaignCatalogueHandler),
);

/**
 * @openapi
 * /platform/campaign-content/catalog:
 *   get:
 *     tags: [Platform Campaign Management]
 *     summary: Get platform campaign content catalogue
 *     description: Returns paginated content catalogue for platform premade campaign building.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [TRAINING_DOCUMENT, QUIZ, SIMULATED_INBOX]
 *       - in: query
 *         name: category
 *         schema:
 *           $ref: '#/components/schemas/ContentCategory'
 *     responses:
 *       200:
 *         description: Catalogue items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetCampaignCatalogueResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
campaignManagementRouter.get(
  '/platform/campaign-content/catalog',
  campaignManagementRateLimit,
  requireAuth,
  validateQuery(campaignCatalogueQuerySchema, { statusCode: 422 }),
  asyncHandler(getPlatformCampaignCatalogueHandler),
);

/**
 * @openapi
 * /organisations/{organisationId}/campaigns:
 *   get:
 *     tags: [Campaign Management]
 *     summary: Get organisation campaigns
 *     description: Returns paginated organisation campaigns with status filtering and allowed actions.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, ACTIVE, ARCHIVED]
 *     responses:
 *       200:
 *         description: Campaigns list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetCampaignsResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
campaignManagementRouter.get(
  '/organisations/:organisationId/campaigns',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema),
  validateQuery(campaignListQuerySchema, { statusCode: 422 }),
  asyncHandler(getOrganisationCampaignsHandler),
);

/**
 * @openapi
 * /platform/campaigns:
 *   get:
 *     tags: [Platform Campaign Management]
 *     summary: Get platform premade campaigns
 *     description: Returns paginated platform premade campaigns.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, ACTIVE, ARCHIVED]
 *     responses:
 *       200:
 *         description: Platform campaigns list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetCampaignsResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
campaignManagementRouter.get(
  '/platform/campaigns',
  campaignManagementRateLimit,
  requireAuth,
  validateQuery(campaignListQuerySchema, { statusCode: 422 }),
  asyncHandler(getPlatformCampaignsHandler),
);

/**
 * @openapi
 * /organisations/{organisationId}/campaigns/{campaignId}:
 *   get:
 *     tags: [Campaign Management]
 *     summary: Get organisation campaign detail
 *     description: Returns campaign detail with ordered item configuration.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - name: campaignId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Campaign detail retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CampaignDetailResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
campaignManagementRouter.get(
  '/organisations/:organisationId/campaigns/:campaignId',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(organisationAndCampaignIdParamsSchema),
  asyncHandler(getOrganisationCampaignDetailHandler),
);

/**
 * @openapi
 * /organisations/{organisationId}/campaigns/{campaignId}/statistics:
 *   get:
 *     tags: [Campaign Management]
 *     summary: Get organisation campaign statistics
 *     description: >
 *       Retrieves authoritative campaign-level and per-trainee progress statistics
 *       for an organisation campaign. Summary values are calculated across
 *       the complete qualifying assignment cohort before trainee pagination is
 *       applied. Disabled Organisation Trainees remain in the cohort while their
 *       campaign assignment exists. CampaignAssignment.startedAt is not used as the
 *       statistics source of truth. VIEW_CAMPAIGNS authorises the read, and
 *       MANAGE_CAMPAIGNS satisfies view access.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - $ref: '#/components/parameters/CampaignIdPathParam'
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100000
 *           default: 1
 *         description: 1-based page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum records per page
 *     responses:
 *       200:
 *         $ref: '#/components/responses/GetCampaignStatisticsOk'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       429:
 *         $ref: '#/components/responses/CampaignManagementRateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
campaignManagementRouter.get(
  '/organisations/:organisationId/campaigns/:campaignId/statistics',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(organisationAndCampaignIdParamsSchema, { statusCode: 422 }),
  validateQuery(campaignStatisticsQuerySchema, { statusCode: 422 }),
  asyncHandler(getOrganisationCampaignStatisticsHandler),
);

/**
 * @openapi
 * /platform/campaigns/{campaignId}:
 *   get:
 *     tags: [Platform Campaign Management]
 *     summary: Get platform campaign detail
 *     description: Returns detail for platform premade campaign.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: campaignId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Platform campaign detail retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CampaignDetailResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
campaignManagementRouter.get(
  '/platform/campaigns/:campaignId',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(campaignIdParamSchema),
  asyncHandler(getPlatformCampaignDetailHandler),
);

/**
 * @openapi
 * /organisations/{organisationId}/campaigns:
 *   post:
 *     tags: [Campaign Management]
 *     summary: Create organisation campaign draft
 *     description: Creates a new draft organisation custom campaign.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCampaignDraftRequest'
 *     responses:
 *       201:
 *         description: Draft campaign created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CampaignDetailResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 */
campaignManagementRouter.post(
  '/organisations/:organisationId/campaigns',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(organisationIdParamsSchema),
  validateBody(createCampaignDraftRequestSchema, { statusCode: 422 }),
  asyncHandler(createOrganisationCampaignDraftHandler),
);

/**
 * @openapi
 * /platform/campaigns:
 *   post:
 *     tags: [Platform Campaign Management]
 *     summary: Create platform campaign draft
 *     description: Creates a new platform premade campaign draft.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCampaignDraftRequest'
 *     responses:
 *       201:
 *         description: Platform campaign draft created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CampaignDetailResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 */
campaignManagementRouter.post(
  '/platform/campaigns',
  campaignManagementRateLimit,
  requireAuth,
  validateBody(createCampaignDraftRequestSchema, { statusCode: 422 }),
  asyncHandler(createPlatformCampaignDraftHandler),
);

/**
 * @openapi
 * /organisations/{organisationId}/campaigns/{campaignId}/copy:
 *  post:
 *   tags: [Campaign Management]
 *   summary: Copy an active organisation campaign to a new draft
 *   security:
 *    - bearerAuth: []
 *   parameters:
 *    - $ref: '#/components/parameters/OrganisationIdPathParam'
 *    - $ref: '#/components/parameters/CampaignIdPathParam'
 *   responses:
 *    201:
 *      description: Campaign copied to a new draft
 *      content:
 *        application/json:
 *          schema:
 *            $ref: '#/components/schemas/CampaignDetailResponse'
 *    401:
 *      $ref: '#/components/responses/Unauthorized'
 *    403:
 *      $ref: '#/components/responses/Forbidden'
 *    404:
 *      $ref: '#/components/responses/NotFound'
 *    409:
 *      $ref: '#/components/responses/Conflict'
 */
campaignManagementRouter.post(
  '/organisations/:organisationId/campaigns/:campaignId/copy',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(organisationAndCampaignIdParamsSchema),
  asyncHandler(copyOrganisationCampaignToDraftHandler),
);

/**
 * @openapi
 * /platform/campaigns/{campaignId}/copy:
 *  post:
 *    tags: [Platform Campaign Management]
 *    summary: Copy an active platform campaign to a new draft
 *    security:
 *     - bearerAuth: []
 *    parameters:
 *      - $ref: '#/components/parameters/CampaignIdPathParam'
 *    responses:
 *      201:
 *        description: Platform campaign copied to a new draft
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/CampaignDetailResponse'
 *    401:
 *      $ref: '#/components/responses/Unauthorized'
 *    403:
 *      $ref: '#/components/responses/Forbidden'
 *    404:
 *      $ref: '#/components/responses/NotFound'
 *    409:
 *      $ref: '#/components/responses/Conflict'
 */

campaignManagementRouter.post(
  '/platform/campaigns/:campaignId/copy',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(campaignIdParamSchema),
  asyncHandler(copyPlatformCampaignToDraftHandler),
);

/**
 * @openapi
 * /organisations/{organisationId}/campaigns/{campaignId}:
 *   put:
 *     tags: [Campaign Management]
 *     summary: Update organisation campaign draft
 *     description: Atomically updates an existing draft campaign configuration.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - name: campaignId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCampaignDraftRequest'
 *     responses:
 *       200:
 *         description: Draft campaign updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CampaignDetailResponse'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 */
campaignManagementRouter.put(
  '/organisations/:organisationId/campaigns/:campaignId',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(organisationAndCampaignIdParamsSchema),
  validateBody(updateCampaignDraftRequestSchema, { statusCode: 422 }),
  asyncHandler(updateOrganisationCampaignDraftHandler),
);

/**
 * @openapi
 * /platform/campaigns/{campaignId}:
 *   put:
 *     tags: [Platform Campaign Management]
 *     summary: Update platform campaign draft
 *     description: Atomically updates a platform premade campaign draft.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: campaignId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCampaignDraftRequest'
 *     responses:
 *       200:
 *         description: Platform draft updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CampaignDetailResponse'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 */
campaignManagementRouter.put(
  '/platform/campaigns/:campaignId',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(campaignIdParamSchema),
  validateBody(updateCampaignDraftRequestSchema, { statusCode: 422 }),
  asyncHandler(updatePlatformCampaignDraftHandler),
);

/**
 * @openapi
 * /organisations/{organisationId}/campaigns/{campaignId}/activate:
 *   post:
 *     tags: [Campaign Management]
 *     summary: Activate organisation campaign
 *     description: Validates and transitions campaign from DRAFT to ACTIVE.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - name: campaignId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CampaignMutationPrecondition'
 *     responses:
 *       200:
 *         description: Campaign activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CampaignLifecycleActionResponse'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 */
campaignManagementRouter.post(
  '/organisations/:organisationId/campaigns/:campaignId/activate',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(organisationAndCampaignIdParamsSchema),
  validateBody(campaignMutationPreconditionSchema, { statusCode: 422 }),
  asyncHandler(activateOrganisationCampaignHandler),
);

/**
 * @openapi
 * /platform/campaigns/{campaignId}/activate:
 *   post:
 *     tags: [Platform Campaign Management]
 *     summary: Activate platform campaign
 *     description: Validates and transitions platform campaign from DRAFT to ACTIVE.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: campaignId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CampaignMutationPrecondition'
 *     responses:
 *       200:
 *         description: Platform campaign activated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CampaignLifecycleActionResponse'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 */
campaignManagementRouter.post(
  '/platform/campaigns/:campaignId/activate',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(campaignIdParamSchema),
  validateBody(campaignMutationPreconditionSchema, { statusCode: 422 }),
  asyncHandler(activatePlatformCampaignHandler),
);

/**
 * @openapi
 * /organisations/{organisationId}/campaigns/{campaignId}/archive:
 *   post:
 *     tags: [Campaign Management]
 *     summary: Archive organisation campaign
 *     description: Non-destructively archives an ACTIVE campaign.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - name: campaignId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CampaignMutationPrecondition'
 *     responses:
 *       200:
 *         description: Campaign archived successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CampaignLifecycleActionResponse'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 */
campaignManagementRouter.post(
  '/organisations/:organisationId/campaigns/:campaignId/archive',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(organisationAndCampaignIdParamsSchema),
  validateBody(campaignMutationPreconditionSchema, { statusCode: 422 }),
  asyncHandler(archiveOrganisationCampaignHandler),
);

/**
 * @openapi
 * /platform/campaigns/{campaignId}/archive:
 *   post:
 *     tags: [Platform Campaign Management]
 *     summary: Archive platform campaign
 *     description: Non-destructively archives an ACTIVE platform campaign.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: campaignId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CampaignMutationPrecondition'
 *     responses:
 *       200:
 *         description: Platform campaign archived
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CampaignLifecycleActionResponse'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 */
campaignManagementRouter.post(
  '/platform/campaigns/:campaignId/archive',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(campaignIdParamSchema),
  validateBody(campaignMutationPreconditionSchema, { statusCode: 422 }),
  asyncHandler(archivePlatformCampaignHandler),
);

/**
 * @openapi
 * /organisations/{organisationId}/campaigns/{campaignId}/reactivate:
 *   post:
 *     tags: [Campaign Management]
 *     summary: Reactivate organisation campaign
 *     description: Transitions an ARCHIVED campaign back to ACTIVE.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - name: campaignId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CampaignMutationPrecondition'
 *     responses:
 *       200:
 *         description: Campaign reactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CampaignLifecycleActionResponse'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 */
campaignManagementRouter.post(
  '/organisations/:organisationId/campaigns/:campaignId/reactivate',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(organisationAndCampaignIdParamsSchema),
  validateBody(campaignMutationPreconditionSchema, { statusCode: 422 }),
  asyncHandler(reactivateOrganisationCampaignHandler),
);

/**
 * @openapi
 * /platform/campaigns/{campaignId}/reactivate:
 *   post:
 *     tags: [Platform Campaign Management]
 *     summary: Reactivate platform campaign
 *     description: Transitions an ARCHIVED platform campaign back to ACTIVE.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: campaignId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CampaignMutationPrecondition'
 *     responses:
 *       200:
 *         description: Platform campaign reactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CampaignLifecycleActionResponse'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 */
campaignManagementRouter.post(
  '/platform/campaigns/:campaignId/reactivate',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(campaignIdParamSchema),
  validateBody(campaignMutationPreconditionSchema, { statusCode: 422 }),
  asyncHandler(reactivatePlatformCampaignHandler),
);

/**
 * @openapi
 * /organisations/{organisationId}/campaigns/{campaignId}/phishing-simulations:
 *   post:
 *     tags: [Campaign Management]
 *     summary: Create a phishing simulation Draft
 *     description: Creates an incomplete phishing simulation Draft for a Draft or Active Campaign. Requires MANAGE_CAMPAIGNS. Campaigns outside the authenticated organisation are not disclosed and return 404. Saving does not perform Launch validation.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - $ref: '#/components/parameters/CampaignIdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePhishingSimulationDraftRequest'
 *     responses:
 *       201:
 *         description: Phishing simulation Draft created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhishingSimulationDraftResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       429:
 *         $ref: '#/components/responses/CampaignManagementRateLimited'
 */
campaignManagementRouter.post(
  '/organisations/:organisationId/campaigns/:campaignId/phishing-simulations',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(phishingSimulationCollectionRequestParamsSchema),
  validateBody(createPhishingSimulationDraftRequestSchema, { statusCode: 422 }),
  asyncHandler(createPhishingSimulationDraftHandler),
);
/**
 * @openapi
 * /organisations/{organisationId}/campaigns/{campaignId}/phishing-simulations:
 *   get:
 *     tags: [Campaign Management]
 *     summary: List phishing simulation Drafts
 *     description: Lists phishing simulation Drafts for the Campaign. Requires VIEW_CAMPAIGNS or MANAGE_CAMPAIGNS. Campaigns outside the authenticated organisation are not disclosed and return 404.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - $ref: '#/components/parameters/CampaignIdPathParam'
 *     responses:
 *       200:
 *         description: Phishing simulation Drafts retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhishingSimulationDraftListResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/CampaignManagementRateLimited'
 */
campaignManagementRouter.get(
  '/organisations/:organisationId/campaigns/:campaignId/phishing-simulations',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(phishingSimulationCollectionRequestParamsSchema),
  asyncHandler(listPhishingSimulationDraftsHandler),
);
/**
 * @openapi
 * /organisations/{organisationId}/campaigns/{campaignId}/phishing-simulations/{simulationId}:
 *   get:
 *     tags: [Campaign Management]
 *     summary: Get a phishing simulation Draft
 *     description: Returns one phishing simulation Draft including incomplete configuration and lifecycle fields. Requires VIEW_CAMPAIGNS or MANAGE_CAMPAIGNS. Campaigns and simulations outside the authenticated organisation are not disclosed and return 404.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - $ref: '#/components/parameters/CampaignIdPathParam'
 *       - $ref: '#/components/parameters/PhishingSimulationIdPathParam'
 *     responses:
 *       200:
 *         description: Phishing simulation Draft retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhishingSimulationDraftResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/CampaignManagementRateLimited'
 */
campaignManagementRouter.get(
  '/organisations/:organisationId/campaigns/:campaignId/phishing-simulations/:simulationId',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(phishingSimulationDetailRequestParamsSchema),
  asyncHandler(getPhishingSimulationDraftHandler),
);
/**
 * @openapi
 * /organisations/{organisationId}/campaigns/{campaignId}/phishing-simulations/{simulationId}:
 *   patch:
 *     tags: [Campaign Management]
 *     summary: Update a phishing simulation Draft
 *     description: Updates a phishing simulation only while it remains a Draft and its Campaign remains Draft or Active. Requires MANAGE_CAMPAIGNS. Omitted fields are preserved, null clears scalar values, and an empty array clears a collection. Campaigns and simulations outside the authenticated organisation are not disclosed and return 404. Saving does not perform Launch validation.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - $ref: '#/components/parameters/CampaignIdPathParam'
 *       - $ref: '#/components/parameters/PhishingSimulationIdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePhishingSimulationDraftRequest'
 *     responses:
 *       200:
 *         description: Phishing simulation Draft updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhishingSimulationDraftResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       429:
 *         $ref: '#/components/responses/CampaignManagementRateLimited'
 */
campaignManagementRouter.patch(
  '/organisations/:organisationId/campaigns/:campaignId/phishing-simulations/:simulationId',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(phishingSimulationDetailRequestParamsSchema),
  validateBody(updatePhishingSimulationDraftRequestSchema, { statusCode: 422 }),
  asyncHandler(updatePhishingSimulationDraftHandler),
);

/**
 * @openapi
 * /organisations/{organisationId}/campaigns/{campaignId}/phishing-simulations/{simulationId}/pool:
 *   get:
 *     tags: [Campaign Management]
 *     summary: Get a phishing simulation email pool
 *     description: Returns the copied email snapshots for one phishing simulation. Requires VIEW_CAMPAIGNS or MANAGE_CAMPAIGNS. Campaigns and simulations outside the authenticated organisation are not disclosed and return 404. Pool reads remain available after the simulation leaves Draft.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - $ref: '#/components/parameters/CampaignIdPathParam'
 *       - $ref: '#/components/parameters/PhishingSimulationIdPathParam'
 *     responses:
 *       200:
 *         description: Phishing simulation email pool retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhishingSimulationPoolResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/CampaignManagementRateLimited'
 */
campaignManagementRouter.get(
  '/organisations/:organisationId/campaigns/:campaignId/phishing-simulations/:simulationId/pool',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(phishingSimulationPoolRequestParamsSchema),
  asyncHandler(getPhishingSimulationPoolHandler),
);
/**
 * @openapi
 * /organisations/{organisationId}/campaigns/{campaignId}/phishing-simulations/{simulationId}/pool:
 *   post:
 *     tags: [Campaign Management]
 *     summary: Add an Organisation Email to a phishing simulation pool
 *     description: Copies one active Organisation Email from the authenticated organisation into a Draft phishing simulation. Requires MANAGE_CAMPAIGNS. The Campaign must be Draft or Active. Missing, inaccessible, and inactive source email identifiers return the same 404. Later edits or removal of the source email do not change the snapshot. Pool size is checked against emailCount at Launch, not when an email is added.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - $ref: '#/components/parameters/CampaignIdPathParam'
 *       - $ref: '#/components/parameters/PhishingSimulationIdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddLibraryEmailToPhishingSimulationPoolRequest'
 *     responses:
 *       201:
 *         description: Email snapshot added to the phishing simulation pool
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmbeddedEmailSnapshot'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       429:
 *         $ref: '#/components/responses/CampaignManagementRateLimited'
 */
campaignManagementRouter.post(
  '/organisations/:organisationId/campaigns/:campaignId/phishing-simulations/:simulationId/pool',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(phishingSimulationPoolRequestParamsSchema),
  validateBody(addLibraryEmailToPhishingSimulationPoolRequestSchema, { statusCode: 422 }),
  asyncHandler(addLibraryEmailToPhishingSimulationPoolHandler),
);
/**
 * @openapi
 * /organisations/{organisationId}/campaigns/{campaignId}/phishing-simulations/{simulationId}/pool/{poolEmailId}:
 *   delete:
 *     tags: [Campaign Management]
 *     summary: Remove an email from a phishing simulation pool
 *     description: Removes one email snapshot from a Draft phishing simulation. Requires MANAGE_CAMPAIGNS. The Campaign must be Draft or Active. Campaigns, simulations, and pool entries outside the authenticated organisation are not disclosed and return 404. Pool size is checked against emailCount at Launch, not when an email is removed.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - $ref: '#/components/parameters/CampaignIdPathParam'
 *       - $ref: '#/components/parameters/PhishingSimulationIdPathParam'
 *       - $ref: '#/components/parameters/PhishingSimulationPoolEmailIdPathParam'
 *     responses:
 *       204:
 *         description: Email snapshot removed from the phishing simulation pool
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       429:
 *         $ref: '#/components/responses/CampaignManagementRateLimited'
 */
campaignManagementRouter.delete(
  '/organisations/:organisationId/campaigns/:campaignId/phishing-simulations/:simulationId/pool/:poolEmailId',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(phishingSimulationPoolEntryRequestParamsSchema),
  asyncHandler(removePhishingSimulationPoolEmailHandler),
);

campaignManagementRouter.post(
  '/organisations/:organisationId/campaigns/:campaignId/phishing-simulations/:simulationId/launch',
  campaignManagementRateLimit,
  requireAuth,
  validateParams(phishingSimulationDetailRequestParamsSchema),
  asyncHandler(launchPhishingSimulationHandler),
);
