import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

export const healthRoutes = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Check system health
 *     description: Verifies API status and database connectivity.
 *     responses:
 *       200:
 *         description: API and database are reachable.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - app
 *                 - api
 *                 - database
 *                 - timestamp
 *               properties:
 *                 app:
 *                   type: string
 *                   example: Insightful Phish
 *                 api:
 *                   type: string
 *                   enum: [working]
 *                   example: working
 *                 database:
 *                   type: string
 *                   enum: [connected]
 *                   example: connected
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2026-05-11T20:44:54.000Z
 *       500:
 *         description: API is reachable, but the database check failed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - app
 *                 - api
 *                 - database
 *                 - timestamp
 *               properties:
 *                 app:
 *                   type: string
 *                   example: Insightful Phish
 *                 api:
 *                   type: string
 *                   enum: [working]
 *                   example: working
 *                 database:
 *                   type: string
 *                   enum: [not connected]
 *                   example: not connected
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2026-05-11T20:44:54.000Z
 */
healthRoutes.get('/health', getHealth);
