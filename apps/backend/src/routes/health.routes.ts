import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

export const healthRoutes = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Check system health
 *     description: Verifies that the API is reachable and reports database connectivity.
 *     security: []
 *     responses:
 *       200:
 *         $ref: '#/components/responses/HealthOk'
 *       500:
 *         $ref: '#/components/responses/HealthDatabaseUnavailable'
 */
healthRoutes.get('/health', getHealth);
