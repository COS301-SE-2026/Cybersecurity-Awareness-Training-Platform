import {
  createTraineeInvitationRequestSchema,
  disableTraineeRequestSchema,
  organisationInvitationParamsSchema,
  organisationTraineeParamsSchema,
  organisationTraineesParamsSchema,
} from '@insightful-phish/shared';
import { Router } from 'express';
import rateLimit, { MemoryStore } from 'express-rate-limit';
import {
  createTraineeInvitation,
  disableTrainee,
  getOrganisationTrainees,
  resendInvitation,
  revokeInvitation,
} from '../controllers/organisation-trainee.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { validateBody, validateParams } from '../middleware/validateRequest.js';

export const organisationTraineeRouter = Router();

const organisationTraineeReadRateLimitStore = new MemoryStore();
const organisationTraineeMutationRateLimitStore = new MemoryStore();
const organisationTraineeSensitiveActionRateLimitStore = new MemoryStore();

const organisationTraineeRateLimitMessage = {
  error: 'ORGANISATION_TRAINEE_RATE_LIMITED',
  message: 'Too many trainee management requests. Please try again later.',
};

export const organisationTraineeReadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  store: organisationTraineeReadRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
  message: organisationTraineeRateLimitMessage,
});

export const organisationTraineeMutationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  store: organisationTraineeMutationRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
  message: organisationTraineeRateLimitMessage,
});

export const organisationTraineeSensitiveActionRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  store: organisationTraineeSensitiveActionRateLimitStore,
  standardHeaders: true,
  legacyHeaders: false,
  message: organisationTraineeRateLimitMessage,
});

export async function clearOrganisationTraineeRateLimitStores(): Promise<void> {
  await organisationTraineeReadRateLimitStore.resetAll();
  await organisationTraineeMutationRateLimitStore.resetAll();
  await organisationTraineeSensitiveActionRateLimitStore.resetAll();
}

/**
 * @openapi
 * /organisations/{organisationId}/trainees:
 *   get:
 *     tags: [Organisation Trainees]
 *     summary: List organisation trainees and pending invitations
 *     description: Returns a list of all active, inactive, and disabled trainees along with pending, sent, or expired invitations for the organisation. Requires VIEW_ORGANISATION_TRAINEES permission.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/OrganisationTraineesOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
organisationTraineeRouter.get(
  '/organisations/:organisationId/trainees',
  organisationTraineeReadRateLimit,
  requireAuth,
  validateParams(organisationTraineesParamsSchema),
  asyncHandler(getOrganisationTrainees),
);

/**
 * @openapi
 * /organisations/{organisationId}/trainee-invitations:
 *   post:
 *     tags: [Organisation Trainees]
 *     summary: Send a trainee invitation
 *     description: Invites a new trainee by email address. Atomically generates an opaque token, records an audit log, and queues an email notification. Requires INVITE_ORGANISATION_TRAINEES permission and an active organisation.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/CreateTraineeInvitation'
 *     responses:
 *       201:
 *         $ref: '#/components/responses/OrganisationTraineeInvitationCreated'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         $ref: '#/components/responses/TraineeInvitationConflict'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
organisationTraineeRouter.post(
  '/organisations/:organisationId/trainee-invitations',
  organisationTraineeMutationRateLimit,
  requireAuth,
  validateParams(organisationTraineesParamsSchema),
  validateBody(createTraineeInvitationRequestSchema, { statusCode: 422 }),
  asyncHandler(createTraineeInvitation),
);

/**
 * @openapi
 * /organisations/{organisationId}/trainee-invitations/{invitationId}/resend:
 *   post:
 *     tags: [Organisation Trainees]
 *     summary: Resend a trainee invitation link
 *     description: Revokes prior unused action tokens for the invitation, issues a fresh opaque action token with a renewed 7-day expiration, records an audit log, and queues a new invite email. Requires INVITE_ORGANISATION_TRAINEES permission on the invitation's organisation and an active organisation.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - $ref: '#/components/parameters/InvitationIdPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/OrganisationTraineeInvitationResent'
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
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
organisationTraineeRouter.post(
  '/organisations/:organisationId/trainee-invitations/:invitationId/resend',
  organisationTraineeMutationRateLimit,
  requireAuth,
  validateParams(organisationInvitationParamsSchema),
  asyncHandler(resendInvitation),
);

/**
 * @openapi
 * /organisations/{organisationId}/trainee-invitations/{invitationId}/revoke:
 *   post:
 *     tags: [Organisation Trainees]
 *     summary: Revoke a pending trainee invitation
 *     description: Revokes the invitation and marks all outstanding action tokens as revoked. Once revoked, the invite link becomes unusable. Requires INVITE_ORGANISATION_TRAINEES permission on the invitation's organisation and an active organisation.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - $ref: '#/components/parameters/InvitationIdPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/OrganisationTraineeInvitationRevoked'
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
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
organisationTraineeRouter.post(
  '/organisations/:organisationId/trainee-invitations/:invitationId/revoke',
  organisationTraineeMutationRateLimit,
  requireAuth,
  validateParams(organisationInvitationParamsSchema),
  asyncHandler(revokeInvitation),
);

/**
 * @openapi
 * /organisations/{organisationId}/trainees/{traineeId}/disable:
 *   patch:
 *     tags: [Organisation Trainees]
 *     summary: Disable a trainee account
 *     description: Atomically marks a trainee profile as DISABLED, revokes all active authentication sessions across all devices for that user, records an audit log, and sends a role change notification email. Requires REMOVE_ORGANISATION_TRAINEES permission and requires confirmation using the acting admin's password.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/OrganisationIdPathParam'
 *       - $ref: '#/components/parameters/TraineeIdPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/DisableTrainee'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/OrganisationTraineeDisabled'
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
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
organisationTraineeRouter.patch(
  '/organisations/:organisationId/trainees/:traineeId/disable',
  organisationTraineeSensitiveActionRateLimit,
  requireAuth,
  validateParams(organisationTraineeParamsSchema),
  validateBody(disableTraineeRequestSchema, { statusCode: 422 }),
  asyncHandler(disableTrainee),
);
