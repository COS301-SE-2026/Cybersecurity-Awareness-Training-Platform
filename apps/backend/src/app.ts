import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { APP_NAME } from '@insightful-phish/shared';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { swaggerSpec } from './config/swagger.js';

export function createApp() {
  const app = express();

  app.use(helmet());

  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    }),
  );

  app.use(express.json());

  // Swagger Documentation
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  /**
   * @openapi
   * /health:
   *   get:
   *     summary: Check system health
   *     description: Verifies API status and database connectivity.
   *     responses:
   *       200:
   *         description: System is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 app:
   *                   type: string
   *                 api:
   *                   type: string
   *                 database:
   *                   type: string
   *                 timestamp:
   *                   type: string
   *       500:
   *         description: System is unhealthy (usually database disconnected)
   */
  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;

      return res.json({
        app: APP_NAME,
        api: 'working',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    } catch {
      return res.status(500).json({
        app: APP_NAME,
        api: 'working',
        database: 'not connected',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Preliminary Demo 1 API Route Placeholders (To be implemented)
  // Base Features
  // app.use('/auth', authRoutes); // POST /auth/register, POST /auth/login

  // UC-01: Simulated Inbox
  // app.use('/simulations', simulationRoutes); // GET /simulations/inbox, GET /simulations/emails/:id, POST /simulations/emails/:id/interactions

  // UC-02: Training Document
  // app.use('/training', trainingRoutes); // GET /training/assigned, GET /training/:id, POST /training/:id/progress

  // UC-03: Quiz Flow
  // app.use('/quizzes', quizRoutes); // GET /quizzes/:id, POST /quizzes/:id/attempts
  // app.use('/quiz-attempts', quizAttemptRoutes); // POST /quiz-attempts/:id/submit, GET /quiz-attempts/:id/results

  // Supporting Admin/Campaign Context
  // app.use('/campaigns', campaignRoutes); // POST /campaigns, POST /campaigns/:id/assign

  return app;
}
