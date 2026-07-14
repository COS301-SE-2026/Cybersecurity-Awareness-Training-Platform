import { Router } from 'express';
import {
  invitationAcceptRequestSchema,
  invitationRejectRequestSchema,
  invitationTokenParamsSchema,
} from '@insightful-phish/shared';
import {
  acceptInvitation,
  getInvitationContext,
  rejectInvitation,
} from '../controllers/invitation.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authRateLimit } from '../middleware/authRateLimit.js';
import { extractInvitationAuth } from '../middleware/extractInvitationAuth.js';
import { validateBody, validateParams } from '../middleware/validateRequest.js';

export const invitationRouter = Router();

/**
 * @openapi
 * /invitations/token/{token}/context:
 *   get:
 *     tags: [Invitations]
 *     summary: Get invitation context and status
 *     description: Inspect an invitation action link token without consuming or mutating its state. Optionally extracts logged in Bearer context if provided.
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/InvitationTokenPathParam'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/InvitationContextOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
invitationRouter.get(
  '/invitations/token/:token/context',
  authRateLimit,
  extractInvitationAuth,
  validateParams(invitationTokenParamsSchema),
  asyncHandler(getInvitationContext),
);

/**
 * @openapi
 * /invitations/token/{token}/accept:
 *   post:
 *     tags: [Invitations]
 *     summary: Accept an invitation and assign role
 *     description: Atomically accepts an invitation link inside a database transaction, updates user profile and role grants, and records an audit log. Blocks invalid role transitions via Role Conflict Matrix.
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/InvitationTokenPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/InvitationAccept'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/InvitationAcceptOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
invitationRouter.post(
  '/invitations/token/:token/accept',
  authRateLimit,
  extractInvitationAuth,
  validateParams(invitationTokenParamsSchema),
  validateBody(invitationAcceptRequestSchema),
  asyncHandler(acceptInvitation),
);

/**
 * @openapi
 * /invitations/token/{token}/reject:
 *   post:
 *     tags: [Invitations]
 *     summary: Reject an invitation link
 *     description: Atomically marks an invitation link as rejected inside a database transaction and records an audit log with rejection reason.
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/InvitationTokenPathParam'
 *     requestBody:
 *       $ref: '#/components/requestBodies/InvitationReject'
 *     responses:
 *       200:
 *         $ref: '#/components/responses/InvitationRejectOk'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
invitationRouter.post(
  '/invitations/token/:token/reject',
  authRateLimit,
  extractInvitationAuth,
  validateParams(invitationTokenParamsSchema),
  validateBody(invitationRejectRequestSchema),
  asyncHandler(rejectInvitation),
);
