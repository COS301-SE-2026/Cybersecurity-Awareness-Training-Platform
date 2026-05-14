import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { swaggerSpec } from './config/swagger.js';
import { healthRoutes } from './routes/health.routes.js';

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

  // Preliminary Demo 1 API Route Placeholders (To be implemented)
  // app.use('/auth', authRoutes);
  // app.use('/learner', learnerRoutes); // campaigns, campaign items, training, quiz, and simulated email flows
  // app.use('/quiz-attempts', quizAttemptRoutes); // submit attempts and fetch attempt results
  // app.use('/campaigns', campaignRoutes); // supporting admin/campaign context

  return app;
}
