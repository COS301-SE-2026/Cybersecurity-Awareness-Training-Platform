import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { swaggerSpec } from './config/swagger.js';
import { healthRoutes } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';

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

  app.use(healthRoutes);
  app.use(authRouter);

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
