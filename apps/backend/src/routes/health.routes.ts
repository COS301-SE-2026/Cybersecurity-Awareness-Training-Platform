import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

export const healthRoutes = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - Health
 *     summary: Check system health
 *     description: Verifies that the API is reachable and reports the current database connectivity status.
 *     security: []
 *     responses:
 *       200:
 *         description: API and database are reachable.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *             examples:
 *               connected:
 *                 summary: Healthy response
 *                 value:
 *                   app: Insightful Phish
 *                   api: working
 *                   database: connected
 *                   timestamp: 2026-05-11T20:44:54.000Z
 *       500:
 *         description: API is reachable, but the database check failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthStatus'
 *             examples:
 *               databaseUnavailable:
 *                 summary: Database connectivity failure
 *                 value:
 *                   app: Insightful Phish
 *                   api: working
 *                   database: not connected
 *                   timestamp: 2026-05-11T20:44:54.000Z
 */
healthRoutes.get('/health', getHealth);
